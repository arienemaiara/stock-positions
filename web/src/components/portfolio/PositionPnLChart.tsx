import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Position } from "../../api/client";

export function PositionPnLChart({ positions }: { positions: Position[] }) {
  const data = positions
    .filter((p) => p.unrealizedPnlPct !== null)
    .map((p) => ({
      ticker: p.ticker,
      pnlPct: (p.unrealizedPnlPct as number) * 100,
      pnl: p.unrealizedPnl ?? 0,
    }))
    .sort((a, b) => Math.abs(b.pnlPct) - Math.abs(a.pnlPct));

  const max = Math.max(5, ...data.map((d) => Math.abs(d.pnlPct)));
  const padded = Math.ceil(max);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="font-medium">Unrealized P/L %</h2>
        <p className="text-xs text-slate-500">
          Per-position unrealized gain/loss. Position cost basis is naive
          average (no FIFO / tax lots).
        </p>
      </div>
      <div className="p-4" style={{ height: 320 }}>
        {data.length === 0 ? (
          <div className="grid h-full place-items-center text-slate-500">
            No priced positions yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 24, left: 0, bottom: 10 }}
            >
              <XAxis
                type="number"
                domain={[-padded, padded]}
                tickFormatter={(v) => `${v}%`}
                stroke="#94a3b8"
                fontSize={11}
              />
              <YAxis
                type="category"
                dataKey="ticker"
                width={80}
                stroke="#475569"
                fontSize={12}
                tick={{ fontFamily: "ui-monospace, monospace" }}
              />
              <ReferenceLine x={0} stroke="#cbd5e1" />
              <Tooltip
                formatter={(v) =>
                  typeof v === "number" ? `${v.toFixed(2)}%` : String(v ?? "")
                }
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              />
              <Bar dataKey="pnlPct" radius={[3, 3, 3, 3]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.pnlPct > 0
                        ? "#10b981"
                        : d.pnlPct < 0
                          ? "#f43f5e"
                          : "#cbd5e1"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
