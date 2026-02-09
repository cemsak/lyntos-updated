'use client';

import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Database,
  AlertCircle,
  FileQuestion,
  FileText,
  CheckCircle2,
  ExternalLink,
  Globe,
} from 'lucide-react';
import type { KurganSenaryo } from '../../../_hooks/useVdkFullAnalysis';
import { VeriKaynagiBadge } from './VeriKaynagiBadge';
import { SENARYO_VERI_GEREKSINIMLERI } from './kurganConstants';

// Geçen senaryolar için detaylı kart - SMMM/YMM için profesyonel gösterim
export interface PassedScenarioCardProps {
  scenario: KurganSenaryo;
  isExpanded: boolean;
  onToggle: () => void;
}

export function PassedScenarioCard({ scenario, isExpanded, onToggle }: PassedScenarioCardProps) {
  const kanitlar = scenario.kanitlar || [];
  const kontrol_detayi = scenario.kontrol_detayi || null;
  const veriGereksinimi = SENARYO_VERI_GEREKSINIMLERI[scenario.senaryo_id];

  // Veri durumunu belirle - GİB Sektör İstatistikleri kaynak olarak kabul et
  const gercekKaynaklar = ['gib', 'mizan', 'beyanname', 'fatura', 'şirket', 'cari', 'kdv', 'vergi', 'hesap'];

  // 1. Kanıtlarda gerçek kaynak var mı?
  const hasRealDataInKanitlar = kanitlar.length > 0 && kanitlar.some(k => {
    const kaynak = String(k.kaynak || '').toLowerCase();
    const not = String(k.not || '').toLowerCase();
    const isGercekKaynak = gercekKaynaklar.some(g => kaynak.includes(g));
    const isNotSistem = !kaynak.includes('sistem') && !not.includes('yüklenmedi') && !not.includes('eksik');
    return isGercekKaynak || isNotSistem;
  });

  // 2. kontrol_detayi içinde gerçek kaynak referansı var mı?
  const hasRealDataInDetay = kontrol_detayi && (
    kontrol_detayi.toLowerCase().includes('gib') ||
    kontrol_detayi.toLowerCase().includes('sektör') ||
    kontrol_detayi.toLowerCase().includes('normal aralıkta') ||
    kontrol_detayi.toLowerCase().includes('risk tespit edilmedi') ||
    kontrol_detayi.toLowerCase().includes('kontrol edildi')
  );

  const hasRealData = hasRealDataInKanitlar || hasRealDataInDetay;
  const dataStatus = hasRealData ? 'verified' : 'no_data';

  return (
    <div className={`border rounded-lg overflow-hidden ${
      dataStatus === 'verified'
        ? 'bg-[#ECFDF5] border-[#AAE8B8]'
        : 'bg-[#F5F6F8] border-[#E5E5E5]'
    }`}>
      <div
        className="p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className={`w-4 h-4 ${dataStatus === 'verified' ? 'text-[#00804D]' : 'text-[#969696]'}`} />
            ) : (
              <ChevronRight className={`w-4 h-4 ${dataStatus === 'verified' ? 'text-[#00804D]' : 'text-[#969696]'}`} />
            )}
            <span className={`font-mono text-sm font-semibold ${dataStatus === 'verified' ? 'text-[#00804D]' : 'text-[#5A5A5A]'}`}>
              {scenario.senaryo_id}
            </span>
          </div>
          <span className={`text-sm font-medium flex items-center gap-1 ${
            dataStatus === 'verified' ? 'text-[#00804D]' : 'text-[#969696]'
          }`}>
            {dataStatus === 'verified' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Kontrol Edildi - Risk Yok
              </>
            ) : (
              <>
                <FileQuestion className="w-4 h-4" />
                Veri Bekleniyor
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 ml-6">
          <p className={`text-sm ${dataStatus === 'verified' ? 'text-[#005A46]' : 'text-[#5A5A5A]'}`}>
            {scenario.senaryo_adi}
          </p>
          {scenario.aktif === false && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-[#F5F6F8] text-[#969696] rounded-full border border-[#E5E5E5]">
              Henuz aktif degil
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#E5E5E5] bg-white">
          {/* Kontrol Detayı */}
          {kontrol_detayi && (
            <div className="mt-3">
              <div className="text-xs text-[#969696] uppercase mb-1 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Kontrol Sonucu
              </div>
              <p className={`text-sm p-3 rounded-lg border ${
                dataStatus === 'verified'
                  ? 'text-[#00804D] bg-[#ECFDF5] border-[#ECFDF5]'
                  : 'text-[#5A5A5A] bg-[#FFFBEB] border-[#FFFBEB]'
              }`}>
                {dataStatus === 'verified' ? '✅' : '⏳'} {kontrol_detayi}
              </p>
            </div>
          )}

          {/* Kanıtlar - Hesap Kodları ile */}
          {kanitlar.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-[#969696] uppercase flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Kontrol Edilen Veriler
                </div>
                {/* Veri kaynağı badge */}
                {(() => {
                  const kaynakKanit = kanitlar.find((k: Record<string, unknown>) => k.kaynak);
                  const kaynak = kaynakKanit?.kaynak as string || '';
                  return kaynak ? <VeriKaynagiBadge kaynak={kaynak} /> : null;
                })()}
              </div>
              <div className="space-y-1">
                {kanitlar.map((kanit: Record<string, unknown>, idx: number) => (
                  <div key={idx} className="text-xs text-[#5A5A5A] bg-[#F5F6F8] p-2 rounded border border-[#E5E5E5]">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(kanit).map(([key, value]) => {
                        // Hesap kodu varsa vurgula
                        const isHesapKodu = key === 'hesap' || key === 'hesap_kodu';
                        return (
                          <span key={key} className="inline-flex items-center gap-1">
                            <span className="font-medium text-[#969696]">{key}:</span>
                            <span className={`${isHesapKodu ? 'font-mono bg-[#E6F9FF] text-[#0049AA] px-1 rounded' : 'text-[#5A5A5A]'}`}>
                              {typeof value === 'number'
                                ? value.toLocaleString('tr-TR')
                                : String(value)}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Veri yoksa - detaylı rehber */}
          {dataStatus !== 'verified' && veriGereksinimi && (
            <div className="mt-3 p-4 bg-[#FFFBEB] border border-[#FFF08C] rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-[#FA841E] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-[#E67324]">Bu Senaryo İçin Gerekli Veriler</div>
                  <p className="text-xs text-[#FA841E] mt-1">{veriGereksinimi.aciklama}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-xs text-[#E67324] font-medium">Gerekli Veri Kaynakları:</div>
                <div className="flex flex-wrap gap-1">
                  {veriGereksinimi.gerekli_veriler.map((veri, idx) => (
                    <span key={idx} className="text-xs bg-[#FFFBEB] text-[#E67324] px-2 py-1 rounded">
                      {veri}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#FFF08C]">
                <div className="text-xs text-[#FA841E] flex items-start gap-1">
                  <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span><strong>Nasıl yüklerim:</strong> {veriGereksinimi.nasil_yuklerim}</span>
                </div>
              </div>

              {/* Gerçek veri kaynağı bilgisi */}
              {veriGereksinimi.gercek_kaynak && (
                <div className="mt-3 pt-3 border-t border-[#AAE8B8] bg-[#ECFDF5] -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                  <div className="text-xs text-[#00804D] flex items-start gap-1">
                    <Globe className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span><strong>Gerçek Veri Kaynağı:</strong> {veriGereksinimi.gercek_kaynak}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
