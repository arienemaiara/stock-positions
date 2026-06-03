import type { CurrencyTotal } from "../../api/client";

export function PortfolioTotals({ totals }: { totals: CurrencyTotal[] }) {
  if (totals.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {totals.flatMap((t) => [
        <Kpi
          key={`${t.currency}-value`}
          label={`Value (${t.currency})`}
          value={money(t.marketValue)}
          sub={`Cost ${money(t.totalCost)}`}
        />,
        <Kpi
          key={`${t.currency}-unrealized`}
          label={`Unrealized (${t.currency})`}
          value={signed(t.unrealizedPnl)}
          sub={`${signed(t.unrealizedPnlPct * 100)}%`}
          tone={t.unrealizedPnl >= 0 ? "good" : "bad"}
        />,
        <Kpi
          key={`${t.currency}-realized`}
          label={`Realized (${t.currency})`}
          value={signed(t.realizedPnl)}
          sub={t.realizedPnl === 0 ? "no sells yet" : "from closed sells"}
          tone={t.realizedPnl > 0 ? "good" : t.realizedPnl < 0 ? "bad" : "neutral"}
        />,
        <Kpi
          key={`${t.currency}-total`}
          label={`Total P/L (${t.currency})`}
          value={signed(t.totalPnl)}
          sub="realized + unrealized"
          tone={t.totalPnl >= 0 ? "good" : "bad"}
        />,
      ])}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad" | "neutral";
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
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function money(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function signed(n: number): string {
  return `${n >= 0 ? "+" : ""}${money(n)}`;
}
