import type { PanelEnvelope, LegalBasisRef, EvidenceRef, ExpertAnalysis, AiAnalysis, PanelMeta } from './envelope';

let sourceCache: Map<string, LegalBasisRef> = new Map();

export function setSourceCache(sources: Array<{ id: string; baslik: string; url?: string; code?: string }>) {
  sourceCache = new Map(sources.map(s => [s.id, { id: s.id, title_tr: s.baslik, url: s.url, code: s.code }]));
}

export function resolveLegalBasisRefs(refs: string[] | undefined): LegalBasisRef[] {
  if (!refs || refs.length === 0) return [];
  return refs.map(ref => sourceCache.get(ref) || { id: ref, title_tr: ref });
}

export function normalizeExpertAnalysis(raw: unknown): ExpertAnalysis | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;

  // summary_tr: Backend'den gelen özet metin
  const summary_tr = typeof obj.summary_tr === 'string' ? obj.summary_tr
    : typeof obj.reason_tr === 'string' ? obj.reason_tr
    : '';

  // details_tr: Detaylı açıklama (trust faktörleri dahil)
  const details_tr = typeof obj.details_tr === 'string' ? obj.details_tr : undefined;

  // rule_refs: Uygulanan kurallar
  const rule_refs = Array.isArray(obj.rule_refs) ? obj.rule_refs as string[] : undefined;

  // trust_score: 0-1 arası güven skoru
  const trust_score = typeof obj.trust_score === 'number' ? obj.trust_score : 1.0;

  // trust_factors: Güven skorunu etkileyen faktörler (SMMM için önemli)
  // YENİ: detay alanı da dahil - hangi hesaplarda sorun var gösteriyor
  const trust_factors = Array.isArray(obj.trust_factors) ? obj.trust_factors as Array<{
    faktor: string;
    skor: number;
    aciklama: string;
    durum: 'ok' | 'warning' | 'error';
    detay?: {
      hata_hesaplar?: Array<{ kod: string; ad: string; neden: string; bakiye: number }>;
      uyari_hesaplar?: Array<{ kod: string; ad: string; neden: string; bakiye: number }>;
      formul?: string;
      donen_varliklar?: number;
      kvyk?: number;
      stoklar?: number;
      sonuc?: number;
      kaynak?: string;
      eksik_veri?: string;
      kontrol?: string;
    } | null;
  }> : undefined;

  // method: Kullanılan analiz yöntemi
  const method = typeof obj.method === 'string' ? obj.method : undefined;

  return {
    summary_tr,
    details_tr,
    rule_refs,
    trust_score,
    trust_factors,
    method,
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
  const expertRaw = analysisRaw?.expert as Record<string, unknown> | undefined;
  const expert = normalizeExpertAnalysis(expertRaw);
  const ai = normalizeAiAnalysis(analysisRaw?.ai);
  const legalRefs = resolveLegalBasisRefs(Array.isArray(obj.legal_basis_refs) ? obj.legal_basis_refs as string[] : undefined);

  // evidence_refs: Hem üst düzey hem de analysis.expert.evidence_refs'ten al
  const topLevelEvidence = Array.isArray(obj.evidence_refs) ? obj.evidence_refs : [];
  const expertEvidence = Array.isArray(expertRaw?.evidence_refs) ? expertRaw.evidence_refs : [];
  const combinedEvidence = [...topLevelEvidence, ...expertEvidence] as Array<Record<string, unknown>>;

  const evidenceRefs: EvidenceRef[] = combinedEvidence.map(e => ({
    id: String(e.id || ''),
    title_tr: String(e.title_tr || e.title || ''),
    kind: (e.kind as EvidenceRef['kind']) || 'document',
    ref: String(e.ref || e.path || ''),
    url: typeof e.url === 'string' ? e.url : undefined,
  }));

  const data = extractData(raw);
  let status: PanelEnvelope<T>['status'] = 'ok';
  let reason_tr = typeof obj.reason_tr === 'string' ? obj.reason_tr : 'Veri basariyla yuklendi.';
  if (data === undefined || data === null) { status = 'empty'; reason_tr = 'Goruntulenecek veri yok.'; }
  if (obj.status === 'missing' || obj.missing === true) { status = 'missing'; reason_tr = typeof obj.reason_tr === 'string' ? obj.reason_tr : 'Eksik veri var.'; }
  return { status, reason_tr, data, legal_basis_refs: legalRefs, evidence_refs: evidenceRefs, analysis: { expert, ai }, trust: determineTrust(expert, ai), confidence: ai?.confidence, meta: normalizeMeta(obj.meta, requestId) };
}
