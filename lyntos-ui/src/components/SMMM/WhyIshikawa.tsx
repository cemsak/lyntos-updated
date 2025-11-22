"use client";
import { analyzeAnomalies } from "@/ai/anomaly";
import { buildFiveWhys, buildFishbone } from "@/ai/whyish";
import FiveWhys from "@/components/FiveWhys";
import IshikawaLite from "@/components/IshikawaLite";

export default function WhyIshikawa({ data }: { data: any }) {
  const anomalies = analyzeAnomalies(data);
  const pick = anomalies.sort((a, b) => {
    const w = (x: any) => (x === "high" ? 3 : x === "med" ? 2 : 1);
    return w(b.severity) - w(a.severity);
  })[0];

  if (!pick) return null;

  const whys = buildFiveWhys(pick);
  const fish = buildFishbone(pick);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500 mb-2">5 Why Analizi</div>
        <FiveWhys whys={whys} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500 mb-2">
          Balıkkılçığı (Ishikawa)
        </div>
        <IshikawaLite fish={fish} />
      </div>
    </div>
  );
}
