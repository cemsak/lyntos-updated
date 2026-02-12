/**
 * LYNTOS V2 Backend Feed Hook
 * Sprint 4: Fetches feed items from /api/v2/feed/{period}
 *
 * NO MOCK DATA - Returns empty array with error on failure
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../_lib/api/client';
import type { FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction, EvidenceKind } from '../_components/feed/types';

// Backend response types
interface BackendEvidenceRef {
  ref_id: string;
  source_type: string;
  description: string;
  status: string;
  file_path: string | null;
  account_code: string | null;
  document_date: string | null;
  metadata: Record<string, unknown>;
}

interface BackendAction {
  action_id: string;
  description: string;
  responsible: string;
  deadline: string | null;
  status: string;
  priority: number;
  related_evidence: string[];
}

interface BackendFeedItem {
  id: string;
  scope: FeedScope;
  category: string;
  severity: string;
  score: number;
  impact: { amount_try: number; pct?: number; points?: number };
  title: string;
  summary: string;
  why: string;
  evidence_refs: BackendEvidenceRef[];
  actions: BackendAction[];
  created_at: string;
  updated_at: string | null;
}

interface BackendFeedResponse {
  schema: { name: string; version: string };
  meta: {
    smmm_id: string;
    client_id: string;
    period: string;
    request_id: string;
  };
  data: BackendFeedItem[];
  warnings?: string[];
  errors?: string[];
}

interface UseBackendFeedResult {
  items: FeedItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

interface UseBackendFeedParams {
  smmm_id: string;
  client_id: string;
  period: string;
  enabled?: boolean;
}

/**
 * Map backend source_type to frontend EvidenceKind
 */
function mapSourceTypeToKind(sourceType: string): EvidenceKind {
  const kindMap: Record<string, EvidenceKind> = {
    'mizan': 'mizan_row',
    'mizan_row': 'mizan_row',
    'fis': 'fis_detay',
    'fis_detay': 'fis_detay',
    'belge': 'belge_ref',
    'belge_ref': 'belge_ref',
    'document': 'belge_ref',
    'ekstre': 'ekstre_satir',
    'ekstre_satir': 'ekstre_satir',
    'beyanname': 'beyanname_ref',
    'beyanname_ref': 'beyanname_ref',
    'mevzuat': 'mevzuat_ref',
    'mevzuat_ref': 'mevzuat_ref',
    'vdk': 'vdk_kural',
    'vdk_kural': 'vdk_kural',
    'missing': 'missing_doc',
    'missing_doc': 'missing_doc',
    'calculation': 'calculation',
    'calc': 'calculation',
    'external': 'external_source',
    'external_source': 'external_source',
  };
  return kindMap[sourceType] || 'belge_ref';
}

/**
 * Map backend evidence_refs to frontend EvidenceRef format
 */
function mapEvidenceRef(backendRef: BackendEvidenceRef): EvidenceRef {
  return {
    kind: mapSourceTypeToKind(backendRef.source_type || 'belge_ref'),
    ref: backendRef.ref_id,
    label: backendRef.description,
    href: backendRef.file_path || undefined,
    account_code: backendRef.account_code || undefined,
  };
}

/**
 * Map backend actions to frontend FeedAction format
 */
function mapAction(backendAction: BackendAction): FeedAction {
  return {
    id: backendAction.action_id,
    label: backendAction.description,
    kind: 'navigate',
    variant: backendAction.priority === 1 ? 'primary' : 'secondary',
    href: undefined, // Backend doesn't provide href
  };
}

/**
 * Map backend FeedItem to frontend FeedItem format
 */
function mapFeedItem(backendItem: BackendFeedItem): FeedItem {
  return {
    id: backendItem.id,
    scope: backendItem.scope,
    dedupe_key: `${backendItem.id}-${backendItem.title}`,
    category: backendItem.category as FeedItem['category'],
    severity: backendItem.severity as FeedItem['severity'],
    score: backendItem.score,
    impact: {
      amount_try: backendItem.impact?.amount_try || 0,
      pct: backendItem.impact?.pct,
      points: backendItem.impact?.points,
    },
    title: backendItem.title,
    summary: backendItem.summary || '',
    why: backendItem.why || '',
    evidence_refs: (backendItem.evidence_refs || []).map(mapEvidenceRef),
    actions: (backendItem.actions || []).map(mapAction),
    snoozeable: true,
    created_at: backendItem.created_at,
  };
}

export function useBackendFeed({
  smmm_id,
  client_id,
  period,
  enabled = true,
}: UseBackendFeedParams): UseBackendFeedResult {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    if (!enabled || !smmm_id || !client_id || !period) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: responseData, error: apiError } = await api.get<BackendFeedResponse>(
        `/api/v2/feed/${encodeURIComponent(period)}`,
        { params: { smmm_id, client_id } }
      );

      if (apiError || !responseData) {
        throw new Error(apiError || 'Feed verisi alinamadi');
      }

      const data = responseData;

      // Map backend response to frontend FeedItem format
      const mappedItems: FeedItem[] = (data.data || []).map(mapFeedItem);

      setItems(mappedItems);

      if (data.warnings && data.warnings.length > 0) {
        console.warn('[useBackendFeed] Warnings:', data.warnings);
      }

      if (data.errors && data.errors.length > 0) {
        console.error('[useBackendFeed] Errors:', data.errors);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      console.error('[useBackendFeed] Error:', errorMessage);
      setError(errorMessage);
      // NO MOCK FALLBACK - empty on error
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [smmm_id, client_id, period, enabled]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Calculate stats from real data
  const stats = {
    total: items.length,
    critical: items.filter((i) => i.severity === 'CRITICAL').length,
    high: items.filter((i) => i.severity === 'HIGH').length,
    medium: items.filter((i) => i.severity === 'MEDIUM').length,
    low: items.filter((i) => i.severity === 'LOW').length,
    info: items.filter((i) => i.severity === 'INFO').length,
  };

  return {
    items,
    loading,
    error,
    refetch: fetchFeed,
    stats,
  };
}

export default useBackendFeed;
