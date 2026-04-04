import OpenAI from 'openai';
import { AgentResult, Issue, Round2Result } from '../types';
import { PersonaDefinition, getPersonaReviewSystemPrompt, getPersonaRound2SystemPrompt } from './personas';
import { BaseAgent } from './base';

export class PersonaAgent extends BaseAgent {
  readonly agentName: string;
  private readonly persona: PersonaDefinition;

  constructor(client: OpenAI, model: string, persona: PersonaDefinition) {
    super(client, model);
    this.persona = persona;
    this.agentName = persona.id;
  }

  getSystemPrompt(): string {
    return getPersonaReviewSystemPrompt(this.persona);
  }

  async reactRound2(ownRound1: AgentResult, peerDigestText: string): Promise<Round2Result> {
    const systemPrompt = getPersonaRound2SystemPrompt(this.persona);

    const ownIssuesText =
      ownRound1.error != null
        ? `Your Round 1 failed with error: ${ownRound1.error}\nAssume you had no issues listed.`
        : ownRound1.issues.length === 0
          ? 'Your Round 1 issues: (none)'
          : `Your Round 1 issues:\n${ownRound1.issues
              .map(
                (i, idx) =>
                  `${idx + 1}. [${i.severity}] ${i.title}${i.line != null ? ` (line ${i.line})` : ''}\n   ${i.description}`
              )
              .join('\n\n')}`;

    const userMessage = `${ownIssuesText}

Other reviewers' findings (summaries only):
${peerDigestText}

Return ONLY the JSON object specified in your instructions.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content =
        response.choices[0]?.message?.content ??
        '{"agreements":[],"disagreements":[],"additionalFindings":[],"voiceNote":""}';
      const parsed = JSON.parse(content) as {
        agreements?: Array<{ withPersonaId: string; aboutTitle: string; comment: string }>;
        disagreements?: Array<{ withPersonaId: string; aboutTitle: string; reason: string }>;
        additionalFindings?: Issue[];
        voiceNote?: string;
      };

      return {
        personaId: this.persona.id,
        agreements: parsed.agreements ?? [],
        disagreements: parsed.disagreements ?? [],
        additionalFindings: parsed.additionalFindings ?? [],
        voiceNote: parsed.voiceNote,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        personaId: this.persona.id,
        agreements: [],
        disagreements: [],
        additionalFindings: [],
        error: message,
      };
    }
  }
}
