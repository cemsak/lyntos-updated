import React from "react";
export default function ReasonCards({ data }) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <h2 className="text-rose-800 text-lg font-bold mb-2">SMİYB Analiz</h2>
      <div><b>Skor:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Özet:</b> {data?.explanation ?? <span className="text-gray-400">Özet yok.</span>}</div>
      <ul>
        {Array.isArray(data?.kartlar) && data.kartlar.length ? (
          data.kartlar.map((k, i) => (
            <li key={i}><b>{k.neden}:</b> {k.detay} {k.tavsiye && `– Tavsiye: ${k.tavsiye}`}</li>
          ))
        ) : (
          <li className="text-gray-400">Kart verisi yok.</li>
        )}
      </ul>
    </div>
  );
}