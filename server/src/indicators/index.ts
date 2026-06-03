import * as fundamentals from "./fundamentals.js";
import * as technicals from "./technicals.js";
import type {
  FundamentalsSnapshot,
  Metrics,
  PriceBar,
  SectorReference,
} from "./types.js";

export { fundamentals, technicals };
export type {
  FundamentalsSnapshot,
  Metrics,
  PriceBar,
  SectorReference,
  AnnualValue,
} from "./types.js";

/**
 * Compute the full `Metrics` object the scoring engine expects from raw,
 * provider-agnostic inputs. Any individual metric may be null; the engine
 * handles that.
 */
export function computeMetrics(input: {
  fundamentals: FundamentalsSnapshot;
  sector: SectorReference;
  bars: PriceBar[];
}): Metrics {
  const closes = input.bars.map((b) => b.close);
  return {
    peToSectorRatio: fundamentals.peToSectorRatio(
      input.fundamentals,
      input.sector,
    ),
    pegRatio: fundamentals.pegRatio(input.fundamentals),
    forwardPE: fundamentals.forwardPE(input.fundamentals),
    evToEbitda: fundamentals.evToEbitda(input.fundamentals),
    roe: fundamentals.roe(input.fundamentals),
    roic: fundamentals.roic(input.fundamentals),
    debtToEquity: fundamentals.debtToEquity(input.fundamentals),
    netDebtToEbitda: fundamentals.netDebtToEbitda(input.fundamentals),
    fcfGrowthYoY: fundamentals.fcfGrowthYoY(input.fundamentals),
    impliedGrowthGapPp: fundamentals.impliedGrowthGapPp(input.fundamentals),
    rsi14: technicals.rsi(closes, 14),
    macdHistPctOfPrice: technicals.macdHistPctOfPrice(closes),
    priceVsSma200Pct: technicals.priceVsSma200Pct(closes),
    priceVsSma90Pct: technicals.priceVsSma90Pct(closes),
    signedVolumeRatio: technicals.signedVolumeRatio(input.bars),
  };
}

export interface ChartSeries {
  sma50: (number | null)[];
  sma200: (number | null)[];
  rsi14: (number | null)[];
  macd: (number | null)[];
  macdSignal: (number | null)[];
  macdHist: (number | null)[];
}

/**
 * Per-bar technical indicator series for the chart panes. Each array aligned
 * with `bars` (same length, leading nulls until enough lookback).
 */
export function computeChartSeries(bars: PriceBar[]): ChartSeries {
  const closes = bars.map((b) => b.close);
  const macd = technicals.macdSeriesFn(closes);
  return {
    sma50: technicals.smaSeries(closes, 50),
    sma200: technicals.smaSeries(closes, 200),
    rsi14: technicals.rsiSeries(closes, 14),
    macd: macd.macd,
    macdSignal: macd.signal,
    macdHist: macd.hist,
  };
}
