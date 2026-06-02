import type { AnalysisResponse } from "../api/client";
import { INDICATOR_META } from "../data/indicatorMeta";

const VERDICT_BADGE: Record<AnalysisResponse["verdict"], string> = {
  buy: "bg-emerald-500 text-white",
  hold: "bg-amber-400 text-amber-950",
  sell: "bg-rose-500 text-white",
};

const VERDICT_GLOW: Record<AnalysisResponse["verdict"], string> = {
  buy: "from-emerald-50 to-white",
  hold: "from-amber-50 to-white",
  sell: "from-rose-50 to-white",
};

export function VerdictCard({ data }: { data: AnalysisResponse }) {
  const date = new Date(data.asOf);
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-gradient-to-br ${VERDICT_GLOW[data.verdict]} p-6 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-semibold font-mono tracking-tight">
              {data.ticker}
            </div>
            {data.currentPrice !== null && (
              <div className="text-lg font-mono text-slate-700">
                {data.currency ?? ""} {data.currentPrice.toFixed(2)}
              </div>
            )}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {data.sector ?? "Sector unknown"}
            {data.sectorRefPE !== null && (
              <span className="text-slate-400">
                {" "}
                · sector ETF P/E {data.sectorRefPE.toFixed(1)}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            as of {date.toLocaleString()}
          </div>
        </div>

        <div className="text-right">
          <div
            className={`inline-block rounded-md px-4 py-1.5 text-sm font-bold uppercase tracking-wider ${VERDICT_BADGE[data.verdict]}`}
          >
            {data.verdict}
          </div>
          <div className="mt-3 font-mono text-3xl tabular-nums">
            {data.score >= 0 ? "+" : ""}
            {data.score.toFixed(3)}
          </div>
          <div className="text-xs text-slate-500">weighted score</div>
        </div>
      </div>

      {data.flags.length > 0 && (
        <div className="mt-5 rounded-md bg-white/70 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          <div className="mb-1 font-medium uppercase tracking-wide text-slate-500">
            Data notes
          </div>
          <ul className="list-disc space-y-0.5 pl-5">
            {data.flags.map((f) => (
              <li key={f}>{prettifyFlag(f)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-400">
        Decision support, not financial advice. The verdict is the weighted sum
        of the indicators below — nothing more.
      </div>
    </div>
  );
}

function prettifyFlag(flag: string): string {
  const match = flag.match(/^(\w+) unavailable/);
  const meta = match ? INDICATOR_META[match[1]!] : undefined;
  if (meta) return `${meta.label} couldn't be calculated (data unavailable)`;
  return flag;
}
