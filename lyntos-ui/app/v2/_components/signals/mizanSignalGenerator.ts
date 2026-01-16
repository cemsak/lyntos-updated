/**
 * LYNTOS Mizan Signal Generator
 * Sprint 4.1 - Deterministic signal generation from Mizan data
 *
 * Anayasa: "Sinyal → Skor → Baskılama → Sunum"
 */

import type { FeedItem, FeedSeverity, EvidenceRef, FeedAction } from '../feed/types';
import type { MizanHesap, MizanContext, SignalResult, SignalRule, SignalCheckResult } from './types';
import { MATERIALITY } from './types';

// ═══════════════════════════════════════════════════════════════════
// HELPER: Format TL
// ═══════════════════════════════════════════════════════════════════

function formatTL(value: number): string {
  return (
    new Intl.NumberFormat('tr-TR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' TL'
  );
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Create Evidence Ref
// ═══════════════════════════════════════════════════════════════════

function createMizanEvidence(
  hesapKod: string,
  period: string,
  label: string,
  amount?: number
): EvidenceRef {
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

function createMissingDocEvidence(docType: string, label: string): EvidenceRef {
  return {
    kind: 'missing_doc',
    ref: `missing-${docType}`,
    label,
  };
}

// ═══════════════════════════════════════════════════════════════════
// HELPER: Create Actions
// ═══════════════════════════════════════════════════════════════════

function createNavigateAction(
  id: string,
  label: string,
  href: string,
  variant: 'primary' | 'secondary' = 'primary'
): FeedAction {
  return { id, label, kind: 'navigate', variant, href };
}

function createUploadAction(id: string, label: string, docType: string): FeedAction {
  return {
    id,
    label,
    kind: 'modal',
    variant: 'secondary',
    payload: { action: 'upload', docType },
  };
}

// ═══════════════════════════════════════════════════════════════════
// SIGNAL RULES
// ═══════════════════════════════════════════════════════════════════

const MIZAN_RULES: SignalRule[] = [
  // ─────────────────────────────────────────────────────────────────
  // RULE 1: Kasa Negatif Bakiye (VDK Kritik)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'mizan-kasa-negatif',
    name: 'Kasa Negatif Bakiye',
    description: 'Kasa hesabinda negatif bakiye VDK incelemesinde kritik risk olusturur',
    hesapKodlari: ['100'],
    category: 'Mizan',
    check: (hesap, context) => {
      // Kasa negatif = Alacak bakiyesi (normalde Borç olmali)
      if (hesap.bakiyeYonu === 'A' && hesap.bakiye > MATERIALITY.KASA_MIN) {
        return {
          severity: 'CRITICAL',
          score: 95,
          impact: { amount_try: hesap.bakiye, points: -15 },
          title: '100-Kasa hesabinda negatif bakiye',
          summary: `Kasa hesabi ${formatTL(hesap.bakiye)} alacak bakiyesi gosteriyor. Fiziksel kasa negatif olamayacagindan bu durum kayit hatasi veya belgesiz islem gostergesidir.`,
          why: `Kasa hesabinin negatif bakiye vermesi muhasebe teknigine aykiridir. ${formatTL(hesap.bakiye)} tutarindaki alacak bakiyesi, ya kasadan cikmamis bir odeme kaydedilmis ya da belgesiz tahsilat yapilmistir. VDK incelemesinde kritik risk olusturur.`,
          evidence_refs: [
            createMizanEvidence(hesap.kod, context.period, `100 Kasa - Alacak Bakiye: ${formatTL(hesap.bakiye)}`, hesap.bakiye),
            createVdkKuralEvidence('kasa-negatif', 'VDK Kural: Kasa hesabi negatif olamaz'),
            createMissingDocEvidence('kasa-sayim', 'Kasa sayim tutanagi eksik'),
          ],
          actions: [
            createNavigateAction('fix_kasa', 'Duzelt', `/v2/mizan-analiz?hesap=100&period=${context.period}`),
            createUploadAction('upload_kasa', 'Kasa Sayimi Yukle', 'kasa-sayim'),
          ],
          dedupe_key: `kasa-negatif-${context.client_id}-${context.period}`,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // RULE 2: Kasa Yüksek Bakiye (VDK Risk)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'mizan-kasa-yuksek',
    name: 'Kasa Yuksek Bakiye',
    description: 'Ciroya oranla yuksek kasa bakiyesi supheli islem gostergesi olabilir',
    hesapKodlari: ['100'],
    category: 'Mizan',
    check: (hesap, context) => {
      if (!context.ciro || context.ciro === 0) return null;

      const kasaCiroOrani = hesap.bakiye / context.ciro;

      if (hesap.bakiyeYonu === 'B' && kasaCiroOrani > MATERIALITY.KASA_CIRO_MAX) {
        const fazlalik = hesap.bakiye - context.ciro * MATERIALITY.KASA_CIRO_MAX;
        return {
          severity: 'HIGH',
          score: 75,
          impact: { amount_try: fazlalik, pct: kasaCiroOrani * 100 },
          title: 'Kasa bakiyesi ciroya oranla yuksek',
          summary: `Kasa bakiyesi (${formatTL(hesap.bakiye)}) donem cirosunun %${(kasaCiroOrani * 100).toFixed(1)}'i seviyesinde. Normal oran %5'in altinda olmali.`,
          why: `Isletmelerde kasa bakiyesinin ciroya orani genellikle %5'i gecmemelidir. ${formatTL(hesap.bakiye)} tutarindaki kasa bakiyesi cirosunun %${(kasaCiroOrani * 100).toFixed(1)}'ine denk gelmektedir. Bu durum yuksek nakit tutma gerekçesi belgelenmeli veya supheli islem olarak degerlendirilmelidir.`,
          evidence_refs: [
            createMizanEvidence(hesap.kod, context.period, `100 Kasa - Bakiye: ${formatTL(hesap.bakiye)}`, hesap.bakiye),
            {
              kind: 'calculation',
              ref: `ciro-oran-${context.period}`,
              label: `Kasa/Ciro Orani: %${(kasaCiroOrani * 100).toFixed(1)}`,
              period: context.period,
            },
          ],
          actions: [
            createNavigateAction('incele_kasa', 'Incele', `/v2/mizan-analiz?hesap=100&period=${context.period}`),
            createUploadAction('gerekce_kasa', 'Gerekce Ekle', 'kasa-gerekce'),
          ],
          dedupe_key: `kasa-yuksek-${context.client_id}-${context.period}`,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // RULE 3: Banka Negatif Bakiye
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'mizan-banka-negatif',
    name: 'Banka Negatif Bakiye',
    description: 'Banka hesabinda alacak bakiyesi (kredili mevduat veya hata)',
    hesapKodlari: ['102'],
    category: 'Mizan',
    check: (hesap, context) => {
      if (hesap.bakiyeYonu === 'A' && hesap.bakiye > MATERIALITY.BANKA_MIN) {
        return {
          severity: 'HIGH',
          score: 70,
          impact: { amount_try: hesap.bakiye },
          title: '102-Banka hesabinda alacak bakiyesi',
          summary: `Banka hesabi ${formatTL(hesap.bakiye)} alacak bakiyesi gosteriyor. Kredili mevduat kullanimi veya ekstre mutabakat hatasi olabilir.`,
          why: `Banka hesabinin alacak bakiyesi vermesi, ya kredili mevduat hesabindan cekilen tutari gostermekte ya da banka ekstresi ile muhasebe kayitlari arasinda uyumsuzluk bulunmaktadir. ${formatTL(hesap.bakiye)} tutarindaki alacak bakiyesi icin banka ekstresi mutabakati yapilmalidir.`,
          evidence_refs: [
            createMizanEvidence(hesap.kod, context.period, `102 Banka - Alacak Bakiye: ${formatTL(hesap.bakiye)}`, hesap.bakiye),
            createMissingDocEvidence('banka-ekstre', 'Banka ekstresi mutabakati eksik'),
          ],
          actions: [
            createNavigateAction('mutabakat_banka', 'Mutabakat Yap', `/v2/mutabakat/banka?period=${context.period}`),
            createUploadAction('upload_ekstre', 'Ekstre Yukle', 'banka-ekstre'),
          ],
          dedupe_key: `banka-negatif-${context.client_id}-${context.period}`,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // RULE 4: Ortaklara Borçlar (VDK Kritik)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'mizan-ortak-borc',
    name: 'Ortaklara Borclar',
    description: 'Sirketin ortaklara borc vermesi VDK incelemesinde sorgulanir',
    hesapKodlari: ['131'],
    category: 'VDK',
    check: (hesap, context) => {
      // 131 normalde Alacak bakiyesi vermeli (sirket ortaga borclu)
      // Borc bakiyesi = sirket ortaktan alacakli = sirket ortaga para vermis
      if (hesap.bakiyeYonu === 'B' && hesap.bakiye > MATERIALITY.ALACAK_MIN) {
        return {
          severity: 'CRITICAL',
          score: 90,
          impact: { amount_try: hesap.bakiye, points: -12 },
          title: '131-Ortaklara borc verilmis',
          summary: `Sirket ortaklarina ${formatTL(hesap.bakiye)} tutarinda borc vermis gorunuyor. Transfer fiyatlandirmasi ve ortulu kazanc dagitimi acisindan VDK incelemesinde sorgulanir.`,
          why: `Sirketin ortaklarina borc vermesi, ortulu kazanc dagitimi veya transfer fiyatlandirmasi acisindan incelenmelidir. ${formatTL(hesap.bakiye)} tutarindaki borc icin emsal faiz hesaplanmali ve sozlesme duzenlenmelidir. VDK denetiminde kritik sorgulama noktasidir.`,
          evidence_refs: [
            createMizanEvidence(hesap.kod, context.period, `131 Ortaklara Borclar - Borc Bakiye: ${formatTL(hesap.bakiye)}`, hesap.bakiye),
            createVdkKuralEvidence('ortak-borc', 'VDK Kural: Ortaklara verilen borclar'),
            createMissingDocEvidence('ortak-sozlesme', 'Ortak borc sozlesmesi eksik'),
          ],
          actions: [
            createNavigateAction('detay_ortak', 'Detay', `/v2/mizan-analiz?hesap=131&period=${context.period}`),
            createNavigateAction('faiz_hesapla', 'Faiz Hesapla', `/v2/pratik-bilgiler/hesaplamalar?tip=ortak-faiz`),
            createUploadAction('upload_sozlesme', 'Sozlesme Yukle', 'ortak-sozlesme'),
          ],
          dedupe_key: `ortak-borc-${context.client_id}-${context.period}`,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // RULE 5: Ortaklardan Alacaklar Limit Aşımı
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'mizan-ortak-alacak-limit',
    name: 'Ortaklardan Alacak Limit Asimi',
    description: 'Ortaklardan alacak sermayenin belirli oranini asmamali',
    hesapKodlari: ['331'],
    category: 'VDK',
    check: (hesap, context) => {
      if (!context.sermaye || context.sermaye === 0) return null;

      const alacakSermayeOrani = hesap.bakiye / context.sermaye;

      if (hesap.bakiyeYonu === 'A' && alacakSermayeOrani > MATERIALITY.ORTAK_SERMAYE_MAX) {
        return {
          severity: 'HIGH',
          score: 80,
          impact: {
            amount_try: hesap.bakiye - context.sermaye * MATERIALITY.ORTAK_SERMAYE_MAX,
            pct: alacakSermayeOrani * 100,
          },
          title: '331-Ortaklardan alacak sermaye limitini asiyor',
          summary: `Ortaklardan alacak (${formatTL(hesap.bakiye)}) odenmis sermayenin %${(alacakSermayeOrani * 100).toFixed(0)}'ine ulasmis. %25 uzeri transfer fiyatlandirmasi incelemesi riski tasir.`,
          why: `Ortaklardan alacaklarin sermayeye orani %25'i asmamalidir. ${formatTL(hesap.bakiye)} tutarindaki alacak, ${formatTL(context.sermaye)} sermayenin %${(alacakSermayeOrani * 100).toFixed(0)}'ini olusturmaktadir. Bu durum transfer fiyatlandirmasi incelemesi riski tasimaktadir.`,
          evidence_refs: [
            createMizanEvidence(hesap.kod, context.period, `331 Ortaklardan Alacaklar: ${formatTL(hesap.bakiye)}`, hesap.bakiye),
            {
              kind: 'calculation',
              ref: `sermaye-oran-${context.period}`,
              label: `Alacak/Sermaye Orani: %${(alacakSermayeOrani * 100).toFixed(0)}`,
              period: context.period,
            },
          ],
          actions: [
            createNavigateAction('incele_alacak', 'Incele', `/v2/mizan-analiz?hesap=331&period=${context.period}`),
            createUploadAction('upload_sermaye', 'Sermaye Belgesi', 'sermaye-belge'),
          ],
          dedupe_key: `ortak-alacak-limit-${context.client_id}-${context.period}`,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // RULE 6: Ticari Mal Negatif (VDK Kritik)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'mizan-stok-negatif',
    name: 'Ticari Mal Negatif',
    description: 'Stok hesabinda negatif bakiye imkansizdir',
    hesapKodlari: ['153'],
    category: 'Mizan',
    check: (hesap, context) => {
      if (hesap.bakiyeYonu === 'A' && hesap.bakiye > MATERIALITY.STOK_MIN) {
        return {
          severity: 'CRITICAL',
          score: 92,
          impact: { amount_try: hesap.bakiye, points: -10 },
          title: '153-Ticari Mal hesabinda negatif bakiye',
          summary: `Stok hesabi ${formatTL(hesap.bakiye)} alacak bakiyesi gosteriyor. Fiziksel stok negatif olamaz; bu durum satis-alis siralamasi hatasi veya belgesiz satis gostergesidir.`,
          why: `Ticari mal hesabinin negatif bakiye vermesi fiziksel olarak imkansizdir. ${formatTL(hesap.bakiye)} tutarindaki alacak bakiyesi, ya satis faturasinin alis faturasundan once kaydedildigini ya da belgesiz satis yapildigini gostermektedir. Stok sayimi ile karsilastirma yapilmalidir.`,
          evidence_refs: [
            createMizanEvidence(hesap.kod, context.period, `153 Ticari Mal - Alacak Bakiye: ${formatTL(hesap.bakiye)}`, hesap.bakiye),
            createVdkKuralEvidence('stok-negatif', 'VDK Kural: Stok hesabi negatif olamaz'),
            createMissingDocEvidence('stok-sayim', 'Stok sayim tutanagi eksik'),
          ],
          actions: [
            createNavigateAction('fix_stok', 'Duzelt', `/v2/mizan-analiz?hesap=153&period=${context.period}`),
            createUploadAction('upload_stok', 'Stok Sayimi Yukle', 'stok-sayim'),
          ],
          dedupe_key: `stok-negatif-${context.client_id}-${context.period}`,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // RULE 7: Satıcılar Ters Bakiye
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'mizan-satici-ters',
    name: 'Saticilar Ters Bakiye',
    description: 'Saticilar hesabi normalde alacak bakiyesi vermelidir',
    hesapKodlari: ['320'],
    category: 'Mizan',
    check: (hesap, context) => {
      if (hesap.bakiyeYonu === 'B' && hesap.bakiye > MATERIALITY.ALACAK_MIN) {
        return {
          severity: 'MEDIUM',
          score: 55,
          impact: { amount_try: hesap.bakiye },
          title: '320-Saticilar hesabinda borc bakiyesi',
          summary: `Saticilar hesabi ${formatTL(hesap.bakiye)} borc bakiyesi gosteriyor. Avans odemesi veya fazla odeme olabilir. Satici mutabakati yapilmali.`,
          why: `Saticilar hesabi normalde alacak bakiyesi vermelidir (sirket saticilara borcludur). ${formatTL(hesap.bakiye)} tutarindaki borc bakiyesi, ya saticilara avans odendigi ya da fazla odeme yapildigi anlamina gelmektedir. Satici mutabakati ile dogrulanmalidir.`,
          evidence_refs: [
            createMizanEvidence(hesap.kod, context.period, `320 Saticilar - Borc Bakiye: ${formatTL(hesap.bakiye)}`, hesap.bakiye),
          ],
          actions: [
            createNavigateAction('mutabakat_satici', 'Mutabakat Yap', `/v2/mutabakat/cari?tip=satici&period=${context.period}`),
          ],
          dedupe_key: `satici-ters-${context.client_id}-${context.period}`,
        };
      }
      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // RULE 8: Gelir Anomalisi (Dönemsel Sapma)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'mizan-gelir-anomali',
    name: 'Gelir Anomalisi',
    description: 'Gelir hesaplarinda onceki doneme gore anormal sapma',
    hesapKodlari: ['600', '601', '602'],
    category: 'Mizan',
    check: (hesap, context) => {
      if (!hesap.oncekiDonemBakiye || hesap.oncekiDonemBakiye === 0) return null;

      const degisimOrani = (hesap.bakiye - hesap.oncekiDonemBakiye) / hesap.oncekiDonemBakiye;

      if (Math.abs(degisimOrani) > MATERIALITY.DONEM_SAPMA_MAX) {
        const artisAzalis = degisimOrani > 0 ? 'artis' : 'azalis';
        const severity: FeedSeverity = Math.abs(degisimOrani) > 0.5 ? 'HIGH' : 'MEDIUM';

        return {
          severity,
          score: Math.abs(degisimOrani) > 0.5 ? 70 : 50,
          impact: {
            pct: degisimOrani * 100,
            amount_try: Math.abs(hesap.bakiye - hesap.oncekiDonemBakiye),
          },
          title: `${hesap.kod}-${hesap.ad} hesabinda %${Math.abs(degisimOrani * 100).toFixed(0)} ${artisAzalis}`,
          summary: `${hesap.ad} hesabi onceki doneme gore %${Math.abs(degisimOrani * 100).toFixed(0)} ${artisAzalis} gosteriyor. ${degisimOrani > 0 ? 'Olagandisi gelir artisi' : 'Ciddi gelir dususu'} analiz edilmeli.`,
          why: `${hesap.ad} hesabindaki %${Math.abs(degisimOrani * 100).toFixed(0)}'lik ${artisAzalis}, onceki donem ${formatTL(hesap.oncekiDonemBakiye)} iken bu donem ${formatTL(hesap.bakiye)} olmasina karsilik gelmektedir. ${Math.abs(degisimOrani) > 0.5 ? 'Bu buyuklukte bir degisim detayli analiz gerektirmektedir.' : 'Donemsel dalgalanma olarak degerlendirilmelidir.'}`,
          evidence_refs: [
            createMizanEvidence(hesap.kod, context.period, `${hesap.kod} ${hesap.ad} - Bu Donem: ${formatTL(hesap.bakiye)}`, hesap.bakiye),
            {
              kind: 'mizan_row',
              ref: `mizan-${hesap.kod}-onceki`,
              label: `${hesap.kod} ${hesap.ad} - Onceki Donem: ${formatTL(hesap.oncekiDonemBakiye)}`,
              amount: hesap.oncekiDonemBakiye,
            },
            {
              kind: 'calculation',
              ref: `degisim-${hesap.kod}-${context.period}`,
              label: `Donemsel Degisim: %${(degisimOrani * 100).toFixed(1)}`,
            },
          ],
          actions: [
            createNavigateAction('analiz_gelir', 'Analiz Et', `/v2/mizan-analiz?hesap=${hesap.kod}&period=${context.period}`),
          ],
          dedupe_key: `gelir-anomali-${hesap.kod}-${context.client_id}-${context.period}`,
        };
      }
      return null;
    },
  },
];

// ═══════════════════════════════════════════════════════════════════
// MAIN GENERATOR FUNCTION
// ═══════════════════════════════════════════════════════════════════

export function generateMizanSignals(hesaplar: MizanHesap[], context: MizanContext): SignalResult {
  const signals: FeedItem[] = [];
  const errors: string[] = [];
  const byCategory: Record<FeedSeverity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };

  // Process each account against all applicable rules
  for (const hesap of hesaplar) {
    for (const rule of MIZAN_RULES) {
      // Check if rule applies to this account
      const hesapGrubu = hesap.kod.substring(0, 3);
      const applies = rule.hesapKodlari.some(
        (kod) => hesap.kod === kod || hesap.kod.startsWith(kod) || hesapGrubu === kod
      );

      if (!applies) continue;

      try {
        const result = rule.check(hesap, context);

        if (result) {
          // Convert to FeedItem
          const feedItem: FeedItem = {
            id: `${rule.id}-${context.client_id}-${context.period}`,
            scope: {
              smmm_id: context.smmm_id,
              client_id: context.client_id,
              period: context.period,
            },
            dedupe_key: result.dedupe_key,
            category: rule.category,
            severity: result.severity,
            score: result.score,
            impact: result.impact,
            title: result.title,
            summary: result.summary,
            why: result.why,
            evidence_refs: result.evidence_refs,
            actions: result.actions,
            snoozeable: result.severity !== 'CRITICAL',
            // created_at set by useFeedSignals for stable reference
          };

          signals.push(feedItem);
          byCategory[result.severity]++;
        }
      } catch (err) {
        errors.push(`Rule ${rule.id} failed for hesap ${hesap.kod}: ${err}`);
      }
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
      total_checked: hesaplar.length,
      signals_generated: signals.length,
      by_severity: byCategory,
    },
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export { MIZAN_RULES };
