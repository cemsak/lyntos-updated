import React from "react";
export default function VDKExpertPanel({ data }) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <h2 className="text-gray-800 text-lg font-bold mb-2">VDK Uzman Paneli</h2>
      <div><b>Uzman Skoru:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Uzman Açıklaması:</b> {data?.explanation ?? <span className="text-gray-400">Açıklama yok.</span>}</div>
      <ul>
        {Array.isArray(data?.uyarilar) && data.uyarilar.length ? (
          data.uyarilar.map((u, i) => (
            <li key={i}><b>{u.konu}:</b> {u.detay} {u.aksiyon && `– Aksiyon: ${u.aksiyon}`}</li>
          ))
        ) : (
          <li className="text-gray-400">Uzman uyarısı yok.</li>
        )}
      </ul>
    </div>
  );
}