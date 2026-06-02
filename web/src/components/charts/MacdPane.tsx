import { useEffect, useRef } from "react";
import { HistogramSeries, LineSeries, createChart } from "lightweight-charts";
import type { PriceBar } from "../../api/client";
import { ChartCard } from "./ChartCard";

export function MacdPane({
  bars,
  macd,
  signal,
  hist,
}: {
  bars: PriceBar[];
  macd: (number | null)[];
  signal: (number | null)[];
  hist: (number | null)[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || bars.length === 0) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#475569",
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: { borderColor: "#e2e8f0" },
      timeScale: { borderColor: "#e2e8f0" },
    });

    const histSeries = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    });
    histSeries.setData(
      bars
        .map((b, i) => {
          const v = hist[i];
          if (v === null || v === undefined) return null;
          return {
            time: b.date.slice(0, 10),
            value: v,
            color: v >= 0 ? "rgba(16,185,129,0.55)" : "rgba(244,63,94,0.55)",
          };
        })
        .filter(
          (
            v,
          ): v is {
            time: string;
            value: number;
            color: string;
          } => v !== null,
        ),
    );

    const macdSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    macdSeries.setData(
      bars
        .map((b, i) =>
          macd[i] !== null && macd[i] !== undefined
            ? { time: b.date.slice(0, 10), value: macd[i] as number }
            : null,
        )
        .filter((v): v is { time: string; value: number } => v !== null),
    );

    const signalSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    signalSeries.setData(
      bars
        .map((b, i) =>
          signal[i] !== null && signal[i] !== undefined
            ? { time: b.date.slice(0, 10), value: signal[i] as number }
            : null,
        )
        .filter((v): v is { time: string; value: number } => v !== null),
    );

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [bars, macd, signal, hist]);

  return (
    <ChartCard
      title="MACD (12, 26, 9)"
      subtitle="Blue: MACD line. Orange: signal. Histogram: MACD − signal."
    >
      <div ref={ref} style={{ height: 220 }} />
    </ChartCard>
  );
}
