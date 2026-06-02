import type { FundamentalsSnapshot, SectorReference } from "./types.js";

/**
 * trailing P/E / sector reference P/E.
 * Null if either is missing or non-positive. Negative or zero P/E is
 * uninterpretable for this ratio (loss-making firm or bad input).
 */
export function peToSectorRatio(
  fund: FundamentalsSnapshot,
  sector: SectorReference,
): number | null {
  const pe = fund.trailingPE;
  const sectorPE = sector.sectorPE;
  if (pe === null || sectorPE === null) return null;
  if (pe <= 0 || sectorPE <= 0) return null;
  return pe / sectorPE;
}

/**
 * PEG ratio passthrough with a guard. Yahoo will return negative PEG when
 * either P/E or growth is negative; the resulting number is meaningless, so
 * we drop it and let the engine flag the indicator as unavailable.
 */
export function pegRatio(fund: FundamentalsSnapshot): number | null {
  const peg = fund.pegRatio;
  if (peg === null) return null;
  if (peg <= 0) return null;
  return peg;
}

export function roe(fund: FundamentalsSnapshot): number | null {
  return fund.returnOnEquity;
}

/**
 * Debt / equity passthrough. Data adapter is responsible for normalizing to a
 * decimal (1.5 means 150%). Yahoo's `debtToEquity` is a percentage (150) and
 * must be divided by 100 in the adapter.
 */
export function debtToEquity(fund: FundamentalsSnapshot): number | null {
  return fund.debtToEquity;
}

/**
 * Year-over-year free cash flow growth. Uses the two most recent annual values
 * (snapshot is newest-first). Returns (newest - prior) / |prior|.
 *
 * Null when fewer than two years of data, or when prior FCF is zero. Sign
 * flips (e.g. -100M → +50M) still compute, but the magnitude is distorted by
 * the abs() in the denominator — accept the noise rather than special-case it.
 */
export function fcfGrowthYoY(fund: FundamentalsSnapshot): number | null {
  const fcf = fund.freeCashFlowAnnual;
  if (fcf.length < 2) return null;
  const newest = fcf[0]!.value;
  const prior = fcf[1]!.value;
  if (prior === 0) return null;
  return (newest - prior) / Math.abs(prior);
}
