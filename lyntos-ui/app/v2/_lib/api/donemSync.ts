/**
 * LYNTOS Dönem Sync API Client
 * Syncs parsed period data to backend POST /api/v2/donem/sync
 *
 * Uses Next.js API routes which proxy to FastAPI backend
 */

// ============================================================================
// TYPES - Match backend Pydantic models
// ============================================================================

export interface SyncMeta {
  clientId: string;
  clientName: string;
  period: string;
  quarter: string;  // "Q1", "Q2", "Q3", "Q4"
  year: number;
  uploadedAt: string;
  sourceFile: string;
}

export interface SyncFileSummary {
  id: string;
  fileName: string;
  fileType: string;  // DetectedFileType from frontend
  fileSize: number;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface SyncStats {
  total: number;
  detected: number;
  parsed: number;
  failed: number;
}

export interface SyncPayload {
  tenantId: string;
  meta: SyncMeta;
  fileSummaries: SyncFileSummary[];
  stats: SyncStats;
}

export interface SyncResultItem {
  fileName: string;
  status: 'synced' | 'error' | 'skipped';
  docType?: string;
  reason?: string;
}

export interface SyncResponse {
  success: boolean;
  syncedCount: number;
  errorCount: number;
  skippedCount: number;
  results: SyncResultItem[];
  errors: string[];
  periodId?: string;
}

export interface SyncStatusResponse {
  periodId: string;
  tenantId: string;
  clientId: string;
  totalCount: number;
  byDocType: Record<string, Array<{
    id: string;
    filename: string;
    parseStatus: string;
    parserName: string;
    confidence: number;
    updatedAt: string;
  }>>;
  syncedAt?: string;
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

import { api } from './client';

// ============================================================================
// SYNC FUNCTION
// ============================================================================

/**
 * Sync parsed dönem data to backend
 *
 * @param payload - The sync payload containing meta, files, and stats
 * @returns SyncResponse with detailed results
 */
export async function syncDonemToBackend(payload: SyncPayload): Promise<SyncResponse> {
  const { data, error } = await api.post<SyncResponse>('/api/v2/donem/sync', payload);

  if (error || !data) {
    console.error('[DonemSync] Sync error:', error);
    return {
      success: false,
      syncedCount: 0,
      errorCount: 1,
      skippedCount: 0,
      results: [],
      errors: [error || 'Unknown error'],
    };
  }

  return data;
}

// ============================================================================
// STATUS CHECK
// ============================================================================

/**
 * Get sync status for a specific period
 * Useful for checking what's already synced before re-syncing
 */
export async function getDonemSyncStatus(
  period: string,
  tenantId: string,
  clientId: string
): Promise<SyncStatusResponse | null> {
  const { data, error } = await api.get<SyncStatusResponse>(
    `/api/v2/donem/status/${encodeURIComponent(period)}`,
    { params: { tenant_id: tenantId, client_id: clientId } }
  );

  if (error || !data) {
    console.warn('[DonemSync] Status check failed:', error);
    return null;
  }
  return data;
}

// ============================================================================
// DELETE / CLEAR FUNCTION
// ============================================================================

export interface ClearResponse {
  success: boolean;
  message: string;
  deletedCount: number;
  period: string;
}

/**
 * Clear/delete dönem data from backend (soft delete)
 *
 * @param period - Period string like "2025-Q1"
 * @param tenantId - Tenant ID
 * @param clientId - Client ID
 * @returns ClearResponse with deletion results
 */
export async function clearDonemFromBackend(
  period: string,
  tenantId: string = 'default',
  clientId: string = 'current'
): Promise<ClearResponse> {
  const { data, error } = await api.delete<{ message?: string; deleted_count?: number }>(
    `/api/v2/donem/clear/${encodeURIComponent(period)}`,
    { params: { tenant_id: tenantId, client_id: clientId } }
  );

  if (error || !data) {
    console.error('[DonemSync] Clear failed:', error);
    return {
      success: false,
      message: error || 'Unknown error',
      deletedCount: 0,
      period,
    };
  }

  return {
    success: true,
    message: data.message || 'Veri başarıyla silindi',
    deletedCount: data.deleted_count || 0,
    period,
  };
}

// ============================================================================
// HELPER: Build payload from donemStore data
// ============================================================================

import type { DonemMeta, DetectedFileSummary, FileStats } from '../stores/donemStore';

/**
 * Build sync payload from donemStore data
 * This is a convenience function to map donemStore format to API format
 */
export function buildSyncPayload(
  meta: DonemMeta,
  fileSummaries: DetectedFileSummary[],
  stats: FileStats,
  tenantId: string = 'default'
): SyncPayload {
  return {
    tenantId,
    meta: {
      clientId: meta.clientId,
      clientName: meta.clientName,
      period: meta.period,
      quarter: meta.quarter,
      year: meta.year,
      uploadedAt: meta.uploadedAt,
      sourceFile: meta.sourceFile,
    },
    fileSummaries: fileSummaries.map(f => ({
      id: f.id,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      confidence: f.confidence,
      metadata: f.metadata || {},
    })),
    stats: {
      total: stats.total,
      detected: stats.detected,
      parsed: stats.parsed,
      failed: stats.failed,
    },
  };
}
