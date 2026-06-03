import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
import type {
  AnnualValue,
  FundamentalsSnapshot,
  PriceBar,
  SectorReference,
} from "../indicators/types.js";
import type { AnalysisInputs, DataSource } from "./source.js";

// SPDR sector ETF used as proxy for sector-median P/E. Yahoo's sector strings on
// the left, the SPDR ticker on the right. If a ticker's sector isn't here (or is
// missing), sector reference comes back null and pe_vs_sector flags unavailable.
const SECTOR_TO_ETF: Record<string, string> = {
  Technology: "XLK",
  "Financial Services": "XLF",
  "Consumer Cyclical": "XLY",
  "Consumer Defensive": "XLP",
  Healthcare: "XLV",
  "Communication Services": "XLC",
  Industrials: "XLI",
  Energy: "XLE",
  Utilities: "XLU",
  "Basic Materials": "XLB",
  "Real Estate": "XLRE",
};

// ~18 months of calendar history. SMA200 needs 200 prior bars before it can
// produce its first value, so this gives roughly 9 months of SMA200 visible on
// the chart instead of just the trailing edge.
const HISTORY_DAYS = 540;

// In-process cache of sector-ETF P/E. Cheap and prevents hammering Yahoo when
// scanning multiple tickers in the same sector. TTL: 6 hours.
const sectorPECache = new Map<string, { value: number | null; ts: number }>();
const SECTOR_PE_TTL_MS = 6 * 60 * 60 * 1000;

interface QuoteSummary {
  summaryDetail?: { trailingPE?: number };
  financialData?: {
    returnOnEquity?: number;
    debtToEquity?: number;
    ebitda?: number;
    totalDebt?: number;
    totalCash?: number;
  };
  defaultKeyStatistics?: {
    pegRatio?: number;
    forwardPE?: number;
    enterpriseToEbitda?: number;
  };
  assetProfile?: { sector?: string };
}

interface CashFlowRow {
  date?: Date | string | number;
  freeCashFlow?: number;
  operatingCashFlow?: number;
  capitalExpenditure?: number;
}

interface FinancialsRow {
  date?: Date | string | number;
  operatingIncome?: number;
  pretaxIncome?: number;
  taxProvision?: number;
}

interface BalanceSheetRow {
  date?: Date | string | number;
  investedCapital?: number;
}

interface Quote {
  currency?: string;
  regularMarketPrice?: number;
  marketCap?: number;
}

interface ChartResult {
  quotes?: Array<{
    date?: Date | number | string;
    open?: number | null;
    high?: number | null;
    low?: number | null;
    close?: number | null;
    volume?: number | null;
  }>;
}

export class YahooDataSource implements DataSource {
  async getHistoricalClose(
    ticker: string,
    isoDate: string,
  ): Promise<number | null> {
    const symbol = ticker.trim().toUpperCase();
    const target = new Date(isoDate);
    if (Number.isNaN(target.getTime())) return null;
    // Window of trade_date -1 to +7 days handles weekends, holidays, and
    // future dates entered by accident (returns null in that case).
    const period1 = new Date(target);
    period1.setDate(period1.getDate() - 1);
    const period2 = new Date(target);
    period2.setDate(period2.getDate() + 7);

    try {
      const result = (await yahooFinance.chart(symbol, {
        period1,
        period2,
        interval: "1d",
      })) as ChartResult;
      const quotes = result.quotes ?? [];
      // First trading day on or after the requested date.
      const wanted = target.getTime();
      let best: { date: number; close: number } | null = null;
      for (const q of quotes) {
        if (q.close == null || q.date == null) continue;
        const ts =
          q.date instanceof Date ? q.date.getTime() : new Date(q.date).getTime();
        if (ts < wanted) continue;
        if (best === null || ts < best.date) best = { date: ts, close: q.close };
      }
      return best?.close ?? null;
    } catch {
      return null;
    }
  }

