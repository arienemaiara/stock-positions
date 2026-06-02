import { db, type LotRow } from "../db/schema.js";
import { dataSource } from "../data/index.js";

const lotsStmt = db.prepare<[], LotRow>(
  "SELECT id, ticker, trade_date, shares, price, type, created_at FROM lots ORDER BY ticker, trade_date",
);

export interface PositionLot {
  id: number;
  tradeDate: string;
  shares: number;
  price: number | null;
}

export interface Position {
  ticker: string;
  currency: string | null;
  totalShares: number;
  totalCost: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  lots: PositionLot[];
}

export interface CurrencyTotal {
  currency: string;
  totalCost: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface PortfolioSnapshot {
  positions: Position[];
  totals: CurrencyTotal[];
}

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const rows = lotsStmt.all();
  const byTicker = new Map<string, LotRow[]>();
  for (const lot of rows) {
    if (!byTicker.has(lot.ticker)) byTicker.set(lot.ticker, []);
    byTicker.get(lot.ticker)!.push(lot);
  }

  const positions: Position[] = await Promise.all(
    [...byTicker.entries()].map(async ([ticker, lots]) => {
      let totalShares = 0;
      let totalCost = 0;
      for (const lot of lots) {
        totalShares += lot.shares;
        if (lot.price !== null) totalCost += lot.shares * lot.price;
      }
      const avgCost = totalShares > 0 ? totalCost / totalShares : 0;

      let currentPrice: number | null = null;
      let currency: string | null = null;
      try {
        const q = await dataSource.getCurrentPrice(ticker);
        currentPrice = q.price;
        currency = q.currency;
      } catch {
        // leave nulls — position still shows, P/L just unavailable
      }

      const marketValue =
        currentPrice !== null ? totalShares * currentPrice : null;
      const unrealizedPnl =
        marketValue !== null ? marketValue - totalCost : null;
      const unrealizedPnlPct =
        unrealizedPnl !== null && totalCost > 0
          ? unrealizedPnl / totalCost
          : null;

      return {
        ticker,
        currency,
        totalShares,
        totalCost,
        avgCost,
        currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPct,
        lots: lots.map((l) => ({
          id: l.id,
          tradeDate: l.trade_date,
          shares: l.shares,
          price: l.price,
        })),
      };
    }),
  );

  positions.sort((a, b) => a.ticker.localeCompare(b.ticker));

  // Aggregate by currency. Tickers whose currency we couldn't resolve are
  // grouped under "?" so they're visible but not silently merged.
  const byCcy = new Map<string, CurrencyTotal>();
  for (const p of positions) {
    if (p.marketValue === null) continue;
    const ccy = p.currency ?? "?";
    const t = byCcy.get(ccy) ?? {
      currency: ccy,
      totalCost: 0,
      marketValue: 0,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
    };
    t.totalCost += p.totalCost;
    t.marketValue += p.marketValue;
    t.unrealizedPnl += p.unrealizedPnl ?? 0;
    byCcy.set(ccy, t);
  }
  const totals = [...byCcy.values()].map((t) => ({
    ...t,
    unrealizedPnlPct: t.totalCost > 0 ? t.unrealizedPnl / t.totalCost : 0,
  }));

  return { positions, totals };
}
