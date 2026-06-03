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

/** Forward P/E. Null on missing or non-positive (negative forward EPS). */
export function forwardPE(fund: FundamentalsSnapshot): number | null {
  const v = fund.forwardPE;
  if (v === null || v <= 0) return null;
  return v;
}

/** EV / EBITDA passthrough. Null on missing or non-positive. */
export function evToEbitda(fund: FundamentalsSnapshot): number | null {
  const v = fund.enterpriseToEbitda;
  if (v === null || v <= 0) return null;
  return v;
}

/**
 * (Total debt − total cash) / EBITDA. Lower is better; negative means net cash.
 * Null when EBITDA is missing or non-positive (ratio meaningless).
 */
export function netDebtToEbitda(fund: FundamentalsSnapshot): number | null {
  const debt = fund.totalDebt;
  const cash = fund.totalCash;
  const ebitda = fund.ebitda;
  if (debt === null || cash === null || ebitda === null) return null;
  if (ebitda <= 0) return null;
  return (debt - cash) / ebitda;
}

/**
 * Return on Invested Capital.
 * ROIC = operatingIncome × (1 − effectiveTaxRate) / investedCapital
 * effectiveTaxRate = taxProvision / pretaxIncome, falling back to 21% if either
 * is unusable (negative pretax income, zero, etc).
 *
 * Null when operatingIncome or investedCapital is missing or invested capital
 * is non-positive.
 */
export function roic(fund: FundamentalsSnapshot): number | null {
  const ebit = fund.operatingIncome;
  const ic = fund.investedCapital;
  if (ebit === null || ic === null || ic <= 0) return null;

  const tax =
    fund.pretaxIncome !== null &&
    fund.taxProvision !== null &&
    fund.pretaxIncome > 0
      ? Math.max(0, Math.min(0.5, fund.taxProvision / fund.pretaxIncome))
      : 0.21;

  return (ebit * (1 - tax)) / ic;
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
 * Gap between next-year consensus EPS growth and the company's realized 3-year
 * EPS CAGR, in percentage points. Positive = market pricing in growth above
 * what the company has delivered (optimistic). Negative = market discounting a
 * company that has been growing (pessimistic).
 *
 * Returns null when forward growth is missing, fewer than 4 annual EPS points
 * exist, or either endpoint EPS is non-positive (CAGR is undefined for sign
 * flips and meaningless for zero/loss bases).
 */
export function impliedGrowthGapPp(
  fund: FundamentalsSnapshot,
): number | null {
  const expected = fund.expectedEpsGrowth1y;
  if (expected == null) return null;

  const eps = fund.epsAnnual;
  if (!eps || eps.length < 4) return null;
  const newest = eps[0]!.value;
  const oldest = eps[3]!.value;
  if (newest <= 0 || oldest <= 0) return null;

  const realizedCagr = Math.pow(newest / oldest, 1 / 3) - 1;
  return (expected - realizedCagr) * 100;
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
