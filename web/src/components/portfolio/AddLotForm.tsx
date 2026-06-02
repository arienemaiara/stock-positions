import { useState, type FormEvent } from "react";
import type { AddLotInput } from "../../api/client";

export function AddLotForm({
  onSubmit,
  isPending,
  error,
}: {
  onSubmit: (input: AddLotInput) => void;
  isPending: boolean;
  error: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [ticker, setTicker] = useState("");
  const [tradeDate, setTradeDate] = useState(today);
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sharesNum = Number(shares);
    if (!ticker.trim() || !Number.isFinite(sharesNum) || sharesNum <= 0) return;
    const priceNum = price.trim() ? Number(price) : null;
    onSubmit({
      ticker: ticker.trim().toUpperCase(),
      tradeDate,
      shares: sharesNum,
      price: priceNum,
    });
    setTicker("");
    setShares("");
    setPrice("");
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="font-medium">Add lot</h2>
        <p className="text-xs text-slate-500">
          Leave price blank to use the closing price on the trade date.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
      >
        <Field label="Ticker">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="AAPL"
          />
        </Field>
        <Field label="Trade date">
          <input
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </Field>
        <Field label="Shares">
          <input
            type="number"
            step="any"
            min="0"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="10"
          />
        </Field>
        <Field label="Price (optional)">
          <input
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="derived"
          />
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
          >
            {isPending ? "Adding…" : "Add lot"}
          </button>
        </div>
      </form>
      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          {error}
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
