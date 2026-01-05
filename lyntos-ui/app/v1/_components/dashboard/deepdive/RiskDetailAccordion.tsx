'use client';

// ════════════════════════════════════════════════════════════════════════════
// RiskDetailAccordion - Risk analysis deep dive
// ════════════════════════════════════════════════════════════════════════════

import { Accordion } from './Accordion';
import { Badge, BadgeVariant } from '../shared/Badge';
import { StateWrapper } from '../shared/StateWrapper';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface RiskItem {
  id: string;
  code: string;
  title: string;
  description: string;
  level: RiskLevel;
  amount?: number;
  recommendation?: string;
  technicalId?: string;
}

interface RiskDetailAccordionProps {
  risks: RiskItem[];
  totalScore?: number;
  loading?: boolean;
  error?: string | null;
  onRiskClick?: (riskId: string) => void;
  onRetry?: () => void;
  advancedMode?: boolean;
  defaultOpen?: boolean;
}

const levelConfig: Record<RiskLevel, { variant: BadgeVariant; label: string }> = {
  high: { variant: 'error', label: 'Yuksek' },
  medium: { variant: 'warning', label: 'Orta' },
  low: { variant: 'success', label: 'Dusuk' },
};

export function RiskDetailAccordion({
  risks,
  totalScore,
  loading = false,
  error = null,
  onRiskClick,
  onRetry,
  advancedMode = false,
  defaultOpen = false
}: RiskDetailAccordionProps) {
  const highRiskCount = risks.filter(r => r.level === 'high').length;

  return (
    <Accordion
      title="Risk Analizi"
      subtitle={`${risks.length} risk tespit edildi`}
      badge={
        <div className="flex items-center gap-2">
          {totalScore !== undefined && (
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {totalScore}/100
            </span>
          )}
          <Badge variant={highRiskCount > 0 ? 'error' : 'success'}>
            {highRiskCount > 0 ? `${highRiskCount} kritik` : 'Iyi'}
          </Badge>
        </div>
      }
      defaultOpen={defaultOpen}
    >
      <StateWrapper loading={loading} error={error} onRetry={onRetry}>
        <div className="space-y-3">
          {risks.map((risk) => {
            const config = levelConfig[risk.level];
            return (
              <div
                key={risk.id}
                onClick={() => onRiskClick?.(risk.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  risk.level === 'high'
                    ? 'border-red-200 bg-red-50 hover:bg-red-100'
                    : risk.level === 'medium'
                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                    : 'border-green-200 bg-green-50 hover:bg-green-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">{risk.code}</span>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900">{risk.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{risk.description}</p>
                    {risk.recommendation && (
                      <p className="text-xs text-blue-600 mt-2">
                        <strong>Oneri:</strong> {risk.recommendation}
                      </p>
                    )}
                  </div>
                  {risk.amount !== undefined && (
                    <span className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                      {risk.amount.toLocaleString('tr-TR')} TL
                    </span>
                  )}
                </div>
                {advancedMode && risk.technicalId && (
                  <div className="mt-2 pt-2 border-t border-gray-200/50">
                    <span className="text-[10px] font-mono text-gray-400">{risk.technicalId}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </StateWrapper>
    </Accordion>
  );
}

export default RiskDetailAccordion;
