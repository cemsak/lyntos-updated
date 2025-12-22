import React from "react";

type DataQuality = {
  bank_rows_total?: number;
  bank_rows_in_period?: number;
  bank_rows_out_of_period?: number;
  sources_present?: string[];
  warnings?: string[];
};

type PeriodWindow = {
  period?: string;
  start_date?: string;
  end_date?: string;
};

function chip(text: string) {
  return (
    <span className="inline-flex items-center rounded-full border bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
      {text}
    </span>
  );
}

export function DataQualityBand({
  periodWindow,
  dataQuality,
}: {
  periodWindow?: PeriodWindow | null;
  dataQuality?: DataQuality | null;
}) {
  if (!periodWindow && !dataQuality) return null;

  const period = periodWindow?.period;
  const start = periodWindow?.start_date;
  const end = periodWindow?.end_date;

  const total = dataQuality?.bank_rows_total;
  const inP = dataQuality?.bank_rows_in_period;
  const outP = dataQuality?.bank_rows_out_of_period;

  const sources = dataQuality?.sources_present ?? [];
  const warnings = dataQuality?.warnings ?? [];

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Veri Kapsama ve Çeyrek Doğrulama</div>
          <div className="mt-1 text-sm text-slate-600">
            Çeyrek dışı satırlar tespit edilirse otomatik filtrelenir; ayrıca burada raporlanır.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {period ? chip(`Dönem: ${period}`) : null}
          {start && end ? chip(`Aralık: ${start} → ${end}`) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(typeof total === "number") ? chip(`BANK toplam: ${total}`) : null}
        {(typeof inP === "number") ? chip(`Q içi: ${inP}`) : null}
        {(typeof outP === "number") ? chip(`Q dışı (filtre): ${outP}`) : null}
        {sources.length ? chip(`Kaynaklar: ${sources.join(", ")}`) : null}
      </div>

      {warnings.length ? (
        <div className="mt-3 rounded-xl border bg-slate-50 p-3">
          <div className="text-sm font-medium">Uyarılar</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
