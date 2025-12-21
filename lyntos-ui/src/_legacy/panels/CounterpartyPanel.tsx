import React from "react";
type Props = { data: any | null };
export default function CounterpartyPanel({ data }: Props) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <div className="text-lg font-bold text-orange-900 mb-3">Karşı Firma Riskleri</div>
      {data && Object.keys(data).length > 0 ?
        <ul>
          <li>Kara Liste: <b>{data.kara_liste_mi ? "EVET" : "HAYIR"}</b></li>
          <li>Beyaz Liste: <b>{data.beyaz_liste_mi ? "EVET" : "HAYIR"}</b></li>
          <li>Toplam Firma Sayısı: <b>{data.toplam_firma ?? "-"}</b></li>
          {/* vs daha fazla alan */}
        </ul>
        : <div className="text-gray-400">Veri yok.</div>}
    </div>
  );
}