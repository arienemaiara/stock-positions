import type { AnalysisResponse } from "../api/client";
import { INDICATOR_META } from "../data/indicatorMeta";

const VERDICT_BADGE: Record<AnalysisResponse["verdict"], string> = {
  buy: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  hold: "bg-amber-100 text-amber-700 ring-amber-200",
  sell: "bg-rose-100 text-rose-700 ring-rose-200",
};

export function VerdictCard({ data }: { data: AnalysisResponse }) {
  const date = new Date(data.asOf);

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <KpiCard label="Current price">
        <Value>
          {data.currentPrice !== null
            ? `${data.currency ?? ""} ${data.currentPrice.toFixed(2)}`
            : "—"}
        </Value>
      </KpiCard>

      <KpiCard label="Market cap">
        <Value>
          {data.marketCap != null ? formatMarketCap(data.marketCap) : "—"}
        </Value>
      </KpiCard>

      <KpiCard label="Sector ETF P/E">
        <Value>
          {data.sectorRefPE !== null ? data.sectorRefPE.toFixed(1) : "—"}
        </Value>
        <Sub>{data.sector ?? "Sector unknown"}</Sub>
      </KpiCard>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Verdict
          </div>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${VERDICT_BADGE[data.verdict]}`}
          >
            {data.verdict}
          </span>
        </div>
        <div
          className={
            "mt-2 text-3xl font-semibold tabular-nums " +
            (data.score > 0
              ? "text-emerald-600"
              : data.score < 0
                ? "text-rose-600"
                : "text-slate-900")
          }
        >
          {data.score >= 0 ? "+" : ""}
          {data.score.toFixed(3)}
        </div>
        <Sub>weighted score · {data.ticker}</Sub>
      </div>

      {data.flags.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 lg:col-span-4">
          <div className="mb-1 font-medium uppercase tracking-wide">
            Data notes
          </div>
          <ul className="list-disc space-y-0.5 pl-5">
            {data.flags.map((f) => (
              <li key={f}>{prettifyFlag(f)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-[11px] text-slate-400 lg:col-span-4">
        Decision support, not financial advice. The verdict is the weighted sum
        of the indicators below — nothing more. Data as of {date.toLocaleString()}.
      </div>
    </div>
  );
}

function KpiCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
      {children}
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-xs text-slate-400">{children}</div>;
}

function formatMarketCap(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function prettifyFlag(flag: string): string {
  const match = flag.match(/^(\w+) unavailable/);
  const meta = match ? INDICATOR_META[match[1]!] : undefined;
  if (meta) return `${meta.label} couldn't be calculated (data unavailable)`;
  return flag;
}
