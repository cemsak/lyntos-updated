'use client';
import React, { useState } from 'react';
import type { PanelEnvelope } from '../contracts/envelope';
import { PanelState, StatusBadge } from '../shared/PanelState';
import { RiskBadge, TrustBadge } from '../shared/Badge';
import { ExplainModal } from './ExplainModal';

export interface KpiData {
  value: number | string;
  label: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  risk_level?: string;
}

interface KpiCardProps {
  title: string;
  envelope: PanelEnvelope<KpiData>;
  icon?: string;
  onRefresh?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

export function KpiCard({ title, envelope, icon, onRefresh, onClick, compact }: KpiCardProps) {
  const [showExplain, setShowExplain] = useState(false);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs } = envelope;

  const renderValue = () => {
    if (status !== 'ok' || !data) return <span className="text-2xl font-semibold text-slate-300">—</span>;

    return (
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900">{data.value}</span>
        {data.unit && <span className="text-sm text-slate-500">{data.unit}</span>}
      </div>
    );
  };

  const renderTrend = () => {
    if (status !== 'ok' || !data?.trend) return null;
    const icons = { up: '↑', down: '↓', stable: '→' };
    const colors = { up: 'text-green-600', down: 'text-red-600', stable: 'text-slate-500' };
    return <span className={`text-sm ${colors[data.trend]}`}>{icons[data.trend]}</span>;
  };

  return (
    <>
      <div
        className={`bg-white border border-slate-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && <span className="text-lg">{icon}</span>}
            <h3 className="text-xs font-medium text-slate-600 uppercase tracking-wide">{title}</h3>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Value */}
        <PanelState status={status} reason_tr={reason_tr}>
          <div className="flex items-center justify-between">
            <div>
              {renderValue()}
              {data?.label && <p className="text-xs text-slate-500 mt-1">{data.label}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              {renderTrend()}
              {data?.risk_level && <RiskBadge level={data.risk_level} />}
            </div>
          </div>
        </PanelState>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <TrustBadge trust={trust} />
          {/* Only show Neden? if there's analysis or legal basis */}
          {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) ? (
            <button
              onClick={() => setShowExplain(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              disabled={status !== 'ok'}
            >
              Neden? →
            </button>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      </div>

      {/* Explain Modal */}
      <ExplainModal
        isOpen={showExplain}
        onClose={() => setShowExplain(false)}
        title={title}
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={envelope.meta}
      />
    </>
  );
}
