// Wipes all user data and cached responses. Run from the server/ directory:
//   node scripts/reset-data.mjs
import { createClient } from "@libsql/client";

const url =
  process.env.TURSO_DATABASE_URL ??
  `file:${process.env.DB_PATH ?? "server-data.db"}`;
const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const tables = ["cache", "lots", "watchlist"];
for (const t of tables) {
  const result = await db.execute(`DELETE FROM ${t}`);
  console.log(`cleared ${t}: ${result.rowsAffected} rows`);
}
