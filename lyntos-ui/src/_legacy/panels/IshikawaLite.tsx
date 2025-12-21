import React from "react";
export default function IshikawaLite({ data }) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <h2 className="text-indigo-800 text-lg font-bold mb-2">Ishikawa Analizi</h2>
      <div><b>Skor:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Özet:</b> {data?.explanation ?? <span className="text-gray-400">Özet yok.</span>}</div>
      <ul>
        {Array.isArray(data?.nedenler) && data.nedenler.length ? (
          data.nedenler.map((n, i) => (
            <li key={i}><b>{n.kategori}:</b> {n.neden}</li>
          ))
        ) : (
          <li className="text-gray-400">Kategori-neden verisi yok.</li>
        )}
      </ul>
    </div>
  );
}