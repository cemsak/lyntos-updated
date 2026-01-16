/**
 * LYNTOS Feed Signals Hook
 * Sprint 4.3 + Hotfix 4.3.1 - Connect signal generators to Feed
 *
 * HOTFIX: Stable references to prevent infinite re-renders
 */

import { useMemo, useRef } from 'react';
import type { FeedItem } from './types';
import {
  generateMizanSignals,
  generateCrossCheckSignals,
  MOCK_MIZAN_HESAPLAR,
  MOCK_MIZAN_CONTEXT,
  MOCK_CROSSCHECK_ITEMS,
  MOCK_CROSSCHECK_CONTEXT,
} from '../signals';

interface FeedStats {
  mizan: { total: number; bySeverity: Record<string, number> };
  crossCheck: { total: number; byType: Record<string, number> };
  combined: { total: number; critical: number; high: number };
}

interface UseFeedSignalsResult {
  signals: FeedItem[];
  stats: FeedStats;
  isLoading: boolean;
  error: string | null;
}

// Stable timestamp for this session (doesn't change on re-render)
const SESSION_TIMESTAMP = new Date().toISOString();

/**
 * Hook that generates feed signals from mizan and crosscheck data
 *
 * IMPORTANT: Uses stable references to prevent infinite re-renders
 */
export function useFeedSignals(): UseFeedSignalsResult {
  // Use ref to store computed signals (stable across renders)
  const cacheRef = useRef<UseFeedSignalsResult | null>(null);

  // Only compute once (or when dependencies change in real app)
  if (cacheRef.current === null) {
    try {
      // Generate mizan signals
      const mizanResult = generateMizanSignals(
        MOCK_MIZAN_HESAPLAR,
        MOCK_MIZAN_CONTEXT
      );

      // Generate crosscheck signals
      const crossCheckResult = generateCrossCheckSignals(
        MOCK_CROSSCHECK_ITEMS,
        MOCK_CROSSCHECK_CONTEXT
      );

      // Combine all signals and set stable timestamp
      const allSignals: FeedItem[] = [
        ...mizanResult.signals,
        ...crossCheckResult.signals,
      ].map(signal => ({
        ...signal,
        created_at: SESSION_TIMESTAMP, // Stable timestamp
      }));

      // Sort by severity then score
      const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      allSignals.sort((a, b) => {
        const sevDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
        if (sevDiff !== 0) return sevDiff;
        return b.score - a.score;
      });

      cacheRef.current = {
        signals: allSignals,
        stats: {
          mizan: {
            total: mizanResult.signals.length,
            bySeverity: mizanResult.stats.by_severity,
          },
          crossCheck: {
            total: crossCheckResult.signals.length,
            byType: crossCheckResult.stats.by_type,
          },
          combined: {
            total: allSignals.length,
            critical: allSignals.filter(s => s.severity === 'CRITICAL').length,
            high: allSignals.filter(s => s.severity === 'HIGH').length,
          },
        },
        isLoading: false,
        error: null,
      };
    } catch (err) {
      cacheRef.current = {
        signals: [],
        stats: {
          mizan: { total: 0, bySeverity: {} },
          crossCheck: { total: 0, byType: {} },
          combined: { total: 0, critical: 0, high: 0 },
        },
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  return cacheRef.current;
}

/**
 * Get feed items with optional filtering
 * Uses useMemo with stable dependencies
 */
export function useFilteredFeedSignals(options?: {
  minSeverity?: string;
  categories?: string[];
  limit?: number;
}): FeedItem[] {
  const { signals } = useFeedSignals();

  // Serialize options for stable comparison
  const optionsKey = JSON.stringify(options || {});

  return useMemo(() => {
    let filtered = signals;

    if (options?.minSeverity) {
      const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      const minIndex = severityOrder.indexOf(options.minSeverity);
      filtered = filtered.filter(s =>
        severityOrder.indexOf(s.severity) <= minIndex
      );
    }

    if (options?.categories?.length) {
      filtered = filtered.filter(s =>
        options.categories!.includes(s.category)
      );
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }, [signals, optionsKey]);
}
