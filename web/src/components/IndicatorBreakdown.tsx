import type { BreakdownEntry } from "../api/client";
import { getIndicatorMeta } from "../data/indicatorMeta";

export function IndicatorBreakdown({ rows }: { rows: BreakdownEntry[] }) {
  const sorted = [...rows].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Indicator breakdown
        </h2>
        <p className="text-xs text-slate-500">
          Each indicator's value, sub-score, weight, and weighted contribution.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr className="text-left">
            <Th>Indicator</Th>
            <Th className="text-right">Value</Th>
            <Th className="text-right">Sub-score</Th>
            <Th className="text-right">Weight</Th>
            <Th className="text-right">Contribution</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const meta = getIndicatorMeta(r.id);
            return (
              <tr
                key={r.id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{meta.label}</span>
                    {meta.long && <InfoIcon title={meta.long} />}
                  </div>
                  {meta.short && (
                    <div className="mt-0.5 text-xs text-slate-500">
                      {meta.short}
                    </div>
                  )}
                </Td>
                <Td className="text-right tabular-nums">
                  {r.available ? formatValue(r.value) : "—"}
                </Td>
                <Td className="text-right tabular-nums">
                  {r.available ? r.subScore.toFixed(2) : "—"}
                </Td>
                <Td className="text-right tabular-nums">
                  {(r.weight * 100).toFixed(1)}%
                  <div className="text-xs text-slate-400">
                    raw {(r.rawWeight * 100).toFixed(0)}%
                  </div>
                </Td>
                <Td className="text-right tabular-nums">
                  <span
                    className={
                      r.contribution > 0
                        ? "text-emerald-600"
                        : r.contribution < 0
                          ? "text-rose-600"
                          : "text-slate-400"
                    }
                  >
                    {r.contribution >= 0 ? "+" : ""}
                    {r.contribution.toFixed(3)}
                  </span>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InfoIcon({ title }: { title: string }) {
  return (
    <span className="group relative inline-flex">
      <span
        role="img"
        aria-label={title}
        className="cursor-help select-none text-xs text-slate-400 hover:text-slate-700"
      >
        ⓘ
      </span>
      <span
        role="tooltip"
        className="invisible absolute left-0 top-full z-30 mt-1.5 w-72 rounded-md bg-slate-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed text-slate-100 opacity-0 shadow-lg ring-1 ring-slate-700 transition-opacity duration-100 group-hover:visible group-hover:opacity-100"
      >
        {title}
      </span>
    </span>
  );
}

function formatValue(v: number | null): string {
  if (v === null) return "—";
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(2);
  return v.toFixed(3);
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-4 py-2 font-medium ${className}`}>{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
