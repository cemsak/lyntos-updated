'use client';
import React, { useState } from 'react';
import { Card } from '../shared/Card';
import { Badge, TrustBadge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

interface CrossCheckItem {
  id: string;
  check_type: 'kdv' | 'e_fatura' | 'banka' | 'beyan' | 'other';
  source_label: string;
  target_label: string;
  source_amount: number;
  target_amount: number;
  difference: number;
  difference_pct: number;
  status: 'match' | 'minor' | 'major' | 'critical';
  explanation_tr?: string;
}

interface CrossCheckResult {
  checks: CrossCheckItem[];
  summary: {
    total: number;
    matched: number;
    discrepancies: number;
    critical: number;
  };
}

function normalizeCrossCheck(raw: unknown): PanelEnvelope<CrossCheckResult> {
  return normalizeToEnvelope<CrossCheckResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const checksRaw = data?.checks || data?.items || data?.comparisons || [];
    const checks: CrossCheckItem[] = Array.isArray(checksRaw)
      ? checksRaw.map((c: Record<string, unknown>, idx: number) => ({
          id: String(c.id || `cc-${idx}`),
          check_type: mapCheckType(c.type || c.check_type),
          source_label: String(c.source_label || c.source || 'Kaynak'),
          target_label: String(c.target_label || c.target || 'Hedef'),
          source_amount: typeof c.source_amount === 'number' ? c.source_amount : 0,
          target_amount: typeof c.target_amount === 'number' ? c.target_amount : 0,
          difference: typeof c.difference === 'number' ? c.difference : 0,
          difference_pct: typeof c.difference_pct === 'number' ? c.difference_pct : 0,
          status: mapStatus(c.status || c.result),
          explanation_tr: c.explanation_tr ? String(c.explanation_tr) : undefined,
        }))
      : [];

    const summaryRaw = data?.summary as Record<string, unknown> | undefined;
    const matched = checks.filter(c => c.status === 'match').length;
    const critical = checks.filter(c => c.status === 'critical').length;

    return {
      checks,
      summary: {
        total: checks.length,
        matched: typeof summaryRaw?.matched === 'number' ? summaryRaw.matched : matched,
        discrepancies: typeof summaryRaw?.discrepancies === 'number' ? summaryRaw.discrepancies : checks.length - matched,
        critical: typeof summaryRaw?.critical === 'number' ? summaryRaw.critical : critical,
      },
    };
  });
}

function mapCheckType(t: unknown): CrossCheckItem['check_type'] {
  const str = String(t).toLowerCase();
  if (str.includes('kdv')) return 'kdv';
  if (str.includes('fatura') || str.includes('e-fatura') || str.includes('efatura')) return 'e_fatura';
  if (str.includes('bank') || str.includes('banka')) return 'banka';
  if (str.includes('beyan')) return 'beyan';
  return 'other';
}

function mapStatus(s: unknown): CrossCheckItem['status'] {
  const str = String(s).toLowerCase();
  if (str === 'match' || str === 'ok' || str === 'esit') return 'match';
  if (str === 'minor' || str === 'warning') return 'minor';
  if (str === 'major') return 'major';
  if (str === 'critical' || str === 'error') return 'critical';
  return 'minor';
}

const CHECK_TYPE_LABELS: Record<CrossCheckItem['check_type'], string> = {
  kdv: 'KDV',
  e_fatura: 'e-Fatura',
  banka: 'Banka',
  beyan: 'Beyanname',
  other: 'Diger',
};

const STATUS_CONFIG: Record<CrossCheckItem['status'], { badge: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
  match: { badge: 'success', label: 'Eslesme' },
  minor: { badge: 'warning', label: 'Kucuk Fark' },
  major: { badge: 'error', label: 'Buyuk Fark' },
  critical: { badge: 'error', label: 'Kritik' },
};

export function CrossCheckPanel() {
  const [showExplain, setShowExplain] = useState(false);
  const envelope = useFailSoftFetch<CrossCheckResult>(ENDPOINTS.CROSS_CHECK, normalizeCrossCheck);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  const formatAmount = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  return (
    <>
      <Card
        title="Cross-Check Matrisi"
        subtitle="Mizan vs KDV / e-Fatura / Banka"
        headerAction={
          data && (
            <div className="flex items-center gap-2">
              <Badge variant="success">{data.summary.matched} eslesti</Badge>
              {data.summary.critical > 0 && (
                <Badge variant="error">{data.summary.critical} kritik</Badge>
              )}
            </div>
          )
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {data && (
            <div className="space-y-3">
              {/* Summary Bar */}
              <div className="grid grid-cols-4 gap-2 text-center p-2 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-lg font-bold text-slate-900">{data.summary.total}</p>
                  <p className="text-xs text-slate-500">Toplam</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{data.summary.matched}</p>
                  <p className="text-xs text-slate-500">Eslesen</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{data.summary.discrepancies}</p>
                  <p className="text-xs text-slate-500">Uyumsuz</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{data.summary.critical}</p>
                  <p className="text-xs text-slate-500">Kritik</p>
                </div>
              </div>

              {/* Check Items Table */}
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-slate-600">Tip</th>
                      <th className="text-left p-2 font-medium text-slate-600">Karsilastirma</th>
                      <th className="text-right p-2 font-medium text-slate-600">Fark</th>
                      <th className="text-center p-2 font-medium text-slate-600">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.checks.map((check) => (
                      <tr key={check.id} className="hover:bg-slate-50">
                        <td className="p-2">
                          <Badge variant="default">{CHECK_TYPE_LABELS[check.check_type]}</Badge>
                        </td>
                        <td className="p-2">
                          <p className="text-slate-900">{check.source_label} vs {check.target_label}</p>
                          <p className="text-xs text-slate-500">
                            {formatAmount(check.source_amount)} / {formatAmount(check.target_amount)}
                          </p>
                        </td>
                        <td className="p-2 text-right">
                          <p className={`font-medium ${check.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatAmount(check.difference)}
                          </p>
                          <p className="text-xs text-slate-400">%{check.difference_pct.toFixed(1)}</p>
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant={STATUS_CONFIG[check.status].badge}>
                            {STATUS_CONFIG[check.status].label}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <TrustBadge trust={trust} />
                {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) && (
                  <button
                    onClick={() => setShowExplain(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
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
        title="Cross-Check Analizi"
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={meta}
      />
    </>
  );
}
