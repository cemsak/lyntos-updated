'use client';

import { useMemo } from 'react';
import { useMizanStore } from '../../_lib/stores/mizanStore';
import { useOranlarStore } from '../../_lib/stores/oranlarStore';
import { useDashboardScope } from '../scope/useDashboardScope';
import type { FeedItem, FeedSeverity, EvidenceRef, FeedAction, FeedImpact, FeedScope } from './types';

// Mock data import (fallback için)
import {
  generateMizanSignals,
  generateCrossCheckSignals,
  MOCK_MIZAN_HESAPLAR,
  MOCK_MIZAN_CONTEXT,
  MOCK_CROSSCHECK_ITEMS,
  MOCK_CROSSCHECK_CONTEXT,
} from '../signals';

interface FeedSignalStats {
  mizan: { total: number; critical: number; high: number; medium: number; low: number };
  crossCheck: { total: number; critical: number; high: number; medium: number; low: number };
  combined: { total: number; critical: number; high: number; medium: number; low: number };
}

function countBySeverity(items: FeedItem[]) {
  return {
    total: items.length,
    critical: items.filter(i => i.severity === 'CRITICAL').length,
    high: items.filter(i => i.severity === 'HIGH').length,
    medium: items.filter(i => i.severity === 'MEDIUM').length,
    low: items.filter(i => i.severity === 'LOW').length,
  };
}

// Helper: Format TL
function formatTL(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' TL';
}

// Helper: Create Evidence Ref
function createMizanEvidence(hesapKod: string, period: string, label: string, amount?: number): EvidenceRef {
  return {
    kind: 'mizan_row',
    ref: `mizan-${hesapKod}-${period}`,
    label,
    period,
    account_code: hesapKod,
    amount,
    href: `/v2/mizan-analiz?hesap=${hesapKod}&period=${period}`,
  };
}

function createVdkKuralEvidence(kuralId: string, label: string): EvidenceRef {
  return {
    kind: 'vdk_kural',
    ref: `vdk-${kuralId}`,
    label,
    href: `/v2/vdk/${kuralId}`,
  };
}

function createCalculationEvidence(source: string, label: string, amount?: number): EvidenceRef {
  return {
    kind: 'calculation',
    ref: `calc-${source.toLowerCase().replace(/\s+/g, '-')}`,
    label,
    amount,
  };
}

// Helper: Create Actions
function createNavigateAction(id: string, label: string, href: string, variant: 'primary' | 'secondary' = 'primary'): FeedAction {
  return { id, label, kind: 'navigate', variant, href };
}

function createModalAction(id: string, label: string, payload: Record<string, unknown>): FeedAction {
  return { id, label, kind: 'modal', variant: 'secondary', payload };
}

/**
 * useFilteredFeedSignals - Filtrelenmiş sinyaller için wrapper hook
 */
export function useFilteredFeedSignals(severityFilter?: string[]) {
  const { signals, stats } = useFeedSignals();

  const filteredSignals = severityFilter && severityFilter.length > 0
    ? signals.filter(s => severityFilter.includes(s.severity))
    : signals;

  return {
    signals: filteredSignals,
    stats,
    totalCount: signals.length,
    filteredCount: filteredSignals.length,
  };
}

/**
 * useFeedSignals - Dashboard Feed için sinyal üretici
 *
 * Öncelik sırası:
 * 1. Gerçek mizan verisi varsa → Rule Engine kurallarını çalıştır
 * 2. Gerçek mizan yoksa → Mock data kullan (demo modu)
 */
