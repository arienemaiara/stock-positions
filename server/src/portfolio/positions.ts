import { db, type LotRow } from "../db/schema.js";
import { dataSource } from "../data/index.js";

const lotsStmt = db.prepare<[], LotRow>(
  "SELECT id, ticker, trade_date, shares, price, type, created_at FROM lots ORDER BY ticker, trade_date, id",
);

export interface PositionLot {
  id: number;
  tradeDate: string;
  shares: number;
  price: number | null;
  type: "buy" | "sell";
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
  realizedPnl: number;
  lots: PositionLot[];
}

export interface CurrencyTotal {
  currency: string;
  totalCost: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  realizedPnl: number;
  totalPnl: number;
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
      // Walk lots in chronological order. Buys add to cost basis; sells
      // remove shares + cost proportionally to current avg cost, and record
      // realized P/L = (sellPrice − avgCost) × sharesSold.
      const sorted = [...lots].sort((a, b) =>
        a.trade_date === b.trade_date
          ? a.id - b.id
          : a.trade_date.localeCompare(b.trade_date),
      );

      let totalShares = 0;
      let totalCost = 0;
      let realizedPnl = 0;

      for (const lot of sorted) {
        const type = lot.type === "sell" ? "sell" : "buy";
        const price = lot.price;
        if (type === "buy") {
          if (price !== null) {
            totalCost += lot.shares * price;
          }
          totalShares += lot.shares;
        } else {
          const sharesSold = Math.min(lot.shares, totalShares);
          const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
          if (price !== null) {
            realizedPnl += (price - avgCost) * sharesSold;
          }
          totalCost -= avgCost * sharesSold;
          totalShares -= sharesSold;
        }
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
        realizedPnl,
        lots: sorted.map((l) => ({
          id: l.id,
          tradeDate: l.trade_date,
          shares: l.shares,
          price: l.price,
          type: l.type === "sell" ? ("sell" as const) : ("buy" as const),
        })),
      };
    }),
  );

  positions.sort((a, b) => a.ticker.localeCompare(b.ticker));

  // Aggregate by currency. Tickers whose currency we couldn't resolve are
  // grouped under "?" so they're visible but not silently merged. Closed
  // positions (zero shares) still contribute realized P/L to their currency
  // bucket — pick the lots' ticker currency as best-effort.
  const byCcy = new Map<string, CurrencyTotal>();
  for (const p of positions) {
    const ccy = p.currency ?? "?";
    const t = byCcy.get(ccy) ?? {
      currency: ccy,
      totalCost: 0,
      marketValue: 0,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      realizedPnl: 0,
      totalPnl: 0,
    };
    if (p.marketValue !== null) {
      t.totalCost += p.totalCost;
      t.marketValue += p.marketValue;
      t.unrealizedPnl += p.unrealizedPnl ?? 0;
    }
    t.realizedPnl += p.realizedPnl;
    byCcy.set(ccy, t);
  }
  const totals = [...byCcy.values()].map((t) => ({
    ...t,
    unrealizedPnlPct: t.totalCost > 0 ? t.unrealizedPnl / t.totalCost : 0,
    totalPnl: t.realizedPnl + t.unrealizedPnl,
  }));

  return { positions, totals };
}
