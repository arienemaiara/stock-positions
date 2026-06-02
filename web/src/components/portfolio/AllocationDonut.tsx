import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Position } from "../../api/client";

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

export function AllocationDonut({ positions }: { positions: Position[] }) {
  const data = positions
    .filter((p) => p.marketValue !== null && p.marketValue > 0)
    .map((p) => ({
      name: p.ticker,
      value: p.marketValue!,
    }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-6 pt-4">
        <h2 className="text-lg font-semibold text-slate-900">Allocation</h2>
        <p className="text-xs text-slate-500">
          Share of total market value by ticker.
        </p>
      </div>
      <div className="p-4" style={{ height: 320 }}>
        {data.length === 0 ? (
          <div className="grid h-full place-items-center text-slate-500">
            No priced positions yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={1}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => {
                  const n = typeof v === "number" ? v : 0;
                  return [
                    `${money(n)} (${((n / total) * 100).toFixed(1)}%)`,
                    String(name ?? ""),
                  ];
                }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
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
