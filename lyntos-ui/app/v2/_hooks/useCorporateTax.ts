'use client';

import { useState, useCallback } from 'react';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { ENDPOINTS, buildScopedUrl } from '../_components/contracts/endpoints';
import { api } from '../_lib/api/client';

interface TicariKar {
  donem_kari: number;
  donem_zarari: number;
  net_donem_kari: number;
}

interface MaliKar {
  ticari_kar: number;
  kkeg: number;
  istisna_kazanclar: number;
  gecmis_zarar: number;
  mali_kar: number;
}

interface Indirimler {
  r_and_d: number;
  yatirim: number;
  bagis: number;
  sponsorluk: number;
}

interface Mahsuplar {
  gecici_vergi: number;
  yurtdisi_vergi: number;
}

export interface CorporateTaxData {
  ticari_kar: TicariKar;
  mali_kar: MaliKar;
  indirimler: Indirimler;
  matrah: number;
  vergi_orani: number;
  hesaplanan_vergi: number;
  mahsuplar: Mahsuplar;
  odenecek_vergi: number;
  iade_edilecek_vergi: number;
  legal_basis_refs: string[];
  trust_score: number;
}

interface ForecastData {
  senaryo: string;
  tahmini_ciro: number;
  tahmini_kar: number;
  tahmini_vergi: number;
  tahmini_net_kar: number;
  buyume_oranlari: {
    ciro: number;
    kar: number;
  };
  confidence: 'high' | 'medium' | 'low';
  aciklama: string;
}

interface UseCorporateTaxResult {
  data: CorporateTaxData | null;
  forecast: ForecastData | null;
  loading: boolean;
  error: string | null;
  scopeIncomplete: boolean;
  fetchTax: () => Promise<void>;
  fetchForecast: (scenario?: 'optimistic' | 'base' | 'pessimistic') => Promise<void>;
}

export function useCorporateTax(): UseCorporateTaxResult {
  const { scope } = useDashboardScope();
  const [data, setData] = useState<CorporateTaxData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeIncomplete = !scope.smmm_id || !scope.client_id || !scope.period;

  const fetchTax = useCallback(async () => {
    if (!scope.smmm_id || !scope.client_id || !scope.period) {
      return; // Scope eksik — hata değil, sayfa ScopeGuide gösterecek
    }

    setLoading(true);
    setError(null);

    try {
      const url = buildScopedUrl(ENDPOINTS.CORPORATE_TAX, {
        smmm_id: scope.smmm_id,
        client_id: scope.client_id,
        period: scope.period
      });

      const { data: json, error: apiError } = await api.get<{ data: CorporateTaxData }>(url);

      if (apiError || !json) {
        throw new Error(apiError || 'Kurumlar vergisi verisi alinamadi');
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  const fetchForecast = useCallback(async (scenario: 'optimistic' | 'base' | 'pessimistic' = 'base') => {
    if (!scope.smmm_id || !scope.client_id || !scope.period) {
      return;
    }

    try {
      const url = buildScopedUrl(ENDPOINTS.CORPORATE_TAX_FORECAST, {
        smmm_id: scope.smmm_id,
        client_id: scope.client_id,
        period: scope.period
      });

      const { data: json, error: apiError } = await api.get<{ data: ForecastData }>(
        url,
        { params: { scenario } }
      );

      if (apiError || !json) {
        throw new Error(apiError || 'Tahmin verisi alinamadi');
      }

      setForecast(json.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Tahmin verisi alinamadi';
      setError(errorMessage);
    }
  }, [scope]);

  return { data, forecast, loading, error, scopeIncomplete, fetchTax, fetchForecast };
}
