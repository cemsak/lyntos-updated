/**
 * Root Cause Analysis - Capraz kontrol farki neden analizi
 * Saf fonksiyon, yan etkisi yok
 *
 * Karar agaci:
 * 1. status=no_data -> VERI_EKSIK (kesin)
 * 2. fark <= tolerans -> UYUMLU (kesin)
 * 3. fark >%10 -> YAPISAL_FARK (kesin)
 * 4. mizan+beyanname, %2-10 -> ZAMANLAMA_FARKI (tahmini)
 * 5. fark %0-2 -> HESAPLAMA_HATASI (tahmini)
 * 6. default -> BILINMEYEN (tahmini)
 */

import type { RootCauseResult, CrossCheckResultRaw } from '../_types/crossCheck';

export function analyzeRootCause(check: CrossCheckResultRaw): RootCauseResult {
  // Rule 1: No data
  if (check.status === 'no_data' || check.status === 'skipped') {
    return {
      neden: 'VERI_EKSIK',
      guvenilirlik: 'kesin',
      aciklama: `${check.source_label || 'Kaynak'} veya ${check.target_label || 'Hedef'} verisi yuklenmemis`,
    };
  }

  // Rule 2: Within tolerance
  if (Math.abs(check.difference) <= check.tolerance_amount && check.status === 'pass') {
    return {
      neden: 'UYUMLU',
      guvenilirlik: 'kesin',
      aciklama: `Fark tolerans dahilinde (±${check.tolerance_amount} TL)`,
    };
  }

  // Rule 3: Structural difference (>10%)
  if (check.difference_percent > 10) {
    return {
      neden: 'YAPISAL_FARK',
      guvenilirlik: 'kesin',
      aciklama: `${check.source_label} ile ${check.target_label} arasinda yapisal fark (%${check.difference_percent.toFixed(1)})`,
    };
  }

  // Rule 4: Timing difference (2-10%, mizan+beyanname)
  const isBeyanKontrol = check.check_id.toLowerCase().includes('beyan') ||
    check.check_id.toLowerCase().includes('kdv') ||
    check.check_id.toLowerCase().includes('matrah');

  if (isBeyanKontrol && check.difference_percent > 2 && check.difference_percent <= 10) {
    return {
      neden: 'ZAMANLAMA_FARKI',
      guvenilirlik: 'tahmini',
      aciklama: 'Donem sonu zamanlama farki (cut-off) olabilir. Mizan ve beyanname kayit tarihleri farkli olabilir.',
    };
  }

  // Rule 5: Calculation error (0-2%)
  if (check.difference_percent > 0 && check.difference_percent <= 2) {
    return {
      neden: 'HESAPLAMA_HATASI',
      guvenilirlik: 'tahmini',
      aciklama: 'Kucuk fark - yuvarlama veya hesaplama hatasi olabilir',
    };
  }

  // Rule 6: Unknown
  return {
    neden: 'BILINMEYEN',
    guvenilirlik: 'tahmini',
    aciklama: 'Fark nedeni otomatik belirlenemedi. Kanitlari inceleyerek karar veriniz.',
  };
}
