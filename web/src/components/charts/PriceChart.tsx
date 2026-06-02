import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
} from "lightweight-charts";
import type { PriceBar } from "../../api/client";
import { ChartCard } from "./ChartCard";

export function PriceChart({
  bars,
  sma50,
  sma200,
}: {
  bars: PriceBar[];
  sma50: (number | null)[];
  sma200: (number | null)[];
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
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: {
        borderColor: "#e2e8f0",
        scaleMargins: { top: 0.05, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#e2e8f0",
        rightOffset: 4,
      },
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });
    candle.setData(
      bars.map((b) => ({
        time: b.date.slice(0, 10),
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    );

    const sma50Series = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      title: "SMA 50",
    });
    sma50Series.setData(
      bars
        .map((b, i) =>
          sma50[i] !== null && sma50[i] !== undefined
            ? { time: b.date.slice(0, 10), value: sma50[i] as number }
            : null,
        )
        .filter((v): v is { time: string; value: number } => v !== null),
    );

    const sma200Series = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      title: "SMA 200",
    });
    sma200Series.setData(
      bars
        .map((b, i) =>
          sma200[i] !== null && sma200[i] !== undefined
            ? { time: b.date.slice(0, 10), value: sma200[i] as number }
            : null,
        )
        .filter((v): v is { time: string; value: number } => v !== null),
    );

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volume.setData(
      bars.map((b) => ({
        time: b.date.slice(0, 10),
        value: b.volume,
        color: b.close >= b.open ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)",
      })),
    );

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [bars, sma50, sma200]);

  return (
    <ChartCard
      title="Price · SMA50 · SMA200 · Volume"
      subtitle="Daily candles with 50- and 200-day moving averages; volume in the lower pane."
    >
      <div ref={ref} style={{ height: 380 }} />
    </ChartCard>
  );
}
