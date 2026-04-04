import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { SwarmOptions, ReviewResult, AgentState, AgentResult, Round2Result } from './types';
import { PERSONAS } from './agents/personas';
import { PersonaAgent } from './agents/personaAgent';
import { FinalReportAgent } from './agents/finalReport';
import { Renderer } from './tui/renderer';
import { theme } from './tui/theme';

/** Cap peer digest size — Round 2 does not resend full file (see plan). */
const MAX_ISSUES_PER_PEER_DIGEST = 12;
const PEER_DESCRIPTION_MAX_CHARS = 160;

function truncateOneLine(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Build text digest of all peers' Round 1 issues for one persona's Round 2 call. */
function buildPeerDigest(results: AgentResult[], excludePersonaId: string): string {
  const chunks: string[] = [];
  for (const r of results) {
    if (r.agentName === excludePersonaId) {
      continue;
    }
    if (r.error) {
      chunks.push(`=== ${r.agentName} ===\n(Error: ${r.error})`);
      continue;
    }
    if (r.issues.length === 0) {
      chunks.push(`=== ${r.agentName} ===\nNo issues.`);
      continue;
    }
    const slice = r.issues.slice(0, MAX_ISSUES_PER_PEER_DIGEST);
    const lines = slice.map((i, idx) => {
      const desc = truncateOneLine(i.description, PEER_DESCRIPTION_MAX_CHARS);
      return `${idx + 1}. [${i.severity}] ${i.title}\n   ${desc}`;
    });
    const more =
      r.issues.length > slice.length
        ? `\n(+ ${r.issues.length - slice.length} more issues omitted for brevity)`
        : '';
    chunks.push(`=== ${r.agentName} ===\n${lines.join('\n')}${more}`);
  }
  return chunks.join('\n\n');
}

export class Orchestrator {
  private client: OpenAI;
  private model: string;

  constructor(options: SwarmOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? 'gpt-4o';
  }

  /**
   * 3-round review: R1 = 10 parallel full-file persona reviews; R2 = 10 parallel peer reactions;
   * R3 = one consolidated report. Cost: 21 LLM calls per file (future: optional --personas subset).
   */
  async review(filePath: string): Promise<ReviewResult> {
    const resolvedPath = path.resolve(filePath);
    const fileName = path.basename(resolvedPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }
    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');

    const personaAgents = PERSONAS.map((p) => new PersonaAgent(this.client, this.model, p));
    const finalReportAgent = new FinalReportAgent(this.client, this.model);

    const shortLabels = PERSONAS.map((p) => ({ name: p.id, status: 'waiting' as const }));

    // ----- Round 1 -----
    const renderer1 = new Renderer(fileName, 'Round 1 — review');
    const agentStates1: AgentState[] = shortLabels.map((s) => ({ ...s }));
    renderer1.setAgents(agentStates1);
    renderer1.start();

    for (const { name } of shortLabels) {
      renderer1.updateAgent(name, { status: 'analyzing' });
    }

    const round1: AgentResult[] = await Promise.all(
      personaAgents.map(async (agent) => {
        const result = await agent.analyze(fileContent, resolvedPath);
        if (result.error) {
          renderer1.updateAgent(agent.agentName, { status: 'error', error: result.error });
        } else {
          renderer1.updateAgent(agent.agentName, {
            status: 'done',
            issueCount: result.issues.length,
          });
        }
        return result;
      })
    );

    renderer1.stop();
    renderer1.printFindings(round1);

    // ----- Round 2 -----
    process.stdout.write('\n');
    const renderer2 = new Renderer(fileName, 'Round 2 — reactions');
    const agentStates2: AgentState[] = shortLabels.map((s) => ({ ...s, status: 'waiting' }));
    renderer2.setAgents(agentStates2);
    renderer2.start();

    for (const { name } of shortLabels) {
      renderer2.updateAgent(name, { status: 'analyzing' });
    }

    const round2: Round2Result[] = await Promise.all(
      personaAgents.map(async (agent) => {
        const own = round1.find((r) => r.agentName === agent.agentName)!;
        const digest = buildPeerDigest(round1, agent.agentName);
        const result = await agent.reactRound2(own, digest);
        if (result.error) {
          renderer2.updateAgent(agent.agentName, { status: 'error', error: result.error });
        } else {
          const n =
            result.agreements.length +
            result.disagreements.length +
            result.additionalFindings.length;
          renderer2.updateAgent(agent.agentName, { status: 'done', issueCount: n });
        }
        return result;
      })
    );

    renderer2.stop();
    renderer2.printRound2(round2);

    // ----- Round 3 -----
    process.stdout.write('\n');
    console.log(theme.sectionHeader('Round 3 — final report'));
    const finalReport = await finalReportAgent.build(round1, round2, resolvedPath);
    renderer2.printFinalReport(finalReport);

    return {
      file: resolvedPath,
      round1,
      round2,
      finalReport,
    };
  }
}
