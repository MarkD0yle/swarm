import OpenAI, { APIError } from 'openai';

/** Remove API key–like substrings so logs and the TUI never echo secrets. */
export function redactApiKeyFromText(text: string): string {
  return text.replace(/sk-[a-zA-Z0-9_*-]{12,}/gi, 'sk-…[redacted]');
}

/** One cheap request before spawning parallel agents; avoids 10× 401 spam and TUI corruption. */
export async function validateOpenAIKey(client: OpenAI): Promise<void> {
  try {
    await client.models.list();
  } catch (err) {
    if (err instanceof APIError && err.status === 401) {
      throw new Error(
        'OpenAI returned 401 (invalid or expired API key).\n' +
          '  • Create or rotate a key at https://platform.openai.com/api-keys\n' +
          '  • In .env use: OPENAI_API_KEY=sk-... with no spaces around = and no quotes unless the whole value is quoted\n' +
          '  • Project keys (sk-proj-...) need an active project and billing where required'
      );
    }
    const msg = err instanceof APIError ? `${err.status}: ${err.message}` : String(err);
    throw new Error(redactApiKeyFromText(`OpenAI check failed: ${msg}`));
  }
}
