/**
 * Thin abstraction over LLM providers (OpenAI, Anthropic).
 * Agents call complete() or completeWithImage() and get back a raw string
 * (expected to be valid JSON based on the prompt instructions).
 */
export interface LLMProvider {
  /** Human-readable provider name, e.g. "openai" or "anthropic". */
  readonly name: 'openai' | 'anthropic';
  /** Default model ID used when none is specified. */
  readonly defaultModel: string;

  /** Text-only completion — returns raw response content. */
  complete(system: string, userText: string): Promise<string>;

  /** Vision completion — returns raw response content. */
  completeWithImage(
    system: string,
    userText: string,
    base64: string,
    mimeType: string
  ): Promise<string>;

  /** Cheap pre-flight call to validate the API key before spawning parallel agents. */
  validateKey(): Promise<void>;
}
