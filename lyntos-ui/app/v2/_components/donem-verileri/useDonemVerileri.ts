'use client';
/**
 * LYNTOS V2 - Dönem Verileri Hook
 * donemStore'dan gerçek veri okur - SIFIR MOCK DATA
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import type { BelgeTipi, BelgeDurumData, DonemVerileriResult } from './types';
import { BELGE_TANIMLARI } from './types';
import { useDonemStore } from '../../_lib/stores/donemStore';
import type { DetectedFileType } from '../../_lib/parsers/types';

// ═══════════════════════════════════════════════════════════════════════════
// DetectedFileType -> BelgeTipi Mapping
// fileDetector'dan gelen tipleri UI kategorilerine eşle
// ═══════════════════════════════════════════════════════════════════════════

const FILE_TYPE_TO_BELGE_TIPI: Partial<Record<DetectedFileType, BelgeTipi>> = {
  // Mizan
  'MIZAN_EXCEL': 'mizan_ayrintili',

  // E-Defter
  'E_DEFTER_YEVMIYE_XML': 'e_defter_yevmiye',
  'E_DEFTER_KEBIR_XML': 'e_defter_kebir',
  'E_DEFTER_BERAT_XML': 'E_DEFTER',
  'E_DEFTER_RAPOR_XML': 'E_DEFTER',

  // Yevmiye & Kebir (Excel versions)
  'YEVMIYE_EXCEL': 'e_defter_yevmiye',
  'KEBIR_EXCEL': 'e_defter_kebir',

  // E-Fatura / E-Arşiv
  'E_FATURA_XML': 'e_fatura_listesi',
  'E_ARSIV_XML': 'e_fatura_listesi',

  // Banka Ekstreleri
  'BANKA_EKSTRE_CSV': 'banka_ekstresi',
  'BANKA_EKSTRE_EXCEL': 'banka_ekstresi',

  // Beyannameler
  'KDV_BEYANNAME_PDF': 'beyan_kdv',
  'MUHTASAR_BEYANNAME_PDF': 'beyan_muhtasar',
  'GECICI_VERGI_BEYANNAME_PDF': 'beyan_gecici',
  'KURUMLAR_VERGISI_PDF': 'beyan_kurumlar',
  'DAMGA_VERGISI_PDF': 'beyan_damga',

  // Tahakkuklar
  'KDV_TAHAKKUK_PDF': 'vergi_tahakkuk',
  'MUHTASAR_TAHAKKUK_PDF': 'vergi_tahakkuk',
  'GECICI_VERGI_TAHAKKUK_PDF': 'vergi_tahakkuk',

  // Mali Tablolar
  'BILANCO_EXCEL': 'bilanco',
  'GELIR_TABLOSU_EXCEL': 'gelir_tablosu',

  // SGK - muhtasar kategorisine dahil
  'SGK_APHB_EXCEL': 'beyan_muhtasar',
  'SGK_APHB_PDF': 'beyan_muhtasar',
};

// Legacy mapping for backward compatibility
const LEGACY_BELGE_TIPI_MAP: Record<string, BelgeTipi> = {
  'MIZAN': 'mizan_ayrintili',
  'E_DEFTER': 'e_defter_yevmiye',
};

interface UseDonemVerileriReturn {
  data: DonemVerileriResult;
  isLoading: boolean;
  markAsUploaded: (tip: BelgeTipi) => void;
}

export function useDonemVerileri(): UseDonemVerileriReturn {
  // Gerçek store'dan oku - MOCK YOK
  const detectedFiles = useDonemStore(s => s.detectedFiles);

  // Hydration state - Zustand persist hydration tamamlandı mı?
  // isLoaded "veri var mı" demek, hydration "store hazır mı" demek
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Client-side'da mount olunca hydration tamamlanmış demektir
    setIsHydrated(true);
  }, []);

  // Manuel olarak işaretlenen tipler (upload modal'dan)
  const [manuallyMarked, setManuallyMarked] = useState<Set<BelgeTipi>>(new Set());

  // Build belgeler list from store data
  const data = useMemo<DonemVerileriResult>(() => {
    // Yüklenen belge tiplerini tespit et
    const yukluTipler = new Set<BelgeTipi>();

    // Store'daki dosyalardan tipleri çıkar
    if (detectedFiles && detectedFiles.length > 0) {
      for (const file of detectedFiles) {
        const fileType = file.fileType as DetectedFileType;
        const belgeTipi = FILE_TYPE_TO_BELGE_TIPI[fileType];
        if (belgeTipi) {
          yukluTipler.add(belgeTipi);
          // Legacy mapping'i de ekle
          if (belgeTipi === 'mizan_ayrintili') yukluTipler.add('MIZAN');
          if (belgeTipi === 'e_defter_yevmiye' || belgeTipi === 'e_defter_kebir') {
            yukluTipler.add('E_DEFTER');
          }
        }
      }
    }

    // Manuel işaretlemeleri de ekle
    manuallyMarked.forEach(tip => yukluTipler.add(tip));

    // BELGE_TANIMLARI'ndan belge listesi oluştur
    const belgeler: BelgeDurumData[] = Object.values(BELGE_TANIMLARI).map(tanim => {
      const yuklendi = yukluTipler.has(tanim.tip);

      // Yüklenen dosya bilgisini bul
      const matchingFile = detectedFiles?.find(f => {
        const belgeTipi = FILE_TYPE_TO_BELGE_TIPI[f.fileType as DetectedFileType];
        return belgeTipi === tanim.tip ||
               LEGACY_BELGE_TIPI_MAP[tanim.tip] === belgeTipi;
      });

      return {
        tip: tanim.tip,
        durum: yuklendi ? 'VAR' as const : 'EKSIK' as const,
        yuklemeTarihi: matchingFile ? new Date().toISOString() : undefined,
        dosyaAdi: matchingFile?.fileName,
        fileId: matchingFile?.id,
      };
    });

    const varSayisi = belgeler.filter(b => b.durum === 'VAR').length;
    const eksikSayisi = belgeler.filter(b => b.durum === 'EKSIK').length;
    const bekleyenSayisi = belgeler.filter(b => b.durum === 'BEKLIYOR').length;

    // Tamamlanma yüzdesini hesapla (zorunlu belgeler bazında)
    const gerekliTipler = Object.values(BELGE_TANIMLARI)
      .filter(t => t.gerekliMi || t.zorunlu)
      .map(t => t.tip);
    const gerekliVar = belgeler.filter(
      b => gerekliTipler.includes(b.tip) && b.durum === 'VAR'
    ).length;
    const tamamlanmaYuzdesi = gerekliTipler.length > 0
      ? Math.round((gerekliVar / gerekliTipler.length) * 100)
      : 0;

    return {
      belgeler,
      tamamlanmaYuzdesi,
      eksikSayisi,
      varSayisi,
      bekleyenSayisi,
    };
  }, [detectedFiles, manuallyMarked]);

  // Upload modal'dan çağrılan fonksiyon
  const markAsUploaded = useCallback((tip: BelgeTipi) => {
    setManuallyMarked(prev => {
      const next = new Set(prev);
      next.add(tip);
      // Legacy mapping'i de ekle
      const legacyTip = LEGACY_BELGE_TIPI_MAP[tip];
      if (legacyTip) next.add(legacyTip);
      return next;
    });
  }, []);

  return {
    data,
    // isLoading: Hydration tamamlanana kadar true, sonra false
    // Veri yoksa empty state gösterilir, sonsuz spinner değil
    isLoading: !isHydrated,
    markAsUploaded
  };
}
