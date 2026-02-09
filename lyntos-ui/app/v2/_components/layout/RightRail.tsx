'use client';

/**
 * LYNTOS RightRail Component
 * Sprint 2.4 - Anayasa Compliance
 *
 * Dönem Özeti Paneli - Dönem durumu ve hızlı aksiyonlar
 * Backend API entegrasyonu ile gerçek veri gösterir
 *
 * ÖNEMLİ: Bu bileşen useDonemVerileriV2 ile entegre edildi
 * Sol panel (DonemVerileriPanel) ile aynı veri kaynağını kullanır
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  FileX,
  Lightbulb,
  FileCheck,
  BarChart3,
  ShieldAlert,
  FolderArchive,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useDashboardScope, useScopeComplete } from '../scope/useDashboardScope';
import { useDonemVerileriV2 } from '../donem-verileri/useDonemVerileriV2';
import { BELGE_TANIMLARI, type BelgeTipi } from '../donem-verileri/types';
import { RailCard } from './RailCard';
import { QuickLink } from './QuickLink';
import { EksikBelgelerPopover } from './EksikBelgelerPopover';
import { KanitPaketiPopover } from './KanitPaketiPopover';

interface RightRailProps {
  onUploadClick?: (tip: BelgeTipi) => void;
}

// Zorunlu belge listesi - UploadPreviewCards ile aynı
const ZORUNLU_BELGELER: Array<{ tip: BelgeTipi; labelOverride?: string }> = [
  { tip: 'mizan_ayrintili' },
  { tip: 'e_defter_yevmiye' },
  { tip: 'e_defter_kebir' },
  { tip: 'beyan_kdv', labelOverride: 'Dönem Beyannameleri' },
  { tip: 'banka_ekstresi' },
];

export function RightRail({ onUploadClick }: RightRailProps) {
  // Get scope from context
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  // Dönem verileri - sol panel ile aynı kaynak
  const { data: donemData, isLoading, refetch } = useDonemVerileriV2();

  // Eksik belgeler popover state
  const [showEksikPopover, setShowEksikPopover] = useState(false);
  const eksikPopoverRef = useRef<HTMLDivElement>(null);

  // Kanıt paketi popover state
  const [showKanitPopover, setShowKanitPopover] = useState(false);
  const kanitPopoverRef = useRef<HTMLDivElement>(null);

  // Click outside to close popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (eksikPopoverRef.current && !eksikPopoverRef.current.contains(event.target as Node)) {
        setShowEksikPopover(false);
      }
      if (kanitPopoverRef.current && !kanitPopoverRef.current.contains(event.target as Node)) {
        setShowKanitPopover(false);
      }
    }
    if (showEksikPopover || showKanitPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEksikPopover, showKanitPopover]);

  // Belge durumlarını hesapla
  const belgeDurumMap = useMemo(() => {
    const map = new Map<BelgeTipi, 'VAR' | 'EKSIK' | 'BEKLIYOR'>();
    for (const belge of donemData.belgeler) {
      map.set(belge.tip, belge.durum);
    }
    return map;
  }, [donemData.belgeler]);

  // Zorunlu eksik belgeler listesi
  const eksikZorunluBelgeler = useMemo(() => {
    return ZORUNLU_BELGELER
      .filter(({ tip }) => belgeDurumMap.get(tip) !== 'VAR')
      .map(({ tip, labelOverride }) => ({
        tip,
        ad: labelOverride || BELGE_TANIMLARI[tip]?.ad || tip,
      }));
  }, [belgeDurumMap]);

  // Tamamlanan zorunlu belgeler
  const tamamlananZorunluBelgeler = useMemo(() => {
    return ZORUNLU_BELGELER
      .filter(({ tip }) => belgeDurumMap.get(tip) === 'VAR')
      .map(({ tip, labelOverride }) => ({
        tip,
        ad: labelOverride || BELGE_TANIMLARI[tip]?.kisaAd || BELGE_TANIMLARI[tip]?.ad || tip,
      }));
  }, [belgeDurumMap]);

  // Kanıt paketi yüzdesi
  const kanitPaketiYuzde = useMemo(() => {
    const tamamlanan = ZORUNLU_BELGELER.filter(({ tip }) => belgeDurumMap.get(tip) === 'VAR').length;
    return Math.round((tamamlanan / ZORUNLU_BELGELER.length) * 100);
  }, [belgeDurumMap]);

  // Kanıt paketi durumu
  const kanitPaketiStatus = useMemo(() => {
    if (kanitPaketiYuzde === 100) return { label: 'Hazır', status: 'success' as const };
    if (kanitPaketiYuzde > 0) return { label: `%${kanitPaketiYuzde}`, status: 'warning' as const };
    return { label: 'Bekliyor', status: 'neutral' as const };
  }, [kanitPaketiYuzde]);

  // Öneriler - dinamik olarak oluştur
  const oneriler = useMemo(() => {
    const list: string[] = [];

    if (eksikZorunluBelgeler.length > 0) {
      list.push('Eksik belgeleri tamamlayın');
    }

    if (donemData.tamamlanmaYuzdesi < 80) {
      list.push('Veri kalitesini iyileştirin');
    }

    if (kanitPaketiYuzde < 100 && kanitPaketiYuzde > 0) {
      list.push('Kanıt paketini tamamlayın');
    }

    if (list.length === 0) {
      list.push('Tüm zorunlu belgeler tamam');
    }

    return list;
  }, [eksikZorunluBelgeler.length, donemData.tamamlanmaYuzdesi, kanitPaketiYuzde]);

  // Kritik ve yüksek öncelikli sayılar (şimdilik 0 - risk feed'den gelecek)
  const kritikSayisi = 0;
  const yuksekSayisi = 0;
  const acilToplam = kritikSayisi + yuksekSayisi;

  return (
    <div className="sticky top-4 space-y-3">
      {/* Header - Kompakt */}
      <div className="bg-gradient-to-r from-[#2E2E2E] to-[#5A5A5A] text-white rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Dönem Durumu</h3>
            <p className="text-[10px] text-[#B4B4B4] mt-0.5 flex items-center gap-1">
              {isLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>Kontrol Paneli</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <RefreshCw className="w-4 h-4 animate-spin text-[#969696]" />
            )}
            {acilToplam > 0 && (
              <span className="bg-[#F0282D] text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                {acilToplam} Acil
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Açık Kritikler - Feed'den */}
      <RailCard
        title="Açık Kritikler"
        icon={<AlertTriangle className="w-4 h-4" />}
        value={kritikSayisi}
        status={kritikSayisi > 0 ? 'danger' : 'success'}
        href={kritikSayisi > 0 ? '/v2/risk' : undefined}
      >
        {kritikSayisi > 0 && (
          <p className="text-[10px] text-[#969696]">
            VDK incelemesinde risk oluşturabilir
          </p>
        )}
      </RailCard>

      {/* Yüksek Öncelikli - Feed'den */}
      {yuksekSayisi > 0 && (
        <RailCard
          title="Yüksek Öncelik"
          icon={<Zap className="w-4 h-4" />}
          value={yuksekSayisi}
          status="warning"
          href="/v2/risk"
        >
          <p className="text-[10px] text-[#969696]">
            Bu hafta tamamlanmalı
          </p>
        </RailCard>
      )}

      {/* Eksik Belgeler - Tıklanabilir Popover */}
      <div className="relative" ref={eksikPopoverRef}>
        <RailCard
          title="Eksik Belgeler"
          icon={<FileX className="w-4 h-4" />}
          value={eksikZorunluBelgeler.length}
          status={eksikZorunluBelgeler.length > 0 ? 'warning' : 'success'}
          onClick={() => eksikZorunluBelgeler.length > 0 && setShowEksikPopover(!showEksikPopover)}
        >
          {eksikZorunluBelgeler.length > 0 ? (
            <p className="text-[10px] text-[#969696]">
              {eksikZorunluBelgeler.length} zorunlu belge eksik - tıklayın
            </p>
          ) : (
            <p className="text-[10px] text-[#00804D]">
              Tüm zorunlu belgeler yüklendi
            </p>
          )}
        </RailCard>

        {/* Eksik belgeler popover */}
        {showEksikPopover && (
          <EksikBelgelerPopover
            belgeler={eksikZorunluBelgeler}
            onClose={() => setShowEksikPopover(false)}
            onUploadClick={onUploadClick}
          />
        )}
      </div>

      {/* Önerilen Aksiyonlar - Kompakt */}
      <div className="border border-[#E5E5E5] rounded-lg p-3 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-[#FFB114]" />
          <span className="text-[11px] font-semibold text-[#5A5A5A] uppercase tracking-wide">
            Öneriler
          </span>
        </div>
        <ul className="space-y-1.5">
          {oneriler.slice(0, 3).map((oneri, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[11px] text-[#5A5A5A]">
              <span className="w-4 h-4 rounded-full bg-[#F5F6F8] flex items-center justify-center text-[9px] text-[#969696] flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="line-clamp-2">{oneri}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Kanıt Paketi Durumu - Tıklanabilir Popover */}
      <div className="relative" ref={kanitPopoverRef}>
        <RailCard
          title="Kanıt Paketi"
          icon={<FileCheck className="w-4 h-4" />}
          value={kanitPaketiStatus.label}
          status={kanitPaketiStatus.status}
          onClick={() => setShowKanitPopover(!showKanitPopover)}
        >
          <div className="flex flex-wrap gap-1 mt-1">
            {tamamlananZorunluBelgeler.map((belge) => (
              <span
                key={belge.tip}
                className="text-[9px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#00804D]"
              >
                {belge.ad}
              </span>
            ))}
            {eksikZorunluBelgeler.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#BF192B]">
                {eksikZorunluBelgeler.length} eksik
              </span>
            )}
          </div>
        </RailCard>

        {/* Kanıt paketi popover */}
        {showKanitPopover && (
          <KanitPaketiPopover
            zorunluBelgeler={ZORUNLU_BELGELER}
            belgeDurumMap={belgeDurumMap}
            kanitPaketiYuzde={kanitPaketiYuzde}
            onClose={() => setShowKanitPopover(false)}
            onUploadClick={onUploadClick}
          />
        )}
      </div>

      {/* Hızlı İşlemler - Gerçek Link'ler */}
      <div className="border border-[#E5E5E5] rounded-lg p-3 bg-gradient-to-br from-[#E6F9FF]/50 to-[#E6F9FF]/50">
        <h4 className="text-[11px] font-semibold text-[#5A5A5A] uppercase tracking-wide mb-2">
          Hızlı İşlemler
        </h4>
        <div className="space-y-1">
          <QuickLink href="/v2/reports" icon={<BarChart3 className="w-3.5 h-3.5" />}>
            Dönem Raporu
          </QuickLink>
          <QuickLink href="/v2/vdk" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
            VDK Risk Özeti
          </QuickLink>
          <QuickLink href="/v2/reports/evidence" icon={<FolderArchive className="w-3.5 h-3.5" />}>
            Kanıt Paketi
          </QuickLink>
        </div>
      </div>
    </div>
  );
}
