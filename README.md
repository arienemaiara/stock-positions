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

Installs both workspaces. SQLite access goes through `@libsql/client`, which is
compatible with both local SQLite files (dev) and Turso (production).

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

Dev uses a local SQLite file via libsql's `file:` URL — default location
`server/server-data.db`. Delete it (or run the reset script) to wipe everything,
or clear just the cache:

```
npm run reset         # wipes cache + watchlist + portfolio
npm run cache:clear   # just the response cache
```

In production point libsql at Turso by setting:

- `TURSO_DATABASE_URL` (e.g. `libsql://your-db.turso.io`)
- `TURSO_AUTH_TOKEN`

The schema is bootstrapped on every boot (`CREATE TABLE IF NOT EXISTS`).

## Deploying to Render

Render free tier + Turso for persistence + HTTP basic auth. ~$0/month for
personal use.

### 1. Create a Turso DB

```
brew install tursodatabase/tap/turso   # or see https://docs.turso.tech/
turso auth signup
turso db create stock-positions
turso db show stock-positions --url    # → libsql://...turso.io
turso db tokens create stock-positions # → eyJ...
```

Keep the URL and token; you'll paste them into Render.

### 2. Push this repo to GitHub

Render reads `render.yaml` from the repo root and configures the service from
it. Connect the repo in the Render dashboard → "New + → Blueprint".

### 3. Set environment variables in Render

The `render.yaml` declares these as required; set them in the Render UI:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `BASIC_AUTH_USER` — pick anything
- `BASIC_AUTH_PASSWORD` — long random string

`NODE_ENV=production`, `HOST=0.0.0.0`, and `CORS_ORIGIN` are set by
`render.yaml` automatically (edit the CORS_ORIGIN in the YAML if your service
URL differs).

### 4. Deploy

Render builds with `npm install --include=dev && npm run build` and starts
with `npm --workspace server run start`. The Fastify server serves both the API
and the built frontend from `web/dist`, so there's just one service.

Health check at `/api/health` (skipped by basic auth so Render can probe it).

### 5. Visit

Open the Render URL, log in with the basic auth credentials, and analyze a
ticker. Data lives in Turso and survives restarts and deploys.

## Data sources

The app talks to one of three providers behind the same `DataSource`
interface. Selection is automatic, in priority order:

1. **`FINNHUB_API_KEY` set → Finnhub.** Recommended free choice. 60 calls/min
   on the free tier and covers everything this app reads (quote, fundamentals
   via `/stock/metric`, annual financials via `/stock/financials-reported`,
   EPS estimates, daily candles). US tickers only on free.
2. **`FMP_API_KEY` set → Financial Modeling Prep.** 250 calls/day on free,
   but several endpoints (annual statements, analyst estimates) are
   paywalled. Most of the fundamentals indicators go null on free — works,
   just with reduced coverage. Useful if you already have an FMP paid plan.
3. **Neither key set → Yahoo Finance** via `yahoo-finance2`. No key required,
   but it's scraping (no official API). Shared-IP hosts like Render free
   often hit Yahoo's anti-scraping 429s.

To use Finnhub: sign up at https://finnhub.io/, copy the API key, set
`FINNHUB_API_KEY` in Render's environment (or your local shell for dev).

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
