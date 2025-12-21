"use client";
import { fmt } from "@/ui/format";
export default function MizanCard({ book }: { book: any }) {
  const ok = !!book?.balanced;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500 mb-2">Mizan Dengesi</div>
      <div className="text-2xl font-semibold">
        {ok ? "Dengeli" : "Dengesiz"}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        Borç: {fmt.try(book?.debitTotal)} • Alacak: {fmt.try(book?.creditTotal)}{" "}
        • Hesap: {book?.accountCount || 0}
      </div>
    </div>
  );
}
