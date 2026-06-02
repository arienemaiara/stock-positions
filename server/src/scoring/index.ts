import config from "./config.json" with { type: "json" };
import { analyze as analyzeWith } from "./engine.js";
import type { ScoringConfig, AnalysisResult } from "./types.js";

const defaultConfig = config as unknown as ScoringConfig;

export function analyze(
  metrics: Record<string, number | null | undefined>,
): AnalysisResult {
  return analyzeWith(metrics, defaultConfig);
}

export { analyzeWith };
export { defaultConfig };
export type { AnalysisResult, ScoringConfig } from "./types.js";
