"use client";

import React from "react";
import { Pill, SectionCard, JsonBox } from "@/components/v1/ui/Atoms";

type AnyObj = Record<string, any>;

function safeArray(x: any): any[] {
  return Array.isArray(x) ? x : [];
}

export default function R401AView({ contract }: { contract: AnyObj }) {
  const risk = contract?.risk ?? {};
  const ev = risk?.evidence_details ?? {};
  const pack = ev?.evidence_pack ?? {};

  const fromValueFound = safeArray(risk?.value_found?.missing_102_details);
  const fromPack = safeArray(pack?.missing_102_details);
  const missingRows = fromPack.length ? fromPack : fromValueFound;

  const checklist = safeArray(pack?.checklist).length ? safeArray(pack?.checklist) : safeArray(risk?.checklist);
  const recommended = safeArray(pack?.recommended_files);

  return (
    <div className="space-y-6">
      <SectionCard title="Özet">
        <div className="flex flex-wrap gap-2">
          <Pill label={`missing_102_details: ${missingRows.length}`} />
          <Pill label={`checklist: ${checklist.length}`} />
          <Pill label={`recommended_files: ${recommended.length}`} />
        </div>
        <div className="mt-3 text-sm text-slate-700">
          Bu risk genelde “mizan 102 alt hesap var ama ilgili dönemde banka ekstresi/delil dosyası eksik olabilir”
          anlamına gelir. Amaç: eksik dosyayı tamamlayıp riski kapatmak ve alt hesabı doğru banka/IBAN ile eşleştirmek.
        </div>
      </SectionCard>

      <SectionCard title="102 Alt Hesap Detayı">
        {missingRows.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Hesap</th>
                  <th className="py-2 text-left">Açıklama</th>
                  <th className="py-2 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {missingRows.map((r: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{r?.account_code ?? "-"}</td>
                    <td className="py-2">{r?.account_name ?? "-"}</td>
                    <td className="py-2 text-right">{(r?.amount ?? "-").toLocaleString?.() ?? r?.amount ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>Detay bulunamadı.</div>
        )}
      </SectionCard>

      <SectionCard title="Kontrol Listesi">
        {checklist.length ? (
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {checklist.map((c: any, i: number) => (
              <li key={i}>{String(c)}</li>
            ))}
          </ul>
        ) : (
          <div>Checklist bulunamadı.</div>
        )}
      </SectionCard>

      <SectionCard title="Önerilen Dosyalar">
        {recommended.length ? (
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {recommended.map((f: any, i: number) => (
              <li key={i}>{String(f)}</li>
            ))}
          </ul>
        ) : (
          <div>Önerilen dosya listesi bulunamadı.</div>
        )}
      </SectionCard>

      <SectionCard title="Ham JSON (her zaman mevcut)">
        <JsonBox value={contract} />
      </SectionCard>
    </div>
  );
}
