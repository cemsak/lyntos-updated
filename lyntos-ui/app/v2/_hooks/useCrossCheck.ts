/**
 * LYNTOS Cross-Check Hook
 * Fetches cross-check results from backend v2 API
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============== TYPES ==============

export type CheckStatus = 'pass' | 'fail' | 'warning' | 'skipped' | 'no_data';
export type CheckSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface CrossCheckResult {
  check_id: string;
  check_name: string;
  check_name_tr: string;
  description: string;
  status: CheckStatus;
  severity: CheckSeverity;
  source_label: string;
  source_value: number;
  target_label: string;
  target_value: number;
  difference: number;
  difference_percent: number;
  tolerance_amount: number;
  tolerance_percent: number;
  message: string;
  recommendation?: string;
  evidence?: Record<string, unknown>;
}

export interface CrossCheckSummary {
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
  overall_status: CheckStatus;
  completion_percent: number;
  checks: CrossCheckResult[];
  checked_at: string;
  recommended_actions: string[];
}

export interface CrossCheckState {
  data: CrossCheckSummary | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

// ============== API CONFIG ==============

import { API_BASE_URL } from '../_lib/config/api';

// ============== HOOK ==============

export function useCrossCheck(
  period: string | null,
  tenantId: string = 'default',
  clientId: string = 'default'
): CrossCheckState & {
  runChecks: () => Promise<void>;
  overallStatus: CheckStatus;
  passedCount: number;
  failedCount: number;
  criticalCount: number;
  checks: CrossCheckResult[];
  actions: string[];
} {
  const [data, setData] = useState<CrossCheckSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runChecks = useCallback(async () => {
    if (!period) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    const url = `${API_BASE_URL}/api/v2/cross-check/run/${encodeURIComponent(period)}?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: CrossCheckSummary = await response.json();
      setData(result);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kontroller calistirilamadi';
      setError(errorMessage);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [period, tenantId, clientId]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  return {
    data,
    isLoading,
    isError,
    error,
    runChecks,
    // Convenience accessors
    overallStatus: data?.overall_status || 'no_data',
    passedCount: data?.passed || 0,
    failedCount: data?.failed || 0,
    criticalCount: data?.critical_issues || 0,
    checks: data?.checks || [],
    actions: data?.recommended_actions || [],
  };
}

// ============== QUICK STATUS HOOK ==============

export interface CrossCheckQuickStatus {
  period_id: string;
  overall_status: CheckStatus;
  passed: number;
  failed: number;
  warnings: number;
  completion_percent: number;
  critical_issues: number;
}

export function useCrossCheckStatus(
  period: string | null,
  tenantId: string = 'default',
  clientId: string = 'default'
): {
  status: CrossCheckQuickStatus | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
} {
  const [status, setStatus] = useState<CrossCheckQuickStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    if (!period) {
      setStatus(null);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    const url = `${API_BASE_URL}/api/v2/cross-check/status/${encodeURIComponent(period)}?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: CrossCheckQuickStatus = await response.json();
      setStatus(result);

    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [period, tenantId, clientId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    isError,
    refetch: fetchStatus,
  };
}

export default useCrossCheck;
