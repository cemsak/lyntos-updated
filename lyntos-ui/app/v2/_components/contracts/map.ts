import type { PanelEnvelope, LegalBasisRef, EvidenceRef, ExpertAnalysis, AiAnalysis, PanelMeta } from './envelope';

let sourceCache: Map<string, LegalBasisRef> = new Map();

export function setSourceCache(sources: Array<{ id: string; baslik: string; url?: string; code?: string }>) {
  sourceCache = new Map(sources.map(s => [s.id, { id: s.id, title_tr: s.baslik, url: s.url, code: s.code }]));
  console.log('[SourceCache] Populated with', sourceCache.size, 'entries');
}

export function resolveLegalBasisRefs(refs: string[] | undefined): LegalBasisRef[] {
  if (!refs || refs.length === 0) return [];
  return refs.map(ref => sourceCache.get(ref) || { id: ref, title_tr: ref });
}

export function normalizeExpertAnalysis(raw: unknown): ExpertAnalysis | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  return {
    summary_tr: typeof obj.reason_tr === 'string' ? obj.reason_tr : typeof obj.summary_tr === 'string' ? obj.summary_tr : '',
    details_tr: typeof obj.details_tr === 'string' ? obj.details_tr : undefined,
    rule_refs: Array.isArray(obj.rule_refs) ? obj.rule_refs : undefined,
    trust_score: typeof obj.trust_score === 'number' ? obj.trust_score : 1.0,
  };
}

export function normalizeAiAnalysis(raw: unknown): AiAnalysis | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const obj = raw as Record<string, unknown>;

  // AI must have confidence
  const confidence = typeof obj.confidence === 'number' ? obj.confidence : null;
  if (confidence === null) return undefined;

  // Map backend fields to frontend fields (backend uses 'suggestion', frontend expects 'summary_tr')
  const summary = typeof obj.summary_tr === 'string' ? obj.summary_tr
    : typeof obj.suggestion === 'string' ? obj.suggestion
    : typeof obj.summary === 'string' ? obj.summary
    : typeof obj.oneri === 'string' ? obj.oneri
    : '';

  const disclaimer = typeof obj.disclaimer_tr === 'string' ? obj.disclaimer_tr
    : typeof obj.disclaimer === 'string' ? obj.disclaimer
    : 'Bu oneri yapay zeka tarafindan uretilmistir. Uzman degerlendirmesi onerilir.';

  // Skip if no actual content
  if (!summary) return undefined;

  return {
    summary_tr: summary,
    details_tr: typeof obj.details_tr === 'string' ? obj.details_tr
      : typeof obj.details === 'string' ? obj.details : undefined,
    confidence: confidence,
    disclaimer_tr: disclaimer,
    trust_score: typeof obj.trust_score === 'number' ? obj.trust_score : 0.5,
  };
}

export function normalizeMeta(raw: unknown, requestId?: string): PanelMeta {
  const defaults: PanelMeta = { rulepack_version: 'unknown', inputs_hash: 'unknown', as_of: new Date().toISOString(), request_id: requestId };
  if (!raw || typeof raw !== 'object') return defaults;
  const obj = raw as Record<string, unknown>;
  return {
    rulepack_version: typeof obj.rulepack_version === 'string' ? obj.rulepack_version : defaults.rulepack_version,
    inputs_hash: typeof obj.inputs_hash === 'string' ? obj.inputs_hash : defaults.inputs_hash,
    as_of: typeof obj.as_of === 'string' ? obj.as_of : defaults.as_of,
    request_id: requestId,
    stale: typeof obj.stale === 'boolean' ? obj.stale : undefined,
    permissions: Array.isArray(obj.permissions) ? obj.permissions : undefined,
  };
}

export function determineTrust(expert?: ExpertAnalysis, ai?: AiAnalysis): 'low' | 'med' | 'high' {
  if (expert && expert.trust_score >= 0.9) return 'high';
  if (expert && expert.trust_score >= 0.7) return 'med';
  if (ai && ai.confidence >= 0.8) return 'med';
  return 'low';
}

export function normalizeToEnvelope<T>(raw: unknown, extractData: (raw: unknown) => T | undefined, requestId?: string): PanelEnvelope<T> {
  if (!raw || typeof raw !== 'object') {
    return { status: 'error', reason_tr: 'Gecersiz yanit formati', legal_basis_refs: [], evidence_refs: [], analysis: {}, trust: 'low', meta: normalizeMeta(undefined, requestId) };
  }
  const obj = raw as Record<string, unknown>;
  const analysisRaw = obj.analysis as Record<string, unknown> | undefined;
  const expert = normalizeExpertAnalysis(analysisRaw?.expert);
  const ai = normalizeAiAnalysis(analysisRaw?.ai);
  const legalRefs = resolveLegalBasisRefs(Array.isArray(obj.legal_basis_refs) ? obj.legal_basis_refs as string[] : undefined);
  const evidenceRefs: EvidenceRef[] = Array.isArray(obj.evidence_refs) ? (obj.evidence_refs as Array<Record<string, unknown>>).map(e => ({
    id: String(e.id || ''), title_tr: String(e.title_tr || e.title || ''), kind: (e.kind as EvidenceRef['kind']) || 'document', ref: String(e.ref || e.path || ''), url: typeof e.url === 'string' ? e.url : undefined,
  })) : [];
  const data = extractData(raw);
  let status: PanelEnvelope<T>['status'] = 'ok';
  let reason_tr = typeof obj.reason_tr === 'string' ? obj.reason_tr : 'Veri basariyla yuklendi.';
  if (data === undefined || data === null) { status = 'empty'; reason_tr = 'Goruntulenecek veri yok.'; }
  if (obj.status === 'missing' || obj.missing === true) { status = 'missing'; reason_tr = typeof obj.reason_tr === 'string' ? obj.reason_tr : 'Eksik veri var.'; }
  return { status, reason_tr, data, legal_basis_refs: legalRefs, evidence_refs: evidenceRefs, analysis: { expert, ai }, trust: determineTrust(expert, ai), confidence: ai?.confidence, meta: normalizeMeta(obj.meta, requestId) };
}
