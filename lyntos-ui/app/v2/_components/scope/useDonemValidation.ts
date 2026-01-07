'use client';
import { useMemo } from 'react';
import { useDashboardScope } from './ScopeProvider';

export interface DonemValidation {
  /** Is the scope fully selected? */
  isComplete: boolean;
  /** Is data entry allowed? */
  canEdit: boolean;
  /** Is the period locked for editing? */
  isLocked: boolean;
  /** Validation message if any */
  message: string | null;
  /** Current period in YYYY-QN format */
  period: string;
  /** Parse period into year and quarter */
  periodParts: { year: number; quarter: number } | null;
}

/**
 * useDonemValidation - Validates current period selection
 *
 * Rules:
 * - Period must be in format: YYYY-Q[1-4] (e.g., 2025-Q2)
 * - Cannot edit periods older than current quarter - 1
 * - Cannot edit if period is marked as "locked" (future feature)
 */
export function useDonemValidation(): DonemValidation {
  const { scope, isReady } = useDashboardScope();

  return useMemo(() => {
    const isComplete = isReady && Boolean(scope.smmm_id && scope.client_id && scope.period);

    // Parse period (format: YYYY-QN)
    let periodParts: { year: number; quarter: number } | null = null;
    const periodMatch = scope.period?.match(/^(\d{4})-Q([1-4])$/);
    if (periodMatch) {
      periodParts = {
        year: parseInt(periodMatch[1], 10),
        quarter: parseInt(periodMatch[2], 10),
      };
    }

    // Determine if period is too old to edit
    let isLocked = false;
    let message: string | null = null;

    if (periodParts) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

      // Calculate if this period is more than 1 quarter old
      const periodValue = periodParts.year * 4 + periodParts.quarter;
      const currentValue = currentYear * 4 + currentQuarter;

      // Allow editing current quarter and previous quarter only
      if (periodValue < currentValue - 1) {
        isLocked = true;
        message = `${scope.period} donemi kilitli. Sadece mevcut ve onceki ceyrek duzenlenebilir.`;
      }
    }

    // If period format is invalid
    if (scope.period && !periodParts) {
      message = 'Donem formati gecersiz. Beklenen: YYYY-QN (ornek: 2025-Q2)';
    }

    const canEdit = isComplete && !isLocked && periodParts !== null;

    return {
      isComplete,
      canEdit,
      isLocked,
      message,
      period: scope.period,
      periodParts,
    };
  }, [scope, isReady]);
}
