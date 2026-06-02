import { useState, useCallback } from "react";
import { Sidebar, type Tab } from "./components/Sidebar";
import { AnalyzeView } from "./views/AnalyzeView";
import { WatchlistView } from "./views/WatchlistView";
import { PortfolioView } from "./views/PortfolioView";

const TITLES: Record<Tab, string> = {
  analyze: "Analyze",
  watchlist: "Watchlist",
  portfolio: "Portfolio",
};

export function App() {
  const [tab, setTab] = useState<Tab>("analyze");
  const [ticker, setTicker] = useState<string | null>(null);

  const analyzeTicker = useCallback((t: string) => {
    setTicker(t.toUpperCase());
    setTab("analyze");
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto flex max-w-[1400px] gap-4">
        <Sidebar tab={tab} onChangeTab={setTab} />

        <main className="flex-1 rounded-2xl border border-slate-200 bg-white/40 p-6 shadow-sm">
          <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {TITLES[tab]}
            </h1>
            {tab === "analyze" && ticker && (
              <div className="text-xs text-slate-400">
                Showing analysis for{" "}
                <span className="font-semibold tracking-wide text-slate-700">
                  {ticker}
                </span>
              </div>
            )}
          </header>

          {tab === "analyze" && (
            <AnalyzeView ticker={ticker} onChangeTicker={setTicker} />
          )}
          {tab === "watchlist" && <WatchlistView onAnalyze={analyzeTicker} />}
          {tab === "portfolio" && <PortfolioView onAnalyze={analyzeTicker} />}
        </main>
      </div>
    </div>
  );
}
