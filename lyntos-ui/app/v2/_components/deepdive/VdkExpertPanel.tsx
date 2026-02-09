'use client';

import React, { useMemo, useState } from 'react';
import { HelpCircle, X, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import { Card } from '../shared/Card';
import { PanelState } from '../shared/PanelState';
import { TrustBadge } from '../shared/Badge';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import {
  RiskScoreSummary,
  CriteriaSection,
  RecommendationsPanel,
} from './vdk';
import { useScopeComplete } from '../scope/useDashboardScope';

// SMMM Context Info for VDK Panel
const VDK_SMMM_INFO = {
  title: 'VDK Risk Analizi Nedir?',
  description: 'Vergi Denetim Kurulu inceleme kriterleri analizi',
  context: [
    'Bu analiz, VDK\'nin vergi incelemelerinde kullandığı KURGAN ve RAM kriterlerine göre mükellefin risk profilini değerlendirir.',
    'KURGAN: Kurumsal Risk Analiz Modeli - Makro düzeyde firma analizi. Sahte belge ile mücadele kapsamında değerlendirilir.',
    'RAM: Risk Analiz Modeli - Detaylı işlem bazlı inceleme kriterleri.',
    'Yüksek risk skoru, vergi incelemesine alınma olasılığının yüksek olduğunu gösterir.',
  ],
  actions: [
    'Kritik seviyedeki kontrolleri hemen inceleyin',
    '5 Why analizi ile kök nedeni bulun',
    'Düzeltici işlem planı oluşturun',
    'Belgelendirmeyi tamamlayın',
  ],
  riskLevels: {
    LOW: 'Düşük risk - Rutin kontrol yeterli',
    MEDIUM: 'Orta risk - Yakın takip öneriliyor',
    HIGH: 'Yüksek risk - Acil aksiyon gerekli',
    CRITICAL: 'Kritik risk - Öncelikli müdahale şart',
  },
};

// Types
interface VdkCriterion {
  id: string;
  code: string;
  name_tr: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  score?: number;
  detail_tr?: string;
  recommendation_tr?: string;
  evidence?: Record<string, unknown>;
  legal_refs?: string[];
}

interface VdkResult {
  criteria: VdkCriterion[];
  total_score: number;
  max_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary_tr?: string;
}

// Helpers
function groupCriteria(criteria: VdkCriterion[]) {
  const kurgan = criteria.filter((c) => c.code.startsWith('K-'));
  const ram = criteria.filter((c) => c.code.startsWith('RAM-'));
  return { kurgan, ram };
}

function getStatusCounts(criteria: VdkCriterion[]) {
  return {
    pass: criteria.filter((c) => c.status === 'pass').length,
    fail: criteria.filter((c) => c.status === 'fail').length,
    warning: criteria.filter((c) => c.status === 'warning').length,
    pending: criteria.filter((c) => c.status === 'pending').length,
  };
}

function extractRecommendations(criteria: VdkCriterion[]) {
  return criteria
    .filter((c) => c.recommendation_tr && c.status !== 'pass')
    .map((c) => ({
      code: c.code,
      text: c.recommendation_tr!,
      severity: c.severity || 'MEDIUM' as const,
    }));
}

function mapVdkStatus(s: unknown): VdkCriterion['status'] {
  const str = String(s).toLowerCase();
  if (str === 'pass' || str === 'ok' || str === 'true') return 'pass';
  if (str === 'fail' || str === 'false' || str === 'error') return 'fail';
  if (str === 'warning' || str === 'warn') return 'warning';
  return 'pending';
}

function calculateRiskLevel(score: number, maxScore: number): VdkResult['risk_level'] {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return 'LOW';
  if (pct >= 50) return 'MEDIUM';
  if (pct >= 25) return 'HIGH';
  return 'CRITICAL';
}

// Normalize API response to PanelEnvelope
function normalizeVdk(raw: unknown): PanelEnvelope<VdkResult> {
  return normalizeToEnvelope<VdkResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    // Handle kurgan-risk response format
    const riskDetail = data?.risk_detail || data?.details || data?.criteria || [];
    const criteria: VdkCriterion[] = Array.isArray(riskDetail)
      ? riskDetail.map((c: Record<string, unknown>, idx: number) => ({
          id: String(c.id || `vdk-${idx}`),
          code: String(c.code || c.criterion_code || c.rule_id || `K${idx + 1}`),
          name_tr: String(c.name_tr || c.criterion_name || c.title || c.description || 'Kriter'),
          status: mapVdkStatus(c.status || c.result),
          severity: c.severity ? String(c.severity) as VdkCriterion['severity'] : undefined,
          score: typeof c.score === 'number' ? c.score : typeof c.points === 'number' ? c.points : undefined,
          detail_tr: c.detail_tr ? String(c.detail_tr) : c.reason ? String(c.reason) : undefined,
          recommendation_tr: c.recommendation_tr ? String(c.recommendation_tr) : undefined,
          evidence: c.evidence as Record<string, unknown> | undefined,
          legal_refs: Array.isArray(c.legal_refs) ? c.legal_refs.map(String) : undefined,
        }))
      : [];

    const summary = data?.summary as Record<string, unknown> | undefined;
    const totalScore = typeof summary?.total_score === 'number' ? summary.total_score
      : typeof data?.total_score === 'number' ? data.total_score
      : criteria.reduce((acc, c) => acc + (c.score || 0), 0);

    const maxScore = typeof summary?.max_score === 'number' ? summary.max_score : criteria.length * 10;

    const rawLevel = String(data?.risk_level || summary?.risk_level || '');
    const riskLevel = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(rawLevel)
      ? rawLevel as VdkResult['risk_level']
      : calculateRiskLevel(totalScore, maxScore);

    return {
      criteria,
      total_score: totalScore,
      max_score: maxScore,
      risk_level: riskLevel,
      summary_tr: summary?.summary_tr ? String(summary.summary_tr) : undefined,
    };
  });
}

