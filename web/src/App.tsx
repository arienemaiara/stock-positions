import { useState, useCallback } from "react";
import { AnalyzeView } from "./views/AnalyzeView";
import { WatchlistView } from "./views/WatchlistView";
import { PortfolioView } from "./views/PortfolioView";

type Tab = "analyze" | "watchlist" | "portfolio";

const TABS: { id: Tab; label: string }[] = [
  { id: "analyze", label: "Analyze" },
  { id: "watchlist", label: "Watchlist" },
  { id: "portfolio", label: "Portfolio" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("analyze");
  const [ticker, setTicker] = useState<string | null>(null);

  const analyzeTicker = useCallback((t: string) => {
    setTicker(t.toUpperCase());
    setTab("analyze");
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Stock Positions
            </h1>
            <p className="text-xs text-slate-500">
              Decision support and position tracking. Not advice.
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors " +
                  (tab === t.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {tab === "analyze" && (
          <AnalyzeView ticker={ticker} onChangeTicker={setTicker} />
        )}
        {tab === "watchlist" && <WatchlistView onAnalyze={analyzeTicker} />}
        {tab === "portfolio" && <PortfolioView onAnalyze={analyzeTicker} />}
      </main>
    </div>
  );
}
