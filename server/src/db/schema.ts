import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "server-data.db";

mkdirSync(dirname(DB_PATH) || ".", { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS cache_expires_at_idx ON cache (expires_at);

  CREATE TABLE IF NOT EXISTS watchlist (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker      TEXT NOT NULL UNIQUE,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lots (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker     TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    shares     REAL NOT NULL,
    price      REAL,
    type       TEXT NOT NULL DEFAULT 'buy',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS lots_ticker_idx ON lots (ticker);
`);

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
