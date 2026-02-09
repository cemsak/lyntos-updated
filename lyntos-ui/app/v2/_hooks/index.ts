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

// Note: useVDKAnalysis removed - use useVdkFullAnalysis instead

export { useDashboardData } from './useDashboardData';
export { useRightRailData } from './useRightRailData';
export { useCrossCheck } from './useCrossCheck';
export { useBackendFeed } from './useBackendFeed';

// VDK Full Analysis Hook (V2)
export { useVdkFullAnalysis } from './useVdkFullAnalysis';
export type {
  HesapKontrol,
  KategoriAnalizi,
  KurganSenaryo,
  TTK376Sonucu,
  OrtulSermayeSonucu,
  FinansmanGiderKisitlamasi,
  AcilAksiyon,
  RiskSummary,
  UrgentActions,
  VdkFullAnalysisData,
  VdkFullAnalysisState,
} from './useVdkFullAnalysis';
export {
  getRiskLevelColor,
  getRiskLevelBgColor,
  getScoreColor,
  getScoreBorderColor,
  getDurumColor,
  getAksiyonColor,
  getOncelikColor,
  KATEGORI_LABELS,
  AKSIYON_LABELS,
} from './useVdkFullAnalysis';

// AI Analysis Hooks
export {
  useAiAnalysis,
  useAiChat,
  useQuickSummary,
  useDetailedAnalysis,
  useIzahGenerator,
} from './useAiAnalysis';
export type {
  AnalysisType,
  AiAnalysisContext,
  AiAnalysisRequest,
  AiAnalysisResponse,
  AiAnalysisState,
  ChatMessage,
} from './useAiAnalysis';
export {
  getProviderLabel,
  getProviderIcon,
  formatCost,
  formatTokens,
} from './useAiAnalysis';
