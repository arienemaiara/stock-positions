import type { PriceBar } from "./types.js";

/**
 * Simple moving average of the last `n` values. Null if fewer than `n` values.
 */
export function smaLast(values: number[], n: number): number | null {
  if (n <= 0 || values.length < n) return null;
  let sum = 0;
  for (let i = values.length - n; i < values.length; i++) sum += values[i]!;
  return sum / n;
}

/**
 * Rolling SMA series. Returns an array the same length as `values` with the
 * first n-1 entries null.
 */
export function smaSeries(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (n <= 0 || values.length < n) return out;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i]!;
  out[n - 1] = sum / n;
  for (let i = n; i < values.length; i++) {
    sum += values[i]! - values[i - n]!;
    out[i] = sum / n;
  }
  return out;
}

/**
 * Exponential moving average series. Seeded with the SMA of the first `n`
 * values, then EMA_i = α * v_i + (1 - α) * EMA_{i-1} with α = 2/(n+1).
 * Returns an array the same length as `values` with the first n-1 entries null.
 */
export function ema(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < n) return out;
  const alpha = 2 / (n + 1);

  let seed = 0;
  for (let i = 0; i < n; i++) seed += values[i]!;
  seed /= n;
  out[n - 1] = seed;

  let prev = seed;
  for (let i = n; i < values.length; i++) {
    const v = alpha * values[i]! + (1 - alpha) * prev;
    out[i] = v;
    prev = v;
  }
  return out;
}

/**
 * Wilder's RSI on the last bar. Standard 14-period.
 * Needs at least period + 1 closes (period deltas).
 */
export function rsi(closes: number[], period = 14): number | null {
  const series = rsiSeries(closes, period);
  return series[series.length - 1] ?? null;
}

/**
 * Wilder's RSI series. Same length as input, first `period` entries null.
 */
export function rsiSeries(
  closes: number[],
  period = 14,
): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i]! - closes[i - 1]!;
    if (delta >= 0) gainSum += delta;
    else lossSum += -delta;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = rsiFromAvgs(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i]! - closes[i - 1]!;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = rsiFromAvgs(avgGain, avgLoss);
  }
  return out;
}

function rsiFromAvgs(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MacdPoint {
  macd: number;
  signal: number;
  hist: number;
}

export interface MacdSeries {
  macd: (number | null)[];
  signal: (number | null)[];
  hist: (number | null)[];
}

/**
 * MACD with default 12/26/9. Returns the last point with all three values, or
 * null if there aren't enough bars (need fast+slow+signal = roughly 26+9 = 35).
 */
export function macdLast(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdPoint | null {
  const s = macdSeriesFn(closes, fast, slow, signalPeriod);
  const i = closes.length - 1;
  const m = s.macd[i];
  const sig = s.signal[i];
  if (m == null || sig == null) return null;
  return { macd: m, signal: sig, hist: m - sig };
}

/**
 * MACD as full series, aligned to `closes`. Each array same length as input
 * with leading nulls until enough data is available.
 */
export function macdSeriesFn(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdSeries {
  const n = closes.length;
  const macdAligned: (number | null)[] = new Array(n).fill(null);
  const signalAligned: (number | null)[] = new Array(n).fill(null);
  const histAligned: (number | null)[] = new Array(n).fill(null);

  if (n < slow) return { macd: macdAligned, signal: signalAligned, hist: histAligned };

  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  // Dense MACD line series starting from slow-1.
  const dense: number[] = [];
  for (let i = slow - 1; i < n; i++) {
    dense.push(emaFast[i]! - emaSlow[i]!);
  }

  const signalDense = ema(dense, signalPeriod);

  for (let j = 0; j < dense.length; j++) {
    const i = j + (slow - 1);
    macdAligned[i] = dense[j]!;
    const sig = signalDense[j];
    if (sig != null) {
      signalAligned[i] = sig;
      histAligned[i] = dense[j]! - sig;
    }
  }

  return { macd: macdAligned, signal: signalAligned, hist: histAligned };
}

/**
 * (MACD - signal) / last close * 100. Price-normalized so it compares across
 * tickers with different price magnitudes.
 */
export function macdHistPctOfPrice(closes: number[]): number | null {
  const last = closes[closes.length - 1];
  if (last === undefined || last <= 0) return null;
  const point = macdLast(closes);
  if (point === null) return null;
  return (point.hist / last) * 100;
}

/**
 * (last close / SMA200 - 1) * 100. Percent above or below the 200-day average.
 */
export function priceVsSma200Pct(closes: number[]): number | null {
  const sma200 = smaLast(closes, 200);
  const last = closes[closes.length - 1];
  if (sma200 === null || last === undefined || sma200 === 0) return null;
  return (last / sma200 - 1) * 100;
}

/**
 * Signed volume ratio: (recent avg volume / baseline avg volume) * sign of
 * 5-bar price change. Positive = heavy volume confirming an up-move; negative
 * = heavy volume on a down-move. Windows are 10 (recent) and 50 (baseline).
 *
 * Needs 50 volume bars and 6 closes. Returns 0 when the 5-bar change is flat.
 */
export function signedVolumeRatio(
  bars: PriceBar[],
  recentWindow = 10,
  baselineWindow = 50,
  changeWindow = 5,
): number | null {
  if (bars.length < baselineWindow) return null;
  if (bars.length < changeWindow + 1) return null;

  const recent = avgVolume(bars, recentWindow);
  const baseline = avgVolume(bars, baselineWindow);
  if (recent === null || baseline === null || baseline === 0) return null;

  const last = bars[bars.length - 1]!.close;
  const past = bars[bars.length - 1 - changeWindow]!.close;
  const change = last - past;
  const sign = change > 0 ? 1 : change < 0 ? -1 : 0;

  return (recent / baseline) * sign;
}

function avgVolume(bars: PriceBar[], n: number): number | null {
  if (bars.length < n) return null;
  let sum = 0;
  for (let i = bars.length - n; i < bars.length; i++) sum += bars[i]!.volume;
  return sum / n;
}
