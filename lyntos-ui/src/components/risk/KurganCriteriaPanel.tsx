import React from "react";

type CriterionStatus = "OK" | "WARN" | "MISSING" | "UNKNOWN";

type MissingRef = {
  code: string;
  title_tr: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  how_to_fix_tr?: string;
};

export type KurganCriterionSignal = {
  code: string;                // KRG-01..KRG-13
  status: CriterionStatus;     // OK/WARN/MISSING/UNKNOWN
  score: number;               // 0..100
  weight?: number;
  rationale_tr?: string;
  evidence_refs?: Array<{ artifact_id: string; note?: string }>;
  missing_refs?: MissingRef[];
};

function statusBadge(status: CriterionStatus) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  if (status === "MISSING") return `${base} border-red-300 bg-red-50 text-red-700`;
  if (status === "WARN") return `${base} border-amber-300 bg-amber-50 text-amber-800`;
  if (status === "OK") return `${base} border-emerald-300 bg-emerald-50 text-emerald-800`;
  return `${base} border-slate-300 bg-slate-50 text-slate-700`;
}

function titleFor(code: string) {
  const map: Record<string, string> = {
    "KRG-11": "Ödeme",
    "KRG-02": "Oranlama",
    "KRG-01": "Faaliyet Konusu",
    "KRG-10": "Sevkiyat",
    "KRG-09": "E-İmza Tarih Uyumu",
    "KRG-04": "Vergiye Uyum",
  };
  return map[code] || code;
}

export function KurganCriteriaPanel({ signals }: { signals?: KurganCriterionSignal[] }) {
  if (!signals || signals.length === 0) return null;

  const order: Record<CriterionStatus, number> = { MISSING: 0, WARN: 1, UNKNOWN: 2, OK: 3 };
  const sorted = [...signals].sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99));

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">KURGAN Kanıt Kontrolleri</div>
          <div className="mt-1 text-sm text-slate-600">
            Bu bölüm, işlemin/tespitin riskini “kesin hüküm” olarak değil; kanıt tamlığı ve uyarı sinyali olarak sunar.
          </div>
        </div>
        <div className="text-xs text-slate-500">{signals.length} kriter</div>
      </div>

      <div className="mt-4 space-y-3">
        {sorted.map((s) => (
          <div key={s.code} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={statusBadge(s.status)}>{s.status}</span>
                <div className="font-medium">{titleFor(s.code)}</div>
                <div className="text-xs text-slate-500">{s.code}</div>
              </div>
              <div className="text-sm text-slate-700">
                Skor: <span className="font-semibold">{Math.round(s.score ?? 0)}</span>
              </div>
            </div>

            {s.rationale_tr ? (
              <div className="mt-2 text-sm text-slate-700">{s.rationale_tr}</div>
            ) : null}

            {(s.missing_refs && s.missing_refs.length > 0) ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <div className="text-sm font-medium">Eksik Kanıtlar</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  {s.missing_refs.map((m) => (
                    <li key={m.code}>
                      <span className="font-medium">{m.title_tr}</span>
                      {m.how_to_fix_tr ? (
                        <div className="mt-1 text-xs text-slate-600">{m.how_to_fix_tr}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
