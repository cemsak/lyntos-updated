import React from 'react';
import { CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../_lib/format';
import type { OdemeDurumu } from './types';

export function OdemeDurumuCard({
  odemeDurumu,
  refreshingPayments,
  onRefresh,
}: {
  odemeDurumu: OdemeDurumu;
  refreshingPayments: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] mb-4 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-[#00804D]" />
          <span className="font-semibold text-[#2E2E2E]">Vergi Ödeme Durumu</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshingPayments}
          className="px-3 py-1.5 text-sm bg-[#F5F6F8] hover:bg-[#E5E5E5] rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshingPayments ? 'animate-spin' : ''}`} />
          {refreshingPayments ? 'Analiz ediliyor...' : 'Yenile'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#ECFDF5] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#00804D]">{odemeDurumu.odenen}</div>
          <div className="text-xs text-[#00804D]">Ödendi</div>
        </div>
        <div className="bg-[#FFFBEB] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#FA841E]">{odemeDurumu.gecikli_odenen}</div>
          <div className="text-xs text-[#FA841E]">Gecikmeli Ödendi</div>
        </div>
        <div className="bg-[#FEF2F2] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#BF192B]">{odemeDurumu.odenmemis}</div>
          <div className="text-xs text-[#BF192B]">Ödenmedi</div>
        </div>
        <div className="bg-[#F5F6F8] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#5A5A5A]">{odemeDurumu.vadesi_gelmemis}</div>
          <div className="text-xs text-[#5A5A5A]">Vadesi Gelmedi</div>
        </div>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-[#E5E5E5]">
        <div>
          <span className="text-sm text-[#969696]">Toplam Borç:</span>
          <span className="ml-2 font-semibold text-[#2E2E2E]">{formatCurrency(odemeDurumu.toplam_borc)}</span>
        </div>
        <div>
          <span className="text-sm text-[#969696]">Ödenen:</span>
          <span className="ml-2 font-semibold text-[#00804D]">{formatCurrency(odemeDurumu.odenen_tutar)}</span>
        </div>
        <div>
          <span className="text-sm text-[#969696]">Kalan:</span>
          <span className="ml-2 font-semibold text-[#BF192B]">{formatCurrency(odemeDurumu.kalan_borc)}</span>
        </div>
      </div>

      {odemeDurumu.gecikme_uyarilari.length > 0 && (
        <div className="mt-4 space-y-2">
          {odemeDurumu.gecikme_uyarilari.map((uyari, idx) => (
            <div key={idx} className={`flex items-start gap-2 p-3 rounded-lg ${uyari.kritik ? 'bg-[#FEF2F2]' : 'bg-[#FFFBEB]'}`}>
              <AlertCircle className={`w-4 h-4 mt-0.5 ${uyari.kritik ? 'text-[#F0282D]' : 'text-[#FFB114]'}`} />
              <span className={`text-sm ${uyari.kritik ? 'text-[#BF192B]' : 'text-[#FA841E]'}`}>{uyari.mesaj}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
