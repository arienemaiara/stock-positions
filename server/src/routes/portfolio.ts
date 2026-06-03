import type { FastifyInstance } from "fastify";
import { db, type LotRow } from "../db/schema.js";
import { dataSource } from "../data/index.js";
import { getPortfolioSnapshot } from "../portfolio/positions.js";

const insertLotStmt = db.prepare(
  "INSERT INTO lots (ticker, trade_date, shares, price, type) VALUES (?, ?, ?, ?, ?)",
);
const deleteLotStmt = db.prepare("DELETE FROM lots WHERE id = ?");
const lotsForTickerStmt = db.prepare<[string], LotRow>(
  "SELECT id, ticker, trade_date, shares, price, type, created_at FROM lots WHERE ticker = ?",
);

type AddLotBody = {
  ticker?: string;
  tradeDate?: string;
  shares?: number;
  price?: number | null;
  type?: string;
};

export async function portfolioRoute(app: FastifyInstance) {
  app.get("/api/portfolio", async () => {
    return getPortfolioSnapshot();
  });

  app.post<{ Body: AddLotBody }>("/api/portfolio", async (req, reply) => {
    const body = req.body ?? {};
    const ticker = body.ticker?.trim().toUpperCase();
    const tradeDate = body.tradeDate?.trim();
    const shares = Number(body.shares);
    const type = (body.type ?? "buy").trim().toLowerCase();

    if (!ticker) return reply.code(400).send({ error: "ticker required" });
    if (!tradeDate || Number.isNaN(new Date(tradeDate).getTime())) {
      return reply.code(400).send({ error: "tradeDate (ISO yyyy-mm-dd) required" });
    }
    if (!Number.isFinite(shares) || shares <= 0) {
      return reply.code(400).send({ error: "shares must be positive" });
    }
    if (type !== "buy" && type !== "sell") {
      return reply.code(400).send({ error: "type must be 'buy' or 'sell'" });
    }

    let price: number | null = null;
    if (body.price !== undefined && body.price !== null) {
      const p = Number(body.price);
      if (!Number.isFinite(p) || p <= 0) {
        return reply.code(400).send({ error: "price must be positive when provided" });
      }
      price = p;
    } else {
      // Derive from historical close on trade_date.
      price = await dataSource.getHistoricalClose(ticker, tradeDate);
      if (price === null) {
        return reply.code(400).send({
          error: `could not derive close price for ${ticker} on ${tradeDate}; supply price explicitly`,
        });
      }
    }

    if (type === "sell") {
      const ok = canSell(ticker, tradeDate, shares);
      if (!ok.ok) {
        return reply.code(400).send({ error: ok.reason });
      }
    }

    const result = insertLotStmt.run(ticker, tradeDate, shares, price, type);
    return reply.code(201).send({
      id: result.lastInsertRowid,
      ticker,
      tradeDate,
      shares,
      price,
      type,
    });
  });

  app.delete<{ Params: { id: string } }>(
    "/api/portfolio/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ error: "bad id" });
      }
      const result = deleteLotStmt.run(id);
      if (result.changes === 0) return reply.code(404).send({ error: "not found" });
      return { ok: true };
    },
  );
}

/**
 * Simulate adding a sell to the existing timeline for this ticker. Returns
 * { ok: false } if running shares would go negative at any point. This guards
 * against selling more than was owned at a given date, even when lots are
 * entered out of chronological order.
 */
function canSell(
  ticker: string,
  tradeDate: string,
  shares: number,
): { ok: true } | { ok: false; reason: string } {
  const lots = lotsForTickerStmt.all(ticker);
  const synthetic = {
    id: Number.MAX_SAFE_INTEGER,
    ticker,
    trade_date: tradeDate,
    shares,
    price: null,
    type: "sell",
    created_at: "",
  } satisfies LotRow;
  const timeline = [...lots, synthetic].sort((a, b) =>
    a.trade_date === b.trade_date
      ? a.id - b.id
      : a.trade_date.localeCompare(b.trade_date),
  );

  let running = 0;
  for (const lot of timeline) {
    if (lot.type === "sell") {
      if (lot.shares > running + 1e-9) {
        const haveAt = running;
        return {
          ok: false,
          reason: `can't sell ${shares} of ${ticker} on ${tradeDate} — only ${haveAt.toFixed(3)} held at that date`,
        };
      }
      running -= lot.shares;
    } else {
      running += lot.shares;
    }
  }
  return { ok: true };
}
