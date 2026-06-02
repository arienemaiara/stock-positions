import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  children,
  legend,
}: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {legend && <div className="text-xs">{legend}</div>}
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}
