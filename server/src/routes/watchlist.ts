import type { FastifyInstance } from "fastify";
import { db, type WatchlistRow } from "../db/schema.js";

function toResponse(row: WatchlistRow) {
  return {
    id: row.id,
    ticker: row.ticker,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
  };
}

function rowFromLibsql(row: Record<string, unknown>): WatchlistRow {
  return {
    id: Number(row.id),
    ticker: String(row.ticker),
    is_favorite: Number(row.is_favorite),
    created_at: String(row.created_at),
  };
}

export async function watchlistRoute(app: FastifyInstance) {
  app.get("/api/watchlist", async () => {
    const result = await db.execute(
      "SELECT id, ticker, is_favorite, created_at FROM watchlist ORDER BY is_favorite DESC, ticker ASC",
    );
    return result.rows.map(rowFromLibsql).map(toResponse);
  });

  app.post<{ Body: { ticker?: string } }>(
    "/api/watchlist",
    async (req, reply) => {
      const ticker = req.body?.ticker?.trim().toUpperCase();
      if (!ticker) {
        return reply.code(400).send({ error: "ticker required" });
      }
      await db.execute({
        sql: "INSERT OR IGNORE INTO watchlist (ticker) VALUES (?)",
        args: [ticker],
      });
      const result = await db.execute({
        sql: "SELECT id, ticker, is_favorite, created_at FROM watchlist WHERE ticker = ?",
        args: [ticker],
      });
      const row = result.rows[0];
      if (!row) return reply.code(500).send({ error: "insert failed" });
      return reply.code(201).send(toResponse(rowFromLibsql(row)));
    },
  );

  app.patch<{ Params: { id: string }; Body: { isFavorite?: boolean } }>(
    "/api/watchlist/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ error: "bad id" });
      }
      const existing = await db.execute({
        sql: "SELECT id, ticker, is_favorite, created_at FROM watchlist WHERE id = ?",
        args: [id],
      });
      const row = existing.rows[0];
      if (!row) return reply.code(404).send({ error: "not found" });

      const fav = req.body?.isFavorite;
      const currentFav = Number(row.is_favorite);
      const next =
        typeof fav === "boolean" ? (fav ? 1 : 0) : currentFav === 1 ? 0 : 1;
      await db.execute({
        sql: "UPDATE watchlist SET is_favorite = ? WHERE id = ?",
        args: [next, id],
      });
      const after = await db.execute({
        sql: "SELECT id, ticker, is_favorite, created_at FROM watchlist WHERE id = ?",
        args: [id],
      });
      return toResponse(rowFromLibsql(after.rows[0]!));
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/watchlist/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ error: "bad id" });
      }
      const result = await db.execute({
        sql: "DELETE FROM watchlist WHERE id = ?",
        args: [id],
      });
      if (result.rowsAffected === 0)
        return reply.code(404).send({ error: "not found" });
      return { ok: true };
    },
  );
}
