/**
 * LYNTOS CrossCheck Signal Generator
 * Sprint 4.2 - Mizan vs Karsi Veri mutabakat sinyalleri
 *
 * Anayasa: "CrossCheck: impact + esik ile deterministik sinyal"
 */

import type { FeedItem, FeedSeverity, FeedAction, EvidenceRef } from '../feed/types';
import type {
  CrossCheckItem,
  CrossCheckContext,
  CrossCheckResult,
  CrossCheckType,
} from './types';
import { CROSSCHECK_THRESHOLDS } from './types';

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function formatTL(value: number): string {
  return (
    new Intl.NumberFormat('tr-TR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value)) + ' TL'
  );
}

function getTypeLabel(type: CrossCheckType): string {
  const labels: Record<CrossCheckType, string> = {
    banka: 'Banka Mutabakati',
    kasa: 'Kasa Sayimi',
    stok: 'Stok Sayimi',
    alici: 'Alici Mutabakati',
    satici: 'Satici Mutabakati',
    kdv: 'KDV Mutabakati',
  };
  return labels[type];
}

function getHesapLabel(type: CrossCheckType): string {
  const labels: Record<CrossCheckType, string> = {
    banka: '102-Bankalar',
    kasa: '100-Kasa',
    stok: '153-Ticari Mallar',
    alici: '120-Alicilar',
    satici: '320-Saticilar',
    kdv: '191/391-KDV',
  };
  return labels[type];
}

function getSeverity(type: CrossCheckType, fark: number, farkYuzde: number): FeedSeverity {
  const threshold = CROSSCHECK_THRESHOLDS[type];

  // Cok buyuk farklar CRITICAL
  if (Math.abs(farkYuzde) > 10 || Math.abs(fark) > threshold.minFark * 100) {
    return 'CRITICAL';
  }

  // Orta farklar threshold'dan bir seviye yukari
  if (Math.abs(farkYuzde) > 5 || Math.abs(fark) > threshold.minFark * 10) {
    return threshold.severity === 'MEDIUM' ? 'HIGH' : threshold.severity;
  }

  return threshold.severity;
}

function getScore(fark: number, farkYuzde: number, severity: FeedSeverity): number {
  const baseScores: Record<FeedSeverity, number> = {
    CRITICAL: 85,
    HIGH: 70,
    MEDIUM: 50,
    LOW: 30,
    INFO: 10,
  };

  let score = baseScores[severity];

  // Yuzdeye gore ayarla
  if (Math.abs(farkYuzde) > 10) score += 10;
  else if (Math.abs(farkYuzde) > 5) score += 5;

  return Math.min(score, 99);
}

function generateWhy(item: CrossCheckItem): string {
  const direction = item.fark > 0 ? 'fazla' : 'eksik';
  const hesapLabel = getHesapLabel(item.type);

  const whyTemplates: Record<CrossCheckType, string> = {
    banka: `${hesapLabel} hesabi, ${item.karsiVeriKaynagi} ile karsilastirildiginda ${formatTL(item.fark)} ${direction} gorunuyor. Bu fark, eksik/fazla kayit veya zamanlama farkindan kaynaklanabilir. Mutabakat yapilarak fark nedeni tespit edilmeli.`,

    kasa: `${hesapLabel} hesabi, ${item.karsiVeriKaynagi} ile karsilastirildiginda ${formatTL(item.fark)} ${direction} gorunuyor. Fiziksel sayim ile muhasebe kaydi uyusmuyor. Bu durum VDK incelemesinde sorgulanir.`,

    stok: `${hesapLabel} hesabi, ${item.karsiVeriKaynagi} ile karsilastirildiginda ${formatTL(item.fark)} ${direction} gorunuyor. Stok sayimi ile muhasebe kaydi uyusmuyor. Fire, kayip veya kayit hatasi olabilir.`,

    alici: `${hesapLabel} hesabi, musteri mutabakat sonuclari ile karsilastirildiginda ${formatTL(item.fark)} ${direction} gorunuyor. Musteri ile mutabakat yapilarak fark nedeni tespit edilmeli.`,

    satici: `${hesapLabel} hesabi, satici mutabakat sonuclari ile karsilastirildiginda ${formatTL(item.fark)} ${direction} gorunuyor. Satici ile mutabakat yapilarak fark nedeni tespit edilmeli.`,

    kdv: `KDV hesaplari (191/391), KDV beyannamesi ile karsilastirildiginda ${formatTL(item.fark)} ${direction} gorunuyor. Beyanname ile muhasebe kaydi uyusmuyor. Duzeltme gerekebilir.`,
  };

  return whyTemplates[item.type];
}

function generateActions(item: CrossCheckItem, context: CrossCheckContext): FeedAction[] {
  const actions: FeedAction[] = [];

  // Ana aksiyon: Detaya git
  actions.push({
    id: `mutabakat_${item.type}`,
    label: 'Mutabakat Yap',
    kind: 'navigate',
    variant: 'primary',
    href: `/v2/mutabakat/${item.type === 'alici' || item.type === 'satici' ? 'cari' : item.type}?hesap=${item.mizanHesapKodu}&period=${context.period}`,
  });

  // Tip bazli ek aksiyonlar
  switch (item.type) {
    case 'banka':
      actions.push({
        id: 'upload_ekstre',
        label: 'Ekstre Yukle',
        kind: 'modal',
        variant: 'secondary',
        payload: { action: 'upload', docType: 'banka-ekstre' },
      });
      break;
    case 'kasa':
      actions.push({
        id: 'upload_kasa_sayim',
        label: 'Sayim Tutanagi Yukle',
        kind: 'modal',
        variant: 'secondary',
        payload: { action: 'upload', docType: 'kasa-sayim' },
      });
      break;
    case 'stok':
      actions.push({
        id: 'upload_stok_sayim',
        label: 'Stok Sayim Yukle',
        kind: 'modal',
        variant: 'secondary',
        payload: { action: 'upload', docType: 'stok-sayim' },
      });
      break;
    case 'alici':
    case 'satici':
      actions.push({
        id: `upload_${item.type}_mutabakat`,
        label: 'Mutabakat Mektubu',
        kind: 'modal',
        variant: 'secondary',
        payload: { action: 'upload', docType: `${item.type}-mutabakat` },
      });
      break;
    case 'kdv':
      actions.push({
        id: 'upload_kdv_beyan',
        label: 'Beyanname Yukle',
        kind: 'modal',
        variant: 'secondary',
        payload: { action: 'upload', docType: 'kdv-beyan' },
      });
      break;
  }

  return actions;
}

function generateEvidenceRefs(item: CrossCheckItem, context: CrossCheckContext): EvidenceRef[] {
  const refs: EvidenceRef[] = [
    {
      kind: 'mizan_row',
      ref: `mizan-${item.mizanHesapKodu}-${context.period}`,
      label: `${getHesapLabel(item.type)} - Mizan Bakiye: ${formatTL(item.mizanBakiye)}`,
      period: context.period,
      account_code: item.mizanHesapKodu,
      amount: item.mizanBakiye,
      href: `/v2/mizan-analiz?hesap=${item.mizanHesapKodu}&period=${context.period}`,
    },
  ];

  // Tip bazli karsi veri referanslari
  const karsiVeriKind: Record<CrossCheckType, EvidenceRef['kind']> = {
    banka: 'ekstre_satir',
    kasa: 'belge_ref',
    stok: 'belge_ref',
    alici: 'belge_ref',
    satici: 'belge_ref',
    kdv: 'beyanname_ref',
  };

  refs.push({
    kind: karsiVeriKind[item.type],
    ref: `${item.type}-karsi-${context.period}`,
    label: `${item.karsiVeriKaynagi}: ${formatTL(item.karsiVeriBakiye)}`,
    period: context.period,
    amount: item.karsiVeriBakiye,
  });

  // Fark hesaplama referansi
  refs.push({
    kind: 'calculation',
    ref: `fark-${item.type}-${context.period}`,
    label: `Fark: ${item.fark > 0 ? '+' : ''}${formatTL(item.fark)} (%${item.farkYuzde.toFixed(2)})`,
  });

  return refs;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN GENERATOR FUNCTION
// ═══════════════════════════════════════════════════════════════════

export function generateCrossCheckSignals(
  items: CrossCheckItem[],
  context: CrossCheckContext
): CrossCheckResult {
  const signals: FeedItem[] = [];
  const errors: string[] = [];
  const byType: Record<CrossCheckType, number> = {
    banka: 0,
    kasa: 0,
    stok: 0,
    alici: 0,
    satici: 0,
    kdv: 0,
  };
  let totalFark = 0;

  for (const item of items) {
    try {
      const threshold = CROSSCHECK_THRESHOLDS[item.type];

      // Materiality gate: esik altindaki farklari atla
      if (Math.abs(item.fark) < threshold.minFark && Math.abs(item.farkYuzde) < threshold.minYuzde) {
        continue;
      }

      const severity = getSeverity(item.type, item.fark, item.farkYuzde);
      const score = getScore(item.fark, item.farkYuzde, severity);

      const feedItem: FeedItem = {
        id: `crosscheck-${item.type}-${item.mizanHesapKodu}-${context.client_id}-${context.period}`,
        scope: {
          smmm_id: context.smmm_id,
          client_id: context.client_id,
          period: context.period,
        },
        dedupe_key: `crosscheck-${item.type}-${context.client_id}-${context.period}`,
        category: 'Mutabakat',
        severity,
        score,
        impact: {
          amount_try: Math.abs(item.fark),
          pct: Math.abs(item.farkYuzde),
        },
        title: `${getTypeLabel(item.type)} farki: ${formatTL(item.fark)}`,
        summary: `${item.label}: Mizan ${formatTL(item.mizanBakiye)} vs ${item.karsiVeriKaynagi} ${formatTL(item.karsiVeriBakiye)}`,
        why: generateWhy(item),
        evidence_refs: generateEvidenceRefs(item, context),
        actions: generateActions(item, context),
        snoozeable: severity !== 'CRITICAL',
        // created_at set by useFeedSignals for stable reference
      };

      signals.push(feedItem);
      byType[item.type]++;
      totalFark += Math.abs(item.fark);
    } catch (err) {
      errors.push(`CrossCheck ${item.type} failed: ${err}`);
    }
  }

  // Sort by severity then score
  const severityOrder: FeedSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  signals.sort((a, b) => {
    const sevDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
    if (sevDiff !== 0) return sevDiff;
    return b.score - a.score;
  });

  return {
    signals,
    stats: {
      total_checked: items.length,
      signals_generated: signals.length,
      total_fark: totalFark,
      by_type: byType,
    },
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export { CROSSCHECK_THRESHOLDS };
