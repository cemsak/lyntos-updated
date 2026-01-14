/**
 * LYNTOS KPI Formatters
 * Sprint 2.1 - Anayasa Compliance
 *
 * Büyük sayıları kısaltma ve formatlama utilities
 */

export interface FormattedNumber {
  display: string;      // Kısaltılmış gösterim: "72.35M"
  full: string;         // Tam gösterim: "72.351.083"
  raw: number;          // Ham değer: 72351083
  unit?: string;        // Birim: "TL", "%", "puan"
}

/**
 * Sayıyı kısalt: 72351083 → "72.35M"
 * Eşikler:
 * - >= 1.000.000.000 → B (Milyar)
 * - >= 1.000.000 → M (Milyon)
 * - >= 1.000 → K (Bin)
 * - < 1.000 → olduğu gibi
 */
export function formatCompactNumber(value: number, decimals: number = 2): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return sign + (absValue / 1_000_000_000).toFixed(decimals) + 'B';
  }
  if (absValue >= 1_000_000) {
    return sign + (absValue / 1_000_000).toFixed(decimals) + 'M';
  }
  if (absValue >= 1_000) {
    return sign + (absValue / 1_000).toFixed(decimals) + 'K';
  }
  return sign + absValue.toFixed(decimals === 0 ? 0 : 1);
}

/**
 * Sayıyı tam formatla: 72351083 → "72.351.083"
 */
export function formatFullNumber(value: number): string {
  return value.toLocaleString('tr-TR', {
    maximumFractionDigits: 2,
  });
}

/**
 * KPI değerini formatla
 * - Sayı ise kısalt
 * - String ise olduğu gibi döndür
 */
export function formatKpiValue(
  value: number | string,
  unit?: string,
  options?: { compact?: boolean; decimals?: number }
): FormattedNumber {
  const { compact = true, decimals = 2 } = options || {};

  // String değerler (örn: "26 Şub") olduğu gibi
  if (typeof value === 'string') {
    return {
      display: value,
      full: value,
      raw: 0,
      unit,
    };
  }

  // Sayı değerler
  const raw = value;
  const full = formatFullNumber(raw);

  // Küçük sayılar için kısaltma yapma
  const display = compact && Math.abs(raw) >= 10_000
    ? formatCompactNumber(raw, decimals)
    : formatFullNumber(raw);

  return {
    display,
    full,
    raw,
    unit,
  };
}

/**
 * TL değeri formatla
 * Kısayol: formatKpiValue(value, 'TL')
 */
export function formatTL(value: number, compact: boolean = true): FormattedNumber {
  return formatKpiValue(value, 'TL', { compact });
}

/**
 * Yüzde değeri formatla
 */
export function formatPercent(value: number, decimals: number = 1): FormattedNumber {
  return {
    display: value.toFixed(decimals),
    full: value.toFixed(decimals),
    raw: value,
    unit: '%',
  };
}
