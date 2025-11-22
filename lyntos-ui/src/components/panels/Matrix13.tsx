import React from "react";
export default function Matrix13({ data }) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <h2 className="text-sky-800 text-lg font-bold mb-2">Matrix 13</h2>
      <div><b>Toplam Skor:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Özet:</b> {data?.explanation ?? <span className="text-gray-400">Özet yok.</span>}</div>
      <ul>
        {Array.isArray(data?.riskler) && data.riskler.length ? (
          data.riskler.map((r, i) => (
            <li key={i}><b>{r.kriter}:</b> {r.deger} {r.tavsiye && `– Tavsiye: ${r.tavsiye}`}</li>
          ))
        ) : (
          <li className="text-gray-400">Risk verisi yok.</li>
        )}
      </ul>
    </div>
  );
}