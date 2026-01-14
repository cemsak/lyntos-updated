/**
 * LYNTOS Feed Mock Data
 * Sprint 4.0 - Full Contract Compliant Test Data
 *
 * All items include: why, structured evidence_refs, actions with id/kind
 */

import type { FeedItem, RawFeedItem } from './types';

// ═══════════════════════════════════════════════════════════════════
// RAW MOCK ITEMS (Before pipeline processing)
// ═══════════════════════════════════════════════════════════════════

export const RAW_MOCK_FEED_ITEMS: RawFeedItem[] = [
  // ─────────────────────────────────────────────────────────────────
  // VDK Risk - Kritik
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'VDK',
    severity: 'CRITICAL',
    score: 95,
    dedupe_key: 'vdk-kasa-negatif-2024q4',
    impact: { points: -15, amount_try: 45230 },
    title: 'Kasa hesabı negatif bakiye',
    summary: '100-Kasa hesabında 31.12.2024 tarihinde -45.230 TL negatif bakiye tespit edildi. VDK incelemesinde kritik risk oluşturur.',
    why: 'Kasa hesabının negatif bakiye vermesi muhasebe tekniğine aykırıdır ve VDK kuralları gereği inceleme riski taşır. Gerçekte kasada negatif para bulunamaz.',
    evidence_refs: [
      {
        kind: 'mizan_row',
        ref: 'mizan-2024-q4-100',
        label: '100 Kasa - Bakiye: -45.230 TL',
        period: '2024-Q4',
        account_code: '100',
        amount: -45230,
        href: '/v2/deepdive/mizan?account=100',
      },
      {
        kind: 'vdk_kural',
        ref: 'vdk-r001',
        label: 'VDK Kural 001: Kasa negatif olamaz',
        href: '/v2/vdk?rule=001',
      },
    ],
    actions: [
      { id: 'fix_kasa', label: 'Düzelt', kind: 'navigate', variant: 'primary', href: '/v2/deepdive/mizan?account=100&action=fix' },
      { id: 'show_detail', label: 'Detay', kind: 'navigate', variant: 'secondary', href: '/v2/vdk?risk=kasa-negatif' },
    ],
    snoozeable: false,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },

  // ─────────────────────────────────────────────────────────────────
  // Eksik Belge - Yüksek
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Belge',
    severity: 'HIGH',
    score: 80,
    dedupe_key: 'belge-edefter-eksik-2024-12',
    impact: {},
    title: 'E-Defter eksik',
    summary: 'Aralık 2024 dönemi e-defter dosyası henüz yüklenmedi. Beyan süresi 26 Ocak 2025.',
    why: 'E-defter yüklenmeden dönem kapanışı yapılamaz ve yasal beyan süreleri kaçırılabilir. Eksik belge analiz kalitesini düşürür.',
    evidence_refs: [
      {
        kind: 'missing_doc',
        ref: 'doc-edefter-2024-12',
        label: 'E-Defter Aralık 2024 - Yüklenmedi',
        period: '2024-12',
      },
    ],
    actions: [
      { id: 'upload_edefter', label: 'Yükle', kind: 'navigate', variant: 'primary', href: '/v2/upload?docType=edefter&period=2024-12' },
      { id: 'remind', label: 'Hatırlat', kind: 'api_call', variant: 'secondary', payload: { action: 'remind', docType: 'edefter' } },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },

  // ─────────────────────────────────────────────────────────────────
  // Vergus Stratejisi - Orta
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Vergus',
    severity: 'MEDIUM',
    score: 60,
    dedupe_key: 'vergus-yatirim-indirimi-2024',
    impact: { amount_try: 125000 },
    title: 'Yatırım indirimi fırsatı',
    summary: 'Dönem içi yapılan makine alımları için yatırım indirimi uygulanabilir. Tahmini tasarruf: 125.000 TL',
    why: 'Sabit kıymet alımları yatırım indirimi kapsamında değerlendirilebilir. Bu fırsat kaçırılırsa önemli vergi avantajı kaybolur.',
    evidence_refs: [
      {
        kind: 'mizan_row',
        ref: 'mizan-2024-q4-253',
        label: '253 Tesis, Makine ve Cihazlar - 850.000 TL',
        period: '2024-Q4',
        account_code: '253',
        amount: 850000,
      },
      {
        kind: 'mevzuat_ref',
        ref: 'gvk-md19',
        label: 'GVK Md. 19 - Yatırım İndirimi',
      },
      {
        kind: 'calculation',
        ref: 'calc-yatirim-indirimi-2024',
        label: 'Hesaplama: 850.000 x %15 = 127.500 TL',
        amount: 127500,
      },
    ],
    actions: [
      { id: 'review_opportunity', label: 'İncele', kind: 'navigate', variant: 'primary', href: '/v2/vergus?opportunity=yatirim-indirimi' },
      { id: 'apply_discount', label: 'Uygula', kind: 'modal', variant: 'secondary', payload: { modal: 'apply_yatirim_indirimi' } },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },

  // ─────────────────────────────────────────────────────────────────
  // Mutabakat - Orta
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Mutabakat',
    severity: 'MEDIUM',
    score: 55,
    dedupe_key: 'mutabakat-isbank-2024q4',
    impact: { amount_try: 8450 },
    title: 'Banka mutabakat farkı',
    summary: 'İş Bankası hesabında 8.450 TL mutabakat farkı tespit edildi. Dekont kontrolü gerekiyor.',
    why: 'Banka ekstresi ile mizan arasında fark var. Bu fark dönem sonunda düzeltilmezse finansal tablolar hatalı olur.',
    evidence_refs: [
      {
        kind: 'mizan_row',
        ref: 'mizan-2024-q4-102-isbank',
        label: '102 İş Bankası - Mizan: 245.320 TL',
        period: '2024-Q4',
        account_code: '102',
        amount: 245320,
      },
      {
        kind: 'ekstre_satir',
        ref: 'ekstre-isbank-2024-12-31',
        label: 'Ekstre Bakiye: 253.770 TL',
        period: '2024-12',
        amount: 253770,
      },
      {
        kind: 'calculation',
        ref: 'calc-mutabakat-fark',
        label: 'Fark: 253.770 - 245.320 = 8.450 TL',
        amount: 8450,
      },
    ],
    actions: [
      { id: 'check_reconciliation', label: 'Kontrol Et', kind: 'navigate', variant: 'primary', href: '/v2/deepdive/mutabakat?bank=isbank' },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },

  // ─────────────────────────────────────────────────────────────────
  // Mevzuat - Düşük
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Mevzuat',
    severity: 'LOW',
    score: 30,
    dedupe_key: 'mevzuat-kdv-efatura-2025',
    impact: {},
    title: 'KDV Genel Tebliği değişikliği',
    summary: 'E-fatura düzenleme sınırı 2025 için güncellendi. Mükellefinizi etkiliyor olabilir.',
    why: 'Yeni tebliğ e-fatura zorunluluk sınırını değiştirdi. Mükellefin ciro durumuna göre yeni yükümlülükler doğabilir.',
    evidence_refs: [
      {
        kind: 'external_source',
        ref: 'regwatch-kdv-2025-01',
        label: 'RegWatch: KDV Genel Tebliği 2025/1',
        href: '/v2/regwatch/kdv-2025-01',
      },
      {
        kind: 'mevzuat_ref',
        ref: 'kdv-teblig-2025',
        label: 'KDV Genel Uygulama Tebliği Değişiklik',
      },
    ],
    actions: [
      { id: 'read_regulation', label: 'Oku', kind: 'navigate', variant: 'primary', href: '/v2/regwatch/kdv-2025-01' },
      { id: 'check_impact', label: 'Etki Analizi', kind: 'navigate', variant: 'secondary', href: '/v2/mevzuat/impact?ref=kdv-2025' },
    ],
    snoozeable: true,
    legal_basis_refs: ['KDV Kanunu Md. 32', 'VUK Mükerrer Md. 242'],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },

  // ─────────────────────────────────────────────────────────────────
  // Hukuk - Bilgi
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Hukuk',
    severity: 'INFO',
    score: 20,
    dedupe_key: 'hukuk-genel-kurul-2025',
    impact: {},
    title: 'Genel kurul tarihi yaklaşıyor',
    summary: 'Yıllık olağan genel kurul toplantısı için son tarih: 31 Mart 2025. Hazırlıklara başlayın.',
    why: 'TTK gereği anonim ve limited şirketlerin yılda en az bir kez olağan genel kurul yapması zorunludur. Süre aşımı cezai yaptırım gerektirebilir.',
    evidence_refs: [
      {
        kind: 'mevzuat_ref',
        ref: 'ttk-409',
        label: 'TTK Md. 409 - Olağan Genel Kurul',
      },
      {
        kind: 'calculation',
        ref: 'calc-deadline',
        label: 'Son Tarih: 31 Mart 2025 (76 gün kaldı)',
      },
    ],
    actions: [
      { id: 'add_calendar', label: 'Takvime Ekle', kind: 'api_call', variant: 'primary', payload: { action: 'add_calendar', event: 'genel_kurul' } },
      { id: 'prepare_docs', label: 'Belge Hazırla', kind: 'navigate', variant: 'secondary', href: '/v2/corporate/genel-kurul-prep' },
    ],
    snoozeable: true,
    legal_basis_refs: ['TTK Md. 409', 'TTK Md. 617'],
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },

  // ─────────────────────────────────────────────────────────────────
  // Enflasyon - Orta
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Enflasyon',
    severity: 'MEDIUM',
    score: 50,
    dedupe_key: 'enflasyon-duzeltme-2024',
    impact: { amount_try: 320000, pct: 8.5 },
    title: 'Enflasyon düzeltmesi yapılmalı',
    summary: 'Parasal olmayan kalemlerin enflasyon düzeltmesi gerekiyor. Tahmini düzeltme farkı: 320.000 TL',
    why: 'VUK Mükerrer 298. madde gereği enflasyon şartları oluştuğunda düzeltme zorunludur. Yapılmazsa vergi matrahı hatalı hesaplanır.',
    evidence_refs: [
      {
        kind: 'calculation',
        ref: 'calc-enflasyon-2024',
        label: 'Düzeltme Hesabı: ÜFE oranı %8.5',
        amount: 320000,
      },
      {
        kind: 'mizan_row',
        ref: 'mizan-2024-q4-parasal-olmayan',
        label: 'Parasal Olmayan Kalemler Toplamı: 3.760.000 TL',
        amount: 3760000,
      },
      {
        kind: 'mevzuat_ref',
        ref: 'vuk-298',
        label: 'VUK Mükerrer Md. 298 - Enflasyon Düzeltmesi',
      },
    ],
    actions: [
      { id: 'run_adjustment', label: 'Düzeltme Yap', kind: 'navigate', variant: 'primary', href: '/v2/enflasyon?action=calculate' },
      { id: 'preview_impact', label: 'Önizle', kind: 'modal', variant: 'secondary', payload: { modal: 'enflasyon_preview' } },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },

  // ─────────────────────────────────────────────────────────────────
  // GV - Orta
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'GV',
    severity: 'MEDIUM',
    score: 45,
    dedupe_key: 'gv-beyan-2024-q4',
    impact: { amount_try: 78500 },
    title: 'Geçici vergi beyan tarihi yaklaşıyor',
    summary: '2024 4. dönem geçici vergi beyanı için son tarih: 17 Şubat 2025. Hesaplanan vergi: 78.500 TL',
    why: 'Geçici vergi beyannamesi süresinde verilmezse vergi cezası ve gecikme faizi uygulanır.',
    evidence_refs: [
      {
        kind: 'calculation',
        ref: 'calc-gv-2024-q4',
        label: 'Hesaplanan GV: 78.500 TL',
        period: '2024-Q4',
        amount: 78500,
      },
      {
        kind: 'beyanname_ref',
        ref: 'gv-beyan-2024-q4-draft',
        label: 'Taslak Beyanname (Hazırlanıyor)',
      },
    ],
    actions: [
      { id: 'prepare_gv', label: 'Beyan Hazırla', kind: 'navigate', variant: 'primary', href: '/v2/vergi/gecici?period=2024-Q4' },
      { id: 'view_calc', label: 'Hesaplama', kind: 'navigate', variant: 'secondary', href: '/v2/vergi/gecici/hesaplama?period=2024-Q4' },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },

  // ─────────────────────────────────────────────────────────────────
  // Mizan - Düşük (Materiality gate'den geçmeyebilir)
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Mizan',
    severity: 'LOW',
    score: 15,
    dedupe_key: 'mizan-kucuk-fark-2024q4',
    impact: { amount_try: 250 },
    title: 'Küçük bakiye farkı',
    summary: '770 Genel Yönetim Giderleri hesabında 250 TL fark tespit edildi.',
    why: 'Hesap bakiyesinde küçük bir tutarsızlık var. Önemlilik eşiğinin altında olabilir.',
    evidence_refs: [
      {
        kind: 'mizan_row',
        ref: 'mizan-2024-q4-770',
        label: '770 Genel Yönetim Giderleri - Fark: 250 TL',
        period: '2024-Q4',
        account_code: '770',
        amount: 250,
      },
    ],
    actions: [
      { id: 'check_770', label: 'Kontrol Et', kind: 'navigate', variant: 'secondary', href: '/v2/deepdive/mizan?account=770' },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },

  // ─────────────────────────────────────────────────────────────────
  // Pratik Bilgi - Bilgi
  // ─────────────────────────────────────────────────────────────────
  {
    scope: { smmm_id: 'DEMO_SMMM', client_id: 'OZKAN_KIRTASIYE', period: '2024-Q4' },
    category: 'Pratik',
    severity: 'INFO',
    score: 25,
    dedupe_key: 'pratik-asgari-ucret-2025',
    impact: {},
    title: 'Asgari ücret 2025 güncellendi',
    summary: '2025 yılı asgari ücret 22.104 TL olarak belirlendi. Bordro hesaplamalarını güncelleyin.',
    why: 'Asgari ücret değişikliği bordro hesaplamalarını, SGK primlerini ve stopaj tutarlarını etkiler.',
    evidence_refs: [
      {
        kind: 'external_source',
        ref: 'asgari-ucret-2025',
        label: 'Resmi Gazete: 2025 Asgari Ücret',
        href: '/v2/pratik-bilgiler/oranlar',
      },
      {
        kind: 'calculation',
        ref: 'calc-asgari-maliyet',
        label: 'İşveren Maliyeti: ~29.500 TL',
        amount: 29500,
      },
    ],
    actions: [
      { id: 'view_rates', label: 'Oranları Gör', kind: 'navigate', variant: 'primary', href: '/v2/pratik-bilgiler/oranlar' },
      { id: 'update_payroll', label: 'Bordro Güncelle', kind: 'modal', variant: 'secondary', payload: { modal: 'update_payroll_rates' } },
    ],
    snoozeable: true,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

// ═══════════════════════════════════════════════════════════════════
// PROCESSED MOCK ITEMS (With IDs - for backwards compatibility)
// ═══════════════════════════════════════════════════════════════════

export const MOCK_FEED_ITEMS: FeedItem[] = RAW_MOCK_FEED_ITEMS.map((item, index) => ({
  ...item,
  id: `feed-${String(index + 1).padStart(3, '0')}`,
}));

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

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
