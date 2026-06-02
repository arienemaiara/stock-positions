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
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {legend && <div className="text-xs">{legend}</div>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
