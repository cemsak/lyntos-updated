'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { getAuthToken } from '../../_lib/auth';
import type { CrossCheckResultRaw, CrossCheckSummaryRaw } from '../_types/crossCheck';
import { getPreviousPeriod } from '../_lib/trendCalculator';

export function useCrossCheckData() {
  const { scope, selectedClient, selectedPeriod } = useDashboardScope();

  // Extract IDs from scope
  const tenantId = scope.smmm_id || '';
  const clientId = selectedClient?.id || '';
  const periodCode = selectedPeriod?.code || '';
  const hasScope = Boolean(tenantId && clientId && periodCode);

  const [summary, setSummary] = useState<CrossCheckSummaryRaw | null>(null);
  const [checks, setChecks] = useState<CrossCheckResultRaw[]>([]);
  const [previousChecks, setPreviousChecks] = useState<CrossCheckResultRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tenantId || !clientId || !periodCode) return;

    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();

      // Backend expects: /run/{period_id}?tenant_id=xxx&client_id=xxx
      const periodId = periodCode; // Use period code as period_id
      const baseUrl = API_ENDPOINTS.crossCheck.run(periodId);
      const url = `${baseUrl}?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`;

      // Fetch current period data
      const res = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': token } : {}),
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[useCrossCheckData] Error response:', res.status, errorText);
        throw new Error(`HTTP ${res.status}`);
      }

      const data: CrossCheckSummaryRaw = await res.json();
      setSummary(data);
      setChecks(data.checks || []);

      // Try to fetch previous period data for trend calculation (non-blocking)
      const prevPeriodCode = getPreviousPeriod(periodCode);
      if (prevPeriodCode) {
        try {
          const prevPeriodId = prevPeriodCode;
          const prevBaseUrl = API_ENDPOINTS.crossCheck.run(prevPeriodId);
          const prevUrl = `${prevBaseUrl}?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`;

          const prevRes = await fetch(prevUrl, {
            headers: {
              ...(token ? { 'Authorization': token } : {}),
              'Content-Type': 'application/json',
            },
          });

          if (prevRes.ok) {
            const prevData: CrossCheckSummaryRaw = await prevRes.json();
            setPreviousChecks(prevData.checks || []);
          } else {
            // Previous period not available - this is OK, just no trend data
            setPreviousChecks([]);
          }
        } catch {
          // Previous period fetch failed - non-critical, just skip trend
          setPreviousChecks([]);
        }
      } else {
        setPreviousChecks([]);
      }
    } catch (err) {
      console.error('[useCrossCheckData] Fetch error:', err);
      setError('Capraz kontrol verileri yuklenemedi');
      setSummary(null);
      setChecks([]);
      setPreviousChecks([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, clientId, periodCode]);

  useEffect(() => {
    if (hasScope) {
      fetchData();
    } else {
      setSummary(null);
      setChecks([]);
      setPreviousChecks([]);
      setLoading(false);
      setError(null);
    }
  }, [hasScope, fetchData]);

  return {
    summary,
    checks,
    previousChecks,
    loading,
    error,
    fetchData,
    clientId,
    periodCode,
    hasScope,
  };
}
