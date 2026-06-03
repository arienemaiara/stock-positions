import type {
  AnnualValue,
  FundamentalsSnapshot,
  PriceBar,
  SectorReference,
} from "../indicators/types.js";
import type { AnalysisInputs, DataSource } from "./source.js";

const BASE = "https://finnhub.io/api/v1";
const HISTORY_DAYS = 540;

// Finnhub uses its own sector taxonomy. Map to SPDR ETF where possible.
const SECTOR_TO_ETF: Record<string, string> = {
  Technology: "XLK",
  "Information Technology": "XLK",
  Financial: "XLF",
  Financials: "XLF",
  "Financial Services": "XLF",
  "Consumer Cyclical": "XLY",
  "Consumer Discretionary": "XLY",
  "Consumer Defensive": "XLP",
  "Consumer Staples": "XLP",
  Healthcare: "XLV",
  "Health Care": "XLV",
  "Communication Services": "XLC",
  "Communications": "XLC",
  Industrials: "XLI",
  Energy: "XLE",
  Utilities: "XLU",
  "Basic Materials": "XLB",
  Materials: "XLB",
  "Real Estate": "XLRE",
};

const sectorPECache = new Map<string, { value: number | null; ts: number }>();
const SECTOR_PE_TTL_MS = 6 * 60 * 60 * 1000;

interface FinnhubQuote {
  c?: number; // current price
  pc?: number; // prev close
}

interface FinnhubProfile {
  finnhubIndustry?: string;
  currency?: string;
  marketCapitalization?: number; // in millions
}

interface FinnhubMetricResponse {
  metric?: {
    peTTM?: number;
    pegRatio?: number;
    pegAnnual?: number;
    pegTTM?: number;
    roeTTM?: number;
    roeRfy?: number;
    "totalDebt/totalEquityAnnual"?: number;
    "totalDebt/totalEquityQuarterly"?: number;
    enterpriseValueOverEBITDAAnnual?: number;
    netDebtToTotalEquityAnnual?: number;
    ebitdPerShareTTM?: number;
    epsBasicExclExtraItemsAnnual?: number;
    epsAnnual?: number;
    epsBasicExclExtraItemsTTM?: number;
  };
  // Per-year history for some metrics.
  series?: {
    annual?: {
      eps?: Array<{ period: string; v: number }>;
      freeCashFlowPerShare?: Array<{ period: string; v: number }>;
      ebitda?: Array<{ period: string; v: number }>;
      netDebtToTotalEquity?: Array<{ period: string; v: number }>;
    };
  };
}

interface FinnhubReportedResponse {
  data?: Array<{
    year?: number;
    quarter?: number;
    form?: string;
    report?: {
      ic?: ReportedConcept[]; // income statement concepts
      bs?: ReportedConcept[]; // balance sheet concepts
      cf?: ReportedConcept[]; // cash flow concepts
    };
  }>;
}

interface ReportedConcept {
  concept?: string;
  label?: string;
  unit?: string;
  value?: number;
}

interface FinnhubCandleResponse {
  s?: string; // "ok" or "no_data"
  t?: number[]; // unix seconds
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
}

interface FinnhubEpsEstimate {
  period?: string;
  epsAvg?: number;
  year?: number;
}

interface FinnhubEpsEstimateResponse {
  data?: FinnhubEpsEstimate[];
}

export class FinnhubDataSource implements DataSource {
  constructor(private apiKey: string) {}

  async getHistoricalClose(
    ticker: string,
    isoDate: string,
  ): Promise<number | null> {
    const symbol = ticker.trim().toUpperCase();
    const target = new Date(isoDate);
    if (Number.isNaN(target.getTime())) return null;
    const from = Math.floor((target.getTime() - 86400000) / 1000);
    const to = Math.floor((target.getTime() + 7 * 86400000) / 1000);
    const url = `${BASE}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`;
    const data = (await fetchJson(url)) as FinnhubCandleResponse | null;
    if (!data || data.s !== "ok" || !data.t || !data.c) return null;
    const wantedSec = Math.floor(target.getTime() / 1000);
    let best: { ts: number; close: number } | null = null;
    for (let i = 0; i < data.t.length; i++) {
      const ts = data.t[i]!;
      const c = data.c[i];
      if (c == null || ts < wantedSec) continue;
      if (best === null || ts < best.ts) best = { ts, close: c };
    }
    return best?.close ?? null;
  }

