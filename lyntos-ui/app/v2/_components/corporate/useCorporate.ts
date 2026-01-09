'use client';

/**
 * LYNTOS Corporate Law API Hooks
 * Sprint S2 - Sirketler Hukuku
 *
 * Handles API calls for corporate law module
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  CorporateEventType,
  TTK376Request,
  TTK376Analysis,
  MinCapitalRequirements,
  GKQuorumGuide,
} from './types';

// Hook: Get all event types
export function useEventTypes(companyType?: string) {
  const [data, setData] = useState<CorporateEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (companyType) params.set('company_type', companyType);

        const res = await fetch(`/api/v1/corporate/event-types?${params}`, {
          headers: { Authorization: 'DEV_HKOZKAN' },
        });

        if (!res.ok) throw new Error('Islem tipleri yuklenemedi');

        const json = await res.json();
        setData(json.data?.event_types || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyType]);

  return { data, loading, error };
}

// Hook: Get single event type
export function useEventType(eventCode: string | null) {
  const [data, setData] = useState<CorporateEventType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventCode) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/corporate/event-types/${eventCode}`, {
          headers: { Authorization: 'DEV_HKOZKAN' },
        });

        if (!res.ok) throw new Error('Islem tipi bulunamadi');

        const json = await res.json();
        setData(json.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventCode]);

  return { data, loading, error };
}

// Hook: TTK 376 Analysis
export function useTTK376Analysis() {
  const [result, setResult] = useState<TTK376Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (request: TTK376Request) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/v1/corporate/ttk376-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'DEV_HKOZKAN',
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) throw new Error('Analiz basarisiz');

      const json = await res.json();
      const analysis = json.data?.analysis || null;
      setResult(analysis);
      return analysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, analyze, reset };
}

// Hook: Min capital requirements
export function useMinCapitalRequirements() {
  const [data, setData] = useState<MinCapitalRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/corporate/min-capital-requirements', {
          headers: { Authorization: 'DEV_HKOZKAN' },
        });

        if (!res.ok) throw new Error('Sermaye gereksinimleri yuklenemedi');

        const json = await res.json();
        setData(json.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

// Hook: GK Quorum Guide
export function useGKQuorumGuide() {
  const [data, setData] = useState<GKQuorumGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/corporate/gk-quorum-guide', {
          headers: { Authorization: 'DEV_HKOZKAN' },
        });

        if (!res.ok) throw new Error('Nisap rehberi yuklenemedi');

        const json = await res.json();
        setData(json.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