// SMMM Info Modal Component
function SmmmInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-[#E6F9FF] border-b border-[#ABEBFF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#E6F9FF]">
              <BookOpen className="w-6 h-6 text-[#0049AA]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#00287F]">{VDK_SMMM_INFO.title}</h2>
              <p className="text-sm text-[#5A5A5A]">{VDK_SMMM_INFO.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Context */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">SMMM Icin Onemli Bilgiler</h3>
            <ul className="space-y-2">
              {VDK_SMMM_INFO.context.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#5A5A5A]">
                  <CheckCircle2 className="w-4 h-4 text-[#0078D0] flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risk Levels */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">Risk Seviyeleri</h3>
            <div className="space-y-2">
              {Object.entries(VDK_SMMM_INFO.riskLevels).map(([level, desc]) => (
                <div key={level} className={`p-2 rounded text-sm ${
                  level === 'LOW' ? 'bg-[#ECFDF5] text-[#00804D]' :
                  level === 'MEDIUM' ? 'bg-[#FFFBEB] text-[#FA841E]' :
                  level === 'HIGH' ? 'bg-[#FFFBEB] text-[#FA841E]' :
                  'bg-[#FEF2F2] text-[#BF192B]'
                }`}>
                  <strong>{level}:</strong> {desc}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3">
            <h3 className="text-sm font-semibold text-[#00287F] mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SMMM Olarak Ne Yapmalisiniz?
            </h3>
            <ul className="space-y-1">
              {VDK_SMMM_INFO.actions.map((action, i) => (
                <li key={i} className="text-sm text-[#5A5A5A] pl-4 border-l-2 border-[#5ED6FF]">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors"
          >
            Anladim
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function VdkExpertPanel() {
  // SMMM GÜVENİ: Scope kontrolü
  const scopeComplete = useScopeComplete();

  const [showSmmmInfo, setShowSmmmInfo] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  // SMMM GÜVENİ: Scope yoksa veri çekme
  const envelope = useFailSoftFetch<VdkResult>(
    scopeComplete ? ENDPOINTS.KURGAN_RISK : null,
    normalizeVdk
  );
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  // SMMM GÜVENİ: Scope yoksa uyarı göster
  if (!scopeComplete) {
    return (
      <Card title="VDK Risk Analizi" subtitle="13 Kriter Değerlendirmesi">
        <div className="py-8 text-center">
          <span className="text-4xl mb-4 block">🎯</span>
          <p className="text-sm text-[#969696]">Dönem seçildikten sonra VDK risk analizi görünecektir.</p>
        </div>
      </Card>
    );
  }

  const { kurgan, ram } = useMemo(
    () => groupCriteria(data?.criteria || []),
    [data?.criteria]
  );

  const statusCounts = useMemo(
    () => getStatusCounts(data?.criteria || []),
    [data?.criteria]
  );

  const recommendations = useMemo(
    () => extractRecommendations(data?.criteria || []),
    [data?.criteria]
  );

  const passCount = statusCounts.pass;
  const failCount = statusCounts.fail;

  return (
    <>
    <Card
      title={
        <span className="flex items-center gap-2">
          VDK Risk Analizi
          <button
            onClick={() => setShowSmmmInfo(true)}
            className="text-[#969696] hover:text-[#0049AA] transition-colors"
            title="SMMM Rehberi"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </span>
      }
      subtitle="KURGAN + RAM Kriterleri (25 Kriter)"
      headerAction={
        data && (
          <div className="flex items-center gap-2">
            <span className="bg-[#ECFDF5] text-[#00804D] text-xs px-2 py-0.5 rounded">
              {passCount} gecti
            </span>
            {failCount > 0 && (
              <span className="bg-[#FEF2F2] text-[#BF192B] text-xs px-2 py-0.5 rounded">
                {failCount} basarisiz
              </span>
            )}
          </div>
        )
      }
    >
      <PanelState status={status} reason_tr={reason_tr}>
        {data && (
          <div>
            {/* Risk Score Summary */}
            <RiskScoreSummary
              totalScore={data.total_score}
              maxScore={data.max_score}
              riskLevel={data.risk_level}
              statusCounts={statusCounts}
            />

            {/* Summary Text */}
            {data.summary_tr && (
              <p className="text-sm text-[#5A5A5A] mb-6 italic">
                {data.summary_tr}
              </p>
            )}

            {/* KURGAN Section */}
            {kurgan.length > 0 && (
              <CriteriaSection
                title="KURGAN Kriterleri"
                subtitle="HMB Sahte Belge ile Mucadele (Genelge 18.04.2025)"
                criteria={kurgan}
                icon="K"
                defaultExpanded={true}
              />
            )}

            {/* RAM Section */}
            {ram.length > 0 && (
              <CriteriaSection
                title="RAM Kriterleri"
                subtitle="VDK Risk Analizi Modeli (646 KHK)"
                criteria={ram}
                icon="R"
                defaultExpanded={true}
              />
            )}

            {/* Recommendations */}
            <RecommendationsPanel recommendations={recommendations} />

            {/* Footer with Neden? button */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#E5E5E5]">
              <TrustBadge trust={trust} />
              {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) && (
                <button
                  onClick={() => setShowExplain(true)}
                  className="text-xs text-[#0049AA] hover:text-[#00287F] font-medium"
                >
                  Neden? →
                </button>
              )}
            </div>
          </div>
        )}
      </PanelState>
    </Card>

    <ExplainModal
      isOpen={showExplain}
      onClose={() => setShowExplain(false)}
      title="VDK Risk Analizi"
      analysis={analysis}
      trust={trust}
      legalBasisRefs={legal_basis_refs}
      evidenceRefs={evidence_refs}
      meta={meta}
    />

    <SmmmInfoModal isOpen={showSmmmInfo} onClose={() => setShowSmmmInfo(false)} />
    </>
  );
}
