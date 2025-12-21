import React from "react";
type Props = { data: any | null, aiResult?: any }; // AI ile çalışacaksa prop
export default function BenfordPanel({ data, aiResult }: Props) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <div className="text-lg font-bold text-blue-900 mb-3">Benford & Outlier Analizi</div>
      {data && Object.keys(data).length > 0 ?
        <ul>
          {/* Senin backend Benford datasına göre ayarla */}
          <li>Toplam Satır: <b>{data.toplam_satir ?? "-"}</b></li>
          <li>Anomali Skoru: <b>{data.anomali_skoru ?? "-"}</b></li>
          {aiResult ? <li>AI Yorumu: {aiResult.comment}</li> : null}
        </ul>
        : <div className="text-gray-400">Veri yok.</div>}
    </div>
  );
}