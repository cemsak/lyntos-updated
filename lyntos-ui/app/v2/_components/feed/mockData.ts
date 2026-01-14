/**
 * LYNTOS Feed Mock Data
 * Sprint 2.2 - Test data for development
 */

import type { FeedItem } from './types';

export const MOCK_FEED_ITEMS: FeedItem[] = [
  {
    id: 'feed-001',
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'VDK',
    severity: 'CRITICAL',
    score: 95,
    impact: { points: -15 },
    title: 'Kasa hesabı negatif bakiye',
    summary: '100-Kasa hesabında 31.12.2024 tarihinde -45.230 TL negatif bakiye tespit edildi. VDK incelemesinde kritik risk oluşturur.',
    evidence_refs: ['mizan-2024-q4', 'kasa-detay'],
    actions: [
      { label: 'Düzelt', action: 'fix_kasa' },
      { label: 'Detay', action: 'show_detail' },
    ],
    snoozeable: false,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
  },
  {
    id: 'feed-002',
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Belge',
    severity: 'HIGH',
    score: 80,
    impact: {},
    title: 'E-Defter eksik',
    summary: 'Aralık 2024 dönemi e-defter dosyası henüz yüklenmedi. Beyan süresi 26 Ocak 2025.',
    evidence_refs: [],
    actions: [
      { label: 'Yükle', action: 'upload_edefter' },
      { label: 'Hatırlat', action: 'remind' },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
  },
  {
    id: 'feed-003',
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Vergus',
    severity: 'MEDIUM',
    score: 60,
    impact: { amount_try: 125000 },
    title: 'Yatırım indirimi fırsatı',
    summary: 'Dönem içi yapılan makine alımları için yatırım indirimi uygulanabilir. Tahmini tasarruf: 125.000 TL',
    evidence_refs: ['sabit-kiymet-listesi', 'vergi-mevzuati'],
    actions: [
      { label: 'İncele', action: 'review_opportunity' },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(), // 1 day ago
  },
  {
    id: 'feed-004',
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Mutabakat',
    severity: 'MEDIUM',
    score: 55,
    impact: { amount_try: 8450 },
    title: 'Banka mutabakat farkı',
    summary: 'İş Bankası hesabında 8.450 TL mutabakat farkı tespit edildi. Dekont kontrolü gerekiyor.',
    evidence_refs: ['banka-ekstre-isbank', 'mizan-102'],
    actions: [
      { label: 'Kontrol Et', action: 'check_reconciliation' },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
  },
  {
    id: 'feed-005',
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Mevzuat',
    severity: 'LOW',
    score: 30,
    impact: {},
    title: 'KDV Genel Tebliği değişikliği',
    summary: 'E-fatura düzenleme sınırı 2025 için güncellendi. Mükellefinizi etkiliyor olabilir.',
    evidence_refs: ['regwatch-kdv-2025'],
    actions: [
      { label: 'Oku', action: 'read_regulation' },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
  },
  {
    id: 'feed-006',
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Hukuk',
    severity: 'INFO',
    score: 20,
    impact: {},
    title: 'Genel kurul tarihi yaklaşıyor',
    summary: 'Yıllık olağan genel kurul toplantısı için son tarih: 31 Mart 2025. Hazırlıklara başlayın.',
    evidence_refs: ['ttk-409'],
    actions: [
      { label: 'Takvime Ekle', action: 'add_calendar' },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
  },
];

/**
 * Get feed items filtered by severity
 */
export function getFilteredFeed(
  items: FeedItem[],
  minSeverity?: FeedItem['severity']
): FeedItem[] {
  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  if (!minSeverity) return items;

  const minIndex = severityOrder.indexOf(minSeverity);
  return items.filter(item => {
    const itemIndex = severityOrder.indexOf(item.severity);
    return itemIndex <= minIndex;
  });
}

/**
 * Sort feed items by score (descending)
 */
export function sortFeedByScore(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => b.score - a.score);
}
