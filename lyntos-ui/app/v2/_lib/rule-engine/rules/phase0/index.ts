/**
 * LYNTOS Rule Engine - Phase 0 Rules
 * Sprint 5.2 - Data Validation
 */

import { BaseRule, RulePhase, RuleCategory, RuleContext, RuleTriggerOutput, Severity, Threshold } from '../../types';

// ═══════════════════════════════════════════════════════════════════
// MİZAN DENKLİĞİ
// ═══════════════════════════════════════════════════════════════════

export class MizanDenkligiRule extends BaseRule {
  readonly id = 'P0-001';
  readonly name = 'Mizan Denkliği';
  readonly description = 'Borç = Alacak kontrolü';
  readonly category = RuleCategory.DATA_VALIDATION;
  readonly phase = RulePhase.INTAKE;
  readonly tags = ['mizan', 'denklik', 'kritik'];
  readonly dependencies: string[] = [];
  readonly legalRefs = ['VUK 177', 'MSUGT'];
  readonly threshold: Threshold = { absoluteAmount: 1 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    let borc = 0, alacak = 0;
    for (const h of context.mizan) {
      borc += h.borc;
      alacak += h.alacak;
    }

    const fark = Math.abs(borc - alacak);
    if (fark < 1) return null;

    return {
      severity: Severity.CRITICAL,
      title: 'Mizan Dengesi Bozuk',
      summary: `Borç-Alacak farkı: ${this.formatTL(fark)}`,
      why: `Borç: ${this.formatTL(borc)}, Alacak: ${this.formatTL(alacak)}`,
      actions: [{ id: 'fix', label: 'Düzelt', type: 'correction', priority: 'critical', assignee: 'SMMM' }],
      evidenceRefs: [{ type: 'hesaplama', source: 'Fark', value: fark }],
      impact: { area: 'Veri', potentialIssue: 'Tüm analizler güvenilmez', magnitude: 'CRITICAL' },
      tags: ['veri-hatasi', 'blokleyici'],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// AKTİF-PASİF DENKLİĞİ
// ═══════════════════════════════════════════════════════════════════

export class AktifPasifDenkligiRule extends BaseRule {
  readonly id = 'P0-002';
  readonly name = 'Aktif-Pasif Denkliği';
  readonly description = 'Bilanço denkliği kontrolü';
  readonly category = RuleCategory.DATA_VALIDATION;
  readonly phase = RulePhase.INTAKE;
  readonly tags = ['bilanco', 'denklik'];
  readonly dependencies = ['P0-001'];
  readonly legalRefs = ['MSUGT'];
  readonly threshold: Threshold = { absoluteAmount: 100 };

  protected async executeLogic(context: RuleContext): Promise<RuleTriggerOutput | null> {
    const aktif = context.mizan
      .filter(h => h.kod.startsWith('1') || h.kod.startsWith('2'))
      .reduce((s, h) => s + (h.bakiyeYonu === 'B' ? h.bakiye : -h.bakiye), 0);

    const pasif = context.mizan
      .filter(h => ['3', '4', '5'].some(p => h.kod.startsWith(p)))
      .reduce((s, h) => s + (h.bakiyeYonu === 'A' ? h.bakiye : -h.bakiye), 0);

    const fark = Math.abs(aktif - pasif);
    if (fark < 100) return null;

    return {
      severity: Severity.CRITICAL,
      title: 'Bilanço Dengesizliği',
      summary: `Aktif-Pasif farkı: ${this.formatTL(fark)}`,
      why: `Aktif: ${this.formatTL(aktif)}, Pasif: ${this.formatTL(pasif)}`,
      actions: [{ id: 'fix', label: 'Düzelt', type: 'correction', priority: 'critical', assignee: 'SMMM' }],
      evidenceRefs: [{ type: 'hesaplama', source: 'Fark', value: fark }],
      impact: { area: 'Bilanço', potentialIssue: 'Bilanço tamamlanamaz', magnitude: 'CRITICAL' },
      tags: ['bilanco', 'kritik'],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

export const PHASE_0_RULES = [
  new MizanDenkligiRule(),
  new AktifPasifDenkligiRule(),
];
