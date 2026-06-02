import type {
  FundamentalsSnapshot,
  PriceBar,
  SectorReference,
} from "../indicators/types.js";

export interface AnalysisInputs {
  ticker: string;
  currency: string | null;
  currentPrice: number | null;
  fundamentals: FundamentalsSnapshot;
  sector: SectorReference;
  bars: PriceBar[];
  asOf: string;
}

export interface DataSource {
  getAnalysisInputs(ticker: string): Promise<AnalysisInputs>;
  getHistoricalClose(ticker: string, isoDate: string): Promise<number | null>;
}
