import OpenAI from 'openai';
import { AgentResult, Issue } from '../types';

export abstract class BaseAgent {
  protected client: OpenAI;
  protected model: string;
  abstract readonly agentName: string;

  constructor(client: OpenAI, model: string = 'gpt-4o') {
    this.client = client;
    this.model = model;
  }

  abstract getSystemPrompt(): string;

  async analyze(fileContent: string, filePath: string): Promise<AgentResult> {
    const systemPrompt = this.getSystemPrompt();

    const userMessage = `Please review the following file and return your findings as structured JSON.

File path: ${filePath}

File content:
\`\`\`tsx
${fileContent}
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

      const content = response.choices[0]?.message?.content ?? '{"issues":[]}';
      const parsed = JSON.parse(content) as { issues: Issue[] };

      return {
        agentName: this.agentName,
        issues: parsed.issues ?? [],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        agentName: this.agentName,
        issues: [],
        error: message,
      };
    }
  }
}
