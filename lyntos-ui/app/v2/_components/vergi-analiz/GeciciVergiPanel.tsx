'use client';

import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Clock, XCircle, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import type { GeciciVergiKontrol, KontrolDurumu, RiskSeviyesi } from './types';
import { GECICI_VERGI_KONTROLLER } from './types';

interface GeciciVergiPanelProps {
  donem?: string;
  kontrolDurumlari?: Record<string, KontrolDurumu>;
  onKontrolClick?: (kontrolId: string) => void;
}

const DURUM_ICONS: Record<KontrolDurumu, React.ReactNode> = {
  tamamlandi: <CheckCircle2 className="w-5 h-5 text-[#00804D]" />,
  bekliyor: <Clock className="w-5 h-5 text-[#969696]" />,
  uyari: <AlertTriangle className="w-5 h-5 text-[#FFB114]" />,
  hata: <XCircle className="w-5 h-5 text-[#F0282D]" />,
  uygulanamaz: <Minus className="w-5 h-5 text-[#B4B4B4]" />,
};

const RISK_COLORS: Record<RiskSeviyesi, string> = {
  dusuk: 'bg-[#ECFDF5] text-[#00804D] border-[#AAE8B8]',
  orta: 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]',
  yuksek: 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]',
  kritik: 'bg-[#FEF2F2] text-[#BF192B] border-[#FFC7C9]',
};

