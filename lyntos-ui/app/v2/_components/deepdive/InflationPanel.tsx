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

interface InflationItem {
  id: string;
  hesap_grubu: string;
  hesap_grubu_tr: string;
  original_amount: number;
  adjusted_amount: number;
  adjustment_factor: number;
  difference: number;
  method: 'TMS29' | 'VUK_GEC33' | 'MIXED';
}

interface InflationResult {
  items: InflationItem[];
  summary: {
    total_original: number;
    total_adjusted: number;
    total_difference: number;
    effective_rate: number;
    method_used: string;
  };
  applicable: boolean;
  threshold_met: boolean;
}

function normalizeInflation(raw: unknown): PanelEnvelope<InflationResult> {
  return normalizeToEnvelope<InflationResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const itemsRaw = data?.items || data?.adjustments || data?.hesaplar || [];
    const items: InflationItem[] = Array.isArray(itemsRaw)
      ? itemsRaw.map((item: Record<string, unknown>, idx: number) => ({
          id: String(item.id || `inf-${idx}`),
          hesap_grubu: String(item.hesap_grubu || item.group_code || item.code || ''),
          hesap_grubu_tr: String(item.hesap_grubu_tr || item.group_name || item.name || ''),
          original_amount: typeof item.original_amount === 'number' ? item.original_amount : typeof item.original === 'number' ? item.original : 0,
          adjusted_amount: typeof item.adjusted_amount === 'number' ? item.adjusted_amount : typeof item.adjusted === 'number' ? item.adjusted : 0,
          adjustment_factor: typeof item.adjustment_factor === 'number' ? item.adjustment_factor : typeof item.factor === 'number' ? item.factor : 1,
          difference: typeof item.difference === 'number' ? item.difference : 0,
          method: mapMethod(item.method),
        }))
      : [];

    const summaryRaw = data?.summary as Record<string, unknown> | undefined;
    const totalOriginal = items.reduce((sum, i) => sum + i.original_amount, 0);
    const totalAdjusted = items.reduce((sum, i) => sum + i.adjusted_amount, 0);

    return {
      items,
      summary: {
        total_original: typeof summaryRaw?.total_original === 'number' ? summaryRaw.total_original : totalOriginal,
        total_adjusted: typeof summaryRaw?.total_adjusted === 'number' ? summaryRaw.total_adjusted : totalAdjusted,
        total_difference: typeof summaryRaw?.total_difference === 'number' ? summaryRaw.total_difference : totalAdjusted - totalOriginal,
        effective_rate: typeof summaryRaw?.effective_rate === 'number' ? summaryRaw.effective_rate : 0,
        method_used: String(summaryRaw?.method_used || 'VUK_GEC33'),
      },
      applicable: typeof data?.applicable === 'boolean' ? data.applicable : true,
      threshold_met: typeof data?.threshold_met === 'boolean' ? data.threshold_met : true,
    };
  });
}

function mapMethod(m: unknown): InflationItem['method'] {
  const str = String(m).toUpperCase();
  if (str.includes('TMS') || str.includes('29')) return 'TMS29';
  if (str.includes('VUK') || str.includes('33') || str.includes('GECICI')) return 'VUK_GEC33';
  return 'MIXED';
}

const METHOD_LABELS: Record<InflationItem['method'], { label: string; badge: 'info' | 'success' | 'warning' }> = {
  TMS29: { label: 'TMS 29', badge: 'info' },
  VUK_GEC33: { label: 'VUK Gec. 33', badge: 'success' },
  MIXED: { label: 'Karma', badge: 'warning' },
};

export function InflationPanel() {
  const [showExplain, setShowExplain] = useState(false);
  const envelope = useFailSoftFetch<InflationResult>(ENDPOINTS.INFLATION_ADJUSTMENT, normalizeInflation);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  const formatCurrency = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  const formatPct = (n: number) => `%${(n * 100).toFixed(2)}`;

  return (
    <>
      <Card
        title="Enflasyon Muhasebesi"
        subtitle="TMS 29 & VUK Gecici 33"
        headerAction={
          data && (
            <div className="flex items-center gap-2">
              {data.applicable ? (
                <Badge variant="info">Uygulanabilir</Badge>
              ) : (
                <Badge variant="default">Uygulanamaz</Badge>
              )}
              <Badge variant={METHOD_LABELS[data.summary.method_used as InflationItem['method']]?.badge || 'default'}>
                {METHOD_LABELS[data.summary.method_used as InflationItem['method']]?.label || data.summary.method_used}
              </Badge>
            </div>
          )
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {data && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Duzeltme Oncesi</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(data.summary.total_original)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Duzeltme Sonrasi</p>
                  <p className="text-lg font-bold text-indigo-700">{formatCurrency(data.summary.total_adjusted)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Toplam Etki</p>
                  <p className={`text-sm font-bold ${data.summary.total_difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.summary.total_difference >= 0 ? '+' : ''}{formatCurrency(data.summary.total_difference)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Efektif Oran</p>
                  <p className="text-sm font-bold text-slate-700">{formatPct(data.summary.effective_rate)}</p>
                </div>
              </div>

              {/* Not Applicable Warning */}
              {!data.applicable && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    Enflasyon muhasebesi kosullari karsilanmiyor veya esik degerine ulasilmamis.
                  </p>
                </div>
              )}

              {/* Items Table */}
              {data.items.length > 0 && (
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-slate-600">Hesap Grubu</th>
                        <th className="text-right p-2 font-medium text-slate-600">Orijinal</th>
                        <th className="text-right p-2 font-medium text-slate-600">Duzeltilmis</th>
                        <th className="text-center p-2 font-medium text-slate-600">Yontem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2">
                            <p className="font-mono text-xs text-slate-400">{item.hesap_grubu}</p>
                            <p className="text-slate-900">{item.hesap_grubu_tr}</p>
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700">
                            {formatCurrency(item.original_amount)}
                          </td>
                          <td className="p-2 text-right">
                            <p className="font-mono text-indigo-700">{formatCurrency(item.adjusted_amount)}</p>
                            <p className="text-xs text-slate-400">x{item.adjustment_factor.toFixed(4)}</p>
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={METHOD_LABELS[item.method].badge}>
                              {METHOD_LABELS[item.method].label}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

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
        title="Enflasyon Muhasebesi Analizi"
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={meta}
      />
    </>
  );
}
