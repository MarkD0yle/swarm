import fs from 'fs';
import path from 'path';
import { AgentResult, Round2Result, FinalReport } from './types';

/** Markdown export for `--out` (like exporting a PDF spec from Figma). */
export function finalReportToMarkdown(
  reviewedFile: string,
  round1: AgentResult[],
  round2: Round2Result[],
  finalReport: FinalReport
): string {
  const lines: string[] = [];
  lines.push('# Swarm — State Street persona review');
  lines.push('');
  lines.push(`**File:** \`${reviewedFile}\``);
  lines.push('');
  lines.push('## Executive summary');
  lines.push('');
  lines.push(finalReport.summary);
  lines.push('');

  if (finalReport.interactionHighlights.length > 0) {
    lines.push('## Interaction highlights');
    lines.push('');
    for (const h of finalReport.interactionHighlights) {
      lines.push(`- **${h.kind}** (${h.personas}): ${h.summary}`);
    }
    lines.push('');
  }

  lines.push('## Ranked issues');
  lines.push('');
  for (const i of finalReport.rankedIssues) {
    lines.push(`### ${i.rank}. [${i.severity}] ${i.title}`);
    lines.push('');
    lines.push(`**Source:** ${i.source}`);
    if (i.line != null) {
      lines.push(`**Line:** ${i.line}`);
    }
    lines.push('');
    lines.push(i.description);
    lines.push('');
  }

  lines.push('## Round 1 — persona issue counts');
  lines.push('');
  for (const r of round1) {
    const n = r.error ? `error: ${r.error}` : `${r.issues.length} issues`;
    lines.push(`- **${r.agentName}:** ${n}`);
  }
  lines.push('');

  lines.push('## Round 2 — reaction counts');
  lines.push('');
  for (const r of round2) {
    if (r.error) {
      lines.push(`- **${r.personaId}:** error: ${r.error}`);
    } else {
      lines.push(
        `- **${r.personaId}:** ${r.agreements.length} agreements, ${r.disagreements.length} disagreements, ${r.additionalFindings.length} additional findings`
      );
    }
  }
  lines.push('');

  return lines.join('\n');
}

export function writeReportFile(outPath: string, markdown: string): void {
  const resolved = path.resolve(outPath);
  const dir = path.dirname(resolved);
  if (dir !== '.' && dir !== '') {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(resolved, markdown, 'utf-8');
}
