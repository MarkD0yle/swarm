import { Orchestrator } from './orchestrator';
import { SwarmOptions, ReviewResult } from './types';

export class Swarm {
  private orchestrator: Orchestrator;

  constructor(options: SwarmOptions) {
    this.orchestrator = new Orchestrator(options);
  }

  async review(filePath: string): Promise<ReviewResult> {
    return this.orchestrator.review(filePath);
  }
}

// Re-export all types for consumers
export type {
  SwarmOptions,
  ReviewResult,
  AgentResult,
  SynthesisResult,
  RankedIssue,
  Issue,
  IssueSeverity,
  AgentState,
  AgentStatus,
} from './types';
