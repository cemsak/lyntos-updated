"use client";
export default function BeyanOzetPanel({ rows }: { rows: any[] }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="mb-2 text-sm font-semibold">Beyanname Özeti</div>
      <div className="text-xs">
        {rows?.length
          ? rows.map((r: any, i: number) => (
              <div key={i}>
                • {r.ad} — {r.durum} (risk: {r.risk || "—"})
              </div>
            ))
          : "—"}
      </div>
    </div>
  );
}
