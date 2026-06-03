import { Fragment, useState } from "react";
import type { Position } from "../../api/client";

export function PortfolioTable({
  positions,
  onAnalyze,
  onRemoveLot,
}: {
  positions: Position[];
  onAnalyze: (t: string) => void;
  onRemoveLot: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Positions</h2>
        <p className="text-xs text-slate-500">
          Click a ticker to analyze it. Click the row to expand individual lots.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr className="text-left">
              <Th>Ticker</Th>
              <Th className="text-right">Shares</Th>
              <Th className="text-right">Avg cost</Th>
              <Th className="text-right">Price</Th>
              <Th className="text-right">Value</Th>
              <Th className="text-right">Unreal. P/L</Th>
              <Th className="text-right">Realized P/L</Th>
              <Th className="text-right">P/L %</Th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const isOpen = expanded === p.ticker;
              return (
                <Fragment key={p.ticker}>
                  <tr
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => setExpanded(isOpen ? null : p.ticker)}
                  >
                    <Td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnalyze(p.ticker);
                        }}
                        className="font-semibold tracking-wide hover:underline"
                      >
                        {p.ticker}
                      </button>
                      <div className="text-xs text-slate-400">
                        {p.currency ?? "?"} · {p.lots.length} lot
                        {p.lots.length === 1 ? "" : "s"}
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {p.totalShares.toFixed(p.totalShares % 1 === 0 ? 0 : 3)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {money(p.avgCost)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {p.currentPrice !== null ? money(p.currentPrice) : "—"}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {p.marketValue !== null ? money(p.marketValue) : "—"}
                    </Td>
                    <Td className="text-right tabular-nums">
                      <PnL value={p.unrealizedPnl} />
                    </Td>
                    <Td className="text-right tabular-nums">
                      <PnL value={p.realizedPnl === 0 ? null : p.realizedPnl} />
                    </Td>
                    <Td className="text-right tabular-nums">
                      <PnLPct value={p.unrealizedPnlPct} />
                    </Td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50">
                      <td colSpan={8} className="px-5 py-3">
                        <table className="w-full text-xs">
                          <thead className="text-slate-500">
                            <tr className="text-left">
                              <th className="py-1 font-medium">Type</th>
                              <th className="py-1 font-medium">Trade date</th>
                              <th className="py-1 text-right font-medium">
                                Shares
                              </th>
                              <th className="py-1 text-right font-medium">
                                Price
                              </th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {p.lots.map((lot) => (
                              <tr
                                key={lot.id}
                                className="border-t border-slate-200/70"
                              >
                                <td className="py-1.5">
                                  <LotTypeBadge type={lot.type} />
                                </td>
                                <td className="py-1.5">{lot.tradeDate}</td>
                                <td className="py-1.5 text-right tabular-nums">
                                  {lot.shares.toFixed(
                                    lot.shares % 1 === 0 ? 0 : 3,
                                  )}
                                </td>
                                <td className="py-1.5 text-right tabular-nums">
                                  {lot.price !== null ? money(lot.price) : "—"}
                                </td>
                                <td className="py-1.5 text-right">
                                  <button
                                    onClick={() => onRemoveLot(lot.id)}
                                    className="rounded px-2 py-0.5 text-slate-500 hover:bg-rose-100 hover:text-rose-700"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LotTypeBadge({ type }: { type: "buy" | "sell" }) {
  const cls =
    type === "buy"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : "bg-rose-100 text-rose-700 ring-rose-200";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${cls}`}
    >
      {type}
    </span>
  );
}

function PnL({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const cls =
    value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-500";
  return (
    <span className={cls}>
      {value >= 0 ? "+" : ""}
      {money(value)}
    </span>
  );
}

function PnLPct({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const cls =
    value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-500";
  return (
    <span className={cls}>
      {value >= 0 ? "+" : ""}
      {(value * 100).toFixed(2)}%
    </span>
  );
}

function money(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-2 font-medium ${className}`}>{children}</th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
