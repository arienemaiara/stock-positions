import { createClient, type Client } from "@libsql/client";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

// In production we expect TURSO_DATABASE_URL=libsql://...turso.io plus a token.
// In dev we fall back to a local SQLite file via libsql's file: scheme.
const url = TURSO_URL ?? `file:${process.env.DB_PATH ?? "server-data.db"}`;

export const db: Client = createClient({
  url,
  authToken: TURSO_TOKEN,
});

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS cache (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS cache_expires_at_idx ON cache (expires_at)`,
  `CREATE TABLE IF NOT EXISTS watchlist (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker      TEXT NOT NULL UNIQUE,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS lots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker     TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    shares     REAL NOT NULL,
    price      REAL,
    type       TEXT NOT NULL DEFAULT 'buy',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS lots_ticker_idx ON lots (ticker)`,
];

/**
 * Idempotent schema bootstrap. Safe to call on every boot. We can't run this
 * at module load time because libsql's API is async, so the server's main()
 * awaits this before listening.
 */
export async function initSchema(): Promise<void> {
  for (const stmt of SCHEMA) {
    await db.execute(stmt);
  }
}

export interface CacheRow {
  key: string;
  value: string;
  expires_at: number;
}

export interface WatchlistRow {
  id: number;
  ticker: string;
  is_favorite: number;
  created_at: string;
}

export interface LotRow {
  id: number;
  ticker: string;
  trade_date: string;
  shares: number;
  price: number | null;
  type: string;
  created_at: string;
}
