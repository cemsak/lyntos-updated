/**
 * VERGUS Tax Strategist Module Exports
 * Sprint 9.0 - LYNTOS V2
 */

// Components
export { VergusStrategistPanel } from './VergusStrategistPanel';
export { OpportunityCard } from './OpportunityCard';
export { FinancialDataForm } from './FinancialDataForm';

// Hooks
export { useVergusAnalysis } from './useVergusAnalysis';

// Types
export type {
  Priority,
  Difficulty,
  RiskLevel,
  Category,
  TaxOpportunity,
  ClientProfile,
  AnalysisSummary,
  TaxAnalysisResult,
  FinancialDataInput,
} from './types';

export {
  PRIORITY_CONFIG,
  DIFFICULTY_CONFIG,
  CATEGORY_CONFIG,
} from './types';
