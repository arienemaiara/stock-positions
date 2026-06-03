/** Verbal label for a sub-score in [-1, +1]. */
export function readingLabel(subScore: number): string {
  if (subScore >= 0.75) return "Strongly bullish";
  if (subScore >= 0.25) return "Bullish";
  if (subScore > -0.25) return "Neutral";
  if (subScore > -0.75) return "Bearish";
  return "Strongly bearish";
}

export function readingTone(
  subScore: number,
): "good" | "bad" | "neutral" {
  if (subScore >= 0.25) return "good";
  if (subScore <= -0.25) return "bad";
  return "neutral";
}

/**
 * Format a fraction (-1..+1) as a percentage with sign, e.g. 0.15 → "+15.0%".
 * The scoring engine produces fractions; users read percentages.
 */
export function formatScorePct(fraction: number): string {
  const pct = fraction * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}
