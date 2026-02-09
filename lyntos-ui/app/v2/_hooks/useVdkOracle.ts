/**
 * LYNTOS VDK Oracle Hook
 * Birleşik VDK analizi: kurgan-risk + vdk-simulator
 *
 * GET /api/v1/contracts/vdk-oracle?client_id={clientId}&period={period}
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../_lib/auth';
import type {
  VdkFullAnalysisData,
} from './useVdkFullAnalysis';
import type { KurganAlarm, RequiredDocument } from '../_components/vdk-simulator/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SimulatorData {
  risk_score: number;
  risk_level: string;
  audit_probability: number;
  alarms: KurganAlarm[];
  triggered_count: number;
  total_documents: number;
  prepared_documents: number;
  simulated_at: string;
  error?: string;
}

export interface VdkOracleData extends VdkFullAnalysisData {
  simulator: SimulatorData;
}

export interface VdkOracleState {
  data: VdkOracleData | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useVdkOracle(
  clientId: string | null,
  period: string | null
): VdkOracleState & { refetch: () => Promise<void> } {
  const [data, setData] = useState<VdkOracleData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clientId || !period) {
      setData(null);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('Oturum bilgisi bulunamadı');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    const url = `/api/v1/contracts/vdk-oracle?client_id=${encodeURIComponent(clientId)}&period=${encodeURIComponent(period)}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: token },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setData(null);
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const responseData = result.data || result;

      // no_data durumu: Backend mizan verisi bulamadı
      if (responseData.status === 'no_data') {
        setData({
          status: 'no_data',
          message: responseData.message || 'Bu dönem için veri bulunamadı.',
          kurgan_risk: null,
          sektor_bilgisi: null,
          tcmb_verileri: null,
          mukellef_finansal_oranlari: null,
          risk_summary: null,
          urgent_actions: null,
          category_analysis: null,
          kurgan_scenarios: null,
          ttk_376: null,
          ortulu_sermaye: null,
          finansman_gider_kisitlamasi: null,
          muhtemel_cezalar: null,
          what_to_do: responseData.what_to_do || 'Lütfen dönem verilerini yükleyin',
          time_estimate: responseData.time_estimate || '-',
          vdk_reference: responseData.vdk_reference || '',
          effective_date: responseData.effective_date || '',
          simulator: {
            risk_score: 0,
            risk_level: 'unknown',
            audit_probability: 0,
            alarms: [],
            triggered_count: 0,
            total_documents: 0,
            prepared_documents: 0,
            simulated_at: '',
          },
        } as VdkOracleData);
        setIsLoading(false);
        return;
      }

      setData({
        status: 'ok',
        // Mevcut kurgan-risk verisi
        kurgan_risk: responseData.kurgan_risk,
        sektor_bilgisi: responseData.sektor_bilgisi || null,
        tcmb_verileri: responseData.tcmb_verileri || null,
        mukellef_finansal_oranlari: responseData.mukellef_finansal_oranlari || null,
        risk_summary: responseData.risk_summary || null,
        urgent_actions: responseData.urgent_actions || null,
        category_analysis: responseData.category_analysis || null,
        kurgan_scenarios: responseData.kurgan_scenarios || null,
        ttk_376: responseData.ttk_376 || null,
        ortulu_sermaye: responseData.ortulu_sermaye || null,
        finansman_gider_kisitlamasi: responseData.finansman_gider_kisitlamasi || null,
        muhtemel_cezalar: responseData.muhtemel_cezalar || null,
        what_to_do: responseData.what_to_do || '',
        time_estimate: responseData.time_estimate || '',
        vdk_reference: responseData.vdk_reference || '',
        effective_date: responseData.effective_date || '',
        // YENİ: Simulator verisi
        simulator: responseData.simulator || {
          risk_score: 0,
          risk_level: 'unknown',
          audit_probability: 0,
          alarms: [],
          triggered_count: 0,
          total_documents: 0,
          prepared_documents: 0,
          simulated_at: '',
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      console.error('[VdkOracle] Error:', errorMessage);
      setError(errorMessage);
      setIsError(true);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
  };
}

// ============================================================================
// INSPECTOR ANSWER HOOK
// ============================================================================

export interface InspectorAnswer {
  answer: string;
  question: string;
  alarm_code: string;
  category: string;
  model: string;
  tokens_used: number;
  processing_time_ms: number;
}

export interface InspectorAnswerState {
  answer: InspectorAnswer | null;
  isLoading: boolean;
  error: string | null;
}

export function useInspectorAnswer() {
  const [state, setState] = useState<InspectorAnswerState>({
    answer: null,
    isLoading: false,
    error: null,
  });

  const askQuestion = useCallback(async (
    clientId: string,
    period: string,
    question: string,
    alarmCode?: string,
    category?: string,
  ) => {
    setState({ answer: null, isLoading: true, error: null });

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        period: period,
        question: question,
      });
      if (alarmCode) params.set('alarm_code', alarmCode);
      if (category) params.set('category', category);

      const response = await fetch(`/api/v1/vdk-inspector/answer?${params.toString()}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setState({ answer: result.data, isLoading: false, error: null });
        return result.data;
      } else {
        throw new Error('Beklenmeyen yanıt formatı');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setState({ answer: null, isLoading: false, error: errorMessage });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ answer: null, isLoading: false, error: null });
  }, []);

  return { ...state, askQuestion, reset };
}
