import { useState, type FormEvent } from "react";
import type { AddLotInput, LotType } from "../../api/client";

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
  const [type, setType] = useState<LotType>("buy");
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
      type,
    });
    setTicker("");
    setShares("");
    setPrice("");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Add {type === "buy" ? "buy" : "sell"}
          </h2>
          <p className="text-xs text-slate-500">
            Leave price blank to use the closing price on the trade date.
            {type === "sell" && " Sells reduce shares + cost basis at the running average."}
          </p>
        </div>
        <BuySellToggle value={type} onChange={setType} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
      >
        <Field label="Ticker">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold uppercase tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
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
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="10"
          />
        </Field>
        <Field label={type === "buy" ? "Buy price (opt)" : "Sell price (opt)"}>
          <input
            type="number"
            step="any"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="derived"
          />
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className={
              "rounded-xl px-5 py-2 text-sm font-medium text-white shadow-sm disabled:from-slate-300 disabled:to-slate-400 " +
              (type === "buy"
                ? "bg-gradient-to-br from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700"
                : "bg-gradient-to-br from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800")
            }
          >
            {isPending
              ? "Saving…"
              : type === "buy"
                ? "Add buy"
                : "Add sell"}
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

function BuySellToggle({
  value,
  onChange,
}: {
  value: LotType;
  onChange: (v: LotType) => void;
}) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1">
      <ToggleButton active={value === "buy"} onClick={() => onChange("buy")}>
        Buy
      </ToggleButton>
      <ToggleButton active={value === "sell"} onClick={() => onChange("sell")}>
        Sell
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-lg px-3 py-1 text-xs font-semibold transition-colors " +
        (active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-800")
      }
    >
      {children}
    </button>
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
