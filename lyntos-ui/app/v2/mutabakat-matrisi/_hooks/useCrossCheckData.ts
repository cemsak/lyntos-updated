'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { api } from '../../_lib/api/client';
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
      // Backend expects: /run/{period_id}?tenant_id=xxx&client_id=xxx
      const periodId = periodCode;

      // Fetch current period data
      const res = await api.get<CrossCheckSummaryRaw>(
        API_ENDPOINTS.crossCheck.run(periodId),
        { params: { tenant_id: tenantId, client_id: clientId } }
      );

      if (!res.ok || !res.data) {
        console.error('[useCrossCheckData] Error response:', res.status, res.error);
        throw new Error(res.error || `Cross-check API failed`);
      }

      const data = res.data;
      setSummary(data);
      setChecks(data.checks || []);

      // Try to fetch previous period data for trend calculation (non-blocking)
      const prevPeriodCode = getPreviousPeriod(periodCode);
      if (prevPeriodCode) {
        try {
          const prevRes = await api.get<CrossCheckSummaryRaw>(
            API_ENDPOINTS.crossCheck.run(prevPeriodCode),
            { params: { tenant_id: tenantId, client_id: clientId } }
          );

          if (prevRes.ok && prevRes.data) {
            setPreviousChecks(prevRes.data.checks || []);
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
