import OpenAI, { APIError } from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { LLMProvider } from '../provider';
import { redactApiKeyFromText } from '../openaiUtil';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;
  readonly defaultModel = 'gpt-4o';

  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.client = new OpenAI({ apiKey: apiKey.trim() });
    this.model = model;
  }

  async complete(system: string, userText: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    return response.choices[0]?.message?.content ?? '{}';
  }

  async completeWithImage(
    system: string,
    userText: string,
    base64: string,
    mimeType: string
  ): Promise<string> {
    const imageUrl = `data:${mimeType};base64,${base64}`;
    const userPayload: ChatCompletionContentPart[] = [
      { type: 'text', text: userText },
      { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
    ];
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPayload },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    return response.choices[0]?.message?.content ?? '{}';
  }

  async validateKey(): Promise<void> {
    try {
      await this.client.models.list();
    } catch (err) {
      if (err instanceof APIError && err.status === 401) {
        throw new Error(
          'OpenAI returned 401 (invalid or expired API key).\n' +
            '  • Create or rotate a key at https://platform.openai.com/api-keys\n' +
            '  • In .env use: OPENAI_API_KEY=sk-... with no spaces around = and no quotes\n' +
            '  • Project keys (sk-proj-...) need an active project and billing enabled'
        );
      }
      const msg = err instanceof APIError ? `${err.status}: ${err.message}` : String(err);
      throw new Error(redactApiKeyFromText(`OpenAI check failed: ${msg}`));
    }
  }
}