export function useFeedSignals() {
  const { scope } = useDashboardScope();

  // Store'lardan veri al
  const mizanLoaded = useMizanStore(s => s.loaded);
  const mizanAccounts = useMizanStore(s => s.accounts);
  const mizanSummary = useMizanStore(s => s.summary);
  const oranlar = useOranlarStore();

  const result = useMemo(() => {
    // ═══════════════════════════════════════════════════════════════════
    // GERÇEK VERİ MODU
    // ═══════════════════════════════════════════════════════════════════
    if (mizanLoaded && mizanAccounts.length > 0 && mizanSummary) {
      console.log('[useFeedSignals] Gerçek mizan verisi kullanılıyor:', {
        accounts: mizanAccounts.length,
        summary: mizanSummary,
      });

      const feedItems: FeedItem[] = [];
      const now = new Date().toISOString();
      const period = scope.period || '2024-Q4';

      // Common scope for all items
      const feedScope: FeedScope = {
        client_id: scope.client_id || 'default-client',
        period,
        smmm_id: scope.smmm_id || 'default-smmm',
      };

      // ─────────────────────────────────────────────────────────────────
      // KURAL 1: Mizan Denkliği (P0-001)
      // ─────────────────────────────────────────────────────────────────
      const borcAlacakFark = Math.abs(mizanSummary.borcToplam - mizanSummary.alacakToplam);
      if (borcAlacakFark > 1) {
        feedItems.push({
          id: `P0-001-${Date.now()}`,
          scope: feedScope,
          dedupe_key: `mizan-denkligi-${scope.client_id}-${period}`,
          category: 'Mizan',
          severity: 'CRITICAL',
          score: 100,
          impact: {
            amount_try: borcAlacakFark,
                        points: -20,
          },
          title: 'Mizan Dengesi Bozuk',
          summary: `Borç-Alacak farkı: ${formatTL(borcAlacakFark)}`,
          why: `Mizan denkliği temel muhasebe kuralıdır. ${formatTL(borcAlacakFark)} tutarındaki fark, kayıt hatası veya eksik işlem olduğunu gösterir.`,
          evidence_refs: [
            createCalculationEvidence('borc-toplam', `Borç Toplam: ${formatTL(mizanSummary.borcToplam)}`, mizanSummary.borcToplam),
            createCalculationEvidence('alacak-toplam', `Alacak Toplam: ${formatTL(mizanSummary.alacakToplam)}`, mizanSummary.alacakToplam),
          ],
          actions: [
            createNavigateAction('fix', 'Düzelt', `/v2/mizan-analiz?period=${period}`),
          ],
          snoozeable: false,
          created_at: now,
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // KURAL 2: Aktif-Pasif Denkliği (P0-002)
      // ─────────────────────────────────────────────────────────────────
      const aktifPasifFark = Math.abs(mizanSummary.aktifToplam - mizanSummary.pasifToplam);
      if (aktifPasifFark > 100) {
        feedItems.push({
          id: `P0-002-${Date.now()}`,
          scope: feedScope,
          dedupe_key: `bilanco-denkligi-${scope.client_id}-${period}`,
          category: 'Mizan',
          severity: 'CRITICAL',
          score: 95,
          impact: {
            amount_try: aktifPasifFark,
                        points: -18,
          },
          title: 'Bilanço Dengesizliği',
          summary: `Aktif-Pasif farkı: ${formatTL(aktifPasifFark)}`,
          why: `Bilanço eşitliği (Aktif = Pasif) temel muhasebe prensibidir. ${formatTL(aktifPasifFark)} fark bulunmaktadır.`,
          evidence_refs: [
            createCalculationEvidence('aktif-toplam', `Aktif Toplam: ${formatTL(mizanSummary.aktifToplam)}`, mizanSummary.aktifToplam),
            createCalculationEvidence('pasif-toplam', `Pasif Toplam: ${formatTL(mizanSummary.pasifToplam)}`, mizanSummary.pasifToplam),
          ],
          actions: [
            createNavigateAction('fix', 'Düzelt', `/v2/mizan-analiz?period=${period}`),
          ],
          snoozeable: false,
          created_at: now,
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // KURAL 3: Yüksek Kasa Bakiyesi (VDK K-09)
      // ─────────────────────────────────────────────────────────────────
      const kasaHesaplari = mizanAccounts.filter(a => a.hesapKodu === '100' || a.hesapKodu.startsWith('100.'));
      const kasaBakiye = kasaHesaplari.reduce((sum, a) => sum + (a.borcBakiye - a.alacakBakiye), 0);
      const kasaOran = mizanSummary.aktifToplam > 0 ? kasaBakiye / mizanSummary.aktifToplam : 0;

      if (kasaBakiye > 10000 && kasaOran > 0.05) {
        const faizOrani = oranlar.faizOranlari?.tcmb_ticari_tl || 50;
        const tahminiAdat = kasaBakiye * (faizOrani / 100);
        const severity: FeedSeverity = kasaOran > 0.15 ? 'CRITICAL' : kasaOran > 0.10 ? 'HIGH' : 'MEDIUM';

        feedItems.push({
          id: `P2-VDK-K09-01-${Date.now()}`,
          scope: feedScope,
          dedupe_key: `vdk-k09-kasa-${scope.client_id}-${period}`,
          category: 'VDK',
          severity,
          score: severity === 'CRITICAL' ? 90 : severity === 'HIGH' ? 75 : 60,
          impact: {
            amount_try: tahminiAdat,
                        points: severity === 'CRITICAL' ? -15 : severity === 'HIGH' ? -10 : -5,
          },
          title: 'Yüksek Kasa Bakiyesi (VDK K-09)',
          summary: `Kasa: ${formatTL(kasaBakiye)} (%${(kasaOran * 100).toFixed(1)} aktif). Tahmini adat: ${formatTL(tahminiAdat)}`,
          why: `VDK K-09: Kasa/Aktif oranı %${(kasaOran * 100).toFixed(1)} > %5. TCMB ticari faiz oranı %${faizOrani} ile tahmini adat hesaplanmıştır. Yüksek kasa bakiyesi örtülü kazanç dağıtımı şüphesi oluşturur.`,
          evidence_refs: [
            createMizanEvidence('100', period, `100 Kasa: ${formatTL(kasaBakiye)}`, kasaBakiye),
            createCalculationEvidence('kasa-aktif-oran', `Kasa/Aktif: %${(kasaOran * 100).toFixed(2)}`),
            createVdkKuralEvidence('K-09', 'VDK Kriteri K-09: Yüksek Kasa Bakiyesi'),
          ],
          actions: [
            createModalAction('kasa-sayim', 'Kasa Sayımı', { action: 'upload', docType: 'kasa-sayim' }),
            createNavigateAction('adat-hesapla', 'Adat Hesapla', `/v2/hesaplamalar/adat?hesap=100&oran=${faizOrani}`),
          ],
          snoozeable: true,
          created_at: now,
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // KURAL 4: Negatif Kasa (VDK K-09)
      // ─────────────────────────────────────────────────────────────────
      if (kasaBakiye < -1) {
        feedItems.push({
          id: `P2-VDK-K09-02-${Date.now()}`,
          scope: feedScope,
          dedupe_key: `vdk-k09-negatif-kasa-${scope.client_id}-${period}`,
          category: 'VDK',
          severity: 'CRITICAL',
          score: 100,
          impact: {
            amount_try: Math.abs(kasaBakiye),
                        points: -20,
          },
          title: 'Negatif Kasa Bakiyesi (VDK K-09)',
          summary: `Kasa hesabı ${formatTL(Math.abs(kasaBakiye))} alacak bakiye veriyor!`,
          why: 'Kasa hesabı asla negatif bakiye veremez. Bu durum kayıt hatası veya belgesiz işlem şüphesi oluşturur. VDK incelemesinde kritik risk teşkil eder.',
          evidence_refs: [
            createMizanEvidence('100', period, `100 Kasa (Negatif): ${formatTL(kasaBakiye)}`, kasaBakiye),
            createVdkKuralEvidence('K-09', 'VDK Kriteri K-09: Negatif Kasa'),
          ],
          actions: [
            createNavigateAction('incele', 'Hareketleri İncele', `/v2/mizan-analiz?hesap=100&period=${period}`),
          ],
          snoozeable: false,
          created_at: now,
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // KURAL 5: Ortaklardan Alacaklar (VDK K-04)
      // ─────────────────────────────────────────────────────────────────
      const ortakAlacak = mizanAccounts
        .filter(a => a.hesapKodu.startsWith('131'))
        .reduce((sum, a) => sum + (a.borcBakiye - a.alacakBakiye), 0);

      if (ortakAlacak > 50000) {
        const faizOrani = oranlar.faizOranlari?.tcmb_ticari_tl || 50;
        const yillikFaiz = ortakAlacak * (faizOrani / 100);
        const kdv = yillikFaiz * 0.20;

        feedItems.push({
          id: `P2-VDK-K04-01-${Date.now()}`,
          scope: feedScope,
          dedupe_key: `vdk-k04-ortak-${scope.client_id}-${period}`,
          category: 'VDK',
          severity: 'CRITICAL',
          score: 95,
          impact: {
            amount_try: yillikFaiz + kdv,
                        points: -18,
          },
          title: 'Ortaklardan Alacak - Faiz Hesaplanmalı (VDK K-04)',
          summary: `Ortaklardan ${formatTL(ortakAlacak)} alacak. Tahmini faiz+KDV: ${formatTL(yillikFaiz + kdv)}`,
          why: `KVK 13: Ortaklara kullandırılan paralar için TCMB ticari faiz oranı (%${faizOrani}) üzerinden faiz hesaplanmalı ve KDV (%20) eklenmelidir. Transfer fiyatlandırması kapsamında örtülü kazanç dağıtımı riski bulunmaktadır.`,
          evidence_refs: [
            createMizanEvidence('131', period, `131 Ortaklardan Alacaklar: ${formatTL(ortakAlacak)}`, ortakAlacak),
            createCalculationEvidence('faiz', `Tahmini Yıllık Faiz: ${formatTL(yillikFaiz)}`, yillikFaiz),
            createCalculationEvidence('kdv', `KDV (%20): ${formatTL(kdv)}`, kdv),
            createVdkKuralEvidence('K-04', 'VDK Kriteri K-04: Ortaklardan Alacaklar'),
          ],
          actions: [
            createNavigateAction('adat', 'Adat Hesapla', `/v2/hesaplamalar/adat?hesap=131&oran=${faizOrani}`),
            createModalAction('fatura', 'Fatura Düzenle', { action: 'create-invoice', type: 'faiz-faturasi' }),
          ],
          snoozeable: true,
          created_at: now,
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // KURAL 6: Negatif Stok (VDK K-08)
      // ─────────────────────────────────────────────────────────────────
      const negatifStoklar = mizanAccounts.filter(a =>
        a.hesapKodu.startsWith('15') && (a.borcBakiye - a.alacakBakiye) < -100
      );

      if (negatifStoklar.length > 0) {
        const toplamNegatif = negatifStoklar.reduce((sum, a) => sum + Math.abs(a.borcBakiye - a.alacakBakiye), 0);

        feedItems.push({
          id: `P2-VDK-K08-01-${Date.now()}`,
          scope: feedScope,
          dedupe_key: `vdk-k08-stok-${scope.client_id}-${period}`,
          category: 'VDK',
          severity: 'CRITICAL',
          score: 95,
          impact: {
            amount_try: toplamNegatif,
                        points: -18,
          },
          title: 'Negatif Stok Bakiyesi (VDK K-08)',
          summary: `${negatifStoklar.length} hesapta toplam ${formatTL(toplamNegatif)} negatif stok`,
          why: 'Stok hesapları asla negatif bakiye veremez. Bu durum belgesiz alış veya kayıt hatası şüphesi oluşturur. VDK incelemesinde kritik risk teşkil eder.',
          evidence_refs: [
            ...negatifStoklar.slice(0, 3).map(a =>
              createMizanEvidence(a.hesapKodu, period, `${a.hesapKodu}: ${formatTL(a.borcBakiye - a.alacakBakiye)}`, a.borcBakiye - a.alacakBakiye)
            ),
            createVdkKuralEvidence('K-08', 'VDK Kriteri K-08: Negatif Stok'),
          ],
          actions: [
            createNavigateAction('incele', 'Stok Kartlarını İncele', `/v2/mizan-analiz?prefix=15&period=${period}`),
          ],
          snoozeable: false,
          created_at: now,
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // KURAL 7: Finansman Gider Kısıtlaması (VDK K-12)
      // ─────────────────────────────────────────────────────────────────
      if (mizanSummary.yabanciKaynak > mizanSummary.ozSermaye) {
        const finansmanGiderleri = mizanAccounts
          .filter(a => ['656', '660', '661', '780'].some(k => a.hesapKodu.startsWith(k)))
          .reduce((sum, a) => sum + (a.borcBakiye - a.alacakBakiye), 0);

        if (finansmanGiderleri > 10000) {
          const kkeg = finansmanGiderleri * 0.10;

          feedItems.push({
            id: `P2-VDK-K12-01-${Date.now()}`,
            scope: feedScope,
            dedupe_key: `vdk-k12-fgk-${scope.client_id}-${period}`,
            category: 'KV',
            severity: 'HIGH',
            score: 75,
            impact: {
              amount_try: kkeg * 0.25, // Vergi etkisi
                            points: -10,
            },
            title: 'Finansman Gider Kısıtlaması (VDK K-12)',
            summary: `Yabancı kaynak > Öz sermaye. KKEG: ${formatTL(kkeg)}`,
            why: `KVK 11/1-i: Yabancı kaynak (${formatTL(mizanSummary.yabanciKaynak)}) öz sermayeyi (${formatTL(mizanSummary.ozSermaye)}) aştığından, finansman giderlerinin %10'u (${formatTL(kkeg)}) KKEG olarak dikkate alınmalıdır.`,
            evidence_refs: [
              createCalculationEvidence('oz-sermaye', `Öz Sermaye: ${formatTL(mizanSummary.ozSermaye)}`, mizanSummary.ozSermaye),
              createCalculationEvidence('yabanci-kaynak', `Yabancı Kaynak: ${formatTL(mizanSummary.yabanciKaynak)}`, mizanSummary.yabanciKaynak),
              createCalculationEvidence('finansman-gider', `Finansman Giderleri: ${formatTL(finansmanGiderleri)}`, finansmanGiderleri),
              createVdkKuralEvidence('K-12', 'VDK Kriteri K-12: FGK'),
            ],
            actions: [
              createNavigateAction('hesapla', 'FGK Hesapla', `/v2/hesaplamalar/fgk?period=${period}`),
            ],
            snoozeable: true,
            created_at: now,
          });
        }
      }

      console.log('[useFeedSignals] Gerçek veriden üretilen sinyaller:', feedItems.length);

      // Sort by score descending
      feedItems.sort((a, b) => b.score - a.score);

      return {
        signals: feedItems,
        stats: {
          mizan: countBySeverity(feedItems),
          crossCheck: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
          combined: countBySeverity(feedItems),
        },
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // MOCK MODU (Mizan yüklenmemişse)
    // ═══════════════════════════════════════════════════════════════════
    console.log('[useFeedSignals] Mock data kullanılıyor (mizan yüklenmemiş)');

    const mizanResult = generateMizanSignals(MOCK_MIZAN_HESAPLAR, {
      ...MOCK_MIZAN_CONTEXT,
      client_id: scope.client_id,
      period: scope.period,
    });

    const crossCheckResult = generateCrossCheckSignals(MOCK_CROSSCHECK_ITEMS, {
      ...MOCK_CROSSCHECK_CONTEXT,
      client_id: scope.client_id,
      period: scope.period,
    });

    const allSignals = [...mizanResult.signals, ...crossCheckResult.signals];

    return {
      signals: allSignals,
      stats: {
        mizan: {
          total: mizanResult.signals.length,
          ...mizanResult.stats.by_severity,
          critical: mizanResult.stats.by_severity?.CRITICAL || 0,
          high: mizanResult.stats.by_severity?.HIGH || 0,
          medium: mizanResult.stats.by_severity?.MEDIUM || 0,
          low: mizanResult.stats.by_severity?.LOW || 0,
        },
        crossCheck: {
          total: crossCheckResult.signals.length,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        combined: countBySeverity(allSignals),
      },
    };

  }, [mizanLoaded, mizanAccounts, mizanSummary, oranlar.faizOranlari, scope.client_id, scope.period, scope.smmm_id]);

  return result;
}

export default useFeedSignals;