export function GeciciVergiPanel({
  donem,  // SMMM GÜVENİ: Varsayılan değer KALDIRILDI - dönem zorunlu
  kontrolDurumlari = {},
  onKontrolClick,
}: GeciciVergiPanelProps) {
  const [expandedKontrol, setExpandedKontrol] = useState<string | null>(null);

  // REACT RULES OF HOOKS: Tüm hook'lar koşullu return'lerden ÖNCE çağrılmalı
  const kontrollerWithDurum = useMemo(() => {
    return GECICI_VERGI_KONTROLLER.map(kontrol => ({
      ...kontrol,
      durum: kontrolDurumlari[kontrol.id] || 'bekliyor' as KontrolDurumu,
    }));
  }, [kontrolDurumlari]);

  const stats = useMemo(() => {
    const tamamlanan = kontrollerWithDurum.filter(k => k.durum === 'tamamlandi').length;
    const uyari = kontrollerWithDurum.filter(k => k.durum === 'uyari').length;
    const hata = kontrollerWithDurum.filter(k => k.durum === 'hata').length;
    const oran = Math.round((tamamlanan / kontrollerWithDurum.length) * 100);
    return { tamamlanan, uyari, hata, oran, toplam: kontrollerWithDurum.length };
  }, [kontrollerWithDurum]);

  const donemBilgisi = useMemo(() => {
    // donem yoksa default değerler döndür
    if (!donem) return { yil: 2025, ceyrek: 4 };
    const match = donem.match(/(\d{4})-Q(\d)/);
    if (!match) return { yil: 2025, ceyrek: 4 };
    return { yil: parseInt(match[1]), ceyrek: parseInt(match[2]) };
  }, [donem]);

  // SMMM GÜVENİ: Dönem yoksa panel render etme - hook'lardan SONRA
  if (!donem) {
    return (
      <Card title="Geçici Vergi Kontrolleri">
        <div className="py-8 text-center">
          <span className="text-4xl mb-4 block">📋</span>
          <p className="text-sm text-[#969696]">Dönem seçildikten sonra kontroller görünecektir.</p>
        </div>
      </Card>
    );
  }

  const toggleExpand = (kontrolId: string) => {
    setExpandedKontrol(prev => prev === kontrolId ? null : kontrolId);
  };

  return (
    <Card
      title="Gecici Vergi 12 Kritik Kontrol"
      subtitle={`${donemBilgisi.yil} - ${donemBilgisi.ceyrek}. Ceyrek`}
      headerAction={
        <div className="flex items-center gap-2">
          <Badge variant={stats.oran === 100 ? 'success' : 'warning'}>
            {stats.tamamlanan}/{stats.toplam}
          </Badge>
        </div>
      }
    >
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-[#F5F6F8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0049AA] rounded-full transition-all duration-500"
            style={{ width: `${stats.oran}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-[#969696]">
          <span>%{stats.oran} tamamlandi</span>
          <span>
            {stats.uyari > 0 && `${stats.uyari} uyari`}
            {stats.uyari > 0 && stats.hata > 0 && ' / '}
            {stats.hata > 0 && `${stats.hata} hata`}
          </span>
        </div>
      </div>

      {/* Kontrol Listesi */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {kontrollerWithDurum.map((kontrol) => (
          <div key={kontrol.id} className="border border-[#E5E5E5] rounded-lg overflow-hidden">
            {/* Kontrol Satiri */}
            <div
              className="px-4 py-3 cursor-pointer hover:bg-[#F5F6F8] transition-colors"
              onClick={() => toggleExpand(kontrol.id)}
            >
              <div className="flex items-center gap-3">
                {DURUM_ICONS[kontrol.durum]}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#969696]">
                      {kontrol.id}
                    </span>
                    <h4 className="font-medium text-[#2E2E2E] text-sm truncate">
                      {kontrol.baslik}
                    </h4>
                  </div>
                  <p className="text-xs text-[#969696] truncate">
                    {kontrol.aciklama}
                  </p>
                </div>

                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${RISK_COLORS[kontrol.riskSeviyesi]}`}>
                  {kontrol.riskSeviyesi.toUpperCase()}
                </span>

                {expandedKontrol === kontrol.id ? (
                  <ChevronDown className="w-4 h-4 text-[#969696]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#969696]" />
                )}
              </div>
            </div>

            {/* Detay Paneli */}
            {expandedKontrol === kontrol.id && (
              <div className="px-4 pb-4 pt-0 border-t border-[#E5E5E5]">
                <div className="bg-[#F5F6F8] rounded-lg p-4 mt-3 space-y-3">
                  <div>
                    <h5 className="text-xs font-medium text-[#5A5A5A] mb-1">Aciklama</h5>
                    <p className="text-sm text-[#5A5A5A]">{kontrol.detayliAciklama}</p>
                  </div>

                  <div>
                    <h5 className="text-xs font-medium text-[#5A5A5A] mb-1">Kontrol Noktalari</h5>
                    <ul className="space-y-1">
                      {kontrol.kontrolNoktasi.map((nokta, idx) => (
                        <li key={idx} className="text-xs text-[#5A5A5A] flex items-start gap-1">
                          <span className="text-[#969696]">-</span>
                          {nokta}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {kontrol.hesaplamaFormulu && (
                    <div>
                      <h5 className="text-xs font-medium text-[#5A5A5A] mb-1">Hesaplama</h5>
                      <code className="text-xs bg-[#E5E5E5] px-2 py-1 rounded text-[#5A5A5A] block">
                        {kontrol.hesaplamaFormulu}
                      </code>
                    </div>
                  )}

                  <div>
                    <h5 className="text-xs font-medium text-[#5A5A5A] mb-1">Yasal Dayanak</h5>
                    <div className="flex flex-wrap gap-1">
                      {kontrol.yasalDayanak.map((dayanak, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-[#E6F9FF] text-[#0049AA] px-2 py-0.5 rounded"
                        >
                          {dayanak.kanun} Md.{dayanak.madde}
                        </span>
                      ))}
                    </div>
                  </div>

                  {kontrol.oneriler.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-[#00804D] mb-1">Oneriler</h5>
                      <ul className="space-y-1">
                        {kontrol.oneriler.map((oneri, idx) => (
                          <li key={idx} className="text-xs text-[#5A5A5A]">- {oneri}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {kontrol.uyarilar.length > 0 && (
                    <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded p-2">
                      <h5 className="text-xs font-medium text-[#FA841E] mb-1">Dikkat</h5>
                      <ul className="space-y-1">
                        {kontrol.uyarilar.map((uyari, idx) => (
                          <li key={idx} className="text-xs text-[#FA841E]">- {uyari}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onKontrolClick?.(kontrol.id);
                      }}
                      className="px-3 py-1.5 text-xs bg-[#0049AA] text-white rounded hover:bg-[#0049AA] transition-colors"
                    >
                      Kontrolu Baslat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-[#E5E5E5] flex items-center justify-between text-sm">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 text-[#00804D]">
            <CheckCircle2 className="w-4 h-4" />
            {stats.tamamlanan}
          </span>
          <span className="flex items-center gap-1 text-[#FFB114]">
            <AlertTriangle className="w-4 h-4" />
            {stats.uyari}
          </span>
          <span className="flex items-center gap-1 text-[#F0282D]">
            <XCircle className="w-4 h-4" />
            {stats.hata}
          </span>
        </div>
        <button className="text-xs text-[#969696] hover:text-[#5A5A5A]">
          Rapor Indir
        </button>
      </div>
    </Card>
  );
}

export default GeciciVergiPanel;
