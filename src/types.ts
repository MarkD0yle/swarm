/** What Round 1 sends to the model: component source or a UI screenshot. */
export type ReviewContent =
  | { kind: 'code'; text: string }
  | { kind: 'image'; mimeType: string; base64: string };

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

/** Round 2: one persona reacting to peers' Round 1 digests */
export interface Round2Agreement {
  withPersonaId: string;
  aboutTitle: string;
  comment: string;
}

export interface Round2Disagreement {
  withPersonaId: string;
  aboutTitle: string;
  reason: string;
}

export interface Round2Result {
  personaId: string;
  agreements: Round2Agreement[];
  disagreements: Round2Disagreement[];
  additionalFindings: Issue[];
  voiceNote?: string;
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
  /** 'openai' or 'anthropic'. Auto-detected from key prefix if omitted (sk-ant- → anthropic). */
  provider?: 'openai' | 'anthropic';
  /** Model override. Defaults to gpt-4o (OpenAI) or claude-sonnet-4-6 (Anthropic). */
  model?: string;
  verbose?: boolean;
}

/** Ranked issue in final report; source may list multiple persona IDs */
export interface RankedIssue {
  rank: number;
  severity: IssueSeverity;
  title: string;
  description: string;
  /** e.g. "SS-002" or "SS-002, SS-006" */
  source: string;
  line?: number;
}

export interface InteractionHighlight {
  kind: 'agreement' | 'disagreement';
  personas: string;
  summary: string;
}

/** Round 3 consolidated output */
export interface FinalReport {
  summary: string;
  rankedIssues: RankedIssue[];
  interactionHighlights: InteractionHighlight[];
}

export interface ReviewResult {
  file: string;
  round1: AgentResult[];
  round2: Round2Result[];
  finalReport: FinalReport;
}

/** @deprecated Use FinalReport — kept for any external imports */
export type SynthesisResult = FinalReport;
