export { useQuarterlyAnalysis } from './useQuarterlyAnalysis';

// NEW: Unified Dönem Data Hook - TEK KAYNAK
export {
  useDonemData,
  useDonemMizan,
  useDonemVdkRisks,
  useDonemFiles,
  useDonemMeta,
} from './useDonemData';
export type {
  DonemData,
  DonemMeta,
  DonemFileSummary,
  DonemAnalysis,
  VdkRiskItem,
  MizanSummary,
  MizanHesap,
  UseDonemDataReturn,
} from './useDonemData';
export type {
  AnalysisPhase,
  AnalysisState,
  FileStats,
  ParsedData
} from './useQuarterlyAnalysis';

export { useVDKAnalysis } from './useVDKAnalysis';
export type {
  KriterDurum,
  KriterDurumu,
  VDKAlarm,
  VDKAnalysisResult,
  VDKState
} from './useVDKAnalysis';

export { useDashboardData } from './useDashboardData';
export { useRightRailData } from './useRightRailData';
export { useCrossCheck } from './useCrossCheck';
export { useBackendFeed } from './useBackendFeed';
