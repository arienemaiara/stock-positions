import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import { analyzeRoute } from "./routes/analyze.js";
import { watchlistRoute } from "./routes/watchlist.js";
import { portfolioRoute } from "./routes/portfolio.js";
import { initSchema } from "./db/schema.js";
import { basicAuthHook } from "./auth.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";
const PRODUCTION = process.env.NODE_ENV === "production";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  await initSchema();

  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  });

  app.addHook("onRequest", basicAuthHook);

  app.get("/api/health", async () => ({
    ok: true,
    service: "stock-positions-server",
    asOf: new Date().toISOString(),
  }));

  await app.register(analyzeRoute);
  await app.register(watchlistRoute);
  await app.register(portfolioRoute);

  if (PRODUCTION) {
    // Serve the built frontend. In dev Vite serves it; in production we ship
    // server + web/dist as one deploy unit.
    const webDist = resolve(__dirname, "../../web/dist");
    await app.register(staticPlugin, { root: webDist });
    // SPA fallback so client-side state survives a refresh on any path.
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
