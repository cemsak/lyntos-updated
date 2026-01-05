// ════════════════════════════════════════════════════════════════════════════
// MICROCOPY HUMANIZATION - Replace technical jargon with SMMM-friendly Turkish
// ════════════════════════════════════════════════════════════════════════════

/**
 * Convert numeric trust score to human-readable Turkish label
 */
export function getTrustLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'Bilinmiyor';
  if (score >= 0.9) return 'Cok Yuksek';
  if (score >= 0.7) return 'Yuksek';
  if (score >= 0.5) return 'Orta';
  if (score >= 0.3) return 'Dusuk';
  return 'Cok Dusuk';
}

/**
 * Get trust level color class
 */
export function getTrustColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-gray-400';
  if (score >= 0.7) return 'text-green-600';
  if (score >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Convert RegWatch status codes to human-readable Turkish
 */
export function getRegWatchStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Bilinmiyor';

  const statusMap: Record<string, string> = {
    'BOOTSTRAP': 'Baslatiliyor',
    'ACTIVE': 'Aktif',
    'ERROR': 'Hata',
    'PENDING': 'Beklemede',
    'NOT_STARTED': 'Baslatilmadi',
    'NA': 'Veri Bekleniyor',
  };

  return statusMap[status.toUpperCase()] || status;
}

/**
 * Convert "NA" or null changes to meaningful text
 */
export function getChangesLabel(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === 'NA') {
    return 'Veri bekleniyor';
  }
  if (value === 0 || value === '0') {
    return 'Degisiklik yok';
  }
  return `${value} degisiklik`;
}

/**
 * Convert scraper messages to human-readable Turkish
 */
export function getScraperMessage(status: string | null | undefined): string | null {
  if (!status) return null;

  const statusUpper = status.toUpperCase();
  if (statusUpper === 'BOOTSTRAP' || statusUpper === 'NOT_STARTED') {
    return 'Mevzuat takibi henuz baslatilmadi.';
  }
  return null;
}

/**
 * Source ID to human-readable title map
 * In production, this would be fetched from the API
 */
const SOURCE_TITLES: Record<string, string> = {
  'SRC-0001': 'TTK Madde 64',
  'SRC-0002': 'VUK Madde 219',
  'SRC-0003': 'KDV Kanunu Madde 29',
  'SRC-0006': 'TMS 29',
  'SRC-0007': 'VUK Gecici Madde 33',
  'SRC-0008': 'TUFE Endeks Tablosu',
  'SRC-0026': 'VUK Madde 168',
  'SRC-0034': 'VDK Genelgesi E-55935724-010.06-7361',
  'SRC-0045': 'VUK Madde 229',
  'SRC-0046': 'Bankacilik Kanunu Madde 73',
  'SRC-0047': 'VDK 13 Kriter Genelgesi',
};

/**
 * Get human-readable title for a source ID
 */
export function getSourceTitle(sourceId: string): string {
  return SOURCE_TITLES[sourceId] || 'Yasal Dayanak';
}

/**
 * Get badge variant for RegWatch status
 */
export function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  const statusUpper = (status || '').toUpperCase();
  switch (statusUpper) {
    case 'ACTIVE':
      return 'success';
    case 'BOOTSTRAP':
    case 'PENDING':
      return 'warning';
    case 'ERROR':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Format button/link labels
 */
export const LABELS = {
  dataCockpit: 'Donemsel Veri Kokpiti',
  refresh: 'Yenile',
  downloadPdf: 'PDF Indir',
  loading: 'Yukleniyor...',
  explain: 'Neden?',
  startTracking: 'Takibi Baslat',
  noData: 'Veri bulunamadi',
  selectClient: 'Mukellef secin...',
  selectPeriod: 'Donem secin...',
};
