'use client';
import React from 'react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

interface MissingItem {
  id: string;
  type: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
  deadline?: string;
}

interface MissingDataResult {
  items: MissingItem[];
  total: number;
  completeness_score: number;
}

function normalizeMissingData(raw: unknown): PanelEnvelope<MissingDataResult> {
  return normalizeToEnvelope<MissingDataResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    // Extract from data-quality response
    const missing = data?.missing_documents || data?.missing_data || data?.items || [];
    const items: MissingItem[] = Array.isArray(missing)
      ? missing.map((item: Record<string, unknown>, idx: number) => ({
          id: String(item.id || `missing-${idx}`),
          type: String(item.type || item.doc_type || 'Belge'),
          description: String(item.description || item.title || item.name || 'Eksik veri'),
          impact: (item.impact || item.priority || 'medium') as MissingItem['impact'],
          action: String(item.action || item.cta || 'Yukle'),
          deadline: item.deadline ? String(item.deadline) : undefined,
        }))
      : [];

    const completeness = typeof data?.completeness_score === 'number'
      ? data.completeness_score
      : typeof data?.score === 'number'
        ? data.score
        : 100 - (items.length * 10);

    return {
      items,
      total: items.length,
      completeness_score: Math.max(0, Math.min(100, completeness)),
    };
  });
}

export function MissingDataPanel() {
  const envelope = useFailSoftFetch<MissingDataResult>(ENDPOINTS.DATA_QUALITY, normalizeMissingData);
  const { status, reason_tr, data } = envelope;

  const getImpactBadge = (impact: MissingItem['impact']) => {
    const config = {
      high: { variant: 'error' as const, label: 'Yuksek Etki' },
      medium: { variant: 'warning' as const, label: 'Orta Etki' },
      low: { variant: 'default' as const, label: 'Dusuk Etki' },
    };
    return <Badge variant={config[impact].variant}>{config[impact].label}</Badge>;
  };

  return (
    <Card
      title="Eksik Veri & Belgeler"
      subtitle={data ? `${data.completeness_score}% tamamlandi` : undefined}
      headerAction={
        data && data.total > 0 && (
          <Badge variant="warning">{data.total} eksik</Badge>
        )
      }
    >
      <PanelState status={status} reason_tr={reason_tr}>
        {data && data.completeness_score >= 100 && data.items.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-3xl">P</span>
            <p className="text-sm text-green-600 mt-2">Tum veriler tam!</p>
          </div>
        ) : data && data.items.length === 0 && data.completeness_score < 100 ? (
          <div className="text-center py-6">
            <span className="text-3xl">!</span>
            <p className="text-sm text-amber-600 mt-2">Veri yuklenmesi bekleniyor</p>
            <p className="text-xs text-slate-500 mt-1">Eksik belgeler icin Upload modulunu kullanin</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data?.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {item.description}
                    </span>
                    {getImpactBadge(item.impact)}
                  </div>
                  <p className="text-xs text-slate-500">
                    {item.type}
                    {item.deadline && ` • Son: ${item.deadline}`}
                  </p>
                </div>
                <button className="ml-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap">
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        )}
      </PanelState>
    </Card>
  );
}
