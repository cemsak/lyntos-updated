'use client';

import React from 'react';
import { ClipboardList, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ActionCard } from '../shared/ActionCard';
import type { RiskLevel } from '@/lib/ui/design-tokens';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  source: string;
  deadline?: string;
}

interface TodayActionsWidgetProps {
  actions: ActionItem[];
  maxVisible?: number;
  onViewAll?: () => void;
  onActionClick?: (id: string) => void;
  className?: string;
}

export const TodayActionsWidget: React.FC<TodayActionsWidgetProps> = ({
  actions,
  maxVisible = 5,
  onViewAll,
  onActionClick,
  className,
}) => {
  const visibleActions = actions.slice(0, maxVisible);
  const remainingCount = actions.length - maxVisible;

  return (
    <div className={cn('bg-white rounded-xl border border-[#E5E5E5] overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E6F9FF] rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[#0049AA]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2E2E2E]">Bugün Yapılacaklar</h3>
              <p className="text-sm text-[#969696]">Öncelik sırasına göre</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-[#E6F9FF] text-[#0049AA] rounded-full text-sm font-medium">
            {actions.length} işlem
          </span>
        </div>
      </div>

      {/* Actions List */}
      <div className="p-4 space-y-3">
        {visibleActions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-[#00A651] mx-auto mb-3" />
            <p className="text-[#5A5A5A] font-medium">Tebrikler! Bekleyen işlem yok.</p>
            <p className="text-sm text-[#969696]">Tüm kontroller başarılı.</p>
          </div>
        ) : (
          visibleActions.map((action, index) => (
            <div key={action.id} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-[#F5F6F8] rounded-full flex items-center justify-center text-xs font-medium text-[#5A5A5A]">
                {index + 1}
              </div>
              <div className="flex-1">
                <ActionCard
                  title={action.title}
                  description={action.description}
                  riskLevel={action.riskLevel}
                  source={action.source}
                  deadline={action.deadline}
                  onDetail={() => onActionClick?.(action.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {remainingCount > 0 && (
        <div className="px-6 py-3 border-t border-[#E5E5E5] bg-[#F5F6F8]">
          <Button
            variant="ghost"
            className="w-full text-[#5A5A5A]"
            onClick={onViewAll}
          >
            +{remainingCount} işlem daha
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default TodayActionsWidget;
