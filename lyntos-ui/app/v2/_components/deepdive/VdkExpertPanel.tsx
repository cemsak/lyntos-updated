'use client';
import React, { useState } from 'react';
import { Card } from '../shared/Card';
import { Badge, TrustBadge, RiskBadge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

interface VdkCriterion {
  id: string;
  code: string;
  name_tr: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  score?: number;
  detail_tr?: string;
}

interface VdkResult {
  criteria: VdkCriterion[];
  total_score: number;
  max_score: number;
  risk_level: string;
  summary_tr?: string;
}

function normalizeVdk(raw: unknown): PanelEnvelope<VdkResult> {
  return normalizeToEnvelope<VdkResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    // Handle kurgan-risk response format
    const riskDetail = data?.risk_detail || data?.details || data?.criteria || [];
    const criteria: VdkCriterion[] = Array.isArray(riskDetail)
      ? riskDetail.map((c: Record<string, unknown>, idx: number) => ({
          id: String(c.id || `vdk-${idx}`),
          code: String(c.code || c.criterion_code || `K${idx + 1}`),
          name_tr: String(c.name_tr || c.criterion_name || c.title || c.description || 'Kriter'),
          status: mapVdkStatus(c.status || c.result),
          score: typeof c.score === 'number' ? c.score : typeof c.points === 'number' ? c.points : undefined,
          detail_tr: c.detail_tr ? String(c.detail_tr) : c.reason ? String(c.reason) : undefined,
        }))
      : [];

    const summary = data?.summary as Record<string, unknown> | undefined;
    const totalScore = typeof summary?.total_score === 'number' ? summary.total_score
      : typeof data?.total_score === 'number' ? data.total_score
      : criteria.reduce((acc, c) => acc + (c.score || 0), 0);

    return {
      criteria,
      total_score: totalScore,
      max_score: typeof summary?.max_score === 'number' ? summary.max_score : criteria.length * 10,
      risk_level: String(data?.risk_level || summary?.risk_level || calculateRiskLevel(totalScore, criteria.length * 10)),
      summary_tr: summary?.summary_tr ? String(summary.summary_tr) : undefined,
    };
  });
}

function mapVdkStatus(s: unknown): VdkCriterion['status'] {
  const str = String(s).toLowerCase();
  if (str === 'pass' || str === 'ok' || str === 'true') return 'pass';
  if (str === 'fail' || str === 'false' || str === 'error') return 'fail';
  if (str === 'warning' || str === 'warn') return 'warning';
  return 'pending';
}

function calculateRiskLevel(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return 'LOW';
  if (pct >= 50) return 'MEDIUM';
  return 'HIGH';
}

export function VdkExpertPanel() {
  const [selectedCriterion, setSelectedCriterion] = useState<VdkCriterion | null>(null);
  const envelope = useFailSoftFetch<VdkResult>(ENDPOINTS.KURGAN_RISK, normalizeVdk);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  const getStatusIcon = (s: VdkCriterion['status']) => {
    const config = {
      pass: { icon: 'P', color: 'text-green-600 bg-green-100' },
      fail: { icon: 'X', color: 'text-red-600 bg-red-100' },
      warning: { icon: '!', color: 'text-amber-600 bg-amber-100' },
      pending: { icon: '?', color: 'text-slate-400 bg-slate-100' },
    };
    return config[s];
  };

  const passCount = data?.criteria.filter(c => c.status === 'pass').length || 0;
  const failCount = data?.criteria.filter(c => c.status === 'fail').length || 0;

  return (
    <>
      <Card
        title="VDK Uzman Analizi"
        subtitle="13 Kriter Risk Degerlendirmesi"
        headerAction={
          data && (
            <div className="flex items-center gap-2">
              <Badge variant="success">{passCount} gecti</Badge>
              {failCount > 0 && <Badge variant="error">{failCount} basarisiz</Badge>}
              <RiskBadge level={data.risk_level} />
            </div>
          )
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {data && (
            <div className="space-y-4">
              {/* Score Summary */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Toplam Puan</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {data.total_score} <span className="text-sm font-normal text-slate-500">/ {data.max_score}</span>
                  </p>
                </div>
                <TrustBadge trust={trust} />
              </div>

              {/* Criteria List */}
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {data.criteria.map((criterion) => {
                  const statusConfig = getStatusIcon(criterion.status);
                  return (
                    <div
                      key={criterion.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                      onClick={() => setSelectedCriterion(criterion)}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${statusConfig.color}`}>
                        {statusConfig.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{criterion.code}</span>
                          <span className="text-sm text-slate-900 truncate">{criterion.name_tr}</span>
                        </div>
                      </div>
                      {criterion.score !== undefined && (
                        <span className="text-xs font-medium text-slate-500">{criterion.score} puan</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer with Explain */}
              {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) && (
                <div className="pt-3 border-t border-slate-100 text-right">
                  <button
                    onClick={() => setSelectedCriterion(data.criteria[0] || null)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Detayli Analiz →
                  </button>
                </div>
              )}
            </div>
          )}
        </PanelState>
      </Card>

      {/* Explain Modal for selected criterion */}
      {selectedCriterion && (
        <ExplainModal
          isOpen={!!selectedCriterion}
          onClose={() => setSelectedCriterion(null)}
          title={`${selectedCriterion.code}: ${selectedCriterion.name_tr}`}
          analysis={analysis}
          trust={trust}
          legalBasisRefs={legal_basis_refs}
          evidenceRefs={evidence_refs}
          meta={meta}
        />
      )}
    </>
  );
}
