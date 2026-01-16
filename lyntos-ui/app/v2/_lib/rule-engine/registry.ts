/**
 * LYNTOS Rule Engine - Master Registry
 * Sprint 5.2 - Unified Rule Architecture
 */

import { ruleRegistry, ruleEngine } from './orchestrator';
import { RulePhase, IRule } from './types';

// Phase kurallarını import et
import { PHASE_0_RULES } from './rules/phase0';
import { PHASE_1_RULES } from './rules/phase1';
import { PHASE_2_RULES } from './rules/phase2';
import { PHASE_3_RULES } from './rules/phase3';

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

let initialized = false;

export function initializeRuleEngine(): void {
  if (initialized) return;

  console.log('🔧 [RuleEngine] Initializing...');

  // Phase 0 kurallarını kaydet
  ruleRegistry.registerAll(PHASE_0_RULES);
  console.log(`📋 [Phase 0] ${PHASE_0_RULES.length} rules registered`);

  // Phase 1 kurallarını kaydet
  ruleRegistry.registerAll(PHASE_1_RULES);
  console.log(`📋 [Phase 1] ${PHASE_1_RULES.length} rules registered`);

  // Phase 2 kurallarını kaydet
  ruleRegistry.registerAll(PHASE_2_RULES);
  console.log(`📋 [Phase 2] ${PHASE_2_RULES.length} rules registered`);

  // Phase 3 kurallarını kaydet
  ruleRegistry.registerAll(PHASE_3_RULES);
  console.log(`📋 [Phase 3] ${PHASE_3_RULES.length} rules registered`);

  initialized = true;
  console.log(`✅ [RuleEngine] Initialized with ${ruleRegistry.count} rules`);
}

// ═══════════════════════════════════════════════════════════════════
// VDK MAPPING
// ═══════════════════════════════════════════════════════════════════

export const VDK_CRITERIA_MAP: Record<string, {
  aciklama: string;
  kurallar: string[];
  risk: 'KRITIK' | 'YUKSEK' | 'ORTA';
}> = {
  'K-04': {
    aciklama: 'Transfer Fiyatlandırması / Örtülü Kazanç',
    kurallar: ['P2-VDK-K04-01'],
    risk: 'KRITIK',
  },
  'K-08': {
    aciklama: 'Negatif Stok Bakiyesi',
    kurallar: ['P2-VDK-K08-01'],
    risk: 'KRITIK',
  },
  'K-09': {
    aciklama: 'Yüksek/Negatif Kasa Bakiyesi',
    kurallar: ['P2-VDK-K09-01'],
    risk: 'KRITIK',
  },
  'K-12': {
    aciklama: 'Finansman Gider Kısıtlaması',
    kurallar: ['P2-VDK-K12-01'],
    risk: 'YUKSEK',
  },
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export function getRulesByVdkCriteria(vdkKriteri: string): IRule[] {
  return ruleRegistry.getAll().filter(r => r.vdkKriteri === vdkKriteri);
}

export function getRulesByPhase(phase: RulePhase): IRule[] {
  return ruleRegistry.getByPhase(phase);
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export { ruleRegistry, ruleEngine, PHASE_0_RULES, PHASE_1_RULES, PHASE_2_RULES, PHASE_3_RULES };
