/**
 * LYNTOS VDK Validation Hook
 * Sends taxpayer data to backend for VDK rule evaluation
 */

import { useState, useCallback } from 'react';
import { TaxpayerData } from './dataAggregator';

// VDK Assessment result (matches backend output)
export interface VdkCriterionResult {
  id: string;
  code: string;
  name_tr: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  detail_tr: string;
  recommendation_tr?: string;
  evidence?: Record<string, unknown>;
  legal_refs?: string[];
}

export interface VdkAssessmentResult {
  vkn: string;
  period: string;
  assessed_at: string;
  criteria: VdkCriterionResult[];
  total_score: number;
  max_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary_tr: string;
}

export interface UseVdkValidationReturn {
  validate: (data: TaxpayerData) => Promise<VdkAssessmentResult | null>;
  result: VdkAssessmentResult | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

// API endpoint
const VDK_VALIDATE_ENDPOINT = '/api/v2/validate/vdk';

export function useVdkValidation(): UseVdkValidationReturn {
  const [result, setResult] = useState<VdkAssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (data: TaxpayerData): Promise<VdkAssessmentResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('lyntos_token') || 'DEV_HKOZKAN'
        : 'DEV_HKOZKAN';

      const response = await fetch(VDK_VALIDATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || `HTTP ${response.status}`);
      }

      const assessment = await response.json() as VdkAssessmentResult;
      setResult(assessment);
      return assessment;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { validate, result, loading, error, reset };
}
