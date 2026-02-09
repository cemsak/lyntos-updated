'use client';

import React, { useState } from 'react';
import {
  Landmark,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { formatCurrency } from '../../_lib/format';
import {
  TICARET_SICILI_HARCLARI,
  ASGARI_SERMAYE_TAKVIMI,
  GUNCEL_ORANLAR_2026,
} from '../_lib/constants';

export function TicaretSiciliBilgiKarti() {
  const [expandedIslem, setExpandedIslem] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Asgari Sermaye Uyarısı */}
      <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FFF08C]/30 rounded-2xl p-6 border border-[#FFB114]/40">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFB114] to-[#FA841E] flex items-center justify-center shadow-lg flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[#E67324] text-lg">
              Asgari Sermaye Tamamlama - Son Tarih: {ASGARI_SERMAYE_TAKVIMI.sonTarih}
            </h3>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/80 rounded-xl p-4 border border-[#FFB114]/20">
                <p className="text-sm font-bold text-[#2E2E2E]">Anonim Şirket (A.Ş.)</p>
                <p className="text-xs text-[#969696] mt-1">Eski asgari: {formatCurrency(ASGARI_SERMAYE_TAKVIMI.as.eskiAsgarı, { decimals: 0 })}</p>
                <p className="text-lg font-black text-[#E67324] mt-1">
                  Yeni asgari: {formatCurrency(ASGARI_SERMAYE_TAKVIMI.as.yeniAsgari, { decimals: 0 })}
                </p>
                <p className="text-xs text-[#969696] mt-1">
                  Kayıtlı sermaye: {formatCurrency(ASGARI_SERMAYE_TAKVIMI.as.kayitliSermaye, { decimals: 0 })}
                </p>
              </div>
              <div className="bg-white/80 rounded-xl p-4 border border-[#FFB114]/20">
                <p className="text-sm font-bold text-[#2E2E2E]">Limited Şirket (Ltd. Şti.)</p>
                <p className="text-xs text-[#969696] mt-1">Eski asgari: {formatCurrency(ASGARI_SERMAYE_TAKVIMI.ltd.eskiAsgarı, { decimals: 0 })}</p>
                <p className="text-lg font-black text-[#E67324] mt-1">
                  Yeni asgari: {formatCurrency(ASGARI_SERMAYE_TAKVIMI.ltd.yeniAsgari, { decimals: 0 })}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {ASGARI_SERMAYE_TAKVIMI.uyarilar.map((uyari, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[#E67324]">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {uyari}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tescil Harçları Tablosu */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0049AA] to-[#0078D0] flex items-center justify-center">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E2E2E]">Ticaret Sicili Harçları (2026 Güncel)</h3>
              <p className="text-sm text-[#969696]">İşlem türüne göre tescil, ilan ve noter masrafları</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#E5E5E5]">
          {TICARET_SICILI_HARCLARI.map((harc) => {
            const isExpanded = expandedIslem === harc.islemTuru;
            const toplamMaliyet = harc.tesciHarci + harc.ilanHarci + harc.noterMasrafi;

            return (
              <div key={harc.islemTuru}>
                <button
                  onClick={() => setExpandedIslem(isExpanded ? null : harc.islemTuru)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[#F5F6F8]/50 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-[#2E2E2E] text-sm">{harc.islemTuru}</h4>
                    {harc.ttsgZorunlu && (
                      <span className="text-xs text-[#0049AA] bg-[#E6F9FF] px-2 py-0.5 rounded-full mt-1 inline-block">
                        TTSG İlanı Zorunlu
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#2E2E2E]">
                      {formatCurrency(toplamMaliyet, { decimals: 0 })}
                    </p>
                    <p className="text-xs text-[#969696]">toplam maliyet</p>
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center bg-[#F5F6F8] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-[#969696]" />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-4 animate-slide-up">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-[#F5F6F8] rounded-lg p-3 text-center">
                        <p className="text-xs text-[#969696]">Tescil Harcı</p>
                        <p className="text-sm font-bold text-[#2E2E2E]">{formatCurrency(harc.tesciHarci, { decimals: 0 })}</p>
                      </div>
                      <div className="bg-[#F5F6F8] rounded-lg p-3 text-center">
                        <p className="text-xs text-[#969696]">İlan Harcı</p>
                        <p className="text-sm font-bold text-[#2E2E2E]">{formatCurrency(harc.ilanHarci, { decimals: 0 })}</p>
                      </div>
                      <div className="bg-[#F5F6F8] rounded-lg p-3 text-center">
                        <p className="text-xs text-[#969696]">Noter Masrafı</p>
                        <p className="text-sm font-bold text-[#2E2E2E]">{formatCurrency(harc.noterMasrafi, { decimals: 0 })}</p>
                      </div>
                    </div>

                    <div className="bg-[#F5F6F8] rounded-lg p-3">
                      <h5 className="text-xs font-bold text-[#5A5A5A] mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#0078D0]" />
                        Gerekli Evraklar
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {harc.gerekliEvraklar.map((evrak, i) => (
                          <span key={i} className="text-xs bg-white px-2.5 py-1 rounded-full border border-[#E5E5E5] text-[#5A5A5A]">
                            {evrak}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bilgi Notu */}
      <div className="bg-[#E6F9FF] rounded-2xl p-5 border border-[#0078D0]/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#0049AA] flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-[#0049AA] font-medium">
              Ticaret Sicili Bilgi Notu
            </p>
            <ul className="text-xs text-[#0049AA] space-y-1.5">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Tüm tescil işlemleri MERSİS üzerinden elektronik başvuru ile yapılır.
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                TTSG (Türkiye Ticaret Sicil Gazetesi) ilanları tescilden sonra yayımlanır.
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Harç tutarları her yıl yeniden değerleme oranına göre güncellenir.
              </li>
              <li className="flex items-start gap-1.5">
                <Calendar className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Güncel TTSG sorgusu için: ticaretsicil.gov.tr
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
