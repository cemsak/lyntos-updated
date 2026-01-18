'use client';

/**
 * LYNTOS Aksiyonlar Hook
 * Sprint MOCK-006 - Mock data removed, uses only API data
 *
 * Fetches actionable tasks from backend - no mock fallback
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboardScope, useScopeComplete } from '../scope/useDashboardScope';
import { ENDPOINTS, buildScopedUrl } from '../contracts/endpoints';
import type { AksiyonItem, AksiyonOncelik, AksiyonKaynak, AksiyonTipi } from './types';

interface UseAksiyonlarResult {
  aksiyonlar: AksiyonItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface ApiTask {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  icon?: string;
  title: string;
  what: string;
  why_important?: string;
  what_happens?: string;
  what_to_do?: string[];
  buttons?: Array<{
    label: string;
    action: string;
    style?: string;
  }>;
  time_estimate?: string;
  deadline?: string;
  kurgan_impact?: string;
}

interface ApiResponse {
  data?: {
    tasks?: ApiTask[];
    summary?: {
      total_tasks: number;
      high_priority: number;
      medium_priority: number;
      low_priority: number;
    };
  };
  errors?: string[];
}

function mapPriority(priority: string): AksiyonOncelik {
  switch (priority.toUpperCase()) {
    case 'HIGH':
      return 'acil';
    case 'MEDIUM':
      return 'normal';
    case 'LOW':
    default:
      return 'bilgi';
  }
}

function inferKaynak(id: string, title: string): AksiyonKaynak {
  const idLower = id.toLowerCase();
  const titleLower = title.toLowerCase();

  if (idLower.includes('infl') || titleLower.includes('enflasyon')) {
    return 'eksik_belge';
  }
  if (idLower.includes('vdk') || titleLower.includes('risk')) {
    return 'vdk_risk';
  }
  if (idLower.includes('reg') || titleLower.includes('mevzuat')) {
    return 'regwatch';
  }
  if (idLower.includes('mutabakat') || titleLower.includes('mutabakat')) {
    return 'mutabakat';
  }
  if (titleLower.includes('beyan') || titleLower.includes('kdv') || titleLower.includes('vergi')) {
    return 'vergi_takvimi';
  }

  return 'hatirlatma';
}

function inferAksiyonTipi(action: string | undefined, title: string): AksiyonTipi {
  const actionLower = (action || '').toLowerCase();
  const titleLower = title.toLowerCase();

  if (actionLower.includes('email') || actionLower.includes('send')) {
    return 'hazirla';
  }
  if (actionLower.includes('upload') || titleLower.includes('yukle') || titleLower.includes('eksik')) {
    return 'yukle';
  }
  if (actionLower.includes('detail') || titleLower.includes('incele')) {
    return 'incele';
  }
  if (titleLower.includes('oku') || titleLower.includes('mevzuat')) {
    return 'oku';
  }
  if (titleLower.includes('onayla')) {
    return 'onayla';
  }

  return 'incele';
}

function parseTimeEstimate(estimate: string | undefined): number {
  if (!estimate) return 15;

  const match = estimate.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return 15;
}

function parseDeadline(deadline: string | undefined): { sonTarih?: Date; kalanGun?: number } {
  if (!deadline) return {};

  // Format: "3 is gunu (12.01.2026)"
  const dayMatch = deadline.match(/(\d+)\s*is\s*gunu/i);
  const dateMatch = deadline.match(/\((\d{2})\.(\d{2})\.(\d{4})\)/);

  const result: { sonTarih?: Date; kalanGun?: number } = {};

  if (dayMatch) {
    result.kalanGun = parseInt(dayMatch[1], 10);
  }

  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    result.sonTarih = new Date(`${year}-${month}-${day}`);
  }

  return result;
}

function mapApiTaskToAksiyon(task: ApiTask, clientId: string): AksiyonItem {
  const kaynak = inferKaynak(task.id, task.title);
  const primaryButton = task.buttons?.[0];
  const aksiyonTipi = inferAksiyonTipi(primaryButton?.action, task.title);
  const { sonTarih, kalanGun } = parseDeadline(task.deadline);

  // Build action URL based on task type
  let aksiyonUrl = '/v2';
  if (kaynak === 'eksik_belge') {
    aksiyonUrl = '/v2/enflasyon/upload';
  } else if (kaynak === 'vdk_risk') {
    aksiyonUrl = `/v2/vdk/${task.id}`;
  } else if (kaynak === 'vergi_takvimi') {
    aksiyonUrl = '/v2/beyan/kdv';
  } else if (kaynak === 'mutabakat') {
    aksiyonUrl = '/v2/mutabakat/cari';
  } else if (kaynak === 'regwatch') {
    aksiyonUrl = `/v2/regwatch/${task.id}`;
  }

  return {
    id: task.id,
    baslik: task.title,
    aciklama: task.what,
    detay: task.why_important,
    mukellef: {
      id: clientId,
      ad: clientId,
    },
    oncelik: mapPriority(task.priority),
    kaynak,
    sonTarih,
    kalanGun,
    tahminiDakika: parseTimeEstimate(task.time_estimate),
    aksiyonTipi,
    aksiyonUrl,
    aksiyonLabel: primaryButton?.label || 'Detay',
    olusturmaTarihi: new Date(),
  };
}

export function useAksiyonlar(): UseAksiyonlarResult {
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();
  const [aksiyonlar, setAksiyonlar] = useState<AksiyonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAksiyonlar = useCallback(async () => {
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // If scope not complete, show empty state
    if (!scopeComplete) {
      setAksiyonlar([]);
      setLoading(false);
      setError('Aksiyon listesi icin mukellef ve donem secin');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const url = buildScopedUrl(ENDPOINTS.ACTIONABLE_TASKS, {
        smmm_id: scope.smmm_id,
        client_id: scope.client_id,
        period: scope.period,
      });

      const token = typeof window !== 'undefined'
        ? localStorage.getItem('lyntos_token')
        : null;
      if (!token) {
        // Token yoksa empty state göster
        setAksiyonlar([]);
        setLoading(false);
        return;
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors.join(', '));
      }

      const tasks = data.data?.tasks || [];

      if (tasks.length === 0) {
        // No tasks from API, return empty array (not mock)
        setAksiyonlar([]);
        setError(null);
      } else {
        const mapped = tasks.map(task => mapApiTaskToAksiyon(task, scope.client_id));
        setAksiyonlar(mapped);
        setError(null);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }

      console.error('[useAksiyonlar] Fetch failed:', err);
      setAksiyonlar([]);
      setError('Aksiyon verileri yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, [scope.smmm_id, scope.client_id, scope.period, scopeComplete]);

  useEffect(() => {
    fetchAksiyonlar();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchAksiyonlar]);

  return {
    aksiyonlar,
    loading,
    error,
    refresh: fetchAksiyonlar,
  };
}
