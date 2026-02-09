'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Info, FileText, TrendingDown } from 'lucide-react';
import type { HesapKontrol } from '../../../_hooks/useVdkFullAnalysis';
import { getDurumColor, getScoreColor } from '../../../_hooks/useVdkFullAnalysis';
import { formatTurkishNumber, getEsikAciklama, HESAP_ACIKLAMALARI } from './hesapAnalizHelpers';

interface KontrolCardProps {
  kontrol: HesapKontrol;
}

export function KontrolCard({ kontrol }: KontrolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const durumColors = getDurumColor(kontrol.durum);

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        kontrol.durum === 'KRITIK'
          ? 'border-[#FF9196]'
          : kontrol.durum === 'UYARI'
            ? 'border-[#FFE045]'
            : 'border-[#E5E5E5]'
      }`}
    >
      <div
        className={`p-4 cursor-pointer hover:bg-[#F5F6F8] ${
          kontrol.durum === 'KRITIK'
            ? 'bg-[#FEF2F2]'
            : kontrol.durum === 'UYARI'
              ? 'bg-[#FFFBEB]'
              : 'bg-white'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {kontrol.durum === 'KRITIK' ? (
              <AlertTriangle className="w-5 h-5 text-[#BF192B]" />
            ) : kontrol.durum === 'UYARI' ? (
              <AlertTriangle className="w-5 h-5 text-[#FA841E]" />
            ) : (
              <CheckCircle className="w-5 h-5 text-[#00804D]" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-[#5A5A5A]">
                  {kontrol.hesap_kodu}
                </span>
                <span className="text-[#969696]">-</span>
                <span className="text-sm text-[#5A5A5A]">{kontrol.kontrol_adi}</span>
              </div>
              <div className="text-xs text-[#969696] mt-1">{kontrol.hesap_adi}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`text-sm font-semibold px-2 py-1 rounded ${durumColors}`}
            >
              {kontrol.durum}
            </span>
            <span className={`text-lg font-bold ${getScoreColor(kontrol.risk_puani)}`}>
              {kontrol.risk_puani}
            </span>
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-[#969696]" />
            ) : (
              <ChevronRight className="w-5 h-5 text-[#969696]" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-4 bg-[#F5F6F8] border-t border-[#E5E5E5] space-y-4">
          {/* Degerler ve Esikler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mevcut Deger */}
            <div className="bg-white p-3 rounded-lg border border-[#E5E5E5]">
              <div className="text-xs text-[#969696] uppercase">Mevcut Deger</div>
              <div className="text-lg font-semibold text-[#2E2E2E] font-mono">
                {typeof kontrol.deger === 'number'
                  ? formatTurkishNumber(kontrol.deger)
                  : kontrol.deger}
                {kontrol.kontrol_adi?.includes('Oran') && '%'}
              </div>
              <div className="text-xs text-[#969696] mt-1">
                {kontrol.hesap_kodu && `Hesap: ${kontrol.hesap_kodu}`}
              </div>
            </div>

            {/* Uyari Esigi - 0 ise farkli goster */}
            {kontrol.esik_uyari === 0 && kontrol.esik_kritik === 0 ? (
              <div className="bg-[#ECFDF5] p-3 rounded-lg border border-[#AAE8B8] col-span-2">
                <div className="text-xs text-[#00804D] uppercase">Kontrol Sonucu</div>
                <div className="text-base font-semibold text-[#00804D] mt-1">
                  &#10003; {getEsikAciklama(kontrol.kontrol_adi, 'uyari', 0)}
                </div>
                <div className="text-xs text-[#00A651] mt-2">
                  Bu kontrol bakiye/oran bazli esik karsilastirmasi yapmaz, dogrudan durumu kontrol eder.
                </div>
              </div>
            ) : (
              <>
                <div className="bg-[#FFFBEB] p-3 rounded-lg border border-[#FFF08C]">
                  <div className="text-xs text-[#FA841E] uppercase">Uyari Esigi</div>
                  <div className="text-lg font-semibold text-[#FA841E] font-mono">
                    {typeof kontrol.esik_uyari === 'number'
                      ? formatTurkishNumber(kontrol.esik_uyari)
                      : kontrol.esik_uyari}
                    {kontrol.kontrol_adi?.includes('Oran') && '%'}
                  </div>
                  <div className="text-xs text-[#FFB114] mt-1">
                    {getEsikAciklama(kontrol.kontrol_adi, 'uyari', kontrol.esik_uyari)}
                  </div>
                </div>
                <div className="bg-[#FEF2F2] p-3 rounded-lg border border-[#FFC7C9]">
                  <div className="text-xs text-[#BF192B] uppercase">Kritik Esik</div>
                  <div className="text-lg font-semibold text-[#BF192B] font-mono">
                    {typeof kontrol.esik_kritik === 'number'
                      ? formatTurkishNumber(kontrol.esik_kritik)
                      : kontrol.esik_kritik}
                    {kontrol.kontrol_adi?.includes('Oran') && '%'}
                  </div>
                  <div className="text-xs text-[#F0282D] mt-1">
                    {getEsikAciklama(kontrol.kontrol_adi, 'kritik', kontrol.esik_kritik)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Kanitlar/Kaynak - Detayli ve Seffaf */}
          <div className="bg-[#F5F6F8] p-3 rounded-lg">
            <div className="text-xs text-[#5A5A5A] uppercase mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Veri Kaynagi ve Aciklama
            </div>
            <p className="text-sm text-[#5A5A5A]">{kontrol.aciklama}</p>

            {/* Hesap Kodu Detayi - YMM icin seffaflik */}
            {kontrol.hesap_kodu && (
              <div className="mt-2 p-2 bg-white rounded border border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[#0049AA] bg-[#E6F9FF] px-2 py-0.5 rounded">
                    {kontrol.hesap_kodu}
                  </span>
                  <span className="text-sm text-[#5A5A5A]">
                    {HESAP_ACIKLAMALARI[kontrol.hesap_kodu] || kontrol.hesap_adi}
                  </span>
                </div>
                {/* Iliskili hesaplar icin ek bilgi */}
                {['131', '231', '331', '431'].includes(kontrol.hesap_kodu) && (
                  <div className="mt-2 text-xs text-[#FA841E] bg-[#FFFBEB] p-2 rounded border border-[#FFF08C]">
                    <strong>Iliskili Kisi Hesabi:</strong> Bu hesap ortaklar/iliskili kisilerle yapilan islemleri icerir.
                    KVK 13 transfer fiyatlandirmasi ve KVK 12 ortulu sermaye kapsaminda degerlendirilmelidir.
                    Adat faizi hesaplamasi yapilip yapilmadigi kontrol edilmelidir.
                  </div>
                )}
              </div>
            )}

            {/* Kanit detaylari (backend'den gelen) */}
            {(() => {
              const kanitlar = kontrol.kanitlar || [];
              if (kanitlar.length > 0) {
                return (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-[#969696] font-medium">Tespit Edilen Veriler:</div>
                    {kanitlar.map((kanit: Record<string, unknown>, idx: number) => (
                      <div key={idx} className="text-xs text-[#5A5A5A] bg-white p-2 rounded border border-[#E5E5E5]">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(kanit).map(([key, value]) => {
                            const isHesapKodu = key.toLowerCase().includes('hesap');
                            const formattedValue = typeof value === 'number'
                              ? value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : String(value);

                            return (
                              <span key={key} className="inline-flex items-center gap-1">
                                <span className="font-medium text-[#969696]">{key}:</span>
                                <span className={`${isHesapKodu ? 'font-mono bg-[#E6F9FF] text-[#0049AA] px-1 rounded' : 'font-mono text-[#5A5A5A]'}`}>
                                  {formattedValue}
                                  {typeof value === 'number' && key.toLowerCase().includes('tutar') ? ' TL' : ''}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            <div className="mt-2 text-[10px] text-[#969696] border-t border-[#E5E5E5] pt-2">
              Kaynak: Q1 Mizan verisi - Tekduzen Hesap Plani
            </div>
          </div>

          {/* Puan Etkisi */}
          {kontrol.durum !== 'NORMAL' && kontrol.risk_puani > 0 && (
            <div className="bg-[#ECFDF5] p-3 rounded-lg border border-[#AAE8B8]">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-[#00804D]" />
                <span className="text-sm font-medium text-[#00804D]">
                  Bu duzeltilirse tahmini -{Math.round(kontrol.risk_puani * 0.15)} puan
                </span>
              </div>
            </div>
          )}

          {/* Oneri */}
          <div className="bg-[#E6F9FF] p-3 rounded-lg">
            <div className="text-xs text-[#0049AA] uppercase mb-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Oneri
            </div>
            <p className="text-sm text-[#00287F]">{kontrol.oneri}</p>
          </div>

          {/* Mevzuat Referanslari */}
          {kontrol.mevzuat_ref && kontrol.mevzuat_ref.length > 0 && (
            <div>
              <div className="text-xs text-[#969696] uppercase mb-1">Mevzuat Referanslari</div>
              <div className="flex flex-wrap gap-2">
                {kontrol.mevzuat_ref.map((ref, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-[#E5E5E5] text-[#5A5A5A] px-2 py-1 rounded"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
