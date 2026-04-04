#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { Orchestrator } from './orchestrator';

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

const program = new Command();

program
  .name('swarm')
  .description('Multi-agent UI code review tool')
  .version('1.0.0');

program
  .command('review <file>')
  .description('Run a multi-agent review on a UI component file')
  .option('--api-key <key>', 'OpenAI API key (overrides OPENAI_API_KEY env var)')
  .option('--model <model>', 'OpenAI model to use', 'gpt-4o')
  .action(async (file: string, options: { apiKey?: string; model?: string }) => {
    const apiKey = options.apiKey ?? process.env['OPENAI_API_KEY'];

    if (!apiKey) {
      console.error(
        '\nError: No OpenAI API key found.\n' +
        'Set OPENAI_API_KEY in your environment, create a .env file, or pass --api-key.\n'
      );
      process.exit(1);
    }

    const resolvedFile = path.resolve(process.cwd(), file);
    if (!fs.existsSync(resolvedFile)) {
      console.error(`\nError: File not found: ${resolvedFile}\n`);
      process.exit(1);
    }

    const orchestrator = new Orchestrator({
      apiKey,
      model: options.model ?? 'gpt-4o',
    });

    try {
      await orchestrator.review(resolvedFile);
      process.exit(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command given
if (process.argv.length < 3) {
  program.help();
}
