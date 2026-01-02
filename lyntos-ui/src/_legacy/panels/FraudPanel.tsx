import React from "react";
export default function FraudPanel({ data }) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <h2 className="text-red-900 text-lg font-bold mb-2">Ağ/Fraud Analizi</h2>
      <div><b>Fraud Skoru:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Açıklama:</b> {data?.explanation ?? <span className="text-gray-400">Açıklama yok.</span>}</div>
      <ul>
        {Array.isArray(data?.sinyaller) && data.sinyaller.length ? (
          data.sinyaller.map((s, i) => (
            <li key={i}><b>{s.tip}:</b> {s.detay}</li>
          ))
        ) : (
          <li className="text-gray-400">Sinyal verisi yok.</li>
        )}
      </ul>
    </div>
  );
}