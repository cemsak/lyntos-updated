'use client';

import { useMemo } from 'react';
import { analyzeRootCause } from '../_lib/rootCauseAnalysis';
import { splitConfidence } from '../_lib/confidenceSplitter';
import { calculateTrend } from '../_lib/trendCalculator';
import type { CrossCheckResultRaw, EnrichedCrossCheck, SmmmKararData } from '../_types/crossCheck';

export function useRootCauseEngine(
  checks: CrossCheckResultRaw[],
  kararlar: Record<string, SmmmKararData>,
  previousChecks: CrossCheckResultRaw[] = [],
): EnrichedCrossCheck[] {
  return useMemo(() => {
    // Create a map for quick lookup of previous checks
    const prevChecksMap = new Map<string, CrossCheckResultRaw>();
    previousChecks.forEach(check => {
      prevChecksMap.set(check.check_id, check);
    });

    return checks.map(check => {
      const rootCause = analyzeRootCause(check);
      const confidence = splitConfidence(check);

      // Get SMMM decision or default
      const smmmKarar: SmmmKararData = kararlar[check.check_id] || {
        karar: 'BILINMIYOR',
        not: '',
        tarih: '',
      };

      // Auto-approve UYUMLU checks
      if (rootCause.neden === 'UYUMLU' && smmmKarar.karar === 'BILINMIYOR') {
        smmmKarar.karar = 'KABUL';
        smmmKarar.not = 'Otomatik: tolerans dahilinde uyumlu';
      }

      // Calculate trend from previous period
      const prevCheck = prevChecksMap.get(check.check_id);
      const trend = calculateTrend(check, prevCheck);

      return {
        ...check,
        rootCause,
        smmmKarar,
        confidence,
        trend,
      };
    });
  }, [checks, kararlar, previousChecks]);
}
