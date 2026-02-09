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
      riskLevel === 'KRITIK' ? 'border-[#FFC7C9] border-l-4 border-l-[#F0282D]' :
      riskLevel === 'YUKSEK' ? 'border-[#FFF08C] border-l-4 border-l-[#FFB114]' :
      riskLevel === 'ORTA' ? 'border-[#FFF08C] border-l-4 border-l-[#FFB114]' :
      'border-[#E5E5E5]',
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <RiskBadge level={riskLevel} size="sm" />
            <span className="text-xs font-mono text-[#969696]">{source}</span>
          </div>

          {/* Title */}
          <h4 className="font-semibold text-[#2E2E2E] mb-1 truncate">{title}</h4>

          {/* Description */}
          <p className="text-sm text-[#5A5A5A] line-clamp-2">{description}</p>

          {/* Deadline */}
          {deadline && (
            <div className="flex items-center gap-1 mt-2 text-xs text-[#969696]">
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
            className="text-[#5A5A5A] hover:text-[#2E2E2E]"
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
