"use client";
export default function MizanOzetPanel({ rows }: { rows: any[] }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="mb-2 text-sm font-semibold">
        Mizan Özeti (Fark yapan 5 hesap)
      </div>
      <div className="text-xs">
        {rows?.length
          ? rows.map((r: any, i: number) => (
              <div key={i}>
                • {r.hesap || r.ad || "hesap"} — fark:{" "}
                {r.fark ?? (r.borc || 0) - (r.alacak || 0)}
              </div>
            ))
          : "—"}
      </div>
    </div>
  );
}
