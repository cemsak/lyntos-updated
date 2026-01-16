/**
 * LYNTOS Rule Engine - Phase 2 VDK Rules
 * Sprint 5.2 - VDK Analysis
 */

import { BaseRule, RulePhase, RuleCategory, RuleContext, RuleTriggerOutput, Severity, Threshold } from '../../types';

// ═══════════════════════════════════════════════════════════════════
// K-09: YÜKSEK KASA BAKİYESİ
// ═══════════════════════════════════════════════════════════════════

export class YuksekKasaBakiyesiRule extends BaseRule {
  readonly id = 'P2-VDK-K09-01';
  readonly name = 'Yüksek Kasa Bakiyesi';
  readonly description = 'Kasa bakiyesinin aktif toplamına oranını kontrol eder (VDK K-09)';
  readonly category = RuleCategory.VDK_ANALYSIS;
  readonly phase = RulePhase.ANALYZE;
  readonly tags = ['vdk', 'kasa', 'K-09'];
  readonly dependencies: string[] = [];
  override readonly vdkKriteri = 'K-09';
  readonly legalRefs = ['VUK 258-259', 'KVK 13'];
  readonly threshold: Threshold = { ratio: 0.05, absoluteAmount: 10000 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    const kasaBakiye = this.getAccountBalance(context.mizan, '100');
    const aktifToplam = context.mizanOzet?.aktifToplam || 1;

    if (kasaBakiye < (this.threshold.absoluteAmount || 0)) return null;

    const oran = kasaBakiye / aktifToplam;
    if (oran < (this.threshold.ratio || 0)) return null;

    const severity = oran > 0.15 ? Severity.CRITICAL : oran > 0.10 ? Severity.HIGH : Severity.MEDIUM;
    const faizOrani = context.oranlar.faizOranlari.tcmb_ticari_tl;
    const tahminiAdat = kasaBakiye * (faizOrani / 100);

    return {
      severity,
      title: 'Yüksek Kasa Bakiyesi (VDK K-09)',
      summary: `Kasa bakiyesi ${this.formatTL(kasaBakiye)} aktif toplamının %${(oran * 100).toFixed(1)}'i`,
      why: `VDK K-09: Kasa/Aktif > %5. TCMB faizi %${faizOrani} ile tahmini adat: ${this.formatTL(tahminiAdat)}`,
      actions: [
        { id: 'kasa-sayim', label: 'Kasa Sayımı Yap', type: 'document', priority: 'high', assignee: 'MUKELLEF' },
        { id: 'adat-hesapla', label: `Adat Hesapla (%${faizOrani})`, type: 'calculation', priority: 'high', assignee: 'SMMM', metadata: { kasaBakiye, faizOrani, tahminiAdat } },
      ],
      evidenceRefs: [
        { type: 'mizan', source: '100 Kasa', value: kasaBakiye },
        { type: 'hesaplama', source: 'Kasa/Aktif', value: `%${(oran * 100).toFixed(2)}` },
      ],
      impact: { area: 'VDK Risk', potentialIssue: 'Örtülü kazanç', estimatedAmount: tahminiAdat * 1.2, magnitude: 'HIGH' },
      tags: ['vdk', 'K-09', 'kasa'],
      vdkKriteri: 'K-09',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// K-04: ORTAKLARDAN ALACAKLAR
// ═══════════════════════════════════════════════════════════════════

export class OrtakAlacakRule extends BaseRule {
  readonly id = 'P2-VDK-K04-01';
  readonly name = 'Ortaklardan Alacak - Transfer Fiyatlandırması';
  readonly description = 'Ortaklara kullandırılan paralar için faiz kontrolü (VDK K-04)';
  readonly category = RuleCategory.TRANSFER_PRICING;
  readonly phase = RulePhase.ANALYZE;
  readonly tags = ['vdk', 'ortak', 'K-04'];
  readonly dependencies: string[] = [];
  override readonly vdkKriteri = 'K-04';
  readonly legalRefs = ['KVK 13', 'GVK 41/5'];
  readonly threshold: Threshold = { absoluteAmount: 50000 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    const ortakAlacak = this.getAccountBalance(context.mizan, '131');
    if (ortakAlacak <= (this.threshold.absoluteAmount || 0)) return null;

    const faizOrani = context.oranlar.faizOranlari.tcmb_ticari_tl;
    const yillikFaiz = ortakAlacak * (faizOrani / 100);
    const kdv = yillikFaiz * 0.20;

    return {
      severity: Severity.CRITICAL,
      title: 'Ortaklardan Alacak - Faiz Hesaplanmalı (VDK K-04)',
      summary: `${this.formatTL(ortakAlacak)} alacak. Faiz: ${this.formatTL(yillikFaiz + kdv)}`,
      why: `KVK 13: Ortaklara kullandırılan paralar için TCMB faizi (%${faizOrani}) + KDV`,
      actions: [
        { id: 'adat', label: `Adat Hesapla (%${faizOrani})`, type: 'calculation', priority: 'critical', assignee: 'SMMM' },
        { id: 'fatura', label: 'Faiz Faturası Düzenle', type: 'document', priority: 'critical', assignee: 'SMMM' },
      ],
      evidenceRefs: [{ type: 'mizan', source: '131', value: ortakAlacak }],
      impact: { area: 'Transfer Fiyatlandırması', potentialIssue: 'Örtülü kazanç', estimatedAmount: yillikFaiz + kdv, magnitude: 'CRITICAL' },
      tags: ['vdk', 'K-04'],
      vdkKriteri: 'K-04',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// K-08: NEGATİF STOK
// ═══════════════════════════════════════════════════════════════════

export class NegatifStokRule extends BaseRule {
  readonly id = 'P2-VDK-K08-01';
  readonly name = 'Negatif Stok Bakiyesi';
  readonly description = 'Stok hesaplarının negatif bakiye kontrolü (VDK K-08)';
  readonly category = RuleCategory.VDK_ANALYSIS;
  readonly phase = RulePhase.ANALYZE;
  readonly tags = ['vdk', 'stok', 'K-08'];
  readonly dependencies: string[] = [];
  override readonly vdkKriteri = 'K-08';
  readonly legalRefs = ['VUK 230'];
  readonly threshold: Threshold = { absoluteAmount: 100 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    const negatifStoklar = context.mizan.filter(h =>
      h.kod.startsWith('15') && h.bakiyeYonu === 'A' && h.bakiye > 100
    );

    if (negatifStoklar.length === 0) return null;

    const toplam = negatifStoklar.reduce((s, h) => s + h.bakiye, 0);

    return {
      severity: Severity.CRITICAL,
      title: 'Negatif Stok Bakiyesi (VDK K-08)',
      summary: `${negatifStoklar.length} hesapta ${this.formatTL(toplam)} negatif`,
      why: 'Stok asla negatif olamaz. Belgesiz alış şüphesi.',
      actions: [
        { id: 'stok-incele', label: 'Stok Kartlarını İncele', type: 'analysis', priority: 'critical', assignee: 'SMMM' },
      ],
      evidenceRefs: negatifStoklar.map(h => ({ type: 'mizan' as const, source: h.kod, value: -h.bakiye })),
      impact: { area: 'VDK Risk', potentialIssue: 'Belgesiz alış', estimatedAmount: toplam * 0.4, magnitude: 'CRITICAL' },
      tags: ['vdk', 'K-08'],
      vdkKriteri: 'K-08',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// K-12: FİNANSMAN GİDER KISITLAMASI
// ═══════════════════════════════════════════════════════════════════

export class FGKRule extends BaseRule {
  readonly id = 'P2-VDK-K12-01';
  readonly name = 'Finansman Gider Kısıtlaması';
  readonly description = 'Yabancı kaynak / öz sermaye FGK kontrolü (VDK K-12)';
  readonly category = RuleCategory.TAX_COMPLIANCE;
  readonly phase = RulePhase.ANALYZE;
  readonly tags = ['vdk', 'fgk', 'K-12'];
  readonly dependencies: string[] = [];
  override readonly vdkKriteri = 'K-12';
  readonly legalRefs = ['KVK 11/1-i'];
  readonly threshold: Threshold = { absoluteAmount: 10000 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    const ozSermaye = context.mizanOzet?.ozSermaye || 0;
    const yabanciKaynak = context.mizanOzet?.yabanciKaynak || 0;

    if (yabanciKaynak <= ozSermaye) return null;

    const finansmanGiderleri = context.mizan
      .filter(h => ['656', '660', '661', '780'].some(k => h.kod.startsWith(k)))
      .reduce((s, h) => s + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0);

    if (finansmanGiderleri < (this.threshold.absoluteAmount || 0)) return null;

    const kkeg = finansmanGiderleri * 0.10;

    return {
      severity: Severity.HIGH,
      title: 'FGK Uygulanmalı (VDK K-12)',
      summary: `Yabancı kaynak > öz sermaye. KKEG: ${this.formatTL(kkeg)}`,
      why: `KVK 11/1-i: Finansman giderlerinin %10'u KKEG`,
      actions: [
        { id: 'fgk', label: 'FGK Hesaplama', type: 'calculation', priority: 'high', assignee: 'SMMM', metadata: { ozSermaye, yabanciKaynak, kkeg } },
      ],
      evidenceRefs: [
        { type: 'hesaplama', source: 'Öz Sermaye', value: ozSermaye },
        { type: 'hesaplama', source: 'Yabancı Kaynak', value: yabanciKaynak },
      ],
      impact: { area: 'Vergi', potentialIssue: 'Eksik KKEG', estimatedAmount: kkeg * 0.25, magnitude: 'HIGH' },
      tags: ['vdk', 'K-12'],
      vdkKriteri: 'K-12',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

export const PHASE_2_RULES = [
  new YuksekKasaBakiyesiRule(),
  new OrtakAlacakRule(),
  new NegatifStokRule(),
  new FGKRule(),
];
