import type { FastifyInstance } from "fastify";
import { dataSource } from "../data/index.js";
import { computeChartSeries, computeMetrics } from "../indicators/index.js";
import { analyze as runEngine } from "../scoring/index.js";

export async function analyzeRoute(app: FastifyInstance) {
  app.get<{ Querystring: { ticker?: string } }>(
    "/api/analyze",
    async (req, reply) => {
      const ticker = req.query.ticker?.trim();
      if (!ticker) {
        return reply.code(400).send({ error: "ticker query param required" });
      }

      try {
        const inputs = await dataSource.getAnalysisInputs(ticker);
        const metrics = computeMetrics({
          fundamentals: inputs.fundamentals,
          sector: inputs.sector,
          bars: inputs.bars,
        });
        const result = runEngine(
          metrics as unknown as Record<string, number | null>,
        );
        const chartSeries = computeChartSeries(inputs.bars);

        return {
          ticker: inputs.ticker,
          asOf: inputs.asOf,
          currency: inputs.currency,
          currentPrice: inputs.currentPrice,
          sector: inputs.fundamentals.sector,
          sectorRefPE: inputs.sector.sectorPE,
          metrics,
          bars: inputs.bars,
          chartSeries,
          ...result,
        };
      } catch (err) {
        req.log.error({ err, ticker }, "analyze failed");
        const message = err instanceof Error ? err.message : "unknown error";
        return reply.code(502).send({ error: `analyze failed: ${message}` });
      }
    },
  );
}
