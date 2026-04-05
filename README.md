# swarmui

Multi-agent UI code review tool — runs 10 institutional-persona agents in parallel via OpenAI or Anthropic.

Swarm sends your UI component or screenshot through three rounds of structured critique: independent analysis, cross-agent reaction, and a final synthesized report. Each agent embodies a distinct institutional persona (ops, risk, trading, compliance, engineering, client services) and reviews the file in character, producing grounded, role-specific feedback that surface issues a single reviewer would miss.

---

## How it works

Swarm orchestrates **21 LLM calls** across three rounds:

| Round | What happens |
|-------|-------------|
| **Round 1** | 10 personas independently review the file and surface issues |
| **Round 2** | Each persona reads a digest of their peers' findings and marks agreements, disagreements, and new insights |
| **Round 3** | A neutral synthesis agent consolidates everything into a ranked, deduplicated final report |

All Round 1 and Round 2 calls run in parallel. The terminal UI shows live agent status as they complete.

---

## Installation

```bash
npm install -g swarmui
```

Or use it without installing:

```bash
npx swarmui review <file>
```

---

## Quick start

```bash
# Set your API key (Anthropic or OpenAI)
export ANTHROPIC_API_KEY=sk-ant-...
# or
export OPENAI_API_KEY=sk-...

# Review a UI component
swarmui review src/components/Dashboard.tsx

# Review a screenshot
swarmui review design/mockup.png

# Save the report to a file
swarmui review src/components/Dashboard.tsx --out review.md
```

---

## CLI reference

```
swarmui review <file> [options]
```

| Option | Description |
|--------|-------------|
| `--api-key <key>` | API key (overrides `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env vars) |
| `--provider <name>` | LLM provider: `openai` or `anthropic` (auto-detected from key prefix if omitted) |
| `--model <model>` | Model override (defaults: `gpt-4o` for OpenAI, `claude-sonnet-4-6` for Anthropic) |
| `--out <path>` | Write the final report as Markdown to this path |

**Supported input types:**
- Code files: `.ts`, `.tsx`, `.js`, `.jsx`, or any plain text file
- Images: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`

**API key detection:**
- Keys starting with `sk-ant-` are automatically routed to Anthropic
- All other `sk-` keys are routed to OpenAI
- Use `--provider` to override

---

## Environment variables

Create a `.env` file in your project root (automatically loaded):

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

If both keys are present, `ANTHROPIC_API_KEY` takes priority unless `--provider openai` is specified.

---

## Programmatic API

Swarm can also be embedded as a library:

```typescript
import { Swarm } from 'swarmui';
import type { ReviewResult } from 'swarmui';

const swarm = new Swarm({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  provider: 'anthropic',
  // model: 'claude-opus-4-6', // optional override
});

const result: ReviewResult = await swarm.review('/path/to/component.tsx');

console.log(result.finalReport.summary);
console.log(result.finalReport.rankedIssues);
console.log(result.finalReport.interactionHighlights);
```

### `SwarmOptions`

```typescript
interface SwarmOptions {
  apiKey: string;
  provider: 'openai' | 'anthropic';
  model?: string;
}
```

### `ReviewResult`

```typescript
interface ReviewResult {
  file: string;
  round1: AgentResult[];       // Raw output from each persona (Round 1)
  round2: Round2Result[];      // Reactions and cross-agent insights (Round 2)
  finalReport: FinalReport;    // Synthesized, ranked, deduplicated report
}
```

### `FinalReport`

```typescript
interface FinalReport {
  summary: string;
  rankedIssues: RankedIssue[];
  interactionHighlights: InteractionHighlight[];
}

interface RankedIssue {
  rank: number;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  sources: string[];           // Persona IDs that flagged this issue
}

interface InteractionHighlight {
  type: 'agreement' | 'disagreement';
  agents: string[];
  summary: string;
}
```

All exported types are available from the `swarmui` package.

---

## Persona pack

The current release ships the **State Street Financial Services** persona pack — 10 institutional characters spanning operations, risk, trading, compliance, engineering, and client services.

| ID | Name | Role |
|----|------|------|
| SS-001 | Marcus Webb | Head of Global Custody Operations |
| SS-002 | Priya Nair | VP Risk Analytics |
| SS-003 | Derek Okafor | Senior Portfolio Analyst |
| SS-004 | Caroline Lim | Director of Technology |
| SS-005 | James Calloway | Institutional Equity Trader |
| SS-006 | Fatima Al-Hassan | Compliance Officer, EMEA |
| SS-007 | Tom Greenwald | Quantitative Developer |
| SS-008 | Sandra Kowalski | Client Reporting Manager |
| SS-009 | Nathan Osei | ESG Data Analyst |
| SS-010 | Rachel Osei | Retail Investor Services Associate |

Each persona has defined stress levels, UI demands, red flags, and trust signals. They disagree in character — for example, SS-005 (trader) deprioritizes methodology footnotes during market hours while SS-002 (risk) considers them non-negotiable. These tensions surface naturally in Round 2 and are captured in the final report's interaction highlights.

---

## Example output

```markdown
## Executive summary

The review highlights significant issues with accessibility, compliance, and usability.
High-severity issues include the lack of color-coded status indicators and reliance on
color alone, which affects color-blind users...

## Interaction highlights

- agreement (SS-001 ↔ SS-008): Color-only status indicators are a risk; need unambiguous indicators.
- agreement (SS-002 ↔ SS-007): Dark mode is essential for reducing eye strain.
- disagreement (SS-001 ↔ SS-004): ISO timestamps are non-negotiable for audit and compliance.
- disagreement (SS-002 ↔ SS-005): Methodology footnotes are less critical during trading hours.

## Ranked issues

### 1. [high] Lack of color-coded status indicators
**Source:** SS-001, SS-003, SS-005
The progress bars use a single color, making it difficult to quickly assess status...
```

---

## Development

```bash
git clone <repo>
cd swarmui
npm install

# Run directly with ts-node
npm run dev -- review src/components/MyComponent.tsx

# Build to dist/
npm run build

# Clean build artifacts
npm run clean
```

The `prepublishOnly` script runs `clean` + `build` automatically before `npm publish`.

---

## Architecture

```
src/
├── cli.ts                  # CLI entry point (commander.js)
├── index.ts                # Public library API (Swarm class + type exports)
├── types.ts                # All TypeScript interfaces and types
├── provider.ts             # LLMProvider interface
├── orchestrator.ts         # 3-round review flow
├── openaiUtil.ts           # API key redaction utilities
├── reportWriter.ts         # Markdown export
├── agents/
│   ├── base.ts             # BaseAgent abstract class
│   ├── personaAgent.ts     # Per-persona Round 1 + Round 2 logic
│   ├── personas.ts         # Persona definitions and prompt builders
│   └── finalReport.ts      # Round 3 synthesis agent
├── providers/
│   ├── openaiProvider.ts   # OpenAI GPT-4o implementation
│   └── anthropicProvider.ts # Anthropic Claude implementation
└── tui/
    ├── renderer.ts         # Animated terminal UI
    └── theme.ts            # Colors and styling
```

**LLM calls per review:** 21 total (10 Round 1 + 10 Round 2 + 1 Round 3), with each round's calls running in parallel.

Both providers use temperature 0.2 for consistent, deterministic output. Images are passed as base64 (Anthropic) or image URLs (OpenAI). API keys are automatically redacted from all error output.

---

## License

MIT
