import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addToWatchlist,
  fetchWatchlist,
  removeFromWatchlist,
  toggleFavorite,
} from "../api/client";

export function WatchlistStar({ ticker }: { ticker: string }) {
  const qc = useQueryClient();
  const { data: list } = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    staleTime: 30_000,
  });
  const entry = list?.find((e) => e.ticker === ticker);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["watchlist"] });

  const add = useMutation({
    mutationFn: () => addToWatchlist(ticker),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => removeFromWatchlist(id),
    onSuccess: invalidate,
  });
  const fav = useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) =>
      toggleFavorite(id, isFavorite),
    onSuccess: invalidate,
  });

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {entry ? (
        <button
          onClick={() => remove.mutate(entry.id)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          title="Remove from watchlist"
        >
          ✓ Watching
        </button>
      ) : (
        <button
          onClick={() => add.mutate()}
          disabled={add.isPending}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          + Watch
        </button>
      )}

      {entry && (
        <button
          onClick={() => fav.mutate({ id: entry.id, isFavorite: !entry.isFavorite })}
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-xl leading-none hover:bg-slate-50"
          title={entry.isFavorite ? "Unstar" : "Star"}
        >
          <span className={entry.isFavorite ? "text-amber-500" : "text-slate-300"}>
            {entry.isFavorite ? "★" : "☆"}
          </span>
        </button>
      )}
    </div>
  );
}
