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
      className="flex gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="Enter ticker (AAPL, MSFT, NVDA …)"
        className="flex-1 rounded-md bg-slate-50 px-4 py-2 font-mono text-sm uppercase tracking-wide focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
        autoFocus
      />
      <button
        type="submit"
        disabled={props.disabled || value.trim().length === 0}
        className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-400"
      >
        Analyze
      </button>
    </form>
  );
}
