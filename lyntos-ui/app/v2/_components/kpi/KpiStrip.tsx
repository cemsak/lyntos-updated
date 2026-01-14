'use client';
import React, { useState } from 'react';
import { KpiCard, type KpiData } from './KpiCard';
import { RiskSkoruDetayModal, DEFAULT_PUAN_KIRANLAR } from './RiskSkoruDetay';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import type { PanelEnvelope, ExpertAnalysis, AiAnalysis, PanelMeta, LegalBasisRef, EvidenceRef } from '../contracts/envelope';
import { normalizeExpertAnalysis, normalizeAiAnalysis, normalizeMeta, determineTrust, resolveLegalBasisRefs } from '../contracts/map';

// Helper to extract nested analysis from backend response
function extractAnalysis(raw: Record<string, unknown>, dataKey?: string): { expert?: ExpertAnalysis; ai?: AiAnalysis } {
  // Try data.analysis first (most endpoints)
  const data = raw.data as Record<string, unknown> | undefined;
  if (data?.analysis) {
    const analysisRaw = data.analysis as Record<string, unknown>;
    return {
      expert: normalizeExpertAnalysis(analysisRaw.expert),
      ai: normalizeAiAnalysis(analysisRaw.ai),
    };
  }
  // Try data[dataKey].analysis (kurgan_risk, etc.)
  if (dataKey && data?.[dataKey]) {
    const nested = data[dataKey] as Record<string, unknown>;
    if (nested.analysis) {
      const analysisRaw = nested.analysis as Record<string, unknown>;
      return {
        expert: normalizeExpertAnalysis(analysisRaw.expert),
        ai: normalizeAiAnalysis(analysisRaw.ai),
      };
    }
  }
  return {};
}

// Helper to extract legal_basis_refs from nested data
function extractLegalBasisRefs(raw: Record<string, unknown>, dataKey?: string): LegalBasisRef[] {
  const data = raw.data as Record<string, unknown> | undefined;
  // Try top-level data.legal_basis_refs
  if (Array.isArray(data?.legal_basis_refs)) {
    return resolveLegalBasisRefs(data.legal_basis_refs as string[]);
  }
  // Try nested data[dataKey].legal_basis_refs
  if (dataKey && data?.[dataKey]) {
    const nested = data[dataKey] as Record<string, unknown>;
    if (Array.isArray(nested.legal_basis_refs)) {
      return resolveLegalBasisRefs(nested.legal_basis_refs as string[]);
    }
  }
  return [];
}

// Helper to extract evidence_refs
function extractEvidenceRefs(raw: Record<string, unknown>, dataKey?: string): EvidenceRef[] {
  const data = raw.data as Record<string, unknown> | undefined;
  // Try analysis.expert.evidence_refs
  const analysis = extractAnalysis(raw, dataKey);
  if (analysis.expert) {
    // Expert analysis might have evidence_refs in different locations
    const expertRaw = dataKey && data?.[dataKey]
      ? ((data[dataKey] as Record<string, unknown>).analysis as Record<string, unknown>)?.expert
      : (data?.analysis as Record<string, unknown>)?.expert;
    if (expertRaw && Array.isArray((expertRaw as Record<string, unknown>).evidence_refs)) {
      const refs = (expertRaw as Record<string, unknown>).evidence_refs as string[];
      return refs.map(ref => ({
        id: ref,
        title_tr: ref,
        kind: 'document' as const,
        ref: ref,
      }));
    }
  }
  return [];
}

// Create envelope with proper analysis extraction
function createKpiEnvelope<T>(
  raw: unknown,
  extractData: (raw: unknown) => T | undefined,
  dataKey?: string,
  requestId?: string,
  emptyMessage?: string
): PanelEnvelope<T> {
  if (!raw || typeof raw !== 'object') {
    return {
      status: 'error',
      reason_tr: 'Geçersiz yanıt formatı',
      legal_basis_refs: [],
      evidence_refs: [],
      analysis: {},
      trust: 'low',
      meta: normalizeMeta(undefined, requestId),
    };
  }

  const obj = raw as Record<string, unknown>;
  const analysis = extractAnalysis(obj, dataKey);
  const legalRefs = extractLegalBasisRefs(obj, dataKey);
  const evidenceRefs = extractEvidenceRefs(obj, dataKey);
  const data = extractData(raw);

  let status: PanelEnvelope<T>['status'] = 'ok';
  let reason_tr = 'Veri başarıyla yüklendi.';

  if (data === undefined || data === null) {
    status = 'empty';
    reason_tr = emptyMessage || 'Görüntülenecek veri yok.';
  }

  return {
    status,
    reason_tr,
    data,
    legal_basis_refs: legalRefs,
    evidence_refs: evidenceRefs,
    analysis,
    trust: determineTrust(analysis.expert, analysis.ai),
    confidence: analysis.ai?.confidence,
    meta: normalizeMeta(obj.meta, requestId),
  };
}

// Normalizers for each KPI type
function normalizeKurganRisk(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    const kurgan = data?.kurgan_risk as Record<string, unknown> | undefined;
    if (!kurgan || typeof kurgan.score !== 'number') return undefined;
    return {
      value: kurgan.score,
      label: '100 üzerinden · VDK 13 Kriter',
      unit: 'puan',
      risk_level: typeof kurgan.risk_level === 'string' ? kurgan.risk_level : undefined,
    };
  }, 'kurgan_risk', requestId, 'Risk analizi için mizan yükleyin');
}

function normalizeDataQuality(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (!data || typeof data.score !== 'number') return undefined;
    return {
      value: data.score,
      label: 'Veri Tamam',
      unit: '%',
    };
  }, undefined, requestId, 'Veri kalitesi için belge yükleyin');
}

