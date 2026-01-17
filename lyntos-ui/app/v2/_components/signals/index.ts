/**
 * LYNTOS Signal Generator Module
 * Sprint 4.1 - Mizan Signal Generator
 * Sprint 4.2 - CrossCheck Signal Generator
 */

// ═══════════════════════════════════════════════════════════════════
// MIZAN SIGNAL GENERATOR (Sprint 4.1)
// ═══════════════════════════════════════════════════════════════════

export { generateMizanSignals, MIZAN_RULES } from './mizanSignalGenerator';
// MOCK_MIZAN_* exports KALDIRILDI - Mock data yasak

// ═══════════════════════════════════════════════════════════════════
// CROSSCHECK SIGNAL GENERATOR (Sprint 4.2)
// ═══════════════════════════════════════════════════════════════════

export { generateCrossCheckSignals, CROSSCHECK_THRESHOLDS } from './crossCheckSignalGenerator';
// MOCK_CROSSCHECK_* exports KALDIRILDI - Mock data yasak

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
