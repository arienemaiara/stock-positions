import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addToWatchlist,
  fetchWatchlist,
  removeFromWatchlist,
  toggleFavorite,
  type WatchlistEntry,
} from "../api/client";

export function WatchlistView({ onAnalyze }: { onAnalyze: (t: string) => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["watchlist"] });

  const add = useMutation({
    mutationFn: addToWatchlist,
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: invalidate,
  });
  const fav = useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) =>
      toggleFavorite(id, isFavorite),
    onSuccess: invalidate,
  });

  const [input, setInput] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const t = input.trim().toUpperCase();
    if (t) {
      add.mutate(t);
      setInput("");
    }
  }

  const favorites = data?.filter((e) => e.isFavorite) ?? [];
  const rest = data?.filter((e) => !e.isFavorite) ?? [];

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
      >
        <div className="flex flex-1 items-center gap-2 px-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Add ticker to watchlist"
            className="w-full bg-transparent py-2 text-sm font-semibold uppercase tracking-wider outline-none placeholder:font-medium placeholder:text-slate-400 placeholder:tracking-normal"
          />
        </div>
        <button
          type="submit"
          disabled={add.isPending || !input.trim()}
          className="rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400"
        >
          Add
        </button>
      </form>

      {isLoading && <Loading />}
      {add.error && <ErrorBanner message={(add.error as Error).message} />}

      {data && data.length === 0 && (
        <EmptyState message="No tickers yet. Add one above or star a ticker from the Analyze view." />
      )}

      {favorites.length > 0 && (
        <Group
          title="Favorites"
          entries={favorites}
          onAnalyze={onAnalyze}
          onRemove={(id) => remove.mutate(id)}
          onFav={(id, isFav) => fav.mutate({ id, isFavorite: isFav })}
        />
      )}
      {rest.length > 0 && (
        <Group
          title={favorites.length > 0 ? "Others" : "Tracked"}
          entries={rest}
          onAnalyze={onAnalyze}
          onRemove={(id) => remove.mutate(id)}
          onFav={(id, isFav) => fav.mutate({ id, isFavorite: isFav })}
        />
      )}
    </div>
  );
}

function Group({
  title,
  entries,
  onAnalyze,
  onRemove,
  onFav,
}: {
  title: string;
  entries: WatchlistEntry[];
  onAnalyze: (t: string) => void;
  onRemove: (id: number) => void;
  onFav: (id: number, isFav: boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-6 pt-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">
          {entries.length} ticker{entries.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="mt-2 divide-y divide-slate-100">
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50"
          >
            <button
              onClick={() => onFav(e.id, !e.isFavorite)}
              className="grid h-8 w-8 place-items-center rounded-lg text-lg leading-none hover:bg-slate-100"
              title={e.isFavorite ? "Unstar" : "Star"}
            >
              <span className={e.isFavorite ? "text-amber-500" : "text-slate-300"}>
                {e.isFavorite ? "★" : "☆"}
              </span>
            </button>
            <button
              onClick={() => onAnalyze(e.ticker)}
              className="flex-1 text-left text-base font-semibold tracking-wide text-slate-800 hover:text-sky-600"
            >
              {e.ticker}
            </button>
            <div className="text-xs text-slate-400">
              added {new Date(e.createdAt + "Z").toLocaleDateString()}
            </div>
            <button
              onClick={() => onRemove(e.id)}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Loading() {
  return <div className="text-slate-500">Loading watchlist…</div>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
      {message}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
      {message}
    </div>
  );
}
