'use client';
/**
 * LYNTOS - useRootCauseEngine Hook
 *
 * Mutabakat satırlarına RootCause analizi uygular.
 * analyzeRootCause pure function'ını her satıra çağırır.
 */

import { useMemo } from 'react';
import { analyzeRootCause } from '../_lib/rootCauseAnalysis';
import type {
  MutabakatSatir,
  RootCauseResult,
  SmmmKararData,
  EnrichedMutabakatSatir,
} from '../_types/cariMutabakat';

interface UseRootCauseEngineOptions {
  /** Dönem bitiş tarihi (ISO format) - cut-off analizi için */
  periodBitis?: string | null;
}

/**
 * Mutabakat satırlarını root cause analizi ile zenginleştirir.
 *
 * @param satirlar - Backend'den gelen ham mutabakat satırları
 * @param kararlar - localStorage'dan okunan SMMM kararları
 * @param options - Opsiyonel ayarlar
 * @returns EnrichedMutabakatSatir[] - Root cause + karar bilgisi eklenmiş satırlar
 */
export function useRootCauseEngine(
  satirlar: MutabakatSatir[],
  kararlar: Record<string, SmmmKararData>,
  options: UseRootCauseEngineOptions = {},
): EnrichedMutabakatSatir[] {
  const { periodBitis } = options;

  return useMemo(() => {
    return satirlar.map((satir) => {
      // Root cause analizi
      const rootCause: RootCauseResult = analyzeRootCause({
        hesapKodu: satir.hesap_kodu,
        mizanBakiye: satir.mizan_bakiye,
        ekstreBakiye: satir.ekstre_bakiye,
        fark: satir.fark,
        agingGun: satir.aging_gun,
        muavinSonHareket: null, // TODO: Kebir API'den son hareket tarihi çekilecek. Şimdilik CUT_OFF tespiti (kural 4) devre dışı.
        periodBitis: periodBitis || null,
      });

      // SMMM kararı (localStorage'dan)
      const kararKey = satir.hesap_kodu;
      const smmmKarar: SmmmKararData = kararlar[kararKey] || {
        karar: 'BILINMIYOR',
        not: '',
        tarih: '',
      };

      // Uyumlu satırlar otomatik olarak RESMİ kabul edilir (karar gerektirmez)
      if (rootCause.neden === 'UYUMLU' && smmmKarar.karar === 'BILINMIYOR') {
        smmmKarar.karar = 'RESMI';
        smmmKarar.not = 'Otomatik: tolerans dahilinde uyumlu';
      }

      return {
        ...satir,
        rootCause,
        smmmKarar,
      };
    });
  }, [satirlar, kararlar, periodBitis]);
}
