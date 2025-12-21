import React from "react";
export default function FiveWhys({ data }) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <h2 className="text-pink-800 text-lg font-bold mb-2">Beş Neden Analizi</h2>
      <div><b>Skor:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Açıklama:</b> {data?.explanation ?? <span className="text-gray-400">Açıklama yok.</span>}</div>
      <ul>
        {Array.isArray(data?.nedenler) && data.nedenler.length ? (
          data.nedenler.map((n, i) => (
            <li key={i}><b>{n.neden}:</b> {n.detay} {n.cozum && `– Çözüm: ${n.cozum}`}</li>
          ))
        ) : (
          <li className="text-gray-400">Neden analizi verisi yok.</li>
        )}
      </ul>
    </div>
  );
}