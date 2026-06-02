import { CachedDataSource } from "./cache.js";
import { YahooDataSource } from "./yahoo.js";

export const dataSource = new CachedDataSource(new YahooDataSource());

export type { AnalysisInputs, DataSource } from "./source.js";
