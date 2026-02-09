'use client';

import React from 'react';
import { Card } from '../../_components/shared/Card';
import { Badge } from '../../_components/shared/Badge';
import { ImpactTag } from './ImpactTag';
import { ConfidenceSplitDisplay } from './ConfidenceSplit';
import { TrendIndicator } from './TrendIndicator';
import { RootCauseTag } from './RootCauseTag';
import { FileSearch, BookOpen } from 'lucide-react';
import type { EnrichedCrossCheck } from '../_types/crossCheck';
import { STATUS_CONFIG, SMMM_KARAR_CONFIG } from '../_types/crossCheck';

interface ControlCardProps {
  check: EnrichedCrossCheck;
  onClick: () => void;
}

export function ControlCard({ check, onClick }: ControlCardProps) {
  const statusCfg = STATUS_CONFIG[check.status];
  const kararCfg = SMMM_KARAR_CONFIG[check.smmmKarar.karar];
  const evidenceCount = check.evidence ? Object.keys(check.evidence).length : 0;
  const nextAction = check.recommendation || 'Inceleme gerekli';
  const isNoData = check.status === 'no_data';
  const hasRealData = check.source_value !== 0 || check.target_value !== 0;

  return (
    <Card interactive onClick={onClick} className="h-full">
      <div className="space-y-3">
        {/* Header: Check name + status + trend */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#2E2E2E] line-clamp-2 flex-1">
            {check.check_name_tr}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {check.trend && !isNoData && <TrendIndicator trend={check.trend} />}
            <Badge variant={statusCfg.badgeVariant} size="xs" style="soft">
              {statusCfg.label}
            </Badge>
          </div>
        </div>

        {/* Root Cause Tag - hide for no_data */}
        {!isNoData && <RootCauseTag neden={check.rootCause.neden} />}

        {/* Source vs Target - show only if there's real data */}
        {hasRealData && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#F5F6F8] rounded-lg px-2.5 py-1.5">
              <div className="text-[#969696] truncate">{check.source_label || 'Kaynak'}</div>
              <div className="font-mono font-semibold text-[#2E2E2E]">
                {check.source_value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-[#F5F6F8] rounded-lg px-2.5 py-1.5">
              <div className="text-[#969696] truncate">{check.target_label || 'Hedef'}</div>
              <div className="font-mono font-semibold text-[#2E2E2E]">
                {check.target_value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* Impact Tag - show only for real comparisons */}
        {!isNoData && (
          <ImpactTag
            amount={check.difference}
            severity={check.severity}
            percentage={check.difference_percent}
          />
        )}

        {/* Confidence Split - hide for no_data */}
        {!isNoData && <ConfidenceSplitDisplay confidence={check.confidence} compact />}

        {/* Evidence + Legal refs - show only if there's evidence */}
        {evidenceCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="info" size="xs" style="soft" icon={<FileSearch className="w-3 h-3" />}>
              {evidenceCount} kanit
            </Badge>
            {check.recommendation && (
              <Badge variant="default" size="xs" style="soft" icon={<BookOpen className="w-3 h-3" />}>
                Oneri var
              </Badge>
            )}
          </div>
        )}

        {/* Next Best Action */}
        <div className="pt-2 border-t border-[#E5E5E5]">
          <p className="text-[10px] text-[#969696] uppercase tracking-wide mb-0.5">Sonraki Adim</p>
          <p className="text-xs text-[#5A5A5A] line-clamp-2">{nextAction}</p>
        </div>

        {/* SMMM Decision - hide for no_data (can't decide without data) */}
        {!isNoData && (
          <div className="pt-2 border-t border-[#E5E5E5]">
            <Badge variant={kararCfg.badgeVariant} size="xs" style="soft">
              {kararCfg.label}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
