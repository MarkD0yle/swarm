/** Remove API key–like substrings from strings so logs and the TUI never echo secrets.
 *  Covers OpenAI keys (sk-...) and Anthropic keys (sk-ant-...). */
export function redactApiKeyFromText(text: string): string {
  return text.replace(/sk-[a-zA-Z0-9_*-]{12,}/gi, 'sk-…[redacted]');
}
