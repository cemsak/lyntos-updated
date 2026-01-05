'use client';

import React, { useMemo } from 'react';
import { Card } from '../shared/Card';
import { PanelState } from '../shared/PanelState';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import {
  RiskScoreSummary,
  CriteriaSection,
  RecommendationsPanel,
} from './vdk';

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

// Main Component
export function VdkExpertPanel() {
  const envelope = useFailSoftFetch<VdkResult>(ENDPOINTS.KURGAN_RISK, normalizeVdk);
  const { status, reason_tr, data } = envelope;

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
    <Card
      title="VDK Risk Analizi"
      subtitle="KURGAN + RAM Kriterleri (25 Kriter)"
      headerAction={
        data && (
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
              {passCount} gecti
            </span>
            {failCount > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">
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
              <p className="text-sm text-slate-600 mb-6 italic">
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
          </div>
        )}
      </PanelState>
    </Card>
  );
}
