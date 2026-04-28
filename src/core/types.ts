export type ProviderId = "anthropic" | "openai" | "gemini";

export type ModeName = "reading" | "interrogation" | "critic";

export interface ProviderModel {
  provider: ProviderId;
  model: string;
}

export interface DocStatsSnapshot {
  words: number;
  sentences: number;
  paragraphs: number;
  characters: number;
  avgSentenceWords: number;
  longestSentenceWords: number;
  fleschKincaidGrade: number;
  passiveRatio: number;
}

export interface ReadingOutput {
  voiceTrend: string;
  rhythm: string;
  paragraphPurpose: string;
  transitionStrength: string;
  notes: string[];
}

export interface InterrogationOutput {
  questions: { kind: "intent" | "craft" | "reader"; text: string }[];
}

export interface CriticIssue {
  severity: "structural" | "clarity" | "rhythm" | "nit";
  span: { start: number; end: number };
  label: string;
  suggestion?: string;
}

export interface CriticOutput {
  issues: CriticIssue[];
}

export type ModeOutput =
  | { mode: "reading"; result: ReadingOutput }
  | { mode: "interrogation"; result: InterrogationOutput }
  | { mode: "critic"; result: CriticOutput };

export interface TokenUsage {
  input: number;
  output: number;
}
