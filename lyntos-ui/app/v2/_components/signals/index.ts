/**
 * LYNTOS Signal Generator Module
 * Sprint 4.1 - Mizan Signal Generator
 * Sprint 4.2 - CrossCheck Signal Generator
 */

// ═══════════════════════════════════════════════════════════════════
// MIZAN SIGNAL GENERATOR (Sprint 4.1)
// ═══════════════════════════════════════════════════════════════════

export { generateMizanSignals, MIZAN_RULES } from './mizanSignalGenerator';
export {
  MOCK_MIZAN_HESAPLAR,
  MOCK_MIZAN_CONTEXT,
  calculateCiroFromMizan,
} from './mockMizanData';

// ═══════════════════════════════════════════════════════════════════
// CROSSCHECK SIGNAL GENERATOR (Sprint 4.2)
// ═══════════════════════════════════════════════════════════════════

export { generateCrossCheckSignals, CROSSCHECK_THRESHOLDS } from './crossCheckSignalGenerator';
export { MOCK_CROSSCHECK_ITEMS, MOCK_CROSSCHECK_CONTEXT } from './mockCrossCheckData';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type {
  // Mizan types
  MizanHesap,
  MizanContext,
  SignalResult,
  SignalRule,
  SignalCheckResult,
  // CrossCheck types
  CrossCheckItem,
  CrossCheckContext,
  CrossCheckResult,
  CrossCheckType,
} from './types';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export { MATERIALITY, VDK_RISK_HESAPLAR } from './types';
