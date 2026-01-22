'use client';
/**
 * LYNTOS V2 - Dönem Verileri Hook (V2 - Backend Based)
 * localStorage KULLANMAZ - Tüm veri Backend'den gelir
 *
 * Bu hook useDonemData'yı sararak DonemVerileriPanel'in beklediği
 * formatta veri döndürür. Mevcut UI'ı bozmadan backend geçişi sağlar.
 */

import { useMemo } from 'react';
import { useDonemData, DonemFileSummary } from '../../_hooks/useDonemData';
import type { BelgeTipi, BelgeDurumData, DonemVerileriResult } from './types';
import { BELGE_TANIMLARI } from './types';

// Backend doc_type -> UI BelgeTipi mapping
const DOC_TYPE_TO_BELGE_TIPI: Record<string, BelgeTipi> = {
  'MIZAN': 'mizan_ayrintili',
  'BANKA': 'banka_ekstresi',
  'BEYANNAME': 'beyan_kdv',
  'TAHAKKUK': 'vergi_tahakkuk',
  'EDEFTER_BERAT': 'e_defter_yevmiye',
  'YEVMIYE': 'e_defter_yevmiye',
  'KEBIR': 'e_defter_kebir',
  'EFATURA_ARSIV': 'e_fatura_listesi',
  'OTHER': 'diger',
};

// BelgeTipi'nin hangi doc_type'larla eşleştiği
const BELGE_TIPI_MATCHES: Record<BelgeTipi, string[]> = {
  'mizan_ayrintili': ['MIZAN'],
  'e_defter_yevmiye': ['EDEFTER_BERAT', 'YEVMIYE'],
  'e_defter_kebir': ['KEBIR'],
  'banka_ekstresi': ['BANKA'],
  'beyan_kdv': ['BEYANNAME'],
  'beyan_muhtasar': ['BEYANNAME'],
  'beyan_gecici': ['BEYANNAME'],
  'beyan_kurumlar': ['BEYANNAME'],
  'beyan_damga': ['BEYANNAME'],
  'vergi_tahakkuk': ['TAHAKKUK'],
  'e_fatura_listesi': ['EFATURA_ARSIV'],
  'bilanco': ['OTHER'],
  'gelir_tablosu': ['OTHER'],
  'E_DEFTER': ['EDEFTER_BERAT'],
  'MIZAN': ['MIZAN'],
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
    meta,
    hasData,
    isLoading,
    error,
    refetch,
  } = useDonemData({ includeAccounts: false });

  const data = useMemo<DonemVerileriResult>(() => {
    // Backend'den gelen dosya tiplerini set olarak tut
    const yukluDocTypes = new Set<string>(files.map(f => f.doc_type));

    // BELGE_TANIMLARI'ndan belge listesi oluştur
    const belgeler: BelgeDurumData[] = Object.values(BELGE_TANIMLARI).map(tanim => {
      // Bu tip için hangi doc_type'lar geçerli?
      const matchingTypes = BELGE_TIPI_MATCHES[tanim.tip] || [];

      // Herhangi biri yüklü mü?
      const yuklendi = matchingTypes.some(dt => yukluDocTypes.has(dt));

      // Yüklenen dosyayı bul
      const matchingFile = files.find(f =>
        matchingTypes.includes(f.doc_type)
      );

      return {
        tip: tanim.tip,
        durum: yuklendi ? 'VAR' as const : 'EKSIK' as const,
        yuklemeTarihi: matchingFile?.uploaded_at,
        dosyaAdi: matchingFile?.original_filename,
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
  }, [files]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

export default useDonemVerileriV2;
