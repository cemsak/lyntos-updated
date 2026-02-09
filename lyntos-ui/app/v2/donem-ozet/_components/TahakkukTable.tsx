import React from 'react';
import { formatCurrency, formatDate } from '../../_lib/format';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import type { Tahakkuk } from './types';

export function TahakkukTable({
  tahakkuklar,
  onOdendiClick,
}: {
  tahakkuklar: Tahakkuk[];
  onOdendiClick: (item: Tahakkuk, index: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-[#969696] border-b">
            <th className="pb-3 font-medium">Tür</th>
            <th className="pb-3 font-medium">Dönem</th>
            <th className="pb-3 font-medium text-right">Toplam Borç</th>
            <th className="pb-3 font-medium text-right">Gecikme Zammı</th>
            <th className="pb-3 font-medium text-center">Ödeme Durumu</th>
            <th className="pb-3 font-medium text-right">Ödeme Tarihi</th>
            <th className="pb-3 font-medium text-center">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {tahakkuklar.map((item, idx) => (
            <tr key={idx} className="border-b border-[#E5E5E5] hover:bg-[#F5F6F8]">
              <td className="py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.beyanname_turu === 'KDV' ? 'bg-[#E6F9FF] text-[#0049AA]' :
                  item.beyanname_turu === 'MUHTASAR' ? 'bg-[#E6F9FF] text-[#0049AA]' :
                  item.beyanname_turu === 'GECICI_VERGI' ? 'bg-[#FFFBEB] text-[#FA841E]' :
                  item.beyanname_turu === 'POSET' ? 'bg-[#ECFDF5] text-[#00804D]' :
                  'bg-[#F5F6F8] text-[#5A5A5A]'
                }`}>
                  {item.beyanname_turu}
                </span>
              </td>
              <td className="py-3 text-[#5A5A5A]">{item.donem}</td>
              <td className="py-3 text-right font-medium text-[#2E2E2E]">{formatCurrency(item.toplam_borc)}</td>
              <td className="py-3 text-right">
                {item.gecikme_zammi && item.gecikme_zammi > 0 ? (
                  <div>
                    <span className="font-medium text-[#BF192B]">{formatCurrency(item.gecikme_zammi)}</span>
                    {item.gecikme_ay && (
                      <div className="text-xs text-[#969696]">
                        {item.gecikme_ay} ay × %{((item.gecikme_oran || 0.037) * 100).toFixed(1)}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[#969696]">-</span>
                )}
              </td>
              <td className="py-3 text-center">
                <PaymentStatusBadge status={item.payment_status} gecikmeGun={item.gecikme_gun} />
              </td>
              <td className="py-3 text-right text-sm text-[#5A5A5A]">
                {formatDate(item.payment_date)}
              </td>
              <td className="py-3 text-center">
                {item.payment_status !== 'odendi' ? (
                  <button
                    onClick={() => onOdendiClick(item, idx)}
                    className="px-2 py-1 text-xs bg-[#0078D0] text-white rounded hover:bg-[#0049AA] transition-colors"
                  >
                    Ödendi İşaretle
                  </button>
                ) : (
                  <span className="text-[#00804D] text-xs">✓</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#F5F6F8] font-semibold">
            <td className="py-3" colSpan={2}>TOPLAM</td>
            <td className="py-3 text-right text-[#2E2E2E]">{formatCurrency(tahakkuklar.reduce((s, i) => s + i.toplam_borc, 0))}</td>
            <td className="py-3 text-right text-[#BF192B]">{formatCurrency(tahakkuklar.reduce((s, i) => s + (i.gecikme_zammi || 0), 0))}</td>
            <td colSpan={3}></td>
          </tr>
          {(() => {
            const dvToplam = tahakkuklar.reduce((sum, t) =>
              sum + (t.kalemler?.filter(k => k.vergi_kodu === '1048').reduce((s, k) => s + k.odenecek, 0) || 0)
            , 0);
            return dvToplam > 0 ? (
              <tr className="bg-[#FFFBEB]">
                <td className="py-3 text-xs text-[#FA841E]" colSpan={2}>
                  Damga Vergisi (488 SK, kod: 1048)
                </td>
                <td className="py-3 text-right font-medium text-[#FA841E]">{formatCurrency(dvToplam)}</td>
                <td colSpan={4}></td>
              </tr>
            ) : null;
          })()}
          <tr className="bg-[#FEF2F2] font-bold">
            <td className="py-3" colSpan={2}>TOPLAM (FAİZLİ)</td>
            <td className="py-3 text-right text-[#BF192B]" colSpan={2}>
              {formatCurrency(
                tahakkuklar.reduce((s, i) => s + i.toplam_borc, 0) +
                tahakkuklar.reduce((s, i) => s + (i.gecikme_zammi || 0), 0)
              )}
            </td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
