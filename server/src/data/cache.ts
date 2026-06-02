import { db } from "../db/schema.js";
import type { DataSource, AnalysisInputs } from "./source.js";

const ANALYZE_TTL_MS = 10 * 60 * 1000;
const QUOTE_TTL_MS = 5 * 60 * 1000;

const getStmt = db.prepare<[string], { value: string; expires_at: number }>(
  "SELECT value, expires_at FROM cache WHERE key = ?",
);
const setStmt = db.prepare(
  "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
);
const cleanupStmt = db.prepare(
  "DELETE FROM cache WHERE expires_at <= ?",
);

export function cacheGet<T>(key: string): T | null {
  const row = getStmt.get(key);
  if (!row) return null;
  if (row.expires_at <= Date.now()) return null;
  return JSON.parse(row.value) as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  setStmt.run(key, JSON.stringify(value), Date.now() + ttlMs);
}

export function cleanupExpired(): void {
  cleanupStmt.run(Date.now());
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
    const hit = cacheGet<AnalysisInputs>(key);
    if (hit) return hit;
    const fresh = await this.inner.getAnalysisInputs(ticker);
    cacheSet(key, fresh, ANALYZE_TTL_MS);
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
    const hit = cacheGet<QuoteCache>(cacheKey);
    if (hit) return hit;

    const inputs = await this.getAnalysisInputs(ticker);
    const value: QuoteCache = {
      price: inputs.currentPrice,
      currency: inputs.currency,
    };
    cacheSet(cacheKey, value, QUOTE_TTL_MS);
    return value;
  }
}
