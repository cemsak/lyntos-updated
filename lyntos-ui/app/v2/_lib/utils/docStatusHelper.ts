/**
 * LYNTOS Document Status Helper
 * Calculates missing/present status for Big-6 categories
 */

import {
  BIG_6_DOC_TYPES,
  DOC_TYPE_INFO,
  type DocCategoryStatus,
  type DocStatus,
  type Big6DocType
} from '../constants/docTypes';

// Backend returns byDocType as Record<string, SyncedFile[]>
// We need to handle both array and count formats
type ByDocTypeInput = Record<string, unknown[] | number> | undefined | null;

/**
 * Calculate status for all Big-6 document categories
 */
export function calculateDocStatuses(
  byDocType: ByDocTypeInput
): DocCategoryStatus[] {
  const docCounts: Record<string, number> = {};

  // Normalize byDocType to counts
  if (byDocType) {
    for (const [key, value] of Object.entries(byDocType)) {
      if (Array.isArray(value)) {
        docCounts[key] = value.length;
      } else if (typeof value === 'number') {
        docCounts[key] = value;
      }
    }
  }

  return BIG_6_DOC_TYPES.map((docType): DocCategoryStatus => {
    const count = docCounts[docType] || 0;
    const info = DOC_TYPE_INFO[docType];

    // Determine status
    let status: DocStatus;
    if (count === 0) {
      status = 'missing';
    } else if (count >= 1) {
      status = 'present';
    } else {
      status = 'partial';
    }

    return {
      docType,
      info,
      status,
      count,
      expectedMin: 1, // At least 1 document expected per category
    };
  });
}

/**
 * Get summary counts
 */
export function getDocStatusSummary(statuses: DocCategoryStatus[]): {
  total: number;
  present: number;
  missing: number;
  error: number;
  completionPercent: number;
} {
  const total = statuses.length;
  const present = statuses.filter(s => s.status === 'present').length;
  const missing = statuses.filter(s => s.status === 'missing').length;
  const error = statuses.filter(s => s.status === 'error').length;
  const completionPercent = total > 0 ? Math.round((present / total) * 100) : 0;

  return { total, present, missing, error, completionPercent };
}

/**
 * Get only missing categories
 */
export function getMissingDocTypes(statuses: DocCategoryStatus[]): DocCategoryStatus[] {
  return statuses.filter(s => s.status === 'missing');
}

/**
 * Check if period is complete (all Big-6 present)
 */
export function isPeriodComplete(statuses: DocCategoryStatus[]): boolean {
  return statuses.every(s => s.status === 'present');
}
