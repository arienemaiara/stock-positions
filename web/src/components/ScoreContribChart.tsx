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
import type { BreakdownEntry } from "../api/client";
import { getIndicatorMeta } from "../data/indicatorMeta";

export function ScoreContribChart({ rows }: { rows: BreakdownEntry[] }) {
  const data = [...rows]
    .map((r) => ({
      id: getIndicatorMeta(r.id).label,
      contribution: r.contribution,
      available: r.available,
      subScore: r.subScore,
      weight: r.weight,
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const max = Math.max(0.5, ...data.map((d) => Math.abs(d.contribution)));
  const padded = Math.ceil(max * 10) / 10;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="font-medium">Score contribution</h2>
        <p className="text-xs text-slate-500">
          Each indicator's weighted contribution to the total. The verdict in
          one picture.
        </p>
      </div>
      <div className="p-4" style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 24, left: 0, bottom: 10 }}
          >
            <XAxis
              type="number"
              domain={[-padded, padded]}
              tickFormatter={(v) => v.toFixed(2)}
              stroke="#94a3b8"
              fontSize={11}
            />
            <YAxis
              type="category"
              dataKey="id"
              width={150}
              stroke="#475569"
              fontSize={12}
            />
            <ReferenceLine x={0} stroke="#cbd5e1" />
            <Tooltip
              formatter={(v) =>
                typeof v === "number" ? v.toFixed(3) : String(v ?? "")
              }
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}
            />
            <Bar dataKey="contribution" radius={[3, 3, 3, 3]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    !d.available
                      ? "#cbd5e1"
                      : d.contribution > 0
                        ? "#10b981"
                        : d.contribution < 0
                          ? "#f43f5e"
                          : "#cbd5e1"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

