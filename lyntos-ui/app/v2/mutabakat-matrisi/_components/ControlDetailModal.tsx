'use client';

import React, { useState } from 'react';
import { X, FileSearch, Search, Zap, ClipboardList } from 'lucide-react';
import { Badge } from '../../_components/shared/Badge';
import { ImpactTag } from './ImpactTag';
import { ConfidenceSplitDisplay } from './ConfidenceSplit';
import { TrendIndicator } from './TrendIndicator';
import { RootCauseTag } from './RootCauseTag';
import { SmmmKararDropdown } from './SmmmKararDropdown';
import { EvidenceTab } from './EvidenceTab';
import { RootCauseTab } from './RootCauseTab';
import { ActionTab } from './ActionTab';
import type { EnrichedCrossCheck, SmmmKarar } from '../_types/crossCheck';
import { STATUS_CONFIG } from '../_types/crossCheck';

type DetailTab = 'ozet' | 'kanit' | 'neden' | 'aksiyon';

const TABS: { value: DetailTab; label: string; icon: React.ReactNode }[] = [
  { value: 'ozet', label: 'Ozet', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { value: 'kanit', label: 'Kanit', icon: <FileSearch className="w-3.5 h-3.5" /> },
  { value: 'neden', label: 'Neden Analizi', icon: <Search className="w-3.5 h-3.5" /> },
  { value: 'aksiyon', label: 'Aksiyon', icon: <Zap className="w-3.5 h-3.5" /> },
];

interface ControlDetailModalProps {
  check: EnrichedCrossCheck | null;
  onClose: () => void;
  onKararChange: (checkId: string, karar: SmmmKarar, not: string) => void;
}

export function ControlDetailModal({ check, onClose, onKararChange }: ControlDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('ozet');

  if (!check) return null;

  const statusCfg = STATUS_CONFIG[check.status];
  const evidenceEntries = check.evidence ? Object.entries(check.evidence) : [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Slide-over */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="control-detail-modal-title"
        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-slide-up"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8] flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 id="control-detail-modal-title" className="text-lg font-semibold text-[#2E2E2E] truncate">
                  {check.check_name_tr}
                </h3>
                <Badge variant={statusCfg.badgeVariant} size="sm" style="soft">
                  {statusCfg.label}
                </Badge>
                {check.trend && <TrendIndicator trend={check.trend} />}
              </div>
              <div className="flex items-center gap-2">
                <RootCauseTag neden={check.rootCause.neden} />
                <p className="text-sm text-[#5A5A5A]">{check.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#E5E5E5] rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-[#5A5A5A]" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-3 -mb-4 px-0">
            {TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.value
                    ? 'bg-white text-[#0078D0] border-b-2 border-[#0078D0]'
                    : 'text-[#969696] hover:text-[#5A5A5A] hover:bg-[#E5E5E5]/50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.value === 'kanit' && (
                  <span className="text-[10px] bg-[#E5E5E5] rounded-full px-1.5">{evidenceEntries.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tab: Ozet */}
          {activeTab === 'ozet' && (
            <>
              {/* Impact */}
              <div>
                <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Etki</h4>
                <ImpactTag
                  amount={check.difference}
                  severity={check.severity}
                  percentage={check.difference_percent}
                />
              </div>

              {/* Source vs Target comparison */}
              <div>
                <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Karsilastirma</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F5F6F8] rounded-lg p-4">
                    <div className="text-xs text-[#969696] mb-1">{check.source_label || 'Kaynak'}</div>
                    <div className="text-xl font-mono font-bold text-[#2E2E2E]">
                      {check.source_value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                    </div>
                  </div>
                  <div className="bg-[#F5F6F8] rounded-lg p-4">
                    <div className="text-xs text-[#969696] mb-1">{check.target_label || 'Hedef'}</div>
                    <div className="text-xl font-mono font-bold text-[#2E2E2E]">
                      {check.target_value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                    </div>
                  </div>
                </div>
                <div className="mt-2 bg-[#FFFBEB] rounded-lg px-4 py-2 text-sm">
                  <span className="text-[#969696]">Fark: </span>
                  <span className="font-mono font-semibold text-[#E67324]">
                    {check.difference.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </span>
                  {check.difference_percent > 0 && (
                    <span className="text-[#969696] ml-2">(%{check.difference_percent.toFixed(1)})</span>
                  )}
                </div>
              </div>

              {/* Confidence Split */}
              <div>
                <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Guven Analizi</h4>
                <ConfidenceSplitDisplay confidence={check.confidence} />
              </div>

              {/* Message */}
              {check.message && (
                <div>
                  <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Aciklama</h4>
                  <p className="text-sm text-[#5A5A5A] bg-[#F5F6F8] rounded-lg p-3">{check.message}</p>
                </div>
              )}

              {/* Tolerance info */}
              <div className="border-t border-[#E5E5E5] pt-4">
                <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-2">Tolerans Bilgisi</h4>
                <div className="flex gap-4 text-xs text-[#969696]">
                  <span>Tutar: ±{check.tolerance_amount} TL</span>
                  <span>Yuzde: ±%{check.tolerance_percent}</span>
                </div>
              </div>
            </>
          )}

          {/* Tab: Kanit - Using separate component */}
          {activeTab === 'kanit' && <EvidenceTab check={check} />}

          {/* Tab: Neden Analizi - Using separate component */}
          {activeTab === 'neden' && <RootCauseTab check={check} />}

          {/* Tab: Aksiyon - Using separate component */}
          {activeTab === 'aksiyon' && <ActionTab check={check} />}
        </div>

        {/* Footer: SMMM Karar */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] bg-[#F5F6F8] flex-shrink-0">
          <SmmmKararDropdown
            currentKarar={check.smmmKarar}
            onKararChange={(karar, not) => onKararChange(check.check_id, karar, not)}
          />
        </div>
      </div>
    </>
  );
}
