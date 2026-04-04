import chalk, { type ChalkInstance } from 'chalk';
import { AgentState, AgentResult, SynthesisResult } from '../types';
import { theme } from './theme';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const BOX_WIDTH = 56;

export class Renderer {
  private spinnerFrame = 0;
  private spinnerInterval: NodeJS.Timeout | null = null;
  private agentStates: AgentState[] = [];
  private panelLineCount = 0;
  private fileName = '';
  private rendered = false;

  constructor(fileName: string) {
    this.fileName = fileName;
  }

  setAgents(agents: AgentState[]): void {
    this.agentStates = agents;
  }

  start(): void {
    // Hide cursor
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
    // Move cursor up to overwrite the panel
    process.stdout.write(`\x1B[${this.panelLineCount}A`);
    this.renderPanel();
  }

  private renderPanel(): void {
    const lines: string[] = [];

    const title = ` Swarm — ${this.fileName} `;
    const innerWidth = BOX_WIDTH - 2; // subtract 2 for border chars

    // Top border
    const titleLine = this.buildTitleLine(title, innerWidth);
    lines.push(theme.boxBorder(titleLine));

    // Agent rows
    for (const agent of this.agentStates) {
      lines.push(this.renderAgentRow(agent, innerWidth));
    }

    // Bottom border
    lines.push(theme.boxBorder('└' + '─'.repeat(innerWidth) + '┘'));

    const output = lines.join('\n') + '\n';
    process.stdout.write(output);
    this.panelLineCount = lines.length + 1; // +1 for the trailing newline
    this.rendered = true;
  }

  private buildTitleLine(title: string, innerWidth: number): string {
    // ┌─ Swarm — dashboard.tsx ──────────────────────────┐
    const stripped = title;
    const dashesAfter = innerWidth - 2 - stripped.length; // 2 for "─ " prefix
    const rightDashes = Math.max(0, dashesAfter);
    return '┌─' + stripped + '─'.repeat(rightDashes) + '┐';
  }

  private renderAgentRow(agent: AgentState, innerWidth: number): string {
    const icon = this.getIcon(agent.status);
    const agentLabel = this.getAgentLabel(agent);
    const statusText = this.getStatusText(agent);

    // Measure visible widths using stripped strings, pad raw strings, then apply color
    const nameWidth = 16;
    const visibleIcon = this.stripAnsi(icon);
    const visibleName = agent.name;
    const visibleStatus = this.stripAnsi(statusText);

    // Pad the plain name to nameWidth before colorizing
    const paddedVisibleName = visibleName.padEnd(nameWidth);
    // Re-apply color to the padded name
    const coloredPaddedName = agentLabel + ' '.repeat(Math.max(0, nameWidth - visibleName.length));

    // Compute visible content length: "  {icon} {paddedName} {status}"
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
    const colors: Record<string, ChalkInstance> = {
      Accessibility: theme.accessibility,
      UX: theme.ux,
      Component: theme.component,
      Styling: theme.styling,
    };
    const colorFn = colors[agent.name] || chalk.white;
    return colorFn(agent.name);
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
        return theme.done(`${count} issue${count !== 1 ? 's' : ''} found`);
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
    // Final render with all done states
    this.refresh();
    // Show cursor
    process.stdout.write('\x1B[?25h');
    process.stdout.write('\n');
  }

  printFindings(agentResults: AgentResult[]): void {
    const agentColors: Record<string, ChalkInstance> = {
      Accessibility: theme.accessibility,
      UX: theme.ux,
      Component: theme.component,
      Styling: theme.styling,
    };

    for (const result of agentResults) {
      const colorFn = agentColors[result.agentName] || chalk.white;
      const header = colorFn(`\n● ${result.agentName} Agent`);
      console.log(header);
      console.log(theme.gray('─'.repeat(50)));

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

  printSynthesis(synthesis: SynthesisResult): void {
    console.log(theme.sectionHeader('\n◆ Synthesis — Ranked Issues'));
    console.log(theme.gray('─'.repeat(50)));
    console.log(theme.dim(synthesis.summary));
    console.log();

    for (const issue of synthesis.rankedIssues) {
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
