import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from '../provider';
import { redactApiKeyFromText } from '../openaiUtil';

type AnthropicImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/** Strip markdown code fences that Claude sometimes wraps around JSON. */
function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;
  readonly defaultModel = 'claude-sonnet-4-6';

  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey: apiKey.trim() });
    this.model = model;
  }

  async complete(system: string, userText: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      system,
      messages: [{ role: 'user', content: userText }],
      max_tokens: 4096,
      temperature: 0.2,
    });
    const block = response.content[0];
    const raw = block?.type === 'text' ? block.text : '{}';
    return stripFences(raw);
  }

  async completeWithImage(
    system: string,
    userText: string,
    base64: string,
    mimeType: string
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      system,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as AnthropicImageMime,
                data: base64,
              },
            },
            { type: 'text', text: userText },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.2,
    });
    const block = response.content[0];
    const raw = block?.type === 'text' ? block.text : '{}';
    return stripFences(raw);
  }

  async validateKey(): Promise<void> {
    try {
      // Cheapest possible call: 1-token completion
      await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        throw new Error(
          'Anthropic returned 401 (invalid or expired API key).\n' +
            '  • Create or rotate a key at https://console.anthropic.com/settings/keys\n' +
            '  • In .env use: ANTHROPIC_API_KEY=sk-ant-... with no spaces around ='
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(redactApiKeyFromText(`Anthropic check failed: ${msg}`));
    }
  }
}
