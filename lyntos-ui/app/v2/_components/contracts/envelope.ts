export type PanelStatus = 'loading' | 'ok' | 'empty' | 'missing' | 'auth' | 'error';

export interface LegalBasisRef {
  id: string;
  title_tr: string;
  url?: string;
  code?: string;
}

export interface EvidenceRef {
  id: string;
  title_tr: string;
  kind: 'document' | 'bundle' | 'external';
  ref: string;
  url?: string;
  page?: number;
  row_ref?: string;
}

export interface ExpertAnalysis {
  summary_tr: string;
  details_tr?: string;
  rule_refs?: string[];
  trust_score: number;
}

export interface AiAnalysis {
  summary_tr: string;
  details_tr?: string;
  confidence: number;
  disclaimer_tr: string;
  trust_score: number;
}

export interface PanelMeta {
  rulepack_version: string;
  inputs_hash: string;
  as_of: string;
  request_id?: string;
  stale?: boolean;
  permissions?: string[];
  build_version?: string;
}

export interface PanelEnvelope<T = unknown> {
  status: PanelStatus;
  reason_tr: string;
  data?: T;
  legal_basis_refs: LegalBasisRef[];
  evidence_refs: EvidenceRef[];
  analysis: {
    expert?: ExpertAnalysis;
    ai?: AiAnalysis;
  };
  trust: 'low' | 'med' | 'high';
  confidence?: number;
  meta: PanelMeta;
}

export function createLoadingEnvelope<T>(): PanelEnvelope<T> {
  return {
    status: 'loading',
    reason_tr: 'Veri yukleniyor...',
    legal_basis_refs: [],
    evidence_refs: [],
    analysis: {},
    trust: 'low',
    meta: { rulepack_version: '', inputs_hash: '', as_of: new Date().toISOString() },
  };
}

export function createErrorEnvelope<T>(reason: string, requestId?: string): PanelEnvelope<T> {
  return {
    status: 'error',
    reason_tr: reason,
    legal_basis_refs: [],
    evidence_refs: [],
    analysis: {},
    trust: 'low',
    meta: { rulepack_version: '', inputs_hash: '', as_of: new Date().toISOString(), request_id: requestId },
  };
}

export function createMissingEnvelope<T>(reason: string): PanelEnvelope<T> {
  return {
    status: 'missing',
    reason_tr: reason,
    legal_basis_refs: [],
    evidence_refs: [],
    analysis: {},
    trust: 'low',
    meta: { rulepack_version: '', inputs_hash: '', as_of: new Date().toISOString() },
  };
}
