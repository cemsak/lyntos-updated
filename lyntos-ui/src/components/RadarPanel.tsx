"use client";
import RadarGauge from "@/components/charts/RadarGauge";
export default function RadarPanel({
  radar,
  reasons,
}: {
  radar: any;
  reasons: any[];
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="mb-2 text-sm font-semibold">RADAR Skoru</div>
      <RadarGauge value={radar?.skor || 0} />
      <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
        {reasons?.length
          ? reasons.slice(0, 4).map((r: any, i: number) => (
              <div key={i}>
                • {r?.neden || r?.baslik || "Sebep"}{" "}
                {r?.etki ? `(${r.etki})` : ""}
              </div>
            ))
          : "—"}
      </div>
    </div>
  );
}
