import type { BreakdownEntry } from "../api/client";
import { getIndicatorMeta } from "../data/indicatorMeta";
import { formatScorePct } from "../data/format";

export function ScoreContribChart({ rows }: { rows: BreakdownEntry[] }) {
  const data = [...rows].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );

  const maxAbs = Math.max(
    0.01,
    ...data.map((r) => Math.abs(r.contribution)),
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Score contribution
        </h2>
        <p className="text-xs text-slate-500">
          Each indicator's weighted contribution to the verdict. Bar length is
          relative to the largest. The verdict in one picture.
        </p>
      </div>

      <ul className="mt-5 space-y-5">
        {data.map((r) => {
          const meta = getIndicatorMeta(r.id);
          const pct = (Math.abs(r.contribution) / maxAbs) * 100;
          const positive = r.contribution > 0;
          const negative = r.contribution < 0;
          const barFill = positive
            ? "from-emerald-300 to-emerald-500"
            : negative
              ? "from-rose-300 to-rose-500"
              : "from-slate-200 to-slate-300";
          const valueClass = positive
            ? "text-emerald-600"
            : negative
              ? "text-rose-600"
              : "text-slate-400";

          return (
            <li
              key={r.id}
              className="grid grid-cols-[140px_1fr_60px] items-center gap-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">
                  {meta.label}
                </div>
                {!r.available && (
                  <div className="text-[11px] text-slate-400">unavailable</div>
                )}
              </div>

              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={
                    "absolute left-0 top-0 h-full rounded-full bg-gradient-to-r " +
                    barFill
                  }
                  style={{ width: r.available ? `${pct}%` : "0%" }}
                />
              </div>

              <div
                className={`text-right text-sm font-medium tabular-nums ${valueClass}`}
              >
                {r.available ? formatScorePct(r.contribution) : "—"}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
