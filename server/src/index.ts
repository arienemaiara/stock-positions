import Fastify from "fastify";
import cors from "@fastify/cors";
import { analyzeRoute } from "./routes/analyze.js";
import { watchlistRoute } from "./routes/watchlist.js";
import { portfolioRoute } from "./routes/portfolio.js";
import "./db/schema.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "127.0.0.1";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  });

  app.get("/api/health", async () => ({
    ok: true,
    service: "stock-positions-server",
    asOf: new Date().toISOString(),
  }));

  await app.register(analyzeRoute);
  await app.register(watchlistRoute);
  await app.register(portfolioRoute);

  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
