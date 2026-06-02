// Wipes the analyze/quote cache. Run from the server/ directory:
//   node scripts/clear-cache.mjs
import Database from "better-sqlite3";

const db = new Database(process.env.DB_PATH ?? "server-data.db");
const n = db.prepare("DELETE FROM cache").run().changes;
console.log(`cleared ${n} cache rows`);
