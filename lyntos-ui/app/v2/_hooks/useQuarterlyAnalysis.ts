/**
 * LYNTOS Quarterly Analysis Hook
 * ZIP upload → Backend ingest → Backend cross-check → Results
 *
 * Pencere 3: Frontend parse kaldırıldı, tüm işlem backend'de yapılıyor.
 * - POST /api/v2/ingest → ZIP upload + parse
 * - GET /api/v2/cross-check/run/{period_id} → çapraz kontrol
 */

'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '../_lib/config/api';
import { api } from '../_lib/api/client';
import type {
  EngineCheckReport,
  EngineCheckResult,
  EngineCheckSummary,
  CheckSeverity,
  CheckStatus,
} from '../_lib/parsers/crosscheck/types';

// ============================================================================
// TYPES
// ============================================================================

export type AnalysisPhase =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'checking'
  | 'complete'
  | 'error';

export interface FileStats {
  total: number;
  detected: number;
  parsed: number;
  failed: number;
}

/**
 * Minimal parsed data — backend handles actual parsing.
 * Interface kept compatible with manifestGenerator which reads parseInfo.kaynak.
 */
interface ParseInfo { parseInfo: { kaynak: string } }
export interface ParsedData {
  mizan: ParseInfo | null;
  yevmiye: ParseInfo | null;
  kebir: ParseInfo | null;
  edefter: ParseInfo[];
  kdv: ParseInfo[];
  muhtasar: ParseInfo[];
  geciciVergi: ParseInfo[];
  banka: ParseInfo[];
}

export interface AnalysisState {
  phase: AnalysisPhase;
  progress: number;
  currentFile: string;
  fileStats: FileStats;
  parsedData: ParsedData;
  checkReport: EngineCheckReport | null;
  error: string | null;
  startTime: number | null;
  endTime: number | null;
  isAutoLoading: boolean;
}

const emptyParsedData: ParsedData = {
  mizan: null,
  yevmiye: null,
  kebir: null,
  edefter: [],
  kdv: [],
  muhtasar: [],
  geciciVergi: [],
  banka: [],
};

const initialState: AnalysisState = {
  phase: 'idle',
  progress: 0,
  currentFile: '',
  fileStats: { total: 0, detected: 0, parsed: 0, failed: 0 },
  parsedData: emptyParsedData,
  checkReport: null,
  error: null,
  startTime: null,
  endTime: null,
  isAutoLoading: false,
};

// ============================================================================
// BACKEND RESPONSE TYPES
// ============================================================================

interface BackendCrossCheckResult {
  check_id: string;
  check_name: string;
  check_name_tr: string;
  description: string;
  status: string;
  severity: string;
  source_label: string;
  source_value: number;
  target_label: string;
  target_value: number;
  difference: number;
  difference_percent: number;
  tolerance_amount: number;
  tolerance_percent: number;
  message: string;
  recommendation?: string | null;
  evidence?: Record<string, unknown> | null;
}

interface BackendCrossCheckSummary {
  period_id: string;
  tenant_id: string;
  client_id: string;
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  no_data: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  overall_status: string;
  completion_percent: number;
  checks: BackendCrossCheckResult[];
  checked_at: string;
  recommended_actions: string[];
}

interface IngestResponse {
  success: boolean;
  session_id: string;
  statistics?: {
    total_files?: number;
    new_files?: number;
    duplicate_files?: number;
    period_mismatch_files?: number;
    total_parsed_rows?: number;
    // Legacy
    new_blobs?: number;
    duplicate_blobs?: number;
    new_canonical?: number;
    duplicate_canonical?: number;
  };
  files?: Array<{
    filename: string;
    doc_type: string;
    is_duplicate: boolean;
    parsed_row_count: number;
    status: string;
    message: string;
  }>;
  parse_results?: Array<{
    doc_type: string;
    status: string;
    row_count?: number;
    error?: string;
  }>;
}

// ============================================================================
// ADAPTER: Backend CrossCheckSummary → Frontend EngineCheckReport
// ============================================================================

function mapBackendStatus(status: string): CheckStatus {
  switch (status) {
    case 'pass': return 'pass';
    case 'fail': return 'fail';
    case 'warning': return 'partial';
    case 'skipped': return 'skip';
    case 'no_data': return 'skip';
    default: return 'skip';
  }
}

