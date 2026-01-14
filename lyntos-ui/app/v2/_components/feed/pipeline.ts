/**
 * LYNTOS Deterministic Feed Pipeline
 * Sprint 4.0 - Feed Processing & Gates
 *
 * Pipeline: Raw Items → Explainability → Materiality → Dedupe → Daily Limit → Final Feed
 *
 * Anayasa: "Feed deterministik olmalı; aynı girdi = aynı çıktı"
 */

import type {
  FeedItem,
  RawFeedItem,
  FeedSeverity,
  FeedCategory,
  MaterialityPreset,
  FeedBuildResult,
} from './types';

// ═══════════════════════════════════════════════════════════════════
// MATERIALITY PRESETS
// ═══════════════════════════════════════════════════════════════════

/**
 * Standart Preset: Orta ölçekli mükellefler için
 * - Mutlak eşik: 5.000 TL
 * - Oransal eşik: %0.5
 * - Min skor: 20
 */
export const MATERIALITY_STANDARD: MaterialityPreset = {
  name: 'Standart',
  absolute_threshold_try: 5000,
  relative_threshold_pct: 0.5,
  min_score: 20,
  critical_exception_categories: ['VDK', 'Belge'],
  critical_exception_severities: ['CRITICAL', 'HIGH'],
};

/**
 * Muhafazakâr Preset: Küçük işletmeler için
 * - Mutlak eşik: 1.000 TL
 * - Oransal eşik: %0.25
 * - Min skor: 10
 */
export const MATERIALITY_CONSERVATIVE: MaterialityPreset = {
  name: 'Muhafazakâr',
  absolute_threshold_try: 1000,
  relative_threshold_pct: 0.25,
  min_score: 10,
  critical_exception_categories: ['VDK', 'Belge', 'Mevzuat'],
  critical_exception_severities: ['CRITICAL', 'HIGH', 'MEDIUM'],
};

/**
 * Agresif Preset: Büyük şirketler için
 * - Mutlak eşik: 25.000 TL
 * - Oransal eşik: %1.0
 * - Min skor: 40
 */
export const MATERIALITY_AGGRESSIVE: MaterialityPreset = {
  name: 'Agresif',
  absolute_threshold_try: 25000,
  relative_threshold_pct: 1.0,
  min_score: 40,
  critical_exception_categories: ['VDK'],
  critical_exception_severities: ['CRITICAL'],
};

// ═══════════════════════════════════════════════════════════════════
// SEVERITY ORDERING
// ═══════════════════════════════════════════════════════════════════

const SEVERITY_ORDER: Record<FeedSeverity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

// ═══════════════════════════════════════════════════════════════════
// EXPLAINABILITY GATE
// ═══════════════════════════════════════════════════════════════════

/**
 * Explainability Gate: Kart üretilmeden önce zorunlu alanlar
 *
 * Gereksinimler:
 * - why alanı dolu olmalı (min 10 karakter)
 * - En az 1 evidence_ref olmalı
 * - En az 1 action olmalı
 *
 * @param item - Kontrol edilecek feed item
 * @returns true eğer explainability kriterlerini geçerse
 */
