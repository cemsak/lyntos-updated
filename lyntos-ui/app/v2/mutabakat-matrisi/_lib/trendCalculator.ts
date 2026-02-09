/**
 * Trend Calculator - Donemler arasi fark degisimi
 * Saf fonksiyon, yan etkisi yok
 */

import type { TrendData, CrossCheckResultRaw } from '../_types/crossCheck';

export function calculateTrend(
  current: CrossCheckResultRaw,
  previous: CrossCheckResultRaw | undefined,
): TrendData {
  if (!previous) {
    return {
      direction: 'no_history',
      change_pct: 0,
      previous_value: 0,
      aciklama: 'Gecmis donem verisi yok',
    };
  }

  const currentDiff = Math.abs(current.difference);
  const previousDiff = Math.abs(previous.difference);

  if (previousDiff === 0 && currentDiff === 0) {
    return {
      direction: 'stable',
      change_pct: 0,
      previous_value: 0,
      aciklama: 'Her iki donemde de fark yok',
    };
  }

  if (previousDiff === 0) {
    return {
      direction: 'up',
      change_pct: 100,
      previous_value: 0,
      aciklama: 'Yeni fark tespit edildi',
    };
  }

  const changePct = ((currentDiff - previousDiff) / previousDiff) * 100;

  if (Math.abs(changePct) < 5) {
    return {
      direction: 'stable',
      change_pct: Math.abs(changePct),
      previous_value: previousDiff,
      aciklama: 'Fark istikrarli',
    };
  }

  if (changePct > 0) {
    return {
      direction: 'up',
      change_pct: changePct,
      previous_value: previousDiff,
      aciklama: `Fark artti (%${changePct.toFixed(1)})`,
    };
  }

  return {
    direction: 'down',
    change_pct: Math.abs(changePct),
    previous_value: previousDiff,
    aciklama: `Fark azaldi (%${Math.abs(changePct).toFixed(1)})`,
  };
}

export function getPreviousPeriod(periodCode: string): string | null {
  const match = periodCode.match(/(\d{4})[-_]Q(\d)/i);
  if (!match) return null;
  const year = parseInt(match[1]);
  const quarter = parseInt(match[2]);
  if (quarter === 1) return `${year - 1}-Q4`;
  return `${year}-Q${quarter - 1}`;
}
