'use client';
/**
 * LYNTOS Risk Review Queue Hook
 * Sprint MOCK-006: Connects to real API with fail-soft pattern
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../../_lib/auth';
import type { RiskReviewItem, RiskQueueStats, RiskLevel } from './types';
import { getRiskLevelFromScore } from './types';

interface UseRiskReviewQueueResult {
  items: RiskReviewItem[];
  stats: RiskQueueStats;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// API response types
interface ApiRiskItem {
  id: string;
  client_id: string;
  client_name: string;
  client_vkn?: string;
  sector?: string;
  period: string;
  risk_score: number;
  risk_level?: string;
  risk_factors?: ApiRiskFactor[];
  status?: string;
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
  ai_suggestion?: string;
}

interface ApiRiskFactor {
  id: string;
  code: string;
  title: string;
  description: string;
  multiplier: number;
  value: string | number;
  threshold: string | number;
  unit?: string;
  level: string;
}

interface ApiQueueResponse {
  items: ApiRiskItem[];
  stats?: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    pending: number;
  };
}

// Map API risk level to internal type
function mapRiskLevel(level?: string, score?: number): RiskLevel {
  if (level) {
    const normalized = level.toLowerCase();
    if (normalized === 'kritik' || normalized === 'critical') return 'kritik';
    if (normalized === 'yuksek' || normalized === 'high') return 'yuksek';
    if (normalized === 'orta' || normalized === 'medium') return 'orta';
    if (normalized === 'dusuk' || normalized === 'low') return 'dusuk';
  }
  return score ? getRiskLevelFromScore(score) : 'orta';
}

// Map API item to internal type
function mapApiItemToRiskItem(apiItem: ApiRiskItem): RiskReviewItem {
  return {
    id: apiItem.id,
    mukellefId: apiItem.client_id,
    mukellefAdi: apiItem.client_name,
    mukellefVkn: apiItem.client_vkn,
    sektor: apiItem.sector,
    donem: apiItem.period,
    riskSkoru: apiItem.risk_score,
    riskLevel: mapRiskLevel(apiItem.risk_level, apiItem.risk_score),
    topRiskFactors: (apiItem.risk_factors || []).map(f => ({
      id: f.id,
      kod: f.code,
      baslik: f.title,
      aciklama: f.description,
      multiplier: f.multiplier,
      deger: f.value,
      esik: f.threshold,
      birim: f.unit,
      seviye: mapRiskLevel(f.level) as RiskLevel,
    })),
    status: (apiItem.status as RiskReviewItem['status']) || 'pending',
    assignedTo: apiItem.assigned_to,
    createdAt: apiItem.created_at || new Date().toISOString(),
    updatedAt: apiItem.updated_at,
    aiOnerisi: apiItem.ai_suggestion,
  };
}

// Calculate stats from items
function calculateStats(items: RiskReviewItem[]): RiskQueueStats {
  return {
    toplam: items.length,
    kritik: items.filter(r => r.riskLevel === 'kritik').length,
    yuksek: items.filter(r => r.riskLevel === 'yuksek').length,
    orta: items.filter(r => r.riskLevel === 'orta').length,
    dusuk: items.filter(r => r.riskLevel === 'dusuk').length,
    bekleyen: items.filter(r => r.status === 'pending').length,
  };
}

// Empty state
const EMPTY_STATS: RiskQueueStats = {
  toplam: 0,
  kritik: 0,
  yuksek: 0,
  orta: 0,
  dusuk: 0,
  bekleyen: 0,
};

export function useRiskReviewQueue(): UseRiskReviewQueueResult {
  const [items, setItems] = useState<RiskReviewItem[]>([]);
  const [stats, setStats] = useState<RiskQueueStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        // Token yoksa empty state göster
        setItems([]);
        setIsLoading(false);
        return;
      }

      // Try primary endpoint
      const response = await fetch('/api/v1/contracts/risk-queue', {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: ApiQueueResponse = await response.json();
        const mappedItems = data.items.map(mapApiItemToRiskItem);
        setItems(mappedItems);
        setStats(data.stats ? {
          toplam: data.stats.total,
          kritik: data.stats.critical,
          yuksek: data.stats.high,
          orta: data.stats.medium,
          dusuk: data.stats.low,
          bekleyen: data.stats.pending,
        } : calculateStats(mappedItems));
        return;
      }

      // Try alternative endpoint (analysis/risk-items)
      const altResponse = await fetch('/api/v1/analysis/risk-items', {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      });

      if (altResponse.ok) {
        const altData = await altResponse.json();
        const altItems = Array.isArray(altData) ? altData : (altData.items || []);
        const mappedItems = altItems.map(mapApiItemToRiskItem);
        setItems(mappedItems);
        setStats(calculateStats(mappedItems));
        return;
      }

      // No data available - show empty state
      setItems([]);
      setStats(EMPTY_STATS);
      setError('Risk inceleme kuyrugu bos. Analiz calistirarak risk verisi olusturun.');
    } catch (err) {
      setError(`Veri yuklenemedi: ${(err as Error).message}`);
      setItems([]);
      setStats(EMPTY_STATS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return {
    items,
    stats,
    isLoading,
    error,
    refresh: fetchQueue,
  };
}