  async getAnalysisInputs(ticker: string): Promise<AnalysisInputs> {
    const symbol = ticker.trim().toUpperCase();
    const k = this.apiKey;

    const [quote, profile, metric, reported, estimates, candle] =
      await Promise.all([
        fetchJson(`${BASE}/quote?symbol=${symbol}&token=${k}`) as Promise<
          FinnhubQuote | null
        >,
        fetchJson(
          `${BASE}/stock/profile2?symbol=${symbol}&token=${k}`,
        ) as Promise<FinnhubProfile | null>,
        fetchJson(
          `${BASE}/stock/metric?symbol=${symbol}&metric=all&token=${k}`,
        ) as Promise<FinnhubMetricResponse | null>,
        fetchJson(
          `${BASE}/stock/financials-reported?symbol=${symbol}&freq=annual&token=${k}`,
        ) as Promise<FinnhubReportedResponse | null>,
        fetchJson(
          `${BASE}/stock/eps-estimate?symbol=${symbol}&freq=annual&token=${k}`,
        ) as Promise<FinnhubEpsEstimateResponse | null>,
        fetchCandles(symbol, k),
      ]);

    const m = metric?.metric ?? {};
    const series = metric?.series?.annual ?? {};
    const reports = (reported?.data ?? []).filter((r) => r.form === "10-K");
    // Newest fiscal year first.
    reports.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const lastReport = reports[0];
    const lastIncome = lastReport?.report?.ic ?? [];
    const lastBalance = lastReport?.report?.bs ?? [];

    const sectorName = profile?.finnhubIndustry ?? null;
    const sectorPE = sectorName ? await getSectorPE(sectorName, k) : null;

    const operatingIncome = findConcept(lastIncome, [
      "OperatingIncomeLoss",
      "Operating income",
    ]);
    const pretaxIncome = findConcept(lastIncome, [
      "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
      "Income before tax",
    ]);
    const taxProvision = findConcept(lastIncome, [
      "IncomeTaxExpenseBenefit",
      "Income tax expense",
    ]);
    const totalDebt = sumConcepts(lastBalance, [
      "LongTermDebt",
      "LongTermDebtNoncurrent",
      "ShortTermBorrowings",
      "DebtCurrent",
    ]);
    const totalCash = sumConcepts(lastBalance, [
      "CashAndCashEquivalentsAtCarryingValue",
      "ShortTermInvestments",
      "MarketableSecuritiesCurrent",
    ]);
    const totalEquity = findConcept(lastBalance, [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ]);
    const investedCapital =
      totalDebt !== null && totalEquity !== null
        ? totalDebt + totalEquity
        : null;

    const epsAnnual = extractEpsAnnual(series.eps);
    const ebitdaSeries = extractAnnualSeries(series.ebitda);
    const fcfAnnual = extractFcfAnnual(reports);
    const ebitda = pickNumber(ebitdaSeries[0]?.value);

    const lastFiscalYear = lastReport?.year ?? epsAnnual[0]?.year ?? null;
    const expectedEpsGrowth1y = computeForwardGrowth1y(
      estimates,
      epsAnnual[0]?.value ?? null,
      lastFiscalYear,
    );
    const forwardPE = computeForwardPE(quote?.c, estimates);

    const fundamentals: FundamentalsSnapshot = {
      trailingPE: pickNumber(m.peTTM),
      forwardPE,
      pegRatio: pickNumber(m.pegRatio ?? m.pegAnnual ?? m.pegTTM),
      returnOnEquity: scalePct(m.roeTTM ?? m.roeRfy),
      debtToEquity: scalePct(
        m["totalDebt/totalEquityAnnual"] ?? m["totalDebt/totalEquityQuarterly"],
      ),
      enterpriseToEbitda: pickNumber(m.enterpriseValueOverEBITDAAnnual),
      ebitda,
      totalDebt,
      totalCash,
      operatingIncome,
      pretaxIncome,
      taxProvision,
      investedCapital,
      freeCashFlowAnnual: fcfAnnual,
      expectedEpsGrowth1y,
      epsAnnual,
      sector: sectorName,
    };

    const sector: SectorReference = { sectorPE };

    return {
      ticker: symbol,
      currency: profile?.currency ?? null,
      currentPrice: pickNumber(quote?.c),
      marketCap:
        profile?.marketCapitalization != null
          ? profile.marketCapitalization * 1_000_000
          : null,
      fundamentals,
      sector,
      bars: candle,
      asOf: new Date().toISOString(),
    };
  }
}

