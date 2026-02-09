/**
 * LYNTOS Merkezi Formatlama Kütüphanesi
 * Tüm para, tarih ve dönem formatlamaları bu dosyadan yapılmalıdır.
 */

export interface FormatCurrencyOptions {
  decimals?: number;
  showSymbol?: boolean;
  nullValue?: string;
}

/**
 * Para birimi formatla (TRY)
 * @example formatCurrency(1234567.89) → "₺1.234.567,89"
 */
export function formatCurrency(
  value: number | null | undefined,
  options: FormatCurrencyOptions = {}
): string {
  const { decimals = 2, showSymbol = true, nullValue = '—' } = options;

  if (value === null || value === undefined || !isFinite(value)) {
    return nullValue;
  }

  return new Intl.NumberFormat('tr-TR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'TRY',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Tarih formatla
 * @example formatDate('2025-01-15') → "15.01.2025"
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '—';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('tr-TR', options).format(dateObj);
  } catch {
    return typeof date === 'string' ? date : '—';
  }
}

/**
 * Dönem formatla
 * @example formatPeriod('2025-Q1') → "2025 1. Çeyrek"
 */
export function formatPeriod(period: string | null | undefined): string {
  if (!period) return '—';

  const match = period.match(/(\d{4})-Q(\d)/);
  if (!match) return period;

  const [, year, quarter] = match;
  const quarterNames: Record<string, string> = {
    '1': '1. Çeyrek',
    '2': '2. Çeyrek',
    '3': '3. Çeyrek',
    '4': '4. Çeyrek',
  };

  return `${year} ${quarterNames[quarter] || `${quarter}. Çeyrek`}`;
}

/**
 * Sayı formatla (para birimi olmadan)
 */
export function formatNumber(
  value: number | null | undefined,
  decimals = 0
): string {
  if (value === null || value === undefined || !isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Yüzde formatla
 * @example formatPercent(0.1567) → "%15,67"
 */
export function formatPercent(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined || !isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('tr-TR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
