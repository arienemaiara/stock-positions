import { db } from "../db/schema.js";
import type { DataSource, AnalysisInputs } from "./source.js";

const ANALYZE_TTL_MS = 10 * 60 * 1000;
const QUOTE_TTL_MS = 5 * 60 * 1000;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const result = await db.execute({
    sql: "SELECT value, expires_at FROM cache WHERE key = ?",
    args: [key],
  });
  const row = result.rows[0];
  if (!row) return null;
  const expiresAt = Number(row.expires_at);
  if (expiresAt <= Date.now()) return null;
  return JSON.parse(String(row.value)) as T;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlMs: number,
): Promise<void> {
  await db.execute({
    sql: "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
    args: [key, JSON.stringify(value), Date.now() + ttlMs],
  });
}

export async function cleanupExpired(): Promise<void> {
  await db.execute({
    sql: "DELETE FROM cache WHERE expires_at <= ?",
    args: [Date.now()],
  });
}

/**
 * Wraps a DataSource with SQLite-backed TTL caching. Single key per ticker for
 * the full AnalysisInputs payload at the shorter cadence (10 min). Fundamentals
 * change less often but the price/technicals dictate the refresh interval, so
 * caching them together is fine for a single-user app.
 */
export class CachedDataSource implements DataSource {
  constructor(private inner: DataSource) {}

  getHistoricalClose(ticker: string, isoDate: string): Promise<number | null> {
    return this.inner.getHistoricalClose(ticker, isoDate);
  }

  async getAnalysisInputs(ticker: string): Promise<AnalysisInputs> {
    const key = `analyze:${ticker.toUpperCase()}`;
    const hit = await cacheGet<AnalysisInputs>(key);
    if (hit) return hit;
    const fresh = await this.inner.getAnalysisInputs(ticker);
    await cacheSet(key, fresh, ANALYZE_TTL_MS);
    return fresh;
  }

  /**
   * Lightweight current-price lookup for the portfolio. Falls back to a full
   * AnalysisInputs fetch — which is cached anyway, so subsequent portfolio
   * reads on the same ticker are free.
   */
  async getCurrentPrice(
    ticker: string,
  ): Promise<{ price: number | null; currency: string | null }> {
    const cacheKey = `quote:${ticker.toUpperCase()}`;
    type QuoteCache = { price: number | null; currency: string | null };
    const hit = await cacheGet<QuoteCache>(cacheKey);
    if (hit) return hit;

    const inputs = await this.getAnalysisInputs(ticker);
    const value: QuoteCache = {
      price: inputs.currentPrice,
      currency: inputs.currency,
    };
    await cacheSet(cacheKey, value, QUOTE_TTL_MS);
    return value;
  }
}
