import { CachedDataSource } from "./cache.js";
import { FmpDataSource } from "./fmp.js";
import type { DataSource } from "./source.js";
import { YahooDataSource } from "./yahoo.js";

function selectSource(): DataSource {
  const fmpKey = process.env.FMP_API_KEY?.trim();
  if (fmpKey) return new FmpDataSource(fmpKey);
  return new YahooDataSource();
}

export const dataSource = new CachedDataSource(selectSource());

export type { AnalysisInputs, DataSource } from "./source.js";
