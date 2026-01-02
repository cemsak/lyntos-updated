"use client";
import { analyzeAnomalies } from "@/ai/anomaly";

function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "ok" | "warn" | "fail" | "neutral";
  children: any;
}) {
  const map: any = {
    ok: "bg-green-100 text-green-700",
    warn: "bg-amber-100 text-amber-700",
    fail: "bg-red-100 text-red-700",
    neutral: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={
        "px-2 py-0.5 rounded-full text-xs " + (map[tone] || map.neutral)
      }
    >
      {children}
    </span>
  );
}

export default function AnalystPanels({ data }: { data: any }) {
  const vdk =
    data?.vdk_uzmani_yorumu ||
    data?.vdkYorumu ||
    "VDK yorumu (demo/gerçek): veri yok.";
  const ai =
    data?.ai_analizi || data?.ai || "AI analiz: veri yoksa normalizer üretir.";
  const anomalies = analyzeAnomalies(data);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500 mb-2">VDK Uzman Analizi</div>
        <p className="text-sm text-slate-800 leading-6">{String(vdk)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500 mb-2">AI Analizi</div>
        <p className="text-sm text-slate-800 leading-6">{String(ai)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-500 mb-2">Anomali Durumu</div>
        <ul className="space-y-2">
          {anomalies.length ? (
            anomalies.map((a, i) => (
              <li key={i} className="text-sm leading-5">
                <div className="flex items-center gap-2">
                  <strong>{a.title}</strong>
                  <Badge
                    tone={
                      a.severity === "high"
                        ? "fail"
                        : a.severity === "med"
                          ? "warn"
                          : "ok"
                    }
                  >
                    {a.severity.toUpperCase()}
                  </Badge>
                  <Badge tone="neutral">{a.tag}</Badge>
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  Kanıt: {a.evidence}
                </div>
                <div className="text-slate-700 text-xs mt-1">
                  Öneri: {a.suggestion}
                </div>
              </li>
            ))
          ) : (
            <li className="text-sm text-slate-500">Anomali saptanmadı.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
