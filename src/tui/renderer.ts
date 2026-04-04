import chalk, { type ChalkInstance } from 'chalk';
import { AgentState, AgentResult, Round2Result, FinalReport } from '../types';
import { theme } from './theme';
import { PERSONAS } from '../agents/personas';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BOX_WIDTH = 62;

function displayNameForId(id: string): string {
  const p = PERSONAS.find((x) => x.id === id);
  return p ? `${p.id} ${p.displayName.split(' ')[0]}` : id;
}

export class Renderer {
  private spinnerFrame = 0;
  private spinnerInterval: NodeJS.Timeout | null = null;
  private agentStates: AgentState[] = [];
  private panelLineCount = 0;
  private fileName = '';
  private phaseLabel = 'Review';
  private rendered = false;

  constructor(fileName: string, phaseLabel = 'Review') {
    this.fileName = fileName;
    this.phaseLabel = phaseLabel;
  }

  setAgents(agents: AgentState[]): void {
    this.agentStates = agents;
  }

  start(): void {
    process.stdout.write('\x1B[?25l');

    this.spinnerInterval = setInterval(() => {
      this.spinnerFrame = (this.spinnerFrame + 1) % SPINNER_FRAMES.length;
      this.refresh();
    }, 80);

    this.renderPanel();
  }

  updateAgent(name: string, updates: Partial<AgentState>): void {
    const agent = this.agentStates.find((a) => a.name === name);
    if (agent) {
      Object.assign(agent, updates);
    }
  }

  private refresh(): void {
    if (!this.rendered) return;
    process.stdout.write(`\x1B[${this.panelLineCount}A`);
    this.renderPanel();
  }

  private renderPanel(): void {
    const lines: string[] = [];

    const title = ` Swarm — ${this.phaseLabel} — ${this.fileName} `;
    const innerWidth = BOX_WIDTH - 2;

    const titleLine = this.buildTitleLine(title, innerWidth);
    lines.push(theme.boxBorder(titleLine));

    for (const agent of this.agentStates) {
      lines.push(this.renderAgentRow(agent, innerWidth));
    }

    lines.push(theme.boxBorder('└' + '─'.repeat(innerWidth) + '┘'));

    const output = lines.join('\n') + '\n';
    process.stdout.write(output);
    this.panelLineCount = lines.length + 1;
    this.rendered = true;
  }

  private buildTitleLine(title: string, innerWidth: number): string {
    const stripped = title;
    const dashesAfter = innerWidth - 2 - stripped.length;
    const rightDashes = Math.max(0, dashesAfter);
    return '┌─' + stripped + '─'.repeat(rightDashes) + '┐';
  }

  private renderAgentRow(agent: AgentState, innerWidth: number): string {
    const icon = this.getIcon(agent.status);
    const agentLabel = this.getAgentLabel(agent);
    const statusText = this.getStatusText(agent);

    const nameWidth = 22;
    const visibleIcon = this.stripAnsi(icon);
    const visibleName = displayNameForId(agent.name);
    const visibleStatus = this.stripAnsi(statusText);

    const paddedVisibleName = visibleName.padEnd(nameWidth);
    const coloredPaddedName = agentLabel + ' '.repeat(Math.max(0, nameWidth - visibleName.length));

    const visibleLen = 2 + visibleIcon.length + 1 + paddedVisibleName.length + 1 + visibleStatus.length;
    const padRight = Math.max(0, innerWidth - visibleLen);

    return (
      theme.boxBorder('│') +
      `  ${icon} ${coloredPaddedName} ${statusText}${' '.repeat(padRight)}` +
      theme.boxBorder('│')
    );
  }

  private getIcon(status: AgentState['status']): string {
    switch (status) {
      case 'waiting':
        return theme.waiting('○');
      case 'analyzing':
        return theme.analyzing(SPINNER_FRAMES[this.spinnerFrame]);
      case 'done':
        return theme.done('✓');
      case 'error':
        return theme.error('✗');
    }
  }

  private getAgentLabel(agent: AgentState): string {
    const colorFn: ChalkInstance = theme.agentColorForId(agent.name);
    return colorFn(displayNameForId(agent.name));
  }

