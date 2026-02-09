'use client';

import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import type { KurganSenaryo } from '../../../_hooks/useVdkFullAnalysis';
import { getAksiyonColor, AKSIYON_LABELS } from '../../../_hooks/useVdkFullAnalysis';
import { VeriKaynagiBadge } from './VeriKaynagiBadge';

export interface ScenarioCardProps {
  scenario: KurganSenaryo;
  isExpanded: boolean;
  onToggle: () => void;
  onGenerateIzah?: (scenario: KurganSenaryo) => void;
}

export function ScenarioCard({ scenario, isExpanded, onToggle, onGenerateIzah }: ScenarioCardProps) {
  const aksiyonColor = getAksiyonColor(scenario.aksiyon);

  return (
    <div
      className={`border rounded-xl overflow-hidden ${
        scenario.aksiyon === 'INCELEME'
          ? 'border-[#FF9196] bg-[#FEF2F2]'
          : scenario.aksiyon === 'IZAHA_DAVET'
            ? 'border-[#FFE045] bg-[#FFFBEB]'
            : 'border-[#FFE045] bg-[#FFFBEB]'
      }`}
    >
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-[#969696]" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[#969696]" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#2E2E2E]">
                {scenario.senaryo_id}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${aksiyonColor}`}>
                {AKSIYON_LABELS[scenario.aksiyon] || scenario.aksiyon}
              </span>
              {scenario.sure && (
                <span className="flex items-center gap-1 text-xs text-[#969696]">
                  <Clock className="w-3 h-3" />
                  {scenario.sure}
                </span>
              )}
            </div>
            <p className="text-sm text-[#5A5A5A] mt-1">{scenario.senaryo_adi}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#2E2E2E]">{scenario.risk_puani}</div>
          <div className="text-xs text-[#969696]">risk puanı</div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-white border-t border-[#E5E5E5] space-y-4">
          {/* Tetikleme Nedeni */}
          {scenario.tetikleme_nedeni && (
            <div>
              <div className="text-xs text-[#969696] uppercase mb-1">Tetikleme Nedeni</div>
              <p className="text-sm text-[#5A5A5A] bg-[#FEF2F2] p-3 rounded-lg border border-[#FEF2F2]">
                🔴 {scenario.tetikleme_nedeni}
              </p>
            </div>
          )}

          {/* Kanıtlar - KRİTİK: SMMM için gerçek veri göster */}
          {(() => {
            // TypeScript interface'de tanımlı - artık type-safe
            const kanitlar = scenario.kanitlar || [];
            if (kanitlar.length > 0) {
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-[#969696] uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Tespit Kanıtları
                    </div>
                    <VeriKaynagiBadge kaynak="Mizan Analizi" />
                  </div>
                  <div className="bg-[#F5F6F8] rounded-lg p-3 space-y-3">
                    {kanitlar.map((kanit: Record<string, unknown>, idx: number) => {
                      const kaynak = kanit.kaynak as string || '';
                      const tutar = kanit.tutar as number | undefined;
                      const oran = kanit.oran as string | undefined;
                      const esik = kanit.esik as string | undefined;
                      const durum = kanit.durum as string | undefined;
                      const aciklama = kanit.aciklama as string | undefined;

                      // Hesap kodunu kaynak'tan çıkar
                      const hesapMatch = kaynak.match(/Hs\.\s*(\d+)/);
                      const hesapKodu = hesapMatch ? hesapMatch[1] : null;

                      return (
                        <div key={idx} className="bg-white rounded-lg border border-[#E5E5E5] p-3">
                          {/* Kaynak başlığı */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {hesapKodu && (
                                <span className="px-2 py-0.5 bg-[#E6F9FF] text-[#0049AA] text-xs font-mono rounded">
                                  Hs. {hesapKodu}
                                </span>
                              )}
                              <span className="text-sm font-medium text-[#5A5A5A]">{kaynak}</span>
                            </div>
                            {durum && (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                durum === 'EŞİK AŞILDI'
                                  ? 'bg-[#FEF2F2] text-[#BF192B]'
                                  : 'bg-[#ECFDF5] text-[#00804D]'
                              }`}>
                                {durum}
                              </span>
                            )}
                          </div>

                          {/* Tutar veya Oran */}
                          <div className="flex flex-wrap gap-4 text-sm">
                            {tutar !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-[#969696]">Tutar:</span>
                                <span className="font-mono font-semibold text-[#2E2E2E]">
                                  {tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                </span>
                              </div>
                            )}
                            {oran && (
                              <div className="flex items-center gap-2">
                                <span className="text-[#969696]">Oran:</span>
                                <span className="font-mono font-semibold text-[#2E2E2E]">{oran}</span>
                              </div>
                            )}
                            {esik && (
                              <div className="flex items-center gap-2">
                                <span className="text-[#969696]">Eşik:</span>
                                <span className="font-mono text-[#5A5A5A]">{esik}</span>
                              </div>
                            )}
                          </div>

                          {/* Açıklama */}
                          {aciklama && (
                            <div className="mt-2 text-xs text-[#FA841E] bg-[#FFFBEB] px-2 py-1 rounded flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {aciklama}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Öneriler */}
          {scenario.oneriler && scenario.oneriler.length > 0 && (
            <div>
              <div className="text-xs text-[#969696] uppercase mb-2">SMMM İçin Öneriler</div>
              <ul className="space-y-2">
                {scenario.oneriler.map((oneri, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                    <span className="w-5 h-5 bg-[#E6F9FF] text-[#0049AA] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    {oneri}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aksiyon Butonları */}
          <div className="flex gap-3 pt-2">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-[#0049AA] text-white rounded-lg text-sm font-medium hover:bg-[#0049AA]"
              onClick={() => onGenerateIzah?.(scenario)}
            >
              <FileText className="w-4 h-4" />
              İzah Metni Hazırla
            </button>
            <button
              onClick={() => {
                // Detaylar zaten expanded durumda gösteriliyor
                // Bu buton expanded'ı kapatır (toggle)
                if (isExpanded) {
                  onToggle();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 border border-[#B4B4B4] text-[#5A5A5A] rounded-lg text-sm font-medium hover:bg-[#F5F6F8]"
            >
              {isExpanded ? 'Detayı Gizle' : 'Detay Görüntüle'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
