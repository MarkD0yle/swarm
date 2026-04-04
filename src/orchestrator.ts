import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { SwarmOptions, ReviewResult, AgentState } from './types';
import { AccessibilityAgent } from './agents/accessibility';
import { UXAgent } from './agents/ux';
import { ComponentAgent } from './agents/component';
import { StylingAgent } from './agents/styling';
import { SynthesizerAgent } from './agents/synthesizer';
import { Renderer } from './tui/renderer';

export class Orchestrator {
  private client: OpenAI;
  private model: string;

  constructor(options: SwarmOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? 'gpt-4o';
  }

  async review(filePath: string): Promise<ReviewResult> {
    const resolvedPath = path.resolve(filePath);
    const fileName = path.basename(resolvedPath);

    // Read the file
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }
    const fileContent = fs.readFileSync(resolvedPath, 'utf-8');

    // Set up agents
    const accessibilityAgent = new AccessibilityAgent(this.client, this.model);
    const uxAgent = new UXAgent(this.client, this.model);
    const componentAgent = new ComponentAgent(this.client, this.model);
    const stylingAgent = new StylingAgent(this.client, this.model);
    const synthesizerAgent = new SynthesizerAgent(this.client, this.model);

    // Set up TUI
    const renderer = new Renderer(fileName);
    const agentStates: AgentState[] = [
      { name: 'Accessibility', status: 'waiting' },
      { name: 'UX', status: 'waiting' },
      { name: 'Component', status: 'waiting' },
      { name: 'Styling', status: 'waiting' },
    ];
    renderer.setAgents(agentStates);
    renderer.start();

    // Run all 4 specialist agents in parallel
    const agentTasks = [
      { agent: accessibilityAgent, name: 'Accessibility' },
      { agent: uxAgent, name: 'UX' },
      { agent: componentAgent, name: 'Component' },
      { agent: stylingAgent, name: 'Styling' },
    ];

    // Mark all as analyzing at start
    for (const { name } of agentTasks) {
      renderer.updateAgent(name, { status: 'analyzing' });
    }

    const agentResults = await Promise.all(
      agentTasks.map(async ({ agent, name }) => {
        const result = await agent.analyze(fileContent, resolvedPath);
        if (result.error) {
          renderer.updateAgent(name, { status: 'error', error: result.error });
        } else {
          renderer.updateAgent(name, { status: 'done', issueCount: result.issues.length });
        }
        return result;
      })
    );

    // Stop the spinner panel
    renderer.stop();

    // Print per-agent findings
    renderer.printFindings(agentResults);

    // Run synthesizer
    process.stdout.write('\n');

    const synthesis = await synthesizerAgent.synthesize(agentResults, resolvedPath);

    // Print synthesis
    renderer.printSynthesis(synthesis);

    return {
      file: resolvedPath,
      agentResults,
      synthesis,
    };
  }
}
