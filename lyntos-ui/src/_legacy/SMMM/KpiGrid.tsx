"use client";
import ScoreBadge from "@/components/ScoreBadge";
import TrendDelta from "./TrendDelta";

function avgRadar(d: any) {
  const arr = Array.isArray(d?.radarContribs) ? d.radarContribs : [];
  if (!arr.length) return 0;
  return Math.round(
    arr.reduce((a: number, b: any) => a + (Number(b.value) || 0), 0) /
      arr.length,
  );
}
function prevLast(trend: any[]) {
  const last = trend?.at?.(-1)?.score ?? 0;
  const prev = trend?.at?.(-2)?.score ?? last;
  return { prev, last };
}

export default function KpiGrid({ data }: { data: any }) {
  const { prev, last } = prevLast(data?.trend || []);
  const KPIS = [
    {
      key: "kurgan",
      label: "Kurgan",
      value: Math.round(data?.parts?.kurgan ?? 0),
      prev: last ? prev : undefined,
      hint: data?.summary,
    },
    {
      key: "smiyb",
      label: "SMİYB",
      value: Math.round(data?.parts?.smiyb ?? 0),
    },
    {
      key: "beyan",
      label: "Beyan Uyum",
      value: Math.round(data?.parts?.beyan ?? 0),
    },
    { key: "radar", label: "Radar Analiz Puanı", value: avgRadar(data) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {KPIS.map((k) => (
        <div
          key={k.key}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">{k.label}</div>
            <ScoreBadge score={k.value} />
          </div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {k.value}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {"prev" in k ? (
              <TrendDelta prev={k.prev as number} last={k.value} />
            ) : null}
            {k.hint ? (
              <span className="text-xs text-slate-400">{k.hint}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
