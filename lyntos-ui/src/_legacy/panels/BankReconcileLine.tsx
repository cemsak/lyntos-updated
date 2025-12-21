import React from "react";
export default function BankReconcileLine({ data }) {
  return (
    <div>
      <h2>Banka Mutabakatı</h2>
      <div><b>Mutabakat Skoru:</b> {data?.score ?? <span className="text-gray-400">Veri yok.</span>}</div>
      <div><b>Açıklama:</b> {data?.explanation ?? <span className="text-gray-400">Açıklama yok.</span>}</div>
      {Array.isArray(data?.eksikler) && data.eksikler.map((e, i) => (
        <div key={i}>
          <b>Eksik:</b> {e.tip} - {e.tutar} {e.kanit && <span>(Kanıt: {e.kanit})</span>}
        </div>
      ))}
      {data?.csv_link && <a href={data.csv_link} target="_blank" rel="noreferrer">CSV Detayı</a>}
    </div>
  );
}