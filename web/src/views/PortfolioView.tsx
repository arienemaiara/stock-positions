import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addLot, fetchPortfolio, removeLot } from "../api/client";
import { AddLotForm } from "../components/portfolio/AddLotForm";
import { PortfolioTable } from "../components/portfolio/PortfolioTable";
import { AllocationDonut } from "../components/portfolio/AllocationDonut";
import { PositionPnLChart } from "../components/portfolio/PositionPnLChart";
import { PortfolioTotals } from "../components/portfolio/PortfolioTotals";

export function PortfolioView({ onAnalyze }: { onAnalyze: (t: string) => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["portfolio"] });

  const addMut = useMutation({ mutationFn: addLot, onSuccess: invalidate });
  const removeMut = useMutation({ mutationFn: removeLot, onSuccess: invalidate });

  return (
    <div className="space-y-6">
      <AddLotForm
        onSubmit={(input) => addMut.mutate(input)}
        isPending={addMut.isPending}
        error={addMut.error ? (addMut.error as Error).message : null}
      />

      {isLoading && <div className="text-slate-500">Loading portfolio…</div>}

      {data && data.positions.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          No lots yet. Add one above. Leave the price blank to derive it from the
          closing price on the trade date.
          <p className="mt-2 text-xs text-slate-400">
            Position tracking only. Not a cost-basis method for tax purposes
            (no FIFO/lot-matching, no fees).
          </p>
        </div>
      )}

      {data && data.positions.length > 0 && (
        <>
          <PortfolioTotals totals={data.totals} />

          <div className="grid gap-6 lg:grid-cols-2">
            <AllocationDonut positions={data.positions} />
            <PositionPnLChart positions={data.positions} />
          </div>

          <PortfolioTable
            positions={data.positions}
            onAnalyze={onAnalyze}
            onRemoveLot={(id) => removeMut.mutate(id)}
          />
        </>
      )}
    </div>
  );
}
