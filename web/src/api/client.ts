export type Verdict = "buy" | "hold" | "sell";

export interface BreakdownEntry {
  id: string;
  metric: string;
  value: number | null;
  subScore: number;
  rawWeight: number;
  weight: number;
  contribution: number;
  available: boolean;
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartSeries {
  sma50: (number | null)[];
  sma200: (number | null)[];
  rsi14: (number | null)[];
  macd: (number | null)[];
  macdSignal: (number | null)[];
  macdHist: (number | null)[];
}

export interface AnalysisResponse {
  ticker: string;
  asOf: string;
  currency: string | null;
  currentPrice: number | null;
  marketCap: number | null;
  sector: string | null;
  sectorRefPE: number | null;
  metrics: Record<string, number | null>;
  bars: PriceBar[];
  chartSeries: ChartSeries;
  verdict: Verdict;
  score: number;
  breakdown: BreakdownEntry[];
  flags: string[];
}

export async function fetchAnalysis(ticker: string): Promise<AnalysisResponse> {
  const res = await fetch(`/api/analyze?ticker=${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`analyze failed (${res.status}): ${body}`);
  }
  return res.json();
}

// Watchlist
export interface WatchlistEntry {
  id: number;
  ticker: string;
  isFavorite: boolean;
  createdAt: string;
}

export async function fetchWatchlist(): Promise<WatchlistEntry[]> {
  const res = await fetch("/api/watchlist");
  if (!res.ok) throw new Error("watchlist fetch failed");
  return res.json();
}

export async function addToWatchlist(ticker: string): Promise<WatchlistEntry> {
  const res = await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function toggleFavorite(
  id: number,
  isFavorite: boolean,
): Promise<WatchlistEntry> {
  const res = await fetch(`/api/watchlist/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isFavorite }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function removeFromWatchlist(id: number): Promise<void> {
  const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

// Portfolio
export type LotType = "buy" | "sell";

export interface PositionLot {
  id: number;
  tradeDate: string;
  shares: number;
  price: number | null;
  type: LotType;
}

export interface Position {
  ticker: string;
  currency: string | null;
  totalShares: number;
  totalCost: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
  realizedPnl: number;
  lots: PositionLot[];
}

export interface CurrencyTotal {
  currency: string;
  totalCost: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  realizedPnl: number;
  totalPnl: number;
}

export interface PortfolioSnapshot {
  positions: Position[];
  totals: CurrencyTotal[];
}

export async function fetchPortfolio(): Promise<PortfolioSnapshot> {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error("portfolio fetch failed");
  return res.json();
}

export interface AddLotInput {
  ticker: string;
  tradeDate: string;
  shares: number;
  price: number | null;
  type: LotType;
}

export async function addLot(input: AddLotInput): Promise<void> {
  const res = await fetch("/api/portfolio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function removeLot(id: number): Promise<void> {
  const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}
