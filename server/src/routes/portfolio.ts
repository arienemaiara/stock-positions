import type { FastifyInstance } from "fastify";
import { db } from "../db/schema.js";
import { dataSource } from "../data/index.js";
import { getPortfolioSnapshot } from "../portfolio/positions.js";

const insertLotStmt = db.prepare(
  "INSERT INTO lots (ticker, trade_date, shares, price, type) VALUES (?, ?, ?, ?, ?)",
);
const deleteLotStmt = db.prepare("DELETE FROM lots WHERE id = ?");

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
    const type = (body.type ?? "buy").trim();

    if (!ticker) return reply.code(400).send({ error: "ticker required" });
    if (!tradeDate || Number.isNaN(new Date(tradeDate).getTime())) {
      return reply.code(400).send({ error: "tradeDate (ISO yyyy-mm-dd) required" });
    }
    if (!Number.isFinite(shares) || shares <= 0) {
      return reply.code(400).send({ error: "shares must be positive" });
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
