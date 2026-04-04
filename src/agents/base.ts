import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { AgentResult, Issue, ReviewContent } from '../types';
import { redactApiKeyFromText } from '../openaiUtil';

export abstract class BaseAgent {
  protected client: OpenAI;
  protected model: string;
  abstract readonly agentName: string;

  constructor(client: OpenAI, model: string = 'gpt-4o') {
    this.client = client;
    this.model = model;
  }

  abstract getSystemPrompt(): string;

  async analyze(content: ReviewContent, filePath: string): Promise<AgentResult> {
    const systemPrompt = this.getSystemPrompt();

    let userPayload: string | ChatCompletionContentPart[];

    if (content.kind === 'code') {
      userPayload = `Please review the following file and return your findings as structured JSON.

File path: ${filePath}

File content:
\`\`\`tsx
${content.text}
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
    } else {
      const imageUrl = `data:${content.mimeType};base64,${content.base64}`;
      userPayload = [
        {
          type: 'text',
          text: `Please review the attached UI screenshot and return your findings as structured JSON.

File path: ${filePath}

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

If there are no issues, return { "issues": [] }.`,
        },
        {
          type: 'image_url',
          image_url: { url: imageUrl, detail: 'high' },
        },
      ];
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPayload },
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
        error: redactApiKeyFromText(message),
      };
    }
  }
}
