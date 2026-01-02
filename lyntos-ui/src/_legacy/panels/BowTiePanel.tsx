import React from "react";
export default function BowTiePanel({ data }) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <h2 className="text-blue-900 text-lg font-bold mb-2">COSO/BowTie Kontrol Tasarımı</h2>
      <div><b>Kontrol Skoru:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Özet:</b> {data?.explanation ?? <span className="text-gray-400">Özet yok.</span>}</div>
      <ul>
        {Array.isArray(data?.nedenler) && data.nedenler.length ? (
          data.nedenler.map((n, i) => (
            <li key={i}><b>{n.neden}:</b> {n.detay}</li>
          ))
        ) : (
          <li className="text-gray-400">Neden verisi yok.</li>
        )}
      </ul>
      {data?.csv_link && <a href={data.csv_link} target="_blank" className="text-blue-600 underline block mt-2">Detay CSV</a>}
    </div>
  );
}