import type {
  AnnualValue,
  FundamentalsSnapshot,
  PriceBar,
  SectorReference,
} from "../indicators/types.js";
import type { AnalysisInputs, DataSource } from "./source.js";

const BASE = "https://financialmodelingprep.com/api/v3";
const HISTORY_DAYS = 540;

// Sector → SPDR sector ETF used as proxy for sector P/E. Same mapping as yahoo.ts.
const SECTOR_TO_ETF: Record<string, string> = {
  Technology: "XLK",
  "Financial Services": "XLF",
  Financials: "XLF",
  "Consumer Cyclical": "XLY",
  "Consumer Defensive": "XLP",
  Healthcare: "XLV",
  "Health Care": "XLV",
  "Communication Services": "XLC",
  Industrials: "XLI",
  Energy: "XLE",
  Utilities: "XLU",
  "Basic Materials": "XLB",
  Materials: "XLB",
  "Real Estate": "XLRE",
};

const sectorPECache = new Map<string, { value: number | null; ts: number }>();
const SECTOR_PE_TTL_MS = 6 * 60 * 60 * 1000;

interface FmpQuote {
  symbol?: string;
  price?: number;
  marketCap?: number;
}

interface FmpProfile {
  sector?: string;
  currency?: string;
}

interface FmpRatiosTTM {
  peRatioTTM?: number;
  pegRatioTTM?: number;
  returnOnEquityTTM?: number;
  debtEquityRatioTTM?: number;
  priceEarningsToGrowthRatioTTM?: number;
}

interface FmpKeyMetricsTTM {
  enterpriseValueOverEBITDATTM?: number;
  ebitdaTTM?: number;
  netDebtToEBITDATTM?: number;
}

interface FmpIncome {
  date?: string;
  operatingIncome?: number;
  incomeBeforeTax?: number;
  incomeTaxExpense?: number;
  eps?: number;
  epsdiluted?: number;
}

interface FmpBalance {
  date?: string;
  totalDebt?: number;
  cashAndCashEquivalents?: number;
  shortTermInvestments?: number;
  totalStockholdersEquity?: number;
}

interface FmpCashFlow {
  date?: string;
  freeCashFlow?: number;
  operatingCashFlow?: number;
  capitalExpenditure?: number;
}

interface FmpAnalystEstimate {
  date?: string;
  estimatedEpsAvg?: number;
}

interface FmpHistoricalResponse {
  historical?: Array<{
    date?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  }>;
}

export class FmpDataSource implements DataSource {
  constructor(private apiKey: string) {}

  async getHistoricalClose(
    ticker: string,
    isoDate: string,
  ): Promise<number | null> {
    const symbol = ticker.trim().toUpperCase();
    const target = new Date(isoDate);
    if (Number.isNaN(target.getTime())) return null;

    const from = new Date(target);
    from.setDate(from.getDate() - 1);
    const to = new Date(target);
    to.setDate(to.getDate() + 7);

    const url = `${BASE}/historical-price-full/${symbol}?from=${iso(from)}&to=${iso(to)}&apikey=${this.apiKey}`;
    const data = (await fetchJson(url)) as FmpHistoricalResponse | null;
    const bars = data?.historical ?? [];
    // FMP returns newest first. Pick first trading day on/after target.
    const wanted = target.getTime();
    let best: { ts: number; close: number } | null = null;
    for (const b of bars) {
      if (b.close == null || b.date == null) continue;
      const ts = new Date(b.date).getTime();
      if (ts < wanted) continue;
      if (best === null || ts < best.ts) best = { ts, close: b.close };
    }
    return best?.close ?? null;
  }

  async getAnalysisInputs(ticker: string): Promise<AnalysisInputs> {
    const symbol = ticker.trim().toUpperCase();
    const k = this.apiKey;

    const [
      quoteList,
      profileList,
      ratios,
      keyMetrics,
      income,
      balance,
      cashFlow,
      estimates,
      bars,
    ] = await Promise.all([
      fetchJson(`${BASE}/quote/${symbol}?apikey=${k}`) as Promise<
        FmpQuote[] | null
      >,
      fetchJson(`${BASE}/profile/${symbol}?apikey=${k}`) as Promise<
        FmpProfile[] | null
      >,
      fetchJson(`${BASE}/ratios-ttm/${symbol}?apikey=${k}`) as Promise<
        FmpRatiosTTM[] | null
      >,
      fetchJson(`${BASE}/key-metrics-ttm/${symbol}?apikey=${k}`) as Promise<
        FmpKeyMetricsTTM[] | null
      >,
      fetchJson(
        `${BASE}/income-statement/${symbol}?period=annual&limit=5&apikey=${k}`,
      ) as Promise<FmpIncome[] | null>,
      fetchJson(
        `${BASE}/balance-sheet-statement/${symbol}?period=annual&limit=5&apikey=${k}`,
      ) as Promise<FmpBalance[] | null>,
      fetchJson(
        `${BASE}/cash-flow-statement/${symbol}?period=annual&limit=5&apikey=${k}`,
      ) as Promise<FmpCashFlow[] | null>,
      fetchJson(
        `${BASE}/analyst-estimates/${symbol}?apikey=${k}`,
      ) as Promise<FmpAnalystEstimate[] | null>,
      fetchHistorical(symbol, k),
    ]);

    const quote = quoteList?.[0];
    const profile = profileList?.[0];
    const ratio = ratios?.[0];
    const km = keyMetrics?.[0];
    const lastIncome = income?.[0]; // FMP returns newest first
    const lastBalance = balance?.[0];

    const sectorName = profile?.sector ?? null;
    const sectorPE = sectorName ? await getSectorPE(sectorName, k) : null;

    const expectedEpsGrowth1y = computeForwardGrowth1y(estimates, income);
    const forwardPE = computeForwardPE(quote?.price, estimates);

    const fundamentals: FundamentalsSnapshot = {
      trailingPE: pickNumber(ratio?.peRatioTTM),
      forwardPE,
      pegRatio: pickNumber(ratio?.pegRatioTTM ?? ratio?.priceEarningsToGrowthRatioTTM),
      returnOnEquity: pickNumber(ratio?.returnOnEquityTTM),
      debtToEquity: pickNumber(ratio?.debtEquityRatioTTM),
      enterpriseToEbitda: pickNumber(km?.enterpriseValueOverEBITDATTM),
      ebitda: pickNumber(km?.ebitdaTTM),
      totalDebt: pickNumber(lastBalance?.totalDebt),
      totalCash: computeTotalCash(lastBalance),
      operatingIncome: pickNumber(lastIncome?.operatingIncome),
      pretaxIncome: pickNumber(lastIncome?.incomeBeforeTax),
      taxProvision: pickNumber(lastIncome?.incomeTaxExpense),
      investedCapital: computeInvestedCapital(lastBalance),
      freeCashFlowAnnual: extractAnnualFcf(cashFlow ?? []),
      expectedEpsGrowth1y,
      epsAnnual: extractAnnualEps(income ?? []),
      sector: sectorName,
    };

    const sector: SectorReference = { sectorPE };

    return {
      ticker: symbol,
      currency: profile?.currency ?? null,
      currentPrice: pickNumber(quote?.price),
      marketCap: pickNumber(quote?.marketCap),
      fundamentals,
      sector,
      bars,
      asOf: new Date().toISOString(),
    };
  }
}

async function getSectorPE(
  sectorName: string,
  apiKey: string,
): Promise<number | null> {
  const etf = SECTOR_TO_ETF[sectorName];
  if (!etf) return null;

  const cached = sectorPECache.get(etf);
  const now = Date.now();
  if (cached && now - cached.ts < SECTOR_PE_TTL_MS) return cached.value;

  const ratios = (await fetchJson(
    `${BASE}/ratios-ttm/${etf}?apikey=${apiKey}`,
  )) as FmpRatiosTTM[] | null;
  const value = pickNumber(ratios?.[0]?.peRatioTTM);
  sectorPECache.set(etf, { value, ts: now });
  return value;
}

async function fetchHistorical(
  symbol: string,
  apiKey: string,
): Promise<PriceBar[]> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - HISTORY_DAYS);
  const url = `${BASE}/historical-price-full/${symbol}?from=${iso(from)}&to=${iso(to)}&apikey=${apiKey}`;

  const data = (await fetchJson(url)) as FmpHistoricalResponse | null;
  const rows = data?.historical ?? [];
  const bars: PriceBar[] = [];
  for (const r of rows) {
    if (
      r.date == null ||
      r.open == null ||
      r.high == null ||
      r.low == null ||
      r.close == null ||
      r.volume == null
    ) {
      continue;
    }
    bars.push({
      date: new Date(r.date).toISOString(),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    });
  }
  // FMP returns newest first; indicators expect oldest first.
  bars.reverse();
  return bars;
}

function computeTotalCash(b: FmpBalance | undefined): number | null {
  if (!b) return null;
  const cash = pickNumber(b.cashAndCashEquivalents) ?? 0;
  const sti = pickNumber(b.shortTermInvestments) ?? 0;
  if (cash === 0 && sti === 0) return null;
  return cash + sti;
}

function computeInvestedCapital(b: FmpBalance | undefined): number | null {
  if (!b) return null;
  const debt = pickNumber(b.totalDebt);
  const equity = pickNumber(b.totalStockholdersEquity);
  if (debt === null || equity === null) return null;
  return debt + equity;
}

function extractAnnualFcf(rows: FmpCashFlow[]): AnnualValue[] {
  const out: AnnualValue[] = [];
  for (const row of rows) {
    let value = pickNumber(row.freeCashFlow);
    if (value === null) {
      const op = pickNumber(row.operatingCashFlow);
      const capex = pickNumber(row.capitalExpenditure);
      if (op !== null && capex !== null) value = op + capex;
    }
    if (value === null) continue;
    const year = yearOf(row.date);
    if (year === null) continue;
    out.push({ year, value });
  }
  out.sort((a, b) => b.year - a.year);
  return out;
}

function extractAnnualEps(rows: FmpIncome[]): AnnualValue[] {
  const out: AnnualValue[] = [];
  for (const row of rows) {
    const value = pickNumber(row.epsdiluted) ?? pickNumber(row.eps);
    if (value === null) continue;
    const year = yearOf(row.date);
    if (year === null) continue;
    out.push({ year, value });
  }
  out.sort((a, b) => b.year - a.year);
  return out;
}

/**
 * FMP analyst-estimates returns yearly estimates including future fiscal years.
 * Use next-year estimated EPS vs the most recent realized EPS to derive the
 * 1-year forward growth. Returns a decimal (0.15 = 15%).
 */
function computeForwardGrowth1y(
  estimates: FmpAnalystEstimate[] | null,
  income: FmpIncome[] | null,
): number | null {
  if (!estimates || estimates.length === 0) return null;
  const lastIncome = income?.[0];
  const currentEps =
    pickNumber(lastIncome?.epsdiluted) ?? pickNumber(lastIncome?.eps);
  if (currentEps === null || currentEps <= 0) return null;

  const lastFiscalYear = yearOf(lastIncome?.date);
  if (lastFiscalYear === null) return null;

  // Find the estimate for the next fiscal year.
  let nextEps: number | null = null;
  for (const est of estimates) {
    const year = yearOf(est.date);
    if (year === null) continue;
    if (year === lastFiscalYear + 1) {
      nextEps = pickNumber(est.estimatedEpsAvg);
      break;
    }
  }
  if (nextEps === null || nextEps <= 0) return null;
  return nextEps / currentEps - 1;
}

/**
 * Forward P/E from current price and next-year estimated EPS. Null when either
 * is missing or non-positive.
 */
function computeForwardPE(
  price: number | undefined,
  estimates: FmpAnalystEstimate[] | null,
): number | null {
  const p = pickNumber(price);
  if (p === null || p <= 0) return null;
  if (!estimates || estimates.length === 0) return null;
  // FMP returns estimates oldest-first or newest-first depending on endpoint;
  // pick the soonest future year by date.
  const today = Date.now();
  let soonest: { ts: number; eps: number } | null = null;
  for (const est of estimates) {
    if (est.date == null) continue;
    const ts = new Date(est.date).getTime();
    if (ts < today) continue;
    const eps = pickNumber(est.estimatedEpsAvg);
    if (eps === null || eps <= 0) continue;
    if (soonest === null || ts < soonest.ts) soonest = { ts, eps };
  }
  if (soonest === null) return null;
  return p / soonest.eps;
}

function yearOf(d: string | undefined): number | null {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pickNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FMP ${res.status} ${res.statusText} for ${redactKey(url)}`);
  }
  return res.json();
}

function redactKey(url: string): string {
  return url.replace(/apikey=[^&]+/, "apikey=***");
}
