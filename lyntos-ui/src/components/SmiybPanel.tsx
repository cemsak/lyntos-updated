"use client";
export default function SmiybPanel({ smiyb }: { smiyb: any }) {
  const skor = smiyb?.skor ?? 0,
    durum = smiyb?.durum ?? "—";
  const nedenler = smiyb?.nedenler || [],
    eksik = smiyb?.eksik || [];
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="mb-1 text-sm font-semibold">
        SMİYB Skoru: {skor} • {durum}
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-300">
        {nedenler.slice(0, 5).map((n: any, i: number) => (
          <div key={i}>
            • {n.neden || n.baslik} — {n.etki}{" "}
            {n.kanit ? `| Kanıt: ${n.kanit}` : ""}{" "}
            {n.oneri ? `| Öneri: ${n.oneri}` : ""}
          </div>
        ))}
        {!nedenler.length && "—"}
      </div>
      {eksik?.length ? (
        <div className="mt-2 text-[11px] text-amber-700">
          Eksik veri: {eksik.slice(0, 6).join(", ")}
          {eksik.length > 6 ? "…" : ""}
        </div>
      ) : null}
    </div>
  );
}
