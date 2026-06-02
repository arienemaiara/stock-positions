export type Verdict = "buy" | "hold" | "sell";

export interface Band {
  upTo: number | null;
  score: number;
}

export interface IndicatorConfig {
  weight: number;
  metric: string;
  bands: Band[];
}

export interface ScoringConfig {
  thresholds: { buy: number; sell: number };
  indicators: Record<string, IndicatorConfig>;
}

export interface BreakdownEntry {
  id: string;
  metric: string;
  value: number | null;
  subScore: number;
  rawWeight: number;
  weight: number;
  contribution: number;
  available: boolean;
}

export interface AnalysisResult {
  verdict: Verdict;
  score: number;
  breakdown: BreakdownEntry[];
  flags: string[];
}
