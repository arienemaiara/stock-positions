export interface IndicatorMeta {
  /** Plain-English label shown in tables and charts. */
  label: string;
  /** Short subtitle visible by default. */
  short: string;
  /** Longer prose shown on hover. Explains how to read the indicator. */
  long: string;
}

export const INDICATOR_META: Record<string, IndicatorMeta> = {
  pe_vs_sector: {
    label: "Price vs peers",
    short: "P/E compared to the sector average",
    long: "Trailing price-to-earnings divided by the sector ETF's P/E. Under 1 means the stock is cheaper than its sector; over 1 means more expensive. Cheap can mean a bargain or a warning sign — read alongside the business indicators.",
  },
  peg: {
    label: "Growth-adjusted price",
    short: "P/E adjusted for expected earnings growth",
    long: "PEG ratio: price-to-earnings divided by expected earnings growth. Under 1 suggests the price is cheap given how fast earnings should grow. Negative or zero growth makes this number meaningless, so it's marked unavailable in that case.",
  },
  roe: {
    label: "Return on equity",
    short: "Profit generated per dollar of shareholder equity",
    long: "How efficiently the business turns shareholder money into profit. Higher is better — strong, durable businesses tend to sit above 15%. Very high values can be driven by aggressive buybacks shrinking the equity base, so context matters.",
  },
  debt_to_equity: {
    label: "Debt load",
    short: "Total debt relative to shareholder equity",
    long: "How much the company borrows compared to what shareholders have invested. Lower means less financial risk; higher leverage amplifies both gains and losses, and makes the business more sensitive to interest rates.",
  },
  fcf_growth: {
    label: "Cash flow growth",
    short: "Year-over-year change in free cash flow",
    long: "Whether the cash the business generates after investments is growing or shrinking. Growing free cash flow funds buybacks, dividends, and reinvestment without taking on debt — it's one of the cleanest signals of business health.",
  },
  rsi: {
    label: "Recent momentum",
    short: "RSI (14-day). Contrarian read.",
    long: "A 0-100 momentum gauge. Above 70 the stock looks overbought and may cool off; below 30 it looks oversold and may bounce. This config treats extremes as fade signals (overbought is bearish, oversold is bullish) — flip the scores if you'd rather follow momentum.",
  },
  macd: {
    label: "Trend strength",
    short: "MACD histogram, normalized by price",
    long: "Difference between the 12-day and 26-day exponential averages, smoothed and divided by price so it compares across tickers. Positive = upward momentum is building; negative = downward momentum.",
  },
  sma_trend: {
    label: "200-day trend",
    short: "Price vs the 200-day moving average",
    long: "How far the current price sits above or below its 200-day average. Comfortably above = in a clear uptrend; well below = in a downtrend. Often the simplest, most stable trend filter there is.",
  },
  volume_confirm: {
    label: "Volume confirmation",
    short: "Recent volume vs longer baseline, signed by price move",
    long: "Whether trading volume is backing the recent price action. Heavy volume on a 5-day up-move is bullish; heavy volume on a 5-day down-move is bearish. The crudest indicator here and the first one to question if it disagrees with the others.",
  },
};

export function getIndicatorMeta(id: string): IndicatorMeta {
  return (
    INDICATOR_META[id] ?? {
      label: id.replace(/_/g, " "),
      short: "",
      long: "",
    }
  );
}
