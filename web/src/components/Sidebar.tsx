import type { ReactNode } from "react";

export type Tab = "analyze" | "watchlist" | "portfolio";

const NAV: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "analyze",
    label: "Analyze",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-5" />
      </svg>
    ),
  },
  {
    id: "watchlist",
    label: "Watchlist",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    ),
  },
];

export function Sidebar({
  tab,
  onChangeTab,
}: {
  tab: Tab;
  onChangeTab: (t: Tab) => void;
}) {
  return (
    <aside className="flex w-60 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="px-2 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 4 5-5" />
            </svg>
          </div>
          <div className="text-sm font-bold tracking-wide text-slate-900">
            STOCK POSITIONS
          </div>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")
              }
            >
              <span className={active ? "text-sky-600" : "text-slate-400"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="px-2 text-xs text-slate-400">
          Decision support, not advice.
        </div>
      </div>
    </aside>
  );
}
