import React from "react";
export default function CAPAPanel({ data }) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <h2 className="text-orange-800 text-lg font-bold mb-2">CAPA/8D İzleme Paneli</h2>
      <div><b>CAPA Skoru:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Açıklama:</b> {data?.explanation ?? <span className="text-gray-400">Açıklama yok.</span>}</div>
      <ul>
        {Array.isArray(data?.aksiyonlar) && data.aksiyonlar.length ? (
          data.aksiyonlar.map((a, i) => (
            <li key={i}><b>{a.konu}:</b> {a.durum} {a.aciklama && `– ${a.aciklama}`}</li>
          ))
        ) : (
          <li className="text-gray-400">Aksiyon verisi yok.</li>
        )}
      </ul>
    </div>
  );
}