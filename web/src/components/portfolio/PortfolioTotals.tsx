import type { CurrencyTotal } from "../../api/client";

export function PortfolioTotals({ totals }: { totals: CurrencyTotal[] }) {
  if (totals.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {totals.flatMap((t) => [
        <Kpi
          key={`${t.currency}-cost`}
          label={`Cost (${t.currency})`}
          value={money(t.totalCost)}
        />,
        <Kpi
          key={`${t.currency}-value`}
          label={`Value (${t.currency})`}
          value={money(t.marketValue)}
        />,
        <Kpi
          key={`${t.currency}-pnl`}
          label={`P/L (${t.currency})`}
          value={`${t.unrealizedPnl >= 0 ? "+" : ""}${money(t.unrealizedPnl)}`}
          tone={t.unrealizedPnl >= 0 ? "good" : "bad"}
        />,
        <Kpi
          key={`${t.currency}-pnlpct`}
          label={`P/L % (${t.currency})`}
          value={`${t.unrealizedPnlPct >= 0 ? "+" : ""}${(t.unrealizedPnlPct * 100).toFixed(2)}%`}
          tone={t.unrealizedPnlPct >= 0 ? "good" : "bad"}
        />,
      ])}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const valueCls =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
        ? "text-rose-600"
        : "text-slate-900";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-semibold tabular-nums ${valueCls}`}
      >
        {value}
      </div>
    </div>
  );
}

function money(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
