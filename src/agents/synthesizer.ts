import OpenAI from 'openai';
import { AgentResult, SynthesisResult, RankedIssue } from '../types';

export class SynthesizerAgent {
  private client: OpenAI;
  private model: string;

  constructor(client: OpenAI, model: string = 'gpt-4o') {
    this.client = client;
    this.model = model;
  }

  async synthesize(agentResults: AgentResult[], filePath: string): Promise<SynthesisResult> {
    const systemPrompt = `You are a senior engineering lead conducting a holistic code review. You have received findings from four specialist agents (Accessibility, UX, Component architecture, and Styling). Your task is to synthesize these findings into a prioritized action plan.

Your synthesis should:
1. Identify the top issues across all agents, ranked by business impact and severity
2. Highlight cross-cutting concerns that span multiple domains (e.g., a pattern that is both a component issue AND a UX issue)
3. Write a concise executive summary paragraph (2-4 sentences) summarizing the overall health of the file and the most important themes
4. Rank issues by: (a) severity — high before medium before low, (b) user impact — issues affecting end users rank higher than internal code quality, (c) fix effort — quick wins rank higher than equivalent-severity issues requiring major refactoring

Return ONLY valid JSON in this exact format:
{
  "summary": "2-4 sentence executive summary of the overall code review findings",
  "rankedIssues": [
    {
      "rank": 1,
      "severity": "high" | "medium" | "low",
      "title": "Concise issue title",
      "description": "Why this matters and the recommended fix approach",
      "source": "Accessibility" | "UX" | "Component" | "Styling",
      "line": <optional integer>
    }
  ]
}

Include at most 10 ranked issues. Focus on the most impactful and actionable findings.`;

    // Build a combined summary of all findings
    const findingsSummary = agentResults
      .map((result) => {
        if (result.error) {
          return `=== ${result.agentName} Agent ===\nError: ${result.error}`;
        }
        if (result.issues.length === 0) {
          return `=== ${result.agentName} Agent ===\nNo issues found.`;
        }
        const issueList = result.issues
          .map(
            (issue, i) =>
              `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}${issue.line ? ` (line ${issue.line})` : ''}\n   ${issue.description}`
          )
          .join('\n\n');
        return `=== ${result.agentName} Agent (${result.issues.length} issues) ===\n${issueList}`;
      })
      .join('\n\n');

    const userMessage = `File reviewed: ${filePath}

Here are the findings from all four specialist agents:

${findingsSummary}

Please synthesize these findings into a prioritized report.`;

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

      const content = response.choices[0]?.message?.content ?? '{"summary":"","rankedIssues":[]}';
      const parsed = JSON.parse(content) as { summary: string; rankedIssues: RankedIssue[] };

      return {
        summary: parsed.summary ?? '',
        rankedIssues: parsed.rankedIssues ?? [],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        summary: `Synthesis failed: ${message}`,
        rankedIssues: [],
      };
    }
  }
}
