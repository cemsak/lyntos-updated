"use client";
export default function MizanDrill({ rows }: { rows: any[] }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="mb-2 text-sm font-semibold">Mizan Drill-Down</div>
      <div className="text-xs text-slate-600 dark:text-slate-300">
        Hesap detayları yakında (demo). İlk 5 fark listelendi.
      </div>
      <ul className="mt-2 list-disc pl-5 text-xs">
        {(rows || []).slice(0, 5).map((r: any, i: number) => (
          <li key={i}>
            {r.hesap || r.ad} — {r.fark ?? (r.borc || 0) - (r.alacak || 0)}
          </li>
        ))}
      </ul>
    </div>
  );
}
