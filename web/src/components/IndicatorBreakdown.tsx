import type { BreakdownEntry } from "../api/client";
import { getIndicatorMeta } from "../data/indicatorMeta";
import { formatScorePct, readingLabel, readingTone } from "../data/format";

// Stable display order, grouped by category. Anything not listed falls to the
// bottom in its original order.
const INDICATOR_ORDER = [
  // Valuation
  "pe_vs_sector",
  "forward_pe",
  "ev_to_ebitda",
  "peg",
  "implied_growth_vs_trend",
  // Quality / profitability
  "roe",
  "roic",
  // Balance sheet
  "debt_to_equity",
  "net_debt_to_ebitda",
  // Growth
  "fcf_growth",
  // Trend / momentum
  "sma_trend",
  "sma_90_trend",
  "macd",
  "rsi",
  "volume_confirm",
];

export function IndicatorBreakdown({ rows }: { rows: BreakdownEntry[] }) {
  const rank = new Map(INDICATOR_ORDER.map((id, i) => [id, i]));
  const sorted = [...rows].sort((a, b) => {
    const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Indicator breakdown
        </h2>
        <p className="text-xs text-slate-500">
          Each indicator's raw value, the engine's reading, its weight, and how
          much it shifts the final score. Buy at total ≥ +30%, Sell at ≤ −30%.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr className="text-left">
            <Th>Indicator</Th>
            <Th className="text-right">Value</Th>
            <Th className="text-right">Reading</Th>
            <Th className="text-right">Weight</Th>
            <Th className="text-right">Impact</Th>
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
                <Td className="text-right">
                  {r.available ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={
                          "text-sm font-medium " +
                          (readingTone(r.subScore) === "good"
                            ? "text-emerald-600"
                            : readingTone(r.subScore) === "bad"
                              ? "text-rose-600"
                              : "text-slate-500")
                        }
                      >
                        {readingLabel(r.subScore)}
                      </span>
                      <SubScoreBar value={r.subScore} />
                    </div>
                  ) : (
                    "—"
                  )}
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
                    {formatScorePct(r.contribution)}
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

function SubScoreBar({ value }: { value: number }) {
  const pct = Math.min(Math.abs(value), 1) * 50;
  const fill =
    value > 0
      ? "bg-gradient-to-r from-emerald-300 to-emerald-500"
      : value < 0
        ? "bg-gradient-to-l from-rose-500 to-rose-300"
        : "bg-slate-300";
  return (
    <div className="relative h-1.5 w-20 rounded-full bg-slate-100">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-300" />
      <div
        className={`absolute top-0 h-full rounded-full ${fill}`}
        style={
          value >= 0
            ? { left: "50%", width: `${pct}%` }
            : { right: "50%", width: `${pct}%` }
        }
      />
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
