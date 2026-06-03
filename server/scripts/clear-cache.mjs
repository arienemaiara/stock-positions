// Wipes the analyze/quote cache. Run from the server/ directory:
//   node scripts/clear-cache.mjs
// Reads TURSO_DATABASE_URL + TURSO_AUTH_TOKEN if set, falls back to file:server-data.db.
import { createClient } from "@libsql/client";

const url =
  process.env.TURSO_DATABASE_URL ??
  `file:${process.env.DB_PATH ?? "server-data.db"}`;
const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const result = await db.execute("DELETE FROM cache");
console.log(`cleared ${result.rowsAffected} cache rows`);
