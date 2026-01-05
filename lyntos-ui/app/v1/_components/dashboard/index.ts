// ════════════════════════════════════════════════════════════════════════════
// LYNTOS Dashboard V2 - Component Exports
// ════════════════════════════════════════════════════════════════════════════

// Legacy components (for backward compatibility)
export { KpiGrid } from './KpiGrid';
export { VdkExpertPanel } from './VdkExpertPanel';
export { AiSuggestionsPanel } from './AiSuggestionsPanel';
export { InflationPanel } from './InflationPanel';
export { CrossCheckPanel } from './CrossCheckPanel';
export { MizanOmurgaPanel } from './MizanOmurgaPanel';
export { ActionQueuePanel } from './ActionQueuePanel';
export { RegWatchPanel } from './RegWatchPanel';
export { ErrorState } from './ErrorState';
export { FilterBar } from './FilterBar';

// Utilities
export { getHumanError, getSeverityStyles } from './utils/errorMessages';

export * from './types';

// ════════════════════════════════════════════════════════════════════════════
// V3 Dashboard Components - New modular architecture
// ════════════════════════════════════════════════════════════════════════════

// Constants
export * from './constants';

// Shared components
export * from './shared';

// Layout components
export * from './layout';

// KPI components
export * from './kpi';

// Operations components
export * from './operations';

// Deep dive components (explicit exports to avoid name collisions with legacy types)
export {
  Accordion,
  RiskDetailAccordion,
  TaxSummaryAccordion,
  CrossCheckAccordion,
  MizanAccordion,
  InflationAccordion,
} from './deepdive';
export type {
  RiskItem,
  RiskLevel,
  TaxSummaryData,
  TaxLineItem,
  CheckStatus,
  InflationItem,
  InflationSummary,
  MizanSummary,
} from './deepdive';
// Note: CrossCheckItem and MizanAccount are not re-exported to avoid collision with ./types

// Hooks
export * from './hooks';
