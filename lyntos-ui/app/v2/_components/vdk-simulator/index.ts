/**
 * VDK Simulator Module Exports
 * Sprint 8.0 - LYNTOS V2
 */

// Components
export { VDKSimulatorPanel } from './VDKSimulatorPanel';
export { KurganAlarmCard } from './KurganAlarmCard';

// Hooks
export { useVDKSimulator } from './useVDKSimulator';

// Types
export type {
  RiskLevel,
  Severity,
  DocumentPriority,
  RequiredDocument,
  KurganAlarm,
  SimulationResult,
  SimulationResponse,
  RulesResponse,
  RuleSummary,
} from './types';

export {
  SEVERITY_CONFIG,
  RISK_LEVEL_CONFIG,
  CATEGORY_LABELS,
  PRIORITY_CONFIG,
} from './types';