async function fetchCandles(symbol: string, apiKey: string): Promise<PriceBar[]> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - HISTORY_DAYS * 86400;
  const url = `${BASE}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
  const data = (await fetchJson(url)) as FinnhubCandleResponse | null;
  if (!data || data.s !== "ok") return [];
  const bars: PriceBar[] = [];
  const n = data.t?.length ?? 0;
  for (let i = 0; i < n; i++) {
    const ts = data.t![i]!;
    const o = data.o?.[i];
    const h = data.h?.[i];
    const l = data.l?.[i];
    const c = data.c?.[i];
    const v = data.v?.[i];
    if (o == null || h == null || l == null || c == null || v == null) continue;
    bars.push({
      date: new Date(ts * 1000).toISOString(),
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }
  return bars;
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
  const m = (await fetchJson(
    `${BASE}/stock/metric?symbol=${etf}&metric=all&token=${apiKey}`,
  )) as FinnhubMetricResponse | null;
  const value = pickNumber(m?.metric?.peTTM);
  sectorPECache.set(etf, { value, ts: now });
  return value;
}

function findConcept(
  concepts: ReportedConcept[],
  candidateKeys: string[],
): number | null {
  for (const key of candidateKeys) {
    for (const c of concepts) {
      if (c.concept === key || c.label === key) {
        const v = pickNumber(c.value);
        if (v !== null) return v;
      }
    }
  }
  return null;
}

function sumConcepts(
  concepts: ReportedConcept[],
  candidateKeys: string[],
): number | null {
  let total = 0;
  let found = false;
  const seen = new Set<string>();
  for (const c of concepts) {
    if (!c.concept) continue;
    if (!candidateKeys.includes(c.concept)) continue;
    if (seen.has(c.concept)) continue;
    seen.add(c.concept);
    const v = pickNumber(c.value);
    if (v === null) continue;
    total += v;
    found = true;
  }
  return found ? total : null;
}

function extractEpsAnnual(
  series: Array<{ period: string; v: number }> | undefined,
): AnnualValue[] {
  if (!series) return [];
  const out: AnnualValue[] = [];
  for (const row of series) {
    const year = yearOf(row.period);
    const v = pickNumber(row.v);
    if (year === null || v === null) continue;
    out.push({ year, value: v });
  }
  out.sort((a, b) => b.year - a.year);
  return out;
}

function extractAnnualSeries(
  series: Array<{ period: string; v: number }> | undefined,
): AnnualValue[] {
  if (!series) return [];
  const out: AnnualValue[] = [];
  for (const row of series) {
    const year = yearOf(row.period);
    const v = pickNumber(row.v);
    if (year === null || v === null) continue;
    out.push({ year, value: v });
  }
  out.sort((a, b) => b.year - a.year);
  return out;
}

function extractFcfAnnual(reports: FinnhubReportedResponse["data"]): AnnualValue[] {
  if (!reports) return [];
  const out: AnnualValue[] = [];
  for (const r of reports) {
    const year = r.year;
    if (year == null) continue;
    const cf = r.report?.cf ?? [];
    const op = findConcept(cf, [
      "NetCashProvidedByUsedInOperatingActivities",
      "Cash from operations",
    ]);
    const capex = findConcept(cf, [
      "PaymentsToAcquirePropertyPlantAndEquipment",
      "Capital expenditures",
    ]);
    if (op === null || capex === null) continue;
    // capex is reported as a positive outflow in some filings; subtract magnitude.
    out.push({ year, value: op - Math.abs(capex) });
  }
  out.sort((a, b) => b.year - a.year);
  return out;
}

function computeForwardGrowth1y(
  estimates: FinnhubEpsEstimateResponse | null,
  realizedEps: number | null,
  lastFiscalYear: number | null,
): number | null {
  if (
    !estimates?.data ||
    estimates.data.length === 0 ||
    realizedEps === null ||
    realizedEps <= 0 ||
    lastFiscalYear === null
  ) {
    return null;
  }
  let nextEps: number | null = null;
  for (const est of estimates.data) {
    const year = est.year ?? yearOf(est.period);
    if (year === lastFiscalYear + 1) {
      nextEps = pickNumber(est.epsAvg);
      break;
    }
  }
  if (nextEps === null || nextEps <= 0) return null;
  return nextEps / realizedEps - 1;
}

function computeForwardPE(
  price: number | undefined,
  estimates: FinnhubEpsEstimateResponse | null,
): number | null {
  const p = pickNumber(price);
  if (p === null || p <= 0) return null;
  if (!estimates?.data) return null;
  const currentYear = new Date().getFullYear();
  let best: { year: number; eps: number } | null = null;
  for (const est of estimates.data) {
    const year = est.year ?? yearOf(est.period);
    if (year === null || year < currentYear) continue;
    const eps = pickNumber(est.epsAvg);
    if (eps === null || eps <= 0) continue;
    if (best === null || year < best.year) best = { year, eps };
  }
  return best ? p / best.eps : null;
}

function yearOf(d: string | undefined): number | null {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
}

function scalePct(v: number | undefined): number | null {
  const n = pickNumber(v);
  if (n === null) return null;
  // Finnhub reports ROE and debt/equity as percentages (15 = 15%).
  return n / 100;
}

function pickNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (res.status === 401 || res.status === 403) return null;
  if (res.status === 429) {
    throw new Error("Finnhub 429 rate limit");
  }
  if (!res.ok) {
    throw new Error(
      `Finnhub ${res.status} ${res.statusText} for ${redactKey(url)}`,
    );
  }
  return res.json();
}

function redactKey(url: string): string {
  return url.replace(/token=[^&]+/, "token=***");
}
