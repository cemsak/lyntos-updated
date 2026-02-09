/**
 * LYNTOS - Root Cause Analysis Engine
 *
 * Pure function: fark nedeni otomatik belirleme algoritması.
 * Sıfır bağımlılık, sıfır side-effect.
 *
 * Karar Ağacı:
 * 1. fark <= 10 TL → UYUMLU
 * 2. mizan > 0 & ekstre = 0 → EKSTRE_EKSIK
 * 3. mizan = 0 & ekstre > 0 → KAYITSIZ_HAREKET
 * 4. Son hareket dönem son 5 gün → CUT_OFF
 * 5. fark < 1 TL ve yuvarlak → YUVARLAMA
 * 6. aging > 365 gün & 120.xxx → SUPHELI_ALACAK
 * 7. DEFAULT → BILINMEYEN_FARK
 */

import type { RootCause, RootCauseResult } from '../_types/cariMutabakat';
import { formatDate } from '../../_lib/format';
import {
  MUTABAKAT_TOLERANS_TL,
  SUPHELI_ALACAK_GUN_ESIGI,
  CUT_OFF_GUN_ESIGI,
  YUVARLAMA_FARK_ESIGI,
} from '../_types/cariMutabakat';

export interface RootCauseInput {
  hesapKodu: string;
  mizanBakiye: number;
  ekstreBakiye: number;
  fark: number;
  agingGun: number;
  /** Muavin son hareket tarihi (ISO string veya null) */
  muavinSonHareket?: string | null;
  /** Dönem bitiş tarihi (ISO string) - ör: "2025-03-31" */
  periodBitis?: string | null;
}

/**
 * Fark nedenini otomatik belirle.
 *
 * Kurallar sıralıdır: ilk eşleşen kazanır.
 */
export function analyzeRootCause(input: RootCauseInput): RootCauseResult {
  const { hesapKodu, mizanBakiye, ekstreBakiye, fark, agingGun } = input;

  // 1. Tolerans dahilinde → UYUMLU
  if (fark <= MUTABAKAT_TOLERANS_TL) {
    return {
      neden: 'UYUMLU',
      guvenilirlik: 'kesin',
      aciklama: `Mizan ve ekstre bakiyeleri eşleşiyor (±${MUTABAKAT_TOLERANS_TL} TL tolerans dahilinde).`,
    };
  }

  // 2. Mizan'da bakiye var ama ekstre yok → EKSTRE_EKSIK
  if (Math.abs(mizanBakiye) > MUTABAKAT_TOLERANS_TL && ekstreBakiye === 0) {
    return {
      neden: 'EKSTRE_EKSIK',
      guvenilirlik: 'kesin',
      aciklama: 'Karşı taraftan cari hesap ekstresi gelmemiş. Sadece mizan bakiyesi mevcut.',
    };
  }

  // 3. Ekstre'de bakiye var ama mizan'da yok → KAYITSIZ_HAREKET
  if (mizanBakiye === 0 && Math.abs(ekstreBakiye) > MUTABAKAT_TOLERANS_TL) {
    return {
      neden: 'KAYITSIZ_HAREKET',
      guvenilirlik: 'kesin',
      aciklama: 'Mizan\'da bu hesap kodu bulunmuyor veya bakiye sıfır. Ekstre\'de bakiye var — kayıtlanmamış hareket olabilir.',
    };
  }

  // 4. Cut-off farkı: son hareket dönem son 5 gününde
  if (input.muavinSonHareket && input.periodBitis) {
    const sonHareket = parseDate(input.muavinSonHareket);
    const periodBitis = parseDate(input.periodBitis);

    if (sonHareket && periodBitis) {
      const gunFarki = Math.abs(daysBetween(sonHareket, periodBitis));
      if (gunFarki <= CUT_OFF_GUN_ESIGI) {
        const tarihStr = formatDate(sonHareket);
        return {
          neden: 'CUT_OFF',
          guvenilirlik: 'tahmini',
          aciklama: `Dönem sonu son ${CUT_OFF_GUN_ESIGI} günde hareket tespit edildi (son hareket: ${tarihStr}). Karşı tarafta farklı tarihte kayıtlanmış olabilir.`,
        };
      }
    }
  }

  // 5. Yuvarlama farkı: küçük ve yuvarlak sayı
  if (fark <= YUVARLAMA_FARK_ESIGI && isRoundingDifference(fark)) {
    return {
      neden: 'YUVARLAMA',
      guvenilirlik: 'kesin',
      aciklama: 'Kuruş düzeyinde yuvarlama farkı tespit edildi. Düzeltme genellikle gerekmez.',
    };
  }

  // 6. Şüpheli alacak: aging > 365 gün & 120.xxx hesap grubu
  if (
    agingGun > SUPHELI_ALACAK_GUN_ESIGI &&
    hesapKodu.startsWith('120')
  ) {
    return {
      neden: 'SUPHELI_ALACAK',
      guvenilirlik: 'kesin',
      aciklama: `VUK Md. 323 — Bu alacak ${agingGun} gündür tahsil edilememiş. Şüpheli ticari alacak karşılığı (TDHP 128/129) ayrılması değerlendirilmelidir.`,
    };
  }

  // 7. DEFAULT → BILINMEYEN_FARK
  return {
    neden: 'BILINMEYEN_FARK',
    guvenilirlik: 'tahmini',
    aciklama: 'Fark nedeni otomatik belirlenemedi. Muavin, banka ve kasa kanıtlarını inceleyerek karar veriniz.',
  };
}

// ═══════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════

/** Yuvarlama farkı mı? (0.01, 0.10, 0.50, 1.00 gibi) */
function isRoundingDifference(fark: number): boolean {
  const roundValues = [0.01, 0.02, 0.05, 0.10, 0.20, 0.25, 0.50, 1.00];
  return roundValues.some(v => Math.abs(fark - v) < 0.005);
}

/** Tarih string'ini Date'e çevir (YYYY-MM-DD veya DD.MM.YYYY) */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // TR format: DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
    const [day, month, year] = dateStr.split('.');
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/** İki tarih arasındaki gün farkı */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

// formatDate imported from ../../_lib/format