  private getStatusText(agent: AgentState): string {
    switch (agent.status) {
      case 'waiting':
        return theme.dim('waiting...');
      case 'analyzing':
        return theme.analyzing('analyzing...');
      case 'done':
        if (agent.error) {
          return theme.error('error occurred');
        }
        const count = agent.issueCount ?? 0;
        return theme.done(`${count} item${count !== 1 ? 's' : ''}`);
      case 'error':
        return theme.error(agent.error ?? 'error occurred');
    }
  }

  private stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1B\[[0-9;]*m/g, '');
  }

  stop(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
    this.refresh();
    process.stdout.write('\x1B[?25h');
    process.stdout.write('\n');
  }

  printFindings(agentResults: AgentResult[]): void {
    for (const result of agentResults) {
      const colorFn = theme.agentColorForId(result.agentName);
      const label = displayNameForId(result.agentName);
      console.log(colorFn(`\n● ${label}`));
      console.log(theme.gray('─'.repeat(54)));

      if (result.error) {
        console.log(theme.error(`  Error: ${result.error}`));
        continue;
      }

      if (result.issues.length === 0) {
        console.log(theme.dim('  No issues found.'));
        continue;
      }

      for (const issue of result.issues) {
        const badge = theme.severityBadge(issue.severity);
        const lineInfo = issue.line ? theme.dim(` (line ${issue.line})`) : '';
        console.log(`  ${badge} ${chalk.white.bold(issue.title)}${lineInfo}`);
        console.log(`     ${theme.dim(issue.description)}`);
        console.log();
      }
    }
  }

  printRound2(results: Round2Result[]): void {
    console.log(theme.sectionHeader('\n◆ Round 2 — peer reactions'));
    console.log(theme.gray('─'.repeat(54)));

    for (const r of results) {
      const colorFn = theme.agentColorForId(r.personaId);
      const label = displayNameForId(r.personaId);
      console.log(colorFn(`\n● ${label}`));
      console.log(theme.gray('─'.repeat(54)));

      if (r.error) {
        console.log(theme.error(`  Error: ${r.error}`));
        continue;
      }

      if (r.voiceNote) {
        console.log(theme.dim(`  "${r.voiceNote}"`));
        console.log();
      }

      if (r.agreements.length === 0 && r.disagreements.length === 0 && r.additionalFindings.length === 0) {
        console.log(theme.dim('  No structured reactions.'));
        continue;
      }

      for (const a of r.agreements) {
        console.log(theme.done(`  ✓ Agrees with ${a.withPersonaId} on "${a.aboutTitle}"`));
        console.log(`     ${theme.dim(a.comment)}`);
        console.log();
      }
      for (const d of r.disagreements) {
        console.log(theme.high(`  ✗ Disputes ${d.withPersonaId} on "${d.aboutTitle}"`));
        console.log(`     ${theme.dim(d.reason)}`);
        console.log();
      }
      for (const issue of r.additionalFindings) {
        const badge = theme.severityBadge(issue.severity);
        const lineInfo = issue.line ? theme.dim(` (line ${issue.line})`) : '';
        console.log(`  ${badge} ${chalk.white.bold(issue.title)}${lineInfo} (additional)`);
        console.log(`     ${theme.dim(issue.description)}`);
        console.log();
      }
    }
  }

  printFinalReport(report: FinalReport): void {
    console.log(theme.sectionHeader('\n◆ Final report'));
    console.log(theme.gray('─'.repeat(54)));
    console.log(theme.dim(report.summary));
    console.log();

    if (report.interactionHighlights.length > 0) {
      console.log(chalk.bold.white('Interaction highlights'));
      for (const h of report.interactionHighlights) {
        const tag = h.kind === 'agreement' ? theme.done('[agree]') : theme.medium('[tension]');
        console.log(`  ${tag} ${theme.dim(h.personas)} — ${h.summary}`);
      }
      console.log();
    }

    for (const issue of report.rankedIssues) {
      const badge = theme.severityBadge(issue.severity);
      const rank = chalk.bold.white(`#${issue.rank}`);
      const source = theme.dim(`[${issue.source}]`);
      const lineInfo = issue.line ? theme.dim(` line ${issue.line}`) : '';
      console.log(`  ${rank} ${badge} ${chalk.white.bold(issue.title)} ${source}${lineInfo}`);
      console.log(`     ${theme.dim(issue.description)}`);
      console.log();
    }
  }
}
