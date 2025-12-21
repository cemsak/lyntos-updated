"use client";
export default function BeyanStatus({ items }: { items: any[] }) {
  const tone = (s: string) =>
    s === "Onaylandı"
      ? "bg-green-100 text-green-700"
      : s === "Bekliyor"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500 mb-2">Beyanname Uyum</div>
      <ul className="space-y-2">
        {(items || []).map((x, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className={"px-2 py-0.5 rounded-full text-xs " + tone(x.status)}
            >
              {x.name}
            </span>
            <span className="text-xs text-slate-500">
              Durum: {x.status} • Risk: {x.risk}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
