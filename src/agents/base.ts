import { LLMProvider } from '../provider';
import { AgentResult, Issue, ReviewContent } from '../types';
import { redactApiKeyFromText } from '../openaiUtil';

export abstract class BaseAgent {
  protected provider: LLMProvider;
  abstract readonly agentName: string;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  abstract getSystemPrompt(): string;

  async analyze(content: ReviewContent, filePath: string): Promise<AgentResult> {
    const system = this.getSystemPrompt();

    const codePrompt = (text: string, fp: string) =>
      `Please review the following file and return your findings as structured JSON.

File path: ${fp}

File content:
\`\`\`tsx
${text}
\`\`\`

Return ONLY valid JSON in this exact format (no markdown, no explanation outside the JSON):
{
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "title": "Brief issue title",
      "description": "Detailed description of the issue and how to fix it",
      "line": <optional line number as integer>
    }
  ]
}

If there are no issues, return { "issues": [] }.`;

    const imagePrompt = (fp: string) =>
      `Please review the attached UI screenshot and return your findings as structured JSON.

File path: ${fp}

Treat this as a visual/UI review (layout, hierarchy, typography, color, spacing, affordances, copy, empty states, progress indicators, accessibility signals visible in the image). You do not have source code; omit the "line" field on issues that are not tied to a line of code.

Return ONLY valid JSON in this exact format (no markdown, no explanation outside the JSON):
{
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "title": "Brief issue title",
      "description": "Detailed description of the issue and how to fix it",
      "line": <optional line number as integer>
    }
  ]
}

If there are no issues, return { "issues": [] }.`;

    try {
      let raw: string;
      if (content.kind === 'code') {
        raw = await this.provider.complete(system, codePrompt(content.text, filePath));
      } else {
        raw = await this.provider.completeWithImage(
          system,
          imagePrompt(filePath),
          content.base64,
          content.mimeType
        );
      }

      const parsed = JSON.parse(raw) as { issues: Issue[] };
      return { agentName: this.agentName, issues: parsed.issues ?? [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { agentName: this.agentName, issues: [], error: redactApiKeyFromText(message) };
    }
  }
}
