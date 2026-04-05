import { LLMProvider } from '../provider';
import { AgentResult, Round2Result, FinalReport } from '../types';
import { redactApiKeyFromText } from '../openaiUtil';

const MAX_RANKED = 18;

export class FinalReportAgent {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  async build(round1: AgentResult[], round2: Round2Result[], filePath: string): Promise<FinalReport> {
    const isScreenshot = /\.(png|jpe?g|webp|gif)$/i.test(filePath);
    const artifact = isScreenshot ? 'UI screenshot' : 'source file';

    const system = `You are an independent lead reviewer consolidating a 3-round internal review of UI work (code or screenshots) at an institutional finance firm (State Street–style personas).

You receive:
- Round 1: each persona's issue list from reviewing the same ${artifact}.
- Round 2: each persona's agreements, disagreements with peers, additional findings, and optional voice notes.

Produce a single actionable final report for engineering and design leads.

Rules:
1. Deduplicate near-duplicate issues; merge sources into "source" as comma-separated persona IDs (e.g. "SS-002, SS-006").
2. Rank by: severity (high first), then user/regulatory/ops impact, then fix clarity.
3. Include at most ${MAX_RANKED} ranked issues.
4. interactionHighlights: 5–12 bullets capturing major cross-persona agreements and tensions (use kind "agreement" or "disagreement"). "personas" should be short (e.g. "SS-001 ↔ SS-005").

Return ONLY valid JSON:
{
  "summary": "3-5 sentence executive summary of overall themes and risk",
  "rankedIssues": [
    {
      "rank": 1,
      "severity": "high" | "medium" | "low",
      "title": "...",
      "description": "Why it matters and recommended fix",
      "source": "SS-00X" or "SS-00X, SS-00Y",
      "line": <optional integer>
    }
  ],
  "interactionHighlights": [
    {
      "kind": "agreement" | "disagreement",
      "personas": "SS-002 ↔ SS-007",
      "summary": "One line"
    }
  ]
}`;

    const r1 = round1
      .map((r) => {
        if (r.error) return `=== ${r.agentName} ===\nError: ${r.error}`;
        if (r.issues.length === 0) return `=== ${r.agentName} ===\nNo issues.`;
        const lines = r.issues.map(
          (i, n) =>
            `${n + 1}. [${i.severity}] ${i.title}${i.line != null ? ` L${i.line}` : ''}\n   ${i.description}`
        );
        return `=== ${r.agentName} (${r.issues.length} issues) ===\n${lines.join('\n\n')}`;
      })
      .join('\n\n');

    const r2 = round2
      .map((r) => {
        if (r.error) return `=== ${r.personaId} Round2 ===\nError: ${r.error}`;
        const parts: string[] = [];
        if (r.voiceNote) parts.push(`Voice: ${r.voiceNote}`);
        if (r.agreements.length)
          parts.push(
            'Agreements:\n' +
              r.agreements
                .map((a) => `  - with ${a.withPersonaId} on "${a.aboutTitle}": ${a.comment}`)
                .join('\n')
          );
        if (r.disagreements.length)
          parts.push(
            'Disagreements:\n' +
              r.disagreements
                .map((d) => `  - with ${d.withPersonaId} on "${d.aboutTitle}": ${d.reason}`)
                .join('\n')
          );
        if (r.additionalFindings.length)
          parts.push(
            'Additional:\n' +
              r.additionalFindings
                .map((i) => `  - [${i.severity}] ${i.title}: ${i.description}`)
                .join('\n')
          );
        return `=== ${r.personaId} Round2 ===\n${parts.join('\n\n') || '(no structured reactions)'}`;
      })
      .join('\n\n');

    const userMessage = `${isScreenshot ? 'Screenshot' : 'File'} reviewed: ${filePath}

## Round 1 (all personas)

${r1}

## Round 2 (reactions)

${r2}

Produce the final JSON report.`;

    try {
      const raw = await this.provider.complete(system, userMessage);
      const parsed = JSON.parse(raw) as FinalReport;
      return {
        summary: parsed.summary ?? '',
        rankedIssues: parsed.rankedIssues ?? [],
        interactionHighlights: parsed.interactionHighlights ?? [],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        summary: `Final report failed: ${redactApiKeyFromText(message)}`,
        rankedIssues: [],
        interactionHighlights: [],
      };
    }
  }
}
