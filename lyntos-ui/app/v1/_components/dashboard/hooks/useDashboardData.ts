'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseDashboardDataOptions {
  smmm: string;
  clientId: string;
  period: string;
  enabled?: boolean;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function createFetchHook<T>(endpoint: string) {
  return function useFetchData(options: UseDashboardDataOptions): FetchState<T> & { refetch: () => void } {
    const [state, setState] = useState<FetchState<T>>({
      data: null,
      loading: false,
      error: null,
    });

    const fetchData = useCallback(async () => {
      if (!options.clientId || !options.period || options.enabled === false) {
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const params = new URLSearchParams({
          client_id: options.clientId,
          period: options.period,
        });

        const response = await fetch('/api/v1/contracts/' + endpoint + '?' + params, {
          headers: { 'Authorization': 'DEV_' + options.smmm }
        });

        if (!response.ok) {
          throw new Error(String(response.status));
        }

        const data = await response.json();
        setState({ data, loading: false, error: null });
      } catch (err) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Beklenmeyen hata',
        });
      }
    }, [options.smmm, options.clientId, options.period, options.enabled]);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    return { ...state, refetch: fetchData };
  };
}

export const usePortfolio = createFetchHook('portfolio');
export const useKurganRisk = createFetchHook('kurgan-risk');
export const useQuarterlyTax = createFetchHook('quarterly-tax');
export const useCorporateTax = createFetchHook('corporate-tax');
export const useCrossCheck = createFetchHook('cross-check');
export const useDataQuality = createFetchHook('data-quality');
export const useActionableTasks = createFetchHook('actionable-tasks');
export const useMizanAnalysis = createFetchHook('mizan-analysis');
export const useInflationAdjustment = createFetchHook('inflation-adjustment');
export const useRegwatchStatus = createFetchHook('regwatch');
export const usePeriodCompleteness = createFetchHook('period-completeness');

export function useDashboardData(options: UseDashboardDataOptions) {
  const portfolio = usePortfolio(options);
  const kurganRisk = useKurganRisk(options);
  const quarterlyTax = useQuarterlyTax(options);
  const corporateTax = useCorporateTax(options);
  const crossCheck = useCrossCheck(options);
  const dataQuality = useDataQuality(options);
  const actionableTasks = useActionableTasks(options);
  const mizanAnalysis = useMizanAnalysis(options);
  const inflationAdjustment = useInflationAdjustment(options);
  const regwatchStatus = useRegwatchStatus(options);
  const periodCompleteness = usePeriodCompleteness(options);

  const isLoading = portfolio.loading || kurganRisk.loading || crossCheck.loading;

  const refetchAll = useCallback(() => {
    portfolio.refetch();
    kurganRisk.refetch();
    quarterlyTax.refetch();
    corporateTax.refetch();
    crossCheck.refetch();
    dataQuality.refetch();
    actionableTasks.refetch();
    mizanAnalysis.refetch();
    inflationAdjustment.refetch();
    regwatchStatus.refetch();
    periodCompleteness.refetch();
  }, []);

  return {
    portfolio,
    kurganRisk,
    quarterlyTax,
    corporateTax,
    crossCheck,
    dataQuality,
    actionableTasks,
    mizanAnalysis,
    inflationAdjustment,
    regwatchStatus,
    periodCompleteness,
    isLoading,
    refetchAll,
  };
}

export default useDashboardData;
