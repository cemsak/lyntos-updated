'use client';

/**
 * Sektör Karşılaştırma Bileşeni
 * Mükellefin finansal oranlarını TCMB EVDS sektör ortalamaları ile karşılaştırır
 *
 * Kaynak: TCMB EVDS Sektör Bilanço Oranları
 * Referans: https://evds2.tcmb.gov.tr/
 */

import React, { useState } from 'react';
import { BarChart3, Info, Building2, AlertTriangle } from 'lucide-react';
import type { SektorBilgisi } from '../../_hooks/useVdkFullAnalysis';

import type { MukellefOranlari } from './sektorTypes';
import { ORAN_TANIMLARI, hesaplaSapma } from './sektorTypes';
import { OranDetayModal } from './OranDetayModal';
import { OranKarsilastirmaRow } from './OranKarsilastirmaRow';

// Re-export for backward compatibility
export type { MukellefOranlari } from './sektorTypes';

interface SektorKarsilastirmaProps {
  sektorBilgisi: SektorBilgisi | null;
  mukellefOranlari: MukellefOranlari;
}

export default function SektorKarsilastirma({ sektorBilgisi, mukellefOranlari }: SektorKarsilastirmaProps) {
  const [selectedOran, setSelectedOran] = useState<{
    key: string;
    mukellef?: number;
    sektor?: number;
  } | null>(null);

  if (!sektorBilgisi) {
    return (
      <div className="bg-[#F5F6F8] border border-[#E5E5E5] rounded-xl p-6 text-center">
        <Building2 className="w-12 h-12 text-[#B4B4B4] mx-auto mb-3" />
        <h3 className="text-[#5A5A5A] font-medium mb-1">Sektör Verisi Bekleniyor</h3>
        <p className="text-sm text-[#969696]">
          Sektör karşılaştırması için NACE kodu ve TCMB EVDS verileri gereklidir.
        </p>
      </div>
    );
  }

  // Karşılaştırılacak oranlar
  const karsilastirmalar = [
    { key: 'cari_oran', mukellef: mukellefOranlari.cari_oran, sektor: sektorBilgisi.cari_oran },
    { key: 'asit_test_orani', mukellef: mukellefOranlari.asit_test_orani, sektor: sektorBilgisi.asit_test_orani },
    { key: 'yabanci_kaynak_aktif', mukellef: mukellefOranlari.yabanci_kaynak_aktif, sektor: sektorBilgisi.yabanci_kaynak_aktif },
    { key: 'ozkaynak_aktif', mukellef: mukellefOranlari.ozkaynak_aktif, sektor: sektorBilgisi.ozkaynak_aktif },
    { key: 'net_kar_marji', mukellef: mukellefOranlari.net_kar_marji, sektor: sektorBilgisi.net_kar_marji },
    { key: 'brut_kar_marji', mukellef: mukellefOranlari.brut_kar_marji, sektor: sektorBilgisi.brut_kar_marji },
    { key: 'roa', mukellef: mukellefOranlari.roa, sektor: sektorBilgisi.roa },
    { key: 'alacak_devir_hizi', mukellef: mukellefOranlari.alacak_devir_hizi, sektor: sektorBilgisi.alacak_devir_hizi },
    { key: 'borc_devir_hizi', mukellef: mukellefOranlari.borc_devir_hizi, sektor: sektorBilgisi.borc_devir_hizi },
    { key: 'vergi_yuku', mukellef: mukellefOranlari.vergi_yuku, sektor: sektorBilgisi.sektor_vergi_yuku },
  ].filter(k => ORAN_TANIMLARI[k.key]); // Sadece tanımlı oranları göster

  // Mükellef verisi var mı kontrol et
  const mukellefVerisiVar = Object.values(mukellefOranlari).some(v => v !== undefined && v !== null);

  // Sorunlu oranları say
  const sorunluSayisi = karsilastirmalar.filter(k => {
    const tanim = ORAN_TANIMLARI[k.key];
    const sapma = hesaplaSapma(k.mukellef, k.sektor, tanim.ideal);
    return sapma.durum === 'kotu';
  }).length;

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-[#E6F9FF] to-[#E6F9FF] px-5 py-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E6F9FF] rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#0049AA]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2E2E2E]">Mükellef vs Sektör Karşılaştırması</h3>
              <p className="text-xs text-[#969696]">
                NACE {sektorBilgisi.nace_kodu} - {sektorBilgisi.nace_adi}
              </p>
            </div>
          </div>
          {sorunluSayisi > 0 && mukellefVerisiVar && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FFFBEB] text-[#E67324] rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">{sorunluSayisi} oran sektör ortalamasından sapıyor</span>
            </div>
          )}
        </div>
      </div>

      {/* Mükellef verisi yoksa uyarı */}
      {!mukellefVerisiVar && (
        <div className="px-5 py-4 bg-[#E6F9FF] border-b border-[#E6F9FF]">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#0078D0] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#00287F]">
                Mükellef Finansal Oranları Hesaplanamadı
              </p>
              <p className="text-xs text-[#0049AA] mt-1">
                Karşılaştırma için detaylı mizan verisi (bilanço ve gelir tablosu hesapları) gereklidir.
                Mizan yüklendiğinde oranlar otomatik hesaplanır ve sektör ortalaması ile karşılaştırılır.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Karşılaştırma Tablosu */}
      <div className="divide-y divide-[#E5E5E5]">
        {karsilastirmalar.map(({ key, mukellef, sektor }) => {
          const tanim = ORAN_TANIMLARI[key];
          return (
            <OranKarsilastirmaRow
              key={key}
              oranKey={key}
              tanim={tanim}
              mukellef={mukellef}
              sektor={sektor}
              onInfoClick={() => setSelectedOran({ key, mukellef, sektor })}
            />
          );
        })}
      </div>

      {/* Footer - Kaynak */}
      <div className="px-5 py-3 bg-[#F5F6F8] border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between text-xs text-[#969696]">
          <span>Kaynak: {sektorBilgisi.kaynak || 'TCMB EVDS'} • {sektorBilgisi.veri_yili || '2024'}</span>
          <span className="text-[#969696]">
            Mükellef verileri Q1 mizanından hesaplanmıştır
          </span>
        </div>
      </div>

      {/* Oran Detay Modal */}
      {selectedOran && ORAN_TANIMLARI[selectedOran.key] && (
        <OranDetayModal
          oranKey={selectedOran.key}
          tanim={ORAN_TANIMLARI[selectedOran.key]}
          mukellef={selectedOran.mukellef}
          sektor={selectedOran.sektor}
          onClose={() => setSelectedOran(null)}
        />
      )}
    </div>
  );
}