function mapBackendSeverity(severity: string): CheckSeverity {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'critical';
    case 'medium':
      return 'warning';
    case 'low':
    case 'info':
      return 'info';
    default:
      return 'info';
  }
}

function mapCheckCategory(checkId: string): string {
  if (checkId.includes('kdv') || checkId.includes('191') || checkId.includes('600')) return 'kdv';
  if (checkId.includes('muhtasar') || checkId.includes('sgk')) return 'muhtasar';
  if (checkId.includes('banka')) return 'banka';
  if (checkId.includes('denklik') || checkId.includes('TECH')) return 'yevmiye';
  if (checkId.includes('beyanname') || checkId.includes('tahakkuk')) return 'kdv';
  if (checkId.includes('efatura')) return 'edefter';
  return 'kdv';
}

function adaptBackendToReport(backend: BackendCrossCheckSummary, durationMs: number): EngineCheckReport {
  const results: EngineCheckResult[] = backend.checks.map(check => {
    const status = mapBackendStatus(check.status);
    const severity = mapBackendSeverity(check.severity);
    const category = mapCheckCategory(check.check_id);

    return {
      ruleId: check.check_id.toUpperCase().replace(/_/g, '-'),
      ruleName: check.check_name_tr || check.check_name,
      category,
      status,
      severity,
      expected: check.source_value,
      actual: check.target_value,
      difference: check.difference,
      toleranceUsed: check.tolerance_amount,
      evidenceA: {
        source: check.source_label,
        field: check.source_label,
        value: check.source_value,
      },
      evidenceB: {
        source: check.target_label,
        field: check.target_label,
        value: check.target_value,
      },
      message: check.message,
      suggestion: check.recommendation ?? undefined,
      checkTime: backend.checked_at,
    };
  });

  // Build summary
  const categories: EngineCheckSummary['categories'] = {
    kdv: { total: 0, passed: 0, failed: 0 },
    muhtasar: { total: 0, passed: 0, failed: 0 },
    banka: { total: 0, passed: 0, failed: 0 },
    yevmiye: { total: 0, passed: 0, failed: 0 },
    edefter: { total: 0, passed: 0, failed: 0 },
  };

  for (const r of results) {
    const cat = r.category as keyof typeof categories;
    if (categories[cat]) {
      categories[cat].total++;
      if (r.status === 'pass') categories[cat].passed++;
      if (r.status === 'fail') categories[cat].failed++;
    }
  }

  const summary: EngineCheckSummary = {
    totalChecks: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    skipped: results.filter(r => r.status === 'skip').length,
    partial: results.filter(r => r.status === 'partial').length,
    criticalIssues: backend.critical_issues + backend.high_issues,
    warnings: backend.warnings,
    categories,
  };

  // Group by
  const byCategory: Record<string, EngineCheckResult[]> = {};
  const bySeverity: Record<CheckSeverity, EngineCheckResult[]> = { critical: [], warning: [], info: [] };
  const byStatus: Record<CheckStatus, EngineCheckResult[]> = { pass: [], fail: [], skip: [], partial: [] };

  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category].push(r);
    bySeverity[r.severity].push(r);
    byStatus[r.status].push(r);
  }

  return {
    vkn: null,
    unvan: null,
    donem: backend.period_id,
    checkTime: backend.checked_at,
    checkDurationMs: durationMs,
    summary,
    results,
    byCategory,
    bySeverity,
    byStatus,
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useQuarterlyAnalysis() {
  const [state, setState] = useState<AnalysisState>(initialState);

  const updateState = useCallback((updates: Partial<AnalysisState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Upload ZIP to backend ingest, then run cross-checks
   */
  const analyzeZip = useCallback(async (
    file: File,
    opts?: { clientId?: string; period?: string; tenantId?: string }
  ) => {
    const startTime = Date.now();
    const clientId = opts?.clientId || 'default';
    const period = opts?.period || `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
    const tenantId = opts?.tenantId || 'default';

    try {
      // Phase 1: Upload to backend ingest
      updateState({
        phase: 'uploading',
        progress: 10,
        currentFile: file.name,
        startTime,
        error: null,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_id', clientId);
      formData.append('period', period);
      formData.append('tenant_id', tenantId);

      const { data: ingestData, error: ingestError } = await api.post<IngestResponse>(
        API_ENDPOINTS.ingest.upload, formData, { timeout: 120_000 }
      );

      if (ingestError || !ingestData) {
        throw new Error(`Ingest hatasi: ${ingestError || 'Veri alinamadi'}`);
      }

      // Update file stats from ingest response
      const parseResults = ingestData.parse_results || [];
      const parsedOk = parseResults.filter(r => r.status === 'success').length;
      const parsedFail = parseResults.filter(r => r.status !== 'success').length;

      updateState({
        phase: 'parsing',
        progress: 50,
        currentFile: 'Backend parse tamamlandi...',
        fileStats: {
          total: ingestData.statistics?.total_files || 0,
          detected: parseResults.length,
          parsed: parsedOk,
          failed: parsedFail,
        },
      });

      // Phase 2: Run cross-checks via backend
      updateState({
        phase: 'checking',
        progress: 70,
        currentFile: 'Capraz kontroller...',
      });

      const { data: ccData, error: ccError } = await api.get<BackendCrossCheckSummary>(
        API_ENDPOINTS.crossCheck.run(period),
        { params: { tenant_id: tenantId, client_id: clientId } }
      );

      if (ccError || !ccData) {
        throw new Error(`Cross-check hatasi: ${ccError || 'Veri alinamadi'}`);
      }

      // Phase 3: Adapt backend response to frontend EngineCheckReport
      const endTime = Date.now();
      const checkReport = adaptBackendToReport(ccData, endTime - startTime);

      updateState({
        phase: 'complete',
        progress: 100,
        currentFile: '',
        checkReport,
        endTime,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      updateState({
        phase: 'error',
        error: errorMessage,
        endTime: Date.now(),
      });
    }
  }, [updateState]);

  /**
   * Mevcut backend verilerinden otomatik yükleme.
   * Scope'dan (header dropdown) gelen client+period bilgisiyle:
   * 1. Mizan verisi var mı kontrol et
   * 2. Varsa cross-check sonuçlarını çek ve göster
   */
  const loadExistingResults = useCallback(async (
    clientId: string, period: string, tenantId: string
  ): Promise<boolean> => {
    try {
      updateState({ isAutoLoading: true });

      // 1. Mizan verisi var mi?
      const { data: checkData, ok: checkOk } = await api.get<{ exists: boolean }>(
        API_ENDPOINTS.mizanData.check,
        { params: { client_id: clientId, period_id: period } }
      );

      if (!checkOk || !checkData?.exists) {
        updateState({ isAutoLoading: false });
        return false;
      }

      // 2. Cross-check sonuclarini cek
      updateState({
        phase: 'checking',
        progress: 50,
        currentFile: 'Mevcut veriler yukleniyor...',
      });

      const { data: ccData, ok: ccOk } = await api.get<BackendCrossCheckSummary>(
        API_ENDPOINTS.crossCheck.run(period),
        { params: { tenant_id: tenantId, client_id: clientId } }
      );

      if (!ccOk || !ccData) {
        updateState({ phase: 'idle', progress: 0, currentFile: '', isAutoLoading: false });
        return false;
      }
      const checkReport = adaptBackendToReport(ccData, 0);

      updateState({
        phase: 'complete',
        progress: 100,
        currentFile: '',
        checkReport,
        isAutoLoading: false,
        endTime: Date.now(),
      });
      return true;

    } catch {
      updateState({ phase: 'idle', progress: 0, currentFile: '', isAutoLoading: false });
      return false;
    }
  }, [updateState]);

  return {
    ...state,
    analyzeZip,
    loadExistingResults,
    reset,
    isIdle: state.phase === 'idle',
    isAutoLoading: state.isAutoLoading,
    isProcessing: ['uploading', 'parsing', 'checking'].includes(state.phase) && !state.isAutoLoading,
    isComplete: state.phase === 'complete',
    isError: state.phase === 'error',
    duration: state.startTime && state.endTime ? state.endTime - state.startTime : null,
  };
}
