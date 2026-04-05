#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { Orchestrator } from './orchestrator';
import { finalReportToMarkdown, writeReportFile } from './reportWriter';
import { redactApiKeyFromText } from './openaiUtil';

// Load .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

/** Detect provider from key prefix; Anthropic keys start with sk-ant-. */
function detectProviderFromKey(key: string): 'openai' | 'anthropic' {
  return key.trim().startsWith('sk-ant-') ? 'anthropic' : 'openai';
}

const program = new Command();

program
  .name('swarmui')
  .description('Multi-agent UI code review tool — powered by OpenAI or Anthropic')
  .version('1.1.0');

program
  .command('review <file>')
  .description(
    'Run a multi-agent review on a UI component file or screenshot (.png, .jpg, .webp, .gif)'
  )
  .option('--api-key <key>', 'API key (overrides OPENAI_API_KEY / ANTHROPIC_API_KEY env vars)')
  .option(
    '--provider <name>',
    'LLM provider: openai or anthropic (auto-detected from key prefix if omitted)'
  )
  .option('--model <model>', 'Model to use (defaults: gpt-4o for OpenAI, claude-sonnet-4-6 for Anthropic)')
  .option('--out <path>', 'Write final report as Markdown to this path')
  .action(
    async (
      file: string,
      options: {
        apiKey?: string;
        provider?: string;
        model?: string;
        out?: string;
      }
    ) => {
      // Resolve API key: flag → env (ANTHROPIC first if provider flag set, else try both)
      let rawKey = options.apiKey;
      if (!rawKey) {
        const explicitProvider = options.provider?.toLowerCase();
        if (explicitProvider === 'anthropic') {
          rawKey = process.env['ANTHROPIC_API_KEY'];
        } else if (explicitProvider === 'openai') {
          rawKey = process.env['OPENAI_API_KEY'];
        } else {
          // No explicit provider: prefer whichever env var is set; Anthropic takes priority
          rawKey = process.env['ANTHROPIC_API_KEY'] ?? process.env['OPENAI_API_KEY'];
        }
      }

      const apiKey = typeof rawKey === 'string' ? rawKey.trim() : undefined;

      if (!apiKey) {
        console.error(
          '\nError: No API key found.\n' +
            'Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment, create a .env file,\n' +
            'or pass --api-key.\n'
        );
        process.exit(1);
      }

      // Validate --provider flag value
      const providerFlag = options.provider?.toLowerCase();
      if (providerFlag && providerFlag !== 'openai' && providerFlag !== 'anthropic') {
        console.error(`\nError: --provider must be "openai" or "anthropic", got "${options.provider}".\n`);
        process.exit(1);
      }

      const provider =
        (providerFlag as 'openai' | 'anthropic' | undefined) ?? detectProviderFromKey(apiKey);

      const resolvedFile = path.resolve(process.cwd(), file);
      if (!fs.existsSync(resolvedFile)) {
        console.error(`\nError: File not found: ${resolvedFile}\n`);
        process.exit(1);
      }

      const orchestrator = new Orchestrator({ apiKey, provider, model: options.model });

      try {
        const result = await orchestrator.review(resolvedFile);

        if (options.out) {
          const md = finalReportToMarkdown(
            result.file,
            result.round1,
            result.round2,
            result.finalReport
          );
          writeReportFile(options.out, md);
          console.log(`\nReport written to ${path.resolve(options.out)}\n`);
        }

        process.exit(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`\nError: ${redactApiKeyFromText(message)}\n`);
        process.exit(1);
      }
    }
  );

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}
