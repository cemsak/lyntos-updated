'use client';

import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RiskBadge } from './RiskBadge';
import type { RiskLevel } from '@/lib/ui/design-tokens';

interface ActionCardProps {
  title: string;
  description: string;
  riskLevel: RiskLevel;
  source: string; // K-01, KRG-01, RAM-B01, etc.
  deadline?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDetail?: () => void;
  className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  riskLevel,
  source,
  deadline,
  actionLabel = 'Detay',
  onAction,
  onDetail,
  className,
}) => {
  return (
    <div className={cn(
      'bg-white rounded-lg border p-4 hover:shadow-md transition-all',
      riskLevel === 'KRITIK' ? 'border-red-200 border-l-4 border-l-red-500' :
      riskLevel === 'YUKSEK' ? 'border-orange-200 border-l-4 border-l-orange-500' :
      riskLevel === 'ORTA' ? 'border-amber-200 border-l-4 border-l-amber-500' :
      'border-slate-200',
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <RiskBadge level={riskLevel} size="sm" />
            <span className="text-xs font-mono text-slate-500">{source}</span>
          </div>

          {/* Title */}
          <h4 className="font-semibold text-slate-800 mb-1 truncate">{title}</h4>

          {/* Description */}
          <p className="text-sm text-slate-600 line-clamp-2">{description}</p>

          {/* Deadline */}
          {deadline && (
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{deadline}</span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDetail || onAction}
            className="text-slate-600 hover:text-slate-800"
          >
            {actionLabel}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActionCard;
