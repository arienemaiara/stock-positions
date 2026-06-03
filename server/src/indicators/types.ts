// Provider-agnostic input shapes. The DataSource layer (yahoo.ts and any
// successor) converts external responses into these. Indicator functions only
// touch these shapes, so they stay testable with hand-written fixtures.

export interface FundamentalsSnapshot {
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
  enterpriseToEbitda: number | null;
  ebitda: number | null;
  totalDebt: number | null;
  totalCash: number | null;
  operatingIncome: number | null;
  pretaxIncome: number | null;
  taxProvision: number | null;
  investedCapital: number | null;
  freeCashFlowAnnual: AnnualValue[];
  // Analyst consensus EPS growth for next fiscal year, as a decimal (0.15 = 15%).
  // From Yahoo earningsTrend, period "+1y".
  expectedEpsGrowth1y: number | null;
  // Diluted EPS history, newest first. Used to compute realized CAGR.
  epsAnnual: AnnualValue[];
  sector: string | null;
}

export interface AnnualValue {
  year: number;
  value: number;
}

// Sector reference data. Currently a single sector-ETF trailing P/E used as a
// proxy for sector-median P/E.
export interface SectorReference {
  sectorPE: number | null;
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Indicator outputs are keyed by the `metric` names declared in config.json.
// Null = unavailable (the engine flags and renormalizes; never treats as 0).
export interface Metrics {
  peToSectorRatio: number | null;
  pegRatio: number | null;
  forwardPE: number | null;
  evToEbitda: number | null;
  roe: number | null;
  roic: number | null;
  debtToEquity: number | null;
  netDebtToEbitda: number | null;
  fcfGrowthYoY: number | null;
  impliedGrowthGapPp: number | null;
  rsi14: number | null;
  macdHistPctOfPrice: number | null;
  priceVsSma200Pct: number | null;
  priceVsSma90Pct: number | null;
  signedVolumeRatio: number | null;
}
