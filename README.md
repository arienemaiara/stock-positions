# stock-positions

Personal stock decision-support dashboard. Fetches fundamentals and technicals
for a ticker and produces a transparent Buy / Hold / Sell score with a full
per-indicator breakdown. Also tracks a watchlist and a position portfolio.

**Decision support, not advice.** The verdict is always shown alongside the
indicators that produced it. Portfolio tracking is position aggregation only —
not a cost-basis method for tax purposes (no FIFO / lot-matching, no fees).

## Layout

- `server/` — Fastify + TypeScript API.
  - `data/` — DataSource interface, Yahoo implementation, SQLite TTL cache.
  - `indicators/` — fundamentals + technicals (hand-rolled SMA, Wilder RSI,
    MACD).
  - `scoring/` — engine + `config.json` (weights, thresholds, bands).
  - `portfolio/` — lot aggregation, P/L.
  - `db/` — SQLite schema (cache, watchlist, lots).
  - `routes/` — `/api/analyze`, `/api/watchlist`, `/api/portfolio`.
- `web/` — Vite + React + TypeScript + Tailwind v4 + TanStack Query.
  - `views/` — Analyze / Watchlist / Portfolio.
  - `components/charts/` — PriceChart, RsiPane, MacdPane (lightweight-charts).
  - `components/` — VerdictCard, IndicatorBreakdown, ScoreContribChart.
  - `components/portfolio/` — table, donut, P/L bars, add-lot form.

## Requirements

- Node 20+ (tested on 22).

## Install

```
npm install
```

Installs both workspaces and builds `better-sqlite3` from source.

## Run (dev)

```
npm run dev
```

- Server: http://localhost:3001 (`/api/health` for a smoke check)
- Web:    http://localhost:5173 (proxies `/api/*` to the server)

To run them individually:

```
npm run dev:server
npm run dev:web
```

## Build

```
npm run build
```

## Typecheck

```
npm run typecheck
```

## Data persistence

`server/server-data.db` (SQLite) holds the response cache plus the watchlist
and portfolio lots. Delete it to reset everything, or clear just the cache:

```
cd server && node scripts/clear-cache.mjs
```

## Tuning the scoring engine

Weights and thresholds live in `server/src/scoring/config.json`. Each indicator
has a `weight`, a `metric` name (the scalar the indicator modules must compute),
and `bands` mapping ranges to sub-scores in `[-1, +1]`. Missing data yields a
neutral sub-score plus a flag; the engine renormalizes remaining weights so the
total stays comparable across tickers.

## Indicators

Fundamentals (Yahoo via `fundamentalsTimeSeries`):

- `pe_vs_sector` — trailing P/E divided by sector SPDR ETF P/E.
- `peg` — passthrough; null when ≤ 0 (negative PEG is uninterpretable).
- `roe` — return on equity.
- `debt_to_equity` — debt/equity as a decimal (Yahoo returns percent).
- `fcf_growth` — YoY free cash flow growth from annual cashflow series.

Technicals (hand-rolled from daily bars):

- `rsi` — Wilder 14-period.
- `macd` — (MACD − signal) normalized by price.
- `sma_trend` — price vs 200-day SMA.
- `volume_confirm` — recent (10-day) vs baseline (50-day) volume, signed by
  5-day price change.

## Scope notes

- SQLite cache TTL is 10 min for the full analyze payload, 5 min for quote-only
  lookups used by the portfolio.
- Portfolio totals are grouped by currency. Lots in different currencies are
  not summed.
- The optional LLM explanation layer (`ENABLE_LLM_EXPLANATION`) is not built.
