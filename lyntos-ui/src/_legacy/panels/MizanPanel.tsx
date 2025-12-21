import React from "react";
type Props = { data: any | null };
export default function MizanPanel({ data }: Props) {
  return (
    <div className="bg-white shadow rounded-2xl p-6 mb-5">
      <div className="text-lg font-bold text-green-900 mb-3">Mizan Paneli</div>
      <div>
        {data && Object.keys(data).length > 0 ?
          <ul>
            <li>Borç Toplam: <b>{data.borc_toplam ?? "—"}</b></li>
            <li>Alacak Toplam: <b>{data.alacak_toplam ?? "—"}</b></li>
            <li>Dengeli: <b>{data.dengeli ? "Evet" : "Hayır"}</b></li>
            <li>Satır Sayısı: <b>{data.satir_sayisi ?? "—"}</b></li>
          </ul>
        : <div className="text-gray-400">Veri yok.</div>}
      </div>
    </div>
  );
}