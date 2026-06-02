import type { FastifyInstance } from "fastify";
import { db, type WatchlistRow } from "../db/schema.js";

const listStmt = db.prepare<[], WatchlistRow>(
  "SELECT id, ticker, is_favorite, created_at FROM watchlist ORDER BY is_favorite DESC, ticker ASC",
);
const insertStmt = db.prepare(
  "INSERT OR IGNORE INTO watchlist (ticker) VALUES (?)",
);
const findByTickerStmt = db.prepare<[string], WatchlistRow>(
  "SELECT id, ticker, is_favorite, created_at FROM watchlist WHERE ticker = ?",
);
const findByIdStmt = db.prepare<[number], WatchlistRow>(
  "SELECT id, ticker, is_favorite, created_at FROM watchlist WHERE id = ?",
);
const updateFavoriteStmt = db.prepare(
  "UPDATE watchlist SET is_favorite = ? WHERE id = ?",
);
const deleteStmt = db.prepare("DELETE FROM watchlist WHERE id = ?");

function toResponse(row: WatchlistRow) {
  return {
    id: row.id,
    ticker: row.ticker,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
  };
}

export async function watchlistRoute(app: FastifyInstance) {
  app.get("/api/watchlist", async () => {
    return listStmt.all().map(toResponse);
  });

  app.post<{ Body: { ticker?: string } }>(
    "/api/watchlist",
    async (req, reply) => {
      const ticker = req.body?.ticker?.trim().toUpperCase();
      if (!ticker) {
        return reply.code(400).send({ error: "ticker required" });
      }
      insertStmt.run(ticker);
      const row = findByTickerStmt.get(ticker);
      if (!row) return reply.code(500).send({ error: "insert failed" });
      return reply.code(201).send(toResponse(row));
    },
  );

  app.patch<{ Params: { id: string }; Body: { isFavorite?: boolean } }>(
    "/api/watchlist/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ error: "bad id" });
      }
      const row = findByIdStmt.get(id);
      if (!row) return reply.code(404).send({ error: "not found" });

      const fav = req.body?.isFavorite;
      const next =
        typeof fav === "boolean" ? (fav ? 1 : 0) : row.is_favorite === 1 ? 0 : 1;
      updateFavoriteStmt.run(next, id);
      return toResponse(findByIdStmt.get(id)!);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/watchlist/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ error: "bad id" });
      }
      const result = deleteStmt.run(id);
      if (result.changes === 0) return reply.code(404).send({ error: "not found" });
      return { ok: true };
    },
  );
}
