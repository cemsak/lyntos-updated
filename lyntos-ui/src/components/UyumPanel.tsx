"use client";
export default function UyumPanel({
  uyum,
  banka,
}: {
  uyum: any;
  banka: number;
}) {
  const b = uyum?.banka_mizan;
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="mb-2 text-sm font-semibold">Vergi Uyum / Banka–Mizan</div>
      <div className="text-xs">
        Banka toplamı: ₺{(banka || 0).toLocaleString("tr-TR")} • Uyum:{" "}
        {b?.durum ? "Evet" : "—"}
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
        {b?.detay || "—"}
      </div>
    </div>
  );
}
