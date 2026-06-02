import { useEffect, useState, type FormEvent } from "react";

export function TickerSearch(props: {
  initialValue?: string;
  onSubmit: (ticker: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(props.initialValue ?? "");

  useEffect(() => {
    if (props.initialValue) setValue(props.initialValue);
  }, [props.initialValue]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = value.trim().toUpperCase();
    if (t.length > 0) props.onSubmit(t);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div className="flex flex-1 items-center gap-2 px-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="Enter ticker (AAPL, MSFT, NVDA …)"
          className="w-full bg-transparent py-2 text-sm font-semibold uppercase tracking-wider outline-none placeholder:font-medium placeholder:text-slate-400 placeholder:tracking-normal"
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={props.disabled || value.trim().length === 0}
        className="rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400"
      >
        Analyze
      </button>
    </form>
  );
}
