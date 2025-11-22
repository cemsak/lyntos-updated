"use client";
import { fmt } from "@/ui/format";
import ChartBox from "@/components/ChartBox";
import BankReconcileLine from "@/components/BankReconcileLine";
export default function BankCard({ bank, line }: { bank: any; line: any[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500 mb-2">Banka</div>
      <div className="text-xl font-semibold">
        {fmt.try(bank?.totalBalance)}{" "}
        <span className="text-xs text-slate-500">
          ({bank?.accountCount || 0} hesap)
        </span>
      </div>
      <div className="text-xs text-slate-500 mb-3">
        Günlük akış: {fmt.try(bank?.dailyFlow)}
      </div>
      <ChartBox height={160} className="w-full">
        {({ width, height }) => (
          <BankReconcileLine width={width} height={height} data={line} />
        )}
      </ChartBox>
    </div>
  );
}
