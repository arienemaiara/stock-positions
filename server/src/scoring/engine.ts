import type {
  AnalysisResult,
  Band,
  BreakdownEntry,
  ScoringConfig,
  Verdict,
} from "./types.js";

type MetricLookup = Record<string, number | null | undefined>;

/**
 * Run the scoring engine.
 *
 * Algorithm:
 *  1. For each indicator declared in config, look up its `metric` value in
 *     `metrics`. Null / undefined / NaN means unavailable.
 *  2. For available indicators, walk `bands` in order and pick the first one
 *     whose `upTo` is null (catch-all) or `>= value`.
 *  3. Renormalize: scale the effective weight of each available indicator by
 *     1 / (sum of raw weights of available indicators). Unavailable indicators
 *     contribute 0 and are listed in `flags`.
 *  4. score = Σ subScore * weight (effective).
 *  5. Bucket via thresholds. score >= buy → "buy", <= sell → "sell", else "hold".
 *
 * Hard requirements (from the brief):
 *  - Missing data is explicit: subScore 0 AND a flag. Never silently treated as 0.
 *  - The breakdown returns raw value, sub-score, both raw and effective weight,
 *    and contribution, so the UI can render *why*.
 */
export function analyze(
  metrics: MetricLookup,
  config: ScoringConfig,
): AnalysisResult {
  const flags: string[] = [];
  const partial: PartialEntry[] = [];

  for (const [id, ind] of Object.entries(config.indicators)) {
    const raw = metrics[ind.metric];
    const value = isNumeric(raw) ? raw : null;

    if (value === null) {
      flags.push(`${id} unavailable (${ind.metric})`);
      partial.push({
        id,
        metric: ind.metric,
        value: null,
        subScore: 0,
        rawWeight: ind.weight,
        available: false,
      });
      continue;
    }

    const band = pickBand(ind.bands, value);
    if (band === null) {
      // Config malformed: no catch-all band. Treat as unavailable + flag.
      flags.push(`${id} no matching band (config error)`);
      partial.push({
        id,
        metric: ind.metric,
        value,
        subScore: 0,
        rawWeight: ind.weight,
        available: false,
      });
      continue;
    }

    partial.push({
      id,
      metric: ind.metric,
      value,
      subScore: band.score,
      rawWeight: ind.weight,
      available: true,
    });
  }

  const availableWeight = partial
    .filter((p) => p.available)
    .reduce((sum, p) => sum + p.rawWeight, 0);

  const breakdown: BreakdownEntry[] = partial.map((p) => {
    const effectiveWeight =
      p.available && availableWeight > 0 ? p.rawWeight / availableWeight : 0;
    const contribution = p.subScore * effectiveWeight;
    return {
      id: p.id,
      metric: p.metric,
      value: p.value,
      subScore: p.subScore,
      rawWeight: p.rawWeight,
      weight: effectiveWeight,
      contribution,
      available: p.available,
    };
  });

  const score = breakdown.reduce((sum, b) => sum + b.contribution, 0);
  const verdict = bucket(score, config.thresholds);

  return { verdict, score, breakdown, flags };
}

interface PartialEntry {
  id: string;
  metric: string;
  value: number | null;
  subScore: number;
  rawWeight: number;
  available: boolean;
}

function pickBand(bands: Band[], value: number): Band | null {
  for (const band of bands) {
    if (band.upTo === null || value <= band.upTo) return band;
  }
  return null;
}

function bucket(
  score: number,
  thresholds: { buy: number; sell: number },
): Verdict {
  if (score >= thresholds.buy) return "buy";
  if (score <= thresholds.sell) return "sell";
  return "hold";
}

function isNumeric(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
