// Wipes all user data and cached responses. Run from the server/ directory:
//   node scripts/reset-data.mjs
// Uses DELETE + VACUUM instead of removing the .db file so it works even when
// the dev server is holding a handle on the database.
import Database from "better-sqlite3";

const db = new Database(process.env.DB_PATH ?? "server-data.db");
const tables = ["cache", "lots", "watchlist"];

const tx = db.transaction(() => {
  for (const t of tables) {
    const n = db.prepare(`DELETE FROM ${t}`).run().changes;
    console.log(`cleared ${t}: ${n} rows`);
  }
});
tx();
db.exec("VACUUM");
