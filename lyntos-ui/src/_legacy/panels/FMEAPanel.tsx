import React from "react";
export default function FMEAPanel({ data }) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <h2 className="text-green-800 text-lg font-bold mb-2">FMEA Risk Analizi</h2>
      <div><b>FMEA Skoru:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Açıklama:</b> {data?.explanation ?? <span className="text-gray-400">Açıklama yok.</span>}</div>
      <ul>
        {Array.isArray(data?.modlar) && data.modlar.length ? (
          data.modlar.map((mod, i) => (
            <li key={i}><b>{mod.mod}</b> – Etki: {mod.etki} – Öncelik (RPN): {mod.rpn}</li>
          ))
        ) : (
          <li className="text-gray-400">Modül verisi yok.</li>
        )}
      </ul>
    </div>
  );
}