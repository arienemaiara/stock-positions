import { useEffect, useRef } from "react";
import { LineSeries, createChart } from "lightweight-charts";
import type { PriceBar } from "../../api/client";
import { ChartCard } from "./ChartCard";

export function RsiPane({
  bars,
  rsi,
}: {
  bars: PriceBar[];
  rsi: (number | null)[];
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
      rightPriceScale: {
        borderColor: "#e2e8f0",
      },
      timeScale: { borderColor: "#e2e8f0" },
    });

    const rsiSeries = chart.addSeries(LineSeries, {
      color: "#6366f1",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    rsiSeries.setData(
      bars
        .map((b, i) =>
          rsi[i] !== null && rsi[i] !== undefined
            ? { time: b.date.slice(0, 10), value: rsi[i] as number }
            : null,
        )
        .filter((v): v is { time: string; value: number } => v !== null),
    );

    rsiSeries.createPriceLine({
      price: 70,
      color: "#f43f5e",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "70",
    });
    rsiSeries.createPriceLine({
      price: 30,
      color: "#10b981",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "30",
    });
    rsiSeries.createPriceLine({
      price: 50,
      color: "#cbd5e1",
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: false,
      title: "",
    });

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [bars, rsi]);

  return (
    <ChartCard
      title="RSI (14)"
      subtitle="Wilder's Relative Strength Index. >70 overbought, <30 oversold."
    >
      <div ref={ref} style={{ height: 220 }} />
    </ChartCard>
  );
}
