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
    <div className={cn('bg-white rounded-xl border border-slate-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Bugun Yapilacaklar</h3>
              <p className="text-sm text-slate-500">Oncelik sirasina gore</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {actions.length} islem
          </span>
        </div>
      </div>

      {/* Actions List */}
      <div className="p-4 space-y-3">
        {visibleActions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">Tebrikler! Bekleyen islem yok.</p>
            <p className="text-sm text-slate-500">Tum kontroller basarili.</p>
          </div>
        ) : (
          visibleActions.map((action, index) => (
            <div key={action.id} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
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
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
          <Button
            variant="ghost"
            className="w-full text-slate-600"
            onClick={onViewAll}
          >
            +{remainingCount} islem daha
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default TodayActionsWidget;
