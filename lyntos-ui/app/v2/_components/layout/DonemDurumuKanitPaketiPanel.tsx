'use client';

/**
 * LYNTOS - Dönem Durumu ve Kanıt Paketi Paneli
 *
 * RightRail + Kanıt Paketi birleşimi
 * Sol panelden sağ panele geçirilen, SMMM için kullanışlı özet panel
 *
 * useDonemVerileriV2 ile entegre - sol panel ile aynı veri kaynağı
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  FileX,
  FileCheck,
  ChevronRight,
  BarChart3,
  ShieldAlert,
  FolderArchive,
  Download,
  X,
  Upload,
  CheckCircle2,
  Circle,
  Lightbulb,
} from 'lucide-react';
import { useDonemVerileriV2 } from '../donem-verileri/useDonemVerileriV2';
import { BELGE_TANIMLARI, type BelgeTipi } from '../donem-verileri/types';

interface DonemDurumuKanitPaketiPanelProps {
  onUploadClick?: (tip: BelgeTipi) => void;
  onEvidenceClick?: () => void;
}

// Zorunlu belge listesi - tüm panellerde tutarlı
const ZORUNLU_BELGELER: Array<{ tip: BelgeTipi; labelOverride?: string }> = [
  { tip: 'mizan_ayrintili' },
  { tip: 'e_defter_yevmiye' },
  { tip: 'e_defter_kebir' },
  { tip: 'beyan_kdv', labelOverride: 'Dönem Beyannameleri' },
  { tip: 'banka_ekstresi' },
];

export function DonemDurumuKanitPaketiPanel({
  onUploadClick,
  onEvidenceClick
}: DonemDurumuKanitPaketiPanelProps) {
  // Dönem verileri - tüm panellerle aynı kaynak
  const { data: donemData, isLoading } = useDonemVerileriV2();

  // Eksik belgeler popover state
  const [showEksikPopover, setShowEksikPopover] = useState(false);
  const eksikPopoverRef = useRef<HTMLDivElement>(null);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (eksikPopoverRef.current && !eksikPopoverRef.current.contains(event.target as Node)) {
        setShowEksikPopover(false);
      }
    }
    if (showEksikPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEksikPopover]);

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

  // Kritik sayısı (şimdilik 0 - risk feed'den gelecek)
  const kritikSayisi = 0;

  // Öneriler
  const oneriler = useMemo(() => {
    const list: string[] = [];
    if (eksikZorunluBelgeler.length > 0) {
      list.push('Eksik belgeleri tamamlayın');
    }
    if (kanitPaketiYuzde < 100 && kanitPaketiYuzde > 0) {
      list.push('Kanıt paketini tamamlayın');
    }
    if (list.length === 0) {
      list.push('Tüm zorunlu belgeler tamam');
    }
    return list;
  }, [eksikZorunluBelgeler.length, kanitPaketiYuzde]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-[#E6F9FF] via-[#E6F9FF] to-[#E6F9FF] rounded-2xl border border-[#ABEBFF]/50 p-6 animate-pulse">
        <div className="h-20 bg-[#E5E5E5] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#F5F6F8] via-[#E6F9FF]/30 to-[#E6F9FF]/30 rounded-2xl border border-[#E5E5E5] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#2E2E2E] to-[#5A5A5A] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">Dönem Durumu ve Kanıt Paketi</h3>
              <p className="text-xs text-[#B4B4B4]">VDK risk analizi ve beyan dosyaları</p>
            </div>
          </div>
          {kanitPaketiYuzde === 100 ? (
            <span className="bg-[#00A651] text-white text-xs font-bold px-3 py-1.5 rounded-full">
              ✓ Hazır
            </span>
          ) : (
            <span className="bg-[#FFB114] text-white text-xs font-bold px-3 py-1.5 rounded-full">
              %{kanitPaketiYuzde}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5">
        {/* Status Cards Row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {/* Açık Kritikler */}
          <div className={`rounded-xl p-4 border ${
            kritikSayisi > 0
              ? 'bg-[#FEF2F2] border-[#FFC7C9]'
              : 'bg-[#ECFDF5] border-[#AAE8B8]'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${kritikSayisi > 0 ? 'text-[#F0282D]' : 'text-[#00A651]'}`} />
              <span className="text-xs font-semibold text-[#5A5A5A] uppercase">Açık Kritikler</span>
            </div>
            <p className={`text-2xl font-bold ${kritikSayisi > 0 ? 'text-[#BF192B]' : 'text-[#00804D]'}`}>
              {kritikSayisi}
            </p>
            {kritikSayisi === 0 && (
              <p className="text-[10px] text-[#00804D] mt-1">Risk yok</p>
            )}
          </div>

          {/* Eksik Belgeler */}
          <div className="relative" ref={eksikPopoverRef}>
            <button
              onClick={() => eksikZorunluBelgeler.length > 0 && setShowEksikPopover(!showEksikPopover)}
              disabled={eksikZorunluBelgeler.length === 0}
              className={`w-full text-left rounded-xl p-4 border transition-all ${
                eksikZorunluBelgeler.length > 0
                  ? 'bg-[#FFFBEB] border-[#FFF08C] hover:bg-[#FFFBEB] cursor-pointer'
                  : 'bg-[#ECFDF5] border-[#AAE8B8]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileX className={`w-4 h-4 ${eksikZorunluBelgeler.length > 0 ? 'text-[#FFB114]' : 'text-[#00A651]'}`} />
                <span className="text-xs font-semibold text-[#5A5A5A] uppercase">Eksik Belgeler</span>
              </div>
              <p className={`text-2xl font-bold ${eksikZorunluBelgeler.length > 0 ? 'text-[#FA841E]' : 'text-[#00804D]'}`}>
                {eksikZorunluBelgeler.length}
              </p>
              {eksikZorunluBelgeler.length > 0 ? (
                <p className="text-[10px] text-[#FA841E] mt-1">Tıklayın →</p>
              ) : (
                <p className="text-[10px] text-[#00804D] mt-1">Tamamlandı</p>
              )}
            </button>

            {/* Eksik belgeler popover */}
            {showEksikPopover && eksikZorunluBelgeler.length > 0 && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-[#E5E5E5] z-50 animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
                  <h4 className="text-sm font-semibold text-[#2E2E2E]">
                    Eksik Zorunlu Belgeler
                  </h4>
                  <button
                    onClick={() => setShowEksikPopover(false)}
                    className="p-1 hover:bg-[#F5F6F8] rounded"
                  >
                    <X className="w-4 h-4 text-[#969696]" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {eksikZorunluBelgeler.map((belge, idx) => (
                    <div
                      key={belge.tip}
                      className={`flex items-center justify-between px-4 py-2.5 hover:bg-[#F5F6F8] ${
                        idx !== eksikZorunluBelgeler.length - 1 ? 'border-b border-[#F5F6F8]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Circle className="w-3 h-3 text-[#B4B4B4]" />
                        <span className="text-sm text-[#5A5A5A]">{belge.ad}</span>
                      </div>
                      {onUploadClick && (
                        <button
                          onClick={() => {
                            onUploadClick(belge.tip);
                            setShowEksikPopover(false);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#0049AA] hover:bg-[#E6F9FF] rounded"
                        >
                          <Upload className="w-3 h-3" />
                          Yükle
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 bg-[#FEF2F2] border-t border-[#FEF2F2] rounded-b-lg">
                  <p className="text-xs text-[#BF192B]">
                    <strong>Uyarı:</strong> Zorunlu belgeler yüklenmeden kanıt paketi oluşturulamaz.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Kanıt Paketi */}
          <div className={`rounded-xl p-4 border ${
            kanitPaketiYuzde === 100
              ? 'bg-[#ECFDF5] border-[#AAE8B8]'
              : 'bg-[#E6F9FF] border-[#ABEBFF]'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <FolderArchive className={`w-4 h-4 ${kanitPaketiYuzde === 100 ? 'text-[#00A651]' : 'text-[#0078D0]'}`} />
              <span className="text-xs font-semibold text-[#5A5A5A] uppercase">Kanıt Paketi</span>
            </div>
            <p className={`text-2xl font-bold ${kanitPaketiYuzde === 100 ? 'text-[#00804D]' : 'text-[#0049AA]'}`}>
              {kanitPaketiYuzde === 100 ? 'Hazır' : `%${kanitPaketiYuzde}`}
            </p>
            <p className="text-[10px] text-[#969696] mt-1">
              {tamamlananZorunluBelgeler.length}/{ZORUNLU_BELGELER.length} belge
            </p>
          </div>
        </div>

        {/* Zorunlu Belgeler Chips */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-[#969696] uppercase mb-2">Zorunlu Belgeler</p>
          <div className="flex flex-wrap gap-2">
            {ZORUNLU_BELGELER.map(({ tip, labelOverride }) => {
              const isVar = belgeDurumMap.get(tip) === 'VAR';
              const ad = labelOverride || BELGE_TANIMLARI[tip]?.kisaAd || BELGE_TANIMLARI[tip]?.ad || tip;

              return (
                <div
                  key={tip}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                    isVar
                      ? 'bg-[#ECFDF5] text-[#00804D] border border-[#AAE8B8]'
                      : 'bg-[#F5F6F8] text-[#969696] border border-[#E5E5E5]'
                  }`}
                >
                  {isVar ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                  {ad}
                </div>
              );
            })}
          </div>
        </div>

        {/* Öneriler */}
        {oneriler.length > 0 && (
          <div className="mb-5 p-3 bg-white rounded-xl border border-[#E5E5E5]">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-[#FFB114]" />
              <span className="text-xs font-semibold text-[#5A5A5A] uppercase">Öneriler</span>
            </div>
            <ul className="space-y-1">
              {oneriler.map((oneri, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-[#5A5A5A]">
                  <span className="w-4 h-4 rounded-full bg-[#F5F6F8] flex items-center justify-center text-[9px] text-[#969696]">
                    {idx + 1}
                  </span>
                  {oneri}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/v2/reports"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#E5E5E5] rounded-xl text-sm font-medium text-[#5A5A5A] hover:bg-[#F5F6F8] hover:border-[#B4B4B4] transition-all"
          >
            <BarChart3 className="w-4 h-4 text-[#0078D0]" />
            Dönem Raporu
          </Link>
          <Link
            href="/v2/vdk"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#E5E5E5] rounded-xl text-sm font-medium text-[#5A5A5A] hover:bg-[#F5F6F8] hover:border-[#B4B4B4] transition-all"
          >
            <ShieldAlert className="w-4 h-4 text-[#FFB114]" />
            VDK Risk Özeti
          </Link>
          <button
            onClick={onEvidenceClick}
            disabled={kanitPaketiYuzde < 100}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              kanitPaketiYuzde === 100
                ? 'bg-gradient-to-r from-[#0078D0] to-[#0078D0] text-white hover:shadow-lg hover:shadow-[#0078D0]/25 hover:-translate-y-0.5'
                : 'bg-[#F5F6F8] text-[#969696] cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            Paketi Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

export default DonemDurumuKanitPaketiPanel;
