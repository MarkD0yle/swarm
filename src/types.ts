export type IssueSeverity = 'high' | 'medium' | 'low';

export interface Issue {
  severity: IssueSeverity;
  title: string;
  description: string;
  line?: number;
}

export interface AgentResult {
  agentName: string;
  issues: Issue[];
  error?: string;
}

export type AgentStatus = 'waiting' | 'analyzing' | 'done' | 'error';

export interface AgentState {
  name: string;
  status: AgentStatus;
  issueCount?: number;
  error?: string;
}

export interface SwarmOptions {
  apiKey: string;
  model?: string;
  verbose?: boolean;
}

export interface ReviewResult {
  file: string;
  agentResults: AgentResult[];
  synthesis: SynthesisResult;
}

export interface SynthesisResult {
  summary: string;
  rankedIssues: RankedIssue[];
}

export interface RankedIssue {
  rank: number;
  severity: IssueSeverity;
  title: string;
  description: string;
  source: string;
  line?: number;
}
