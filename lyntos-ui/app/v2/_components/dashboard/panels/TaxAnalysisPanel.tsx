/**
 * TaxAnalysisPanel - Unified panel for Gecici & Kurumlar Vergisi
 * WHITE CARD style (no dark gradient)
 */

'use client';

import React from 'react';
import type { PanelEnvelope, TaxAnalysisData, TaxControl } from '../types';
import { PanelState, PanelSkeleton } from '../shared/PanelState';
import { BasePanel } from '../shared/BasePanel';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileDown,
  ChevronRight
} from 'lucide-react';

interface TaxAnalysisPanelProps {
  envelope: PanelEnvelope<TaxAnalysisData>;
  title: string;
  subtitle?: string;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onDetailClick?: () => void;
}

// Control status icon mapping
function ControlStatusIcon({ status }: { status: TaxControl['status'] }) {
  const iconMap = {
    passed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
    pending: <Clock className="w-4 h-4 text-slate-400" />,
    skipped: <Clock className="w-4 h-4 text-slate-300" />,
  };
  return iconMap[status] || iconMap.pending;
}

// Progress bar component
function ProgressBar({ passed, total }: { passed: number; total: number }) {
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{passed}/{total} Kontrol Tamamlandi</span>
        <span className="font-medium">%{percent}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Summary stats row
function SummaryStats({ data }: { data: TaxAnalysisData }) {
  const stats = [
    { label: 'Yuksek', value: data.summary?.highRisk || data.failedControls, color: 'text-red-600 bg-red-50' },
    { label: 'Orta', value: data.summary?.mediumRisk || data.warningControls, color: 'text-amber-600 bg-amber-50' },
    { label: 'Dusuk', value: data.summary?.lowRisk || data.passedControls, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="flex gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${stat.color.split(' ')[1]}`}
        >
          <span className={`text-lg font-bold ${stat.color.split(' ')[0]}`}>
            {stat.value}
          </span>
          <span className="text-xs text-slate-600">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export function TaxAnalysisPanel({
  envelope,
  title,
  subtitle,
  onExportPdf,
  onExportExcel,
  onDetailClick,
}: TaxAnalysisPanelProps) {
  // Calculate badge based on status
  const getBadgeFromData = (data: TaxAnalysisData) => {
    if (data.failedControls > 0) {
      return { text: `${data.failedControls} Sorun`, variant: 'error' as const };
    }
    if (data.warningControls > 0) {
      return { text: `${data.warningControls} Uyari`, variant: 'warning' as const };
    }
    return { text: 'Tamam', variant: 'success' as const };
  };

  // Actions for header
  const headerActions = (
    <div className="flex items-center gap-2">
      {onExportPdf && (
        <button
          onClick={onExportPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          PDF
        </button>
      )}
      {onExportExcel && (
        <button
          onClick={onExportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          Excel
        </button>
      )}
    </div>
  );

  return (
    <PanelState envelope={envelope} loadingSkeleton={<PanelSkeleton rows={5} />} minHeight="250px">
      {(data) => (
        <BasePanel
          title={title}
          subtitle={subtitle || data.period}
          badge={getBadgeFromData(data)}
          actions={headerActions}
          showInfo
        >
          {/* Progress Bar */}
          <div className="mb-5">
            <ProgressBar passed={data.passedControls} total={data.totalControls} />
          </div>

          {/* Summary Stats */}
          <div className="mb-5">
            <SummaryStats data={data} />
          </div>

          {/* Estimated Tax (if available) */}
          {data.estimatedTax !== undefined && (
            <div className="mb-5 p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-500 mb-1">Tahmini Vergi</div>
              <div className="text-2xl font-bold text-slate-800">
                {data.estimatedTax.toLocaleString('tr-TR')} TL
              </div>
            </div>
          )}

          {/* Controls List (Top 5) */}
          <div className="space-y-2">
            {data.controls.slice(0, 5).map((control) => (
              <div
                key={control.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ControlStatusIcon status={control.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">
                    {control.name}
                  </div>
                  {control.description && (
                    <div className="text-xs text-slate-500 truncate">
                      {control.description}
                    </div>
                  )}
                </div>
                {control.value && (
                  <div className="text-sm font-mono text-slate-600">
                    {control.value}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Detail Link */}
          {onDetailClick && data.controls.length > 5 && (
            <button
              onClick={onDetailClick}
              className="mt-4 w-full flex items-center justify-center gap-1 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Tum Kontrolleri Goruntule ({data.controls.length})
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </BasePanel>
      )}
    </PanelState>
  );
}

export default TaxAnalysisPanel;