export function passesExplainability(item: RawFeedItem): boolean {
  // Why alanı kontrolü
  if (!item.why || item.why.trim().length < 10) {
    return false;
  }

  // Evidence refs kontrolü
  if (!item.evidence_refs || item.evidence_refs.length === 0) {
    return false;
  }

  // Actions kontrolü
  if (!item.actions || item.actions.length === 0) {
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════
// MATERIALITY GATE
// ═══════════════════════════════════════════════════════════════════

/**
 * Materiality Gate: Önemsizlik eşiği kontrolü
 *
 * Kart geçer eğer:
 * 1. Kritik istisna kategorisinde veya severity'de ise (bypass)
 * 2. VEYA aşağıdakilerden birini sağlıyorsa:
 *    - impact.amount_try >= absolute_threshold
 *    - impact.pct >= relative_threshold
 *    - score >= min_score
 *
 * @param item - Kontrol edilecek feed item
 * @param preset - Materiality preset
 * @returns true eğer materiality kriterlerini geçerse
 */
export function passesMateriality(
  item: RawFeedItem,
  preset: MaterialityPreset = MATERIALITY_STANDARD
): boolean {
  // Kritik istisna kontrolü - bypass
  if (preset.critical_exception_categories.includes(item.category)) {
    return true;
  }
  if (preset.critical_exception_severities.includes(item.severity)) {
    return true;
  }

  // Mutlak eşik kontrolü
  if (
    item.impact.amount_try !== undefined &&
    Math.abs(item.impact.amount_try) >= preset.absolute_threshold_try
  ) {
    return true;
  }

  // Oransal eşik kontrolü
  if (
    item.impact.pct !== undefined &&
    Math.abs(item.impact.pct) >= preset.relative_threshold_pct
  ) {
    return true;
  }

  // Skor kontrolü
  if (item.score >= preset.min_score) {
    return true;
  }

  // Hiçbir koşul sağlanmadı
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// DEDUPE & BUNDLING
// ═══════════════════════════════════════════════════════════════════

/**
 * Dedupe: Aynı dedupe_key'e sahip kartları birleştirir
 *
 * Birleştirme stratejisi:
 * - En yüksek severity alınır
 * - Skorlar toplanır (max 100)
 * - Impact'ler birleştirilir
 * - Evidence ve actions birleştirilir
 *
 * @param items - Dedupe edilecek feed items
 * @returns Dedupe edilmiş items
 */
export function bundleAndDedupe(items: RawFeedItem[]): RawFeedItem[] {
  const dedupeMap = new Map<string, RawFeedItem>();

  for (const item of items) {
    const key = item.dedupe_key;
    const existing = dedupeMap.get(key);

    if (!existing) {
      dedupeMap.set(key, { ...item });
      continue;
    }

    // Merge: daha yüksek severity'yi al
    const existingSeverityOrder = SEVERITY_ORDER[existing.severity];
    const newSeverityOrder = SEVERITY_ORDER[item.severity];
    if (newSeverityOrder > existingSeverityOrder) {
      existing.severity = item.severity;
    }

    // Merge: skorları topla (max 100)
    existing.score = Math.min(100, existing.score + item.score * 0.5);

    // Merge: impact birleştir
    existing.impact = {
      amount_try:
        (existing.impact.amount_try || 0) + (item.impact.amount_try || 0) || undefined,
      pct: Math.max(existing.impact.pct || 0, item.impact.pct || 0) || undefined,
      points:
        (existing.impact.points || 0) + (item.impact.points || 0) || undefined,
    };

    // Merge: evidence refs birleştir (unique by ref)
    const existingRefs = new Set(existing.evidence_refs.map((e) => e.ref));
    for (const ref of item.evidence_refs) {
      if (!existingRefs.has(ref.ref)) {
        existing.evidence_refs.push(ref);
      }
    }

    // Merge: actions birleştir (unique by id)
    const existingActionIds = new Set(existing.actions.map((a) => a.id));
    for (const action of item.actions) {
      if (!existingActionIds.has(action.id)) {
        existing.actions.push(action);
      }
    }

    // Summary'yi güncelle (ilk item'dan al)
    // Title ve summary ilk item'dan kalır
  }

  return Array.from(dedupeMap.values());
}

// ═══════════════════════════════════════════════════════════════════
// DAILY LIMIT
// ═══════════════════════════════════════════════════════════════════

/**
 * Daily Limit: Günlük kart sayısını sınırla
 *
 * Sıralama stratejisi:
 * 1. Severity'ye göre (CRITICAL > HIGH > MEDIUM > LOW > INFO)
 * 2. Aynı severity içinde score'a göre
 *
 * @param items - Limit uygulanacak items
 * @param limit - Maksimum kart sayısı (varsayılan: 12)
 * @returns { items, othersCount }
 */
export function applyDailyLimit(
  items: RawFeedItem[],
  limit: number = 12
): { items: RawFeedItem[]; othersCount: number } {
  // Sırala: severity → score
  const sorted = [...items].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.score - a.score;
  });

  const limited = sorted.slice(0, limit);
  const othersCount = Math.max(0, sorted.length - limit);

  return { items: limited, othersCount };
}

// ═══════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate unique ID for feed item
 */
function generateFeedItemId(item: RawFeedItem): string {
  if (item.id) return item.id;

  const hash = `${item.scope.client_id}-${item.scope.period}-${item.category}-${item.dedupe_key}`;
  // Simple hash function
  let h = 0;
  for (let i = 0; i < hash.length; i++) {
    h = ((h << 5) - h + hash.charCodeAt(i)) | 0;
  }
  return `feed-${Math.abs(h).toString(36)}`;
}

// ═══════════════════════════════════════════════════════════════════
// BUILD FEED (Main Pipeline)
// ═══════════════════════════════════════════════════════════════════

/**
 * Build Feed: Ana pipeline fonksiyonu
 *
 * Pipeline:
 * 1. Explainability Gate
 * 2. Materiality Gate
 * 3. Dedupe & Bundle
 * 4. Daily Limit
 * 5. ID Generation
 *
 * @param rawItems - Ham feed items
 * @param preset - Materiality preset
 * @param dailyLimit - Günlük limit
 * @returns FeedBuildResult
 */
export function buildFeed(
  rawItems: RawFeedItem[],
  preset: MaterialityPreset = MATERIALITY_STANDARD,
  dailyLimit: number = 12
): FeedBuildResult {
  const stats = {
    total_raw: rawItems.length,
    passed_explainability: 0,
    passed_materiality: 0,
    after_dedupe: 0,
    final_count: 0,
    others_count: 0,
  };

  // Step 1: Explainability Gate
  const afterExplainability = rawItems.filter((item) => {
    const passes = passesExplainability(item);
    if (passes) stats.passed_explainability++;
    return passes;
  });

  // Step 2: Materiality Gate
  const afterMateriality = afterExplainability.filter((item) => {
    const passes = passesMateriality(item, preset);
    if (passes) stats.passed_materiality++;
    return passes;
  });

  // Step 3: Dedupe & Bundle
  const afterDedupe = bundleAndDedupe(afterMateriality);
  stats.after_dedupe = afterDedupe.length;

  // Step 4: Daily Limit
  const { items: limitedItems, othersCount } = applyDailyLimit(afterDedupe, dailyLimit);
  stats.others_count = othersCount;

  // Step 5: Assign IDs and finalize
  const finalItems: FeedItem[] = limitedItems.map((item) => ({
    ...item,
    id: generateFeedItemId(item),
  }));

  stats.final_count = finalItems.length;

  return {
    items: finalItems,
    stats,
  };
}

// ═══════════════════════════════════════════════════════════════════
// FEED FILTERING HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Filter feed items by resolved/snoozed status
 */
export function filterByStatus(
  items: FeedItem[],
  resolvedIds: Set<string>,
  snoozedIds: Map<string, Date>
): FeedItem[] {
  const now = new Date();

  return items.filter((item) => {
    // Resolved items are hidden
    if (resolvedIds.has(item.id)) return false;

    // Snoozed items are hidden until snooze expires
    const snoozeUntil = snoozedIds.get(item.id);
    if (snoozeUntil && now < snoozeUntil) return false;

    // Expired items are hidden
    if (item.expires_at && new Date(item.expires_at) < now) return false;

    return true;
  });
}

/**
 * Get feed statistics for RightRail
 */
export function getFeedStats(items: FeedItem[]): {
  criticalCount: number;
  highCount: number;
  missingDocCount: number;
  totalActions: number;
  topRecommendations: string[];
} {
  const criticalCount = items.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = items.filter((i) => i.severity === 'HIGH').length;

  // Eksik belge: Belge kategorisi veya missing_doc evidence kind
  const missingDocCount = items.filter((i) =>
    i.category === 'Belge' ||
    i.evidence_refs.some((e) => e.kind === 'missing_doc')
  ).length;

  const totalActions = items.reduce((sum, i) => sum + i.actions.length, 0);

  // Top 3 recommendations from highest score items
  const topRecommendations = items
    .slice(0, 3)
    .map((i) => i.title);

  return {
    criticalCount,
    highCount,
    missingDocCount,
    totalActions,
    topRecommendations,
  };
}
