import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnalysis } from "../api/client";
import { TickerSearch } from "../components/TickerSearch";
import { VerdictCard } from "../components/VerdictCard";
import { IndicatorBreakdown } from "../components/IndicatorBreakdown";
import { ScoreContribChart } from "../components/ScoreContribChart";
import { PriceChart } from "../components/charts/PriceChart";
import { RsiPane } from "../components/charts/RsiPane";
import { MacdPane } from "../components/charts/MacdPane";
import { WatchlistStar } from "../components/WatchlistStar";

export function AnalyzeView({
  ticker,
  onChangeTicker,
}: {
  ticker: string | null;
  onChangeTicker: (t: string | null) => void;
}) {
  const [input, setInput] = useState(ticker ?? "");
  useEffect(() => {
    if (ticker) setInput(ticker);
  }, [ticker]);

  const { data, error, isFetching } = useQuery({
    queryKey: ["analyze", ticker],
    queryFn: () => fetchAnalysis(ticker!),
    enabled: ticker !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-stretch gap-3">
        <div className="flex-1">
          <TickerSearch
            initialValue={input}
            onSubmit={onChangeTicker}
            disabled={isFetching}
          />
        </div>
        {data && <WatchlistStar ticker={data.ticker} />}
      </div>

      {!ticker && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          Enter a ticker above (e.g. AAPL, MSFT, NVDA) to see its verdict and
          indicator breakdown.
        </div>
      )}

      {ticker && isFetching && !data && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
          Analyzing {ticker}…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          <VerdictCard data={data} />

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <ScoreContribChart rows={data.breakdown} />
            </div>
            <div className="lg:col-span-3">
              <IndicatorBreakdown rows={data.breakdown} />
            </div>
          </div>

          <PriceChart
            bars={data.bars}
            sma50={data.chartSeries.sma50}
            sma200={data.chartSeries.sma200}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <RsiPane bars={data.bars} rsi={data.chartSeries.rsi14} />
            <MacdPane
              bars={data.bars}
              macd={data.chartSeries.macd}
              signal={data.chartSeries.macdSignal}
              hist={data.chartSeries.macdHist}
            />
          </div>
        </>
      )}
    </div>
  );
}
