'use client';
/**
 * LYNTOS V2 - Dönem Verileri Hook (V2 - Backend Based)
 * localStorage KULLANMAZ - Tüm veri Backend'den gelir
 *
 * Pencere 8: İki API çağrısı TEK çağrıya birleştirildi.
 * useDonemData artık edefter_durum bilgisini de döndürür.
 * Ayrı /api/v2/edefter/durum çağrısına gerek kalmadı.
 */

import { useMemo, useEffect } from 'react';
import { useDonemData } from '../../_hooks/useDonemData';
import type { BelgeTipi, BelgeDurumData, DonemVerileriResult } from './types';
import { BELGE_TANIMLARI } from './types';

/**
 * Pipeline completion event adı.
 * UploadModal pipeline tamamlandığında bu event'i dispatch eder.
 * useDonemVerileriV2 bu event'i dinleyerek otomatik refetch yapar.
 */
export const PIPELINE_COMPLETE_EVENT = 'lyntos:pipeline-complete';

// Backend doc_type -> UI BelgeTipi mapping
const DOC_TYPE_TO_BELGE_TIPI: Record<string, BelgeTipi> = {
  'MIZAN': 'mizan_ayrintili',
  'BANKA': 'banka_ekstresi',
  'BEYANNAME': 'beyan_kdv',
  'TAHAKKUK': 'vergi_tahakkuk',
  'EDEFTER_YEVMIYE': 'e_defter_yevmiye',
  'EDEFTER_KEBIR': 'e_defter_kebir',
  'EDEFTER_BERAT': 'e_defter_yevmiye',  // Legacy fallback
  'EFATURA_ARSIV': 'e_fatura_listesi',
  'OTHER': 'diger',
};

// BelgeTipi'nin hangi doc_type'larla eşleştiği
const BELGE_TIPI_MATCHES: Record<BelgeTipi, string[]> = {
  'mizan_ayrintili': ['MIZAN'],
  'e_defter_yevmiye': ['EDEFTER_YEVMIYE', 'EDEFTER_BERAT'],
  'e_defter_kebir': ['EDEFTER_KEBIR'],
  'banka_ekstresi': ['BANKA'],
  'beyan_kdv': ['BEYANNAME'],
  'beyan_kdv2': ['BEYANNAME'],
  'beyan_muhtasar': ['BEYANNAME'],
  'beyan_gecici': ['BEYANNAME'],
  'beyan_kurumlar': ['BEYANNAME'],
  'beyan_damga': ['BEYANNAME'],
  'beyan_gelir': ['BEYANNAME'],
  'beyan_otv': ['BEYANNAME'],
  'vergi_tahakkuk': ['TAHAKKUK'],
  'e_fatura_listesi': ['EFATURA_ARSIV'],
  'bilanco': ['OTHER'],
  'gelir_tablosu': ['OTHER'],
  'nakit_akim': ['OTHER'],
  'ozkaynak_degisim': ['OTHER'],
  'E_DEFTER': ['EDEFTER_YEVMIYE', 'EDEFTER_BERAT'],
  'MIZAN': ['MIZAN'],
  'cari_hesap_ekstresi': ['OTHER'],
  'diger': ['OTHER'],
};

interface UseDonemVerileriReturn {
  data: DonemVerileriResult;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDonemVerileriV2(): UseDonemVerileriReturn {
  const {
    files,
    edefterDurum,
    isLoading,
    error,
    refetch,
  } = useDonemData({ includeAccounts: false });

  // Pipeline tamamlandığında otomatik refetch
  useEffect(() => {
    const handlePipelineComplete = () => {
      refetch();
    };
    window.addEventListener(PIPELINE_COMPLETE_EVENT, handlePipelineComplete);
    return () => {
      window.removeEventListener(PIPELINE_COMPLETE_EVENT, handlePipelineComplete);
    };
  }, [refetch]);

  const data = useMemo<DonemVerileriResult>(() => {
    // Backend'den gelen dosya tiplerini set olarak tut
    const yukluDocTypes = new Set<string>(files.map(f => f.doc_type));

    // E-Defter durumuna göre sanal doc_type'lar ekle
    // edefter_entries tablosunda Y (Yevmiye) veya K (Kebir) varsa
    if (edefterDurum?.has_yevmiye) {
      yukluDocTypes.add('EDEFTER_YEVMIYE');
    }
    if (edefterDurum?.has_kebir) {
      yukluDocTypes.add('EDEFTER_KEBIR');
    }

    // BELGE_TANIMLARI'ndan belge listesi oluştur
    const belgeler: BelgeDurumData[] = Object.values(BELGE_TANIMLARI).map(tanim => {
      // Bu tip için hangi doc_type'lar geçerli?
      const matchingTypes = BELGE_TIPI_MATCHES[tanim.tip] || [];

      // Herhangi biri yüklü mü?
      const yuklendi = matchingTypes.some(dt => yukluDocTypes.has(dt));

      // Yüklenen dosyayı bul (document_uploads'tan)
      const matchingFile = files.find(f =>
        matchingTypes.includes(f.doc_type)
      );

      // E-Defter için özel satır sayısı bilgisi
      let extraInfo: string | undefined;
      if (tanim.tip === 'e_defter_yevmiye' && edefterDurum?.has_yevmiye) {
        extraInfo = `${edefterDurum.yevmiye_satir.toLocaleString('tr-TR')} satır`;
      } else if (tanim.tip === 'e_defter_kebir' && edefterDurum?.has_kebir) {
        extraInfo = `${edefterDurum.kebir_satir.toLocaleString('tr-TR')} satır`;
      }

      return {
        tip: tanim.tip,
        durum: yuklendi ? 'VAR' as const : 'EKSIK' as const,
        yuklemeTarihi: matchingFile?.uploaded_at,
        dosyaAdi: matchingFile?.original_filename || extraInfo,
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
  }, [files, edefterDurum]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

export default useDonemVerileriV2;