function normalizeCrossCheck(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    const summary = data?.summary as Record<string, unknown> | undefined;
    if (!summary) return undefined;
    const errors = typeof summary.errors === 'number' ? summary.errors : 0;
    const warnings = typeof summary.warnings === 'number' ? summary.warnings : 0;
    return {
      value: errors + warnings,
      label: `${errors} hata, ${warnings} uyarı`,
      risk_level: errors > 0 ? 'Yüksek' : warnings > 0 ? 'Orta' : 'Düşük',
    };
  }, undefined, requestId, 'Çapraz kontrol için mizan ve beyanname yükleyin');
}

function normalizeQuarterlyTax(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    const amount = data?.tax_amount ?? data?.amount ?? data?.quarterly_tax;
    if (typeof amount !== 'number') return undefined;
    return {
      value: amount.toLocaleString('tr-TR'),
      label: 'Geçici Vergi',
      unit: 'TL',
    };
  }, undefined, requestId, 'Geçici vergi hesabı için mizan yükleyin');
}

function normalizeCorporateTax(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    const amount = data?.tax_amount ?? data?.amount ?? data?.corporate_tax;
    if (typeof amount !== 'number') return undefined;
    return {
      value: amount.toLocaleString('tr-TR'),
      label: 'Kurumlar Vergisi',
      unit: 'TL',
    };
  }, undefined, requestId, 'Kurumlar vergisi hesaplaması için mizan yükleyin');
}

function normalizeCorporateTaxForecast(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    const amount = data?.forecast_amount ?? data?.amount;
    if (typeof amount !== 'number') return undefined;
    return {
      value: amount.toLocaleString('tr-TR'),
      label: 'KV Tahmini',
      unit: 'TL',
    };
  }, undefined, requestId, 'Tahmin için en az 3 dönem mizan verisi gerekli');
}

function normalizeInflation(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    const adjustment = data?.total_adjustment ?? data?.adjustment ?? data?.inflation_effect;
    if (typeof adjustment !== 'number') return undefined;
    return {
      value: adjustment.toLocaleString('tr-TR'),
      label: 'Enflasyon Düzeltmesi',
      unit: 'TL',
    };
  }, undefined, requestId, 'Enflasyon düzeltmesi için bilanço yükleyin');
}

function normalizeRegwatch(raw: unknown, requestId?: string): PanelEnvelope<KpiData> {
  return createKpiEnvelope<KpiData>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    if (!data) return undefined;
    const isActive = data.is_active === true || data.status === 'ACTIVE';
    const pending = typeof data.pending_count === 'number' ? data.pending_count : 0;
    // Show next declaration deadline - currently static, will be dynamic with backend
    return {
      value: '26 Şub',
      label: 'KDV beyanı son gün',
    };
  }, undefined, requestId, 'Beyan takvimini görüntüle');
}

interface KpiStripProps {
  onRegWatchClick?: () => void;
}

export function KpiStrip({ onRegWatchClick }: KpiStripProps) {
  // Risk Skoru Detay Modal state
  const [riskDetayAcik, setRiskDetayAcik] = useState(false);

  // Each KPI has its own fail-soft fetch
  const kurgan = useFailSoftFetch<KpiData>(ENDPOINTS.KURGAN_RISK, normalizeKurganRisk);
  const dataQuality = useFailSoftFetch<KpiData>(ENDPOINTS.DATA_QUALITY, normalizeDataQuality);
  const crossCheck = useFailSoftFetch<KpiData>(ENDPOINTS.CROSS_CHECK, normalizeCrossCheck);
  const quarterlyTax = useFailSoftFetch<KpiData>(ENDPOINTS.QUARTERLY_TAX, normalizeQuarterlyTax);
  const corporateTax = useFailSoftFetch<KpiData>(ENDPOINTS.CORPORATE_TAX, normalizeCorporateTax);
  const corporateTaxForecast = useFailSoftFetch<KpiData>(ENDPOINTS.CORPORATE_TAX_FORECAST, normalizeCorporateTaxForecast);
  const inflation = useFailSoftFetch<KpiData>(ENDPOINTS.INFLATION_ADJUSTMENT, normalizeInflation);
  const regwatch = useFailSoftFetch<KpiData>(ENDPOINTS.REGWATCH_STATUS, normalizeRegwatch);

  // Scroll to RegWatch section - use prop if provided, else default
  const handleRegWatchClick = onRegWatchClick || (() => {
    const section = document.getElementById('regwatch-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Get risk score value for modal
  const riskSkor = kurgan.status === 'ok' && kurgan.data ?
    (typeof kurgan.data.value === 'number' ? kurgan.data.value : 88) : 88;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard
          title="Vergi Risk Skoru"
          icon="🎯"
          envelope={kurgan}
          onClick={() => setRiskDetayAcik(true)}
        />
        <KpiCard title="Veri Kalitesi" icon="📊" envelope={dataQuality} />
        <KpiCard title="Mutabakat" icon="✓" envelope={crossCheck} />
        <KpiCard title="Geçici Vergi" icon="💰" envelope={quarterlyTax} />
        <KpiCard title="Kurumlar Vergisi" icon="🏢" envelope={corporateTax} />
        <KpiCard title="KV Tahmini" icon="📈" envelope={corporateTaxForecast} />
        <KpiCard title="Enflasyon" icon="📉" envelope={inflation} />
        <KpiCard title="Beyan Takvimi" icon="📅" envelope={regwatch} onClick={handleRegWatchClick} />
      </div>

      {/* Risk Skoru Detay Modal */}
      <RiskSkoruDetayModal
        isOpen={riskDetayAcik}
        onClose={() => setRiskDetayAcik(false)}
        skor={riskSkor}
        puanKiranlar={DEFAULT_PUAN_KIRANLAR}
      />
    </>
  );
}