  async getAnalysisInputs(ticker: string): Promise<AnalysisInputs> {
    const symbol = ticker.trim().toUpperCase();

    const [quote, summary, chart, cashFlow, financials, balanceSheet] =
      await Promise.all([
        yahooFinance.quote(symbol) as Promise<Quote>,
        yahooFinance.quoteSummary(symbol, {
          modules: [
            "summaryDetail",
            "financialData",
            "defaultKeyStatistics",
            "assetProfile",
          ],
        }) as Promise<QuoteSummary>,
        fetchChart(symbol),
        fetchAnnualCashFlow(symbol),
        fetchAnnualFinancials(symbol),
        fetchAnnualBalanceSheet(symbol),
      ]);

    const lastFin = financials[financials.length - 1];
    const lastBs = balanceSheet[balanceSheet.length - 1];

    const sectorName = summary.assetProfile?.sector ?? null;
    const sectorPE = sectorName ? await getSectorPE(sectorName) : null;

    const fundamentals: FundamentalsSnapshot = {
      trailingPE: pickNumber(summary.summaryDetail?.trailingPE),
      forwardPE: pickNumber(summary.defaultKeyStatistics?.forwardPE),
      pegRatio: pickNumber(summary.defaultKeyStatistics?.pegRatio),
      returnOnEquity: pickNumber(summary.financialData?.returnOnEquity),
      debtToEquity: yahooDebtToEquityToDecimal(
        summary.financialData?.debtToEquity,
      ),
      enterpriseToEbitda: pickNumber(
        summary.defaultKeyStatistics?.enterpriseToEbitda,
      ),
      ebitda: pickNumber(summary.financialData?.ebitda),
      totalDebt: pickNumber(summary.financialData?.totalDebt),
      totalCash: pickNumber(summary.financialData?.totalCash),
      operatingIncome: pickNumber(lastFin?.operatingIncome),
      pretaxIncome: pickNumber(lastFin?.pretaxIncome),
      taxProvision: pickNumber(lastFin?.taxProvision),
      investedCapital: pickNumber(lastBs?.investedCapital),
      freeCashFlowAnnual: extractAnnualFcf(cashFlow),
      sector: sectorName,
    };

    const sector: SectorReference = { sectorPE };

    return {
      ticker: symbol,
      currency: quote.currency ?? null,
      currentPrice: pickNumber(quote.regularMarketPrice),
      marketCap: pickNumber(quote.marketCap),
      fundamentals,
      sector,
      bars: chart,
      asOf: new Date().toISOString(),
    };
  }
}

async function fetchChart(symbol: string): Promise<PriceBar[]> {
  const period2 = new Date();
  const period1 = new Date(period2);
  period1.setDate(period1.getDate() - HISTORY_DAYS);

  const result = (await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: "1d",
  })) as ChartResult;

  const quotes = result.quotes ?? [];
  const bars: PriceBar[] = [];
  for (const q of quotes) {
    if (
      q.date == null ||
      q.open == null ||
      q.high == null ||
      q.low == null ||
      q.close == null ||
      q.volume == null
    ) {
      continue;
    }
    bars.push({
      date:
        q.date instanceof Date ? q.date.toISOString() : new Date(q.date).toISOString(),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
    });
  }
  return bars;
}

async function getSectorPE(sectorName: string): Promise<number | null> {
  const etf = SECTOR_TO_ETF[sectorName];
  if (!etf) return null;

  const cached = sectorPECache.get(etf);
  const now = Date.now();
  if (cached && now - cached.ts < SECTOR_PE_TTL_MS) return cached.value;

  try {
    const summary = (await yahooFinance.quoteSummary(etf, {
      modules: ["summaryDetail"],
    })) as { summaryDetail?: { trailingPE?: number } };
    const value = pickNumber(summary.summaryDetail?.trailingPE);
    sectorPECache.set(etf, { value, ts: now });
    return value;
  } catch {
    sectorPECache.set(etf, { value: null, ts: now });
    return null;
  }
}

/** Yahoo reports debt/equity as a percentage (e.g. 150 = 1.5x). */
function yahooDebtToEquityToDecimal(
  raw: number | null | undefined,
): number | null {
  const n = pickNumber(raw);
  if (n === null) return null;
  return n / 100;
}

async function fetchAnnualFinancials(symbol: string): Promise<FinancialsRow[]> {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 2);
  try {
    return (await yahooFinance.fundamentalsTimeSeries(symbol, {
      period1,
      type: "annual",
      module: "financials",
    })) as FinancialsRow[];
  } catch {
    return [];
  }
}

async function fetchAnnualBalanceSheet(
  symbol: string,
): Promise<BalanceSheetRow[]> {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 2);
  try {
    return (await yahooFinance.fundamentalsTimeSeries(symbol, {
      period1,
      type: "annual",
      module: "balance-sheet",
    })) as BalanceSheetRow[];
  } catch {
    return [];
  }
}

async function fetchAnnualCashFlow(symbol: string): Promise<CashFlowRow[]> {
  // Yahoo deprecated cashflowStatementHistory in late 2024. fundamentalsTimeSeries
  // is now the source. We pull ~4 years of annual data so YoY has at least two
  // points to work with.
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 4);
  try {
    const rows = (await yahooFinance.fundamentalsTimeSeries(symbol, {
      period1,
      type: "annual",
      module: "cash-flow",
    })) as CashFlowRow[];
    return rows;
  } catch {
    return [];
  }
}

function extractAnnualFcf(rows: CashFlowRow[]): AnnualValue[] {
  const out: AnnualValue[] = [];
  for (const row of rows) {
    const direct = pickNumber(row.freeCashFlow);
    let value: number | null = direct;
    if (value === null) {
      // Fallback to operating CF + capex when freeCashFlow is missing.
      const op = pickNumber(row.operatingCashFlow);
      const capex = pickNumber(row.capitalExpenditure);
      if (op !== null && capex !== null) value = op + capex;
    }
    if (value === null) continue;
    const year = extractYear(row.date);
    if (year === null) continue;
    out.push({ year, value });
  }
  // Newest first.
  out.sort((a, b) => b.year - a.year);
  return out;
}

function extractYear(d: Date | string | number | undefined): number | null {
  if (d == null) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
}

function pickNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}
