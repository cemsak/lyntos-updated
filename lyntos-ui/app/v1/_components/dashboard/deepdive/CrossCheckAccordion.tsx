'use client';

// ════════════════════════════════════════════════════════════════════════════
// CrossCheckAccordion - Cross-check validation results
// ════════════════════════════════════════════════════════════════════════════

import { Accordion } from './Accordion';
import { Badge, BadgeVariant } from '../shared/Badge';
import { StateWrapper } from '../shared/StateWrapper';

export type CheckStatus = 'pass' | 'fail' | 'warning' | 'skipped';

export interface CrossCheckItem {
  id: string;
  code: string;
  name: string;
  description: string;
  status: CheckStatus;
  expected?: string | number;
  actual?: string | number;
  difference?: number;
  technicalId?: string;
}

interface CrossCheckAccordionProps {
  checks: CrossCheckItem[];
  loading?: boolean;
  error?: string | null;
  onCheckClick?: (checkId: string) => void;
  onRetry?: () => void;
  advancedMode?: boolean;
  defaultOpen?: boolean;
}

const statusConfig: Record<CheckStatus, { variant: BadgeVariant; label: string; icon: JSX.Element }> = {
  pass: {
    variant: 'success',
    label: 'Gecti',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  fail: {
    variant: 'error',
    label: 'Basarisiz',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    variant: 'warning',
    label: 'Uyari',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  skipped: {
    variant: 'neutral',
    label: 'Atlandi',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
  },
};

export function CrossCheckAccordion({
  checks,
  loading = false,
  error = null,
  onCheckClick,
  onRetry,
  advancedMode = false,
  defaultOpen = false
}: CrossCheckAccordionProps) {
  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const total = checks.length;

  return (
    <Accordion
      title="Capraz Kontroller"
      subtitle={`${passCount}/${total} basarili`}
      badge={
        <Badge variant={failCount > 0 ? 'error' : passCount === total ? 'success' : 'warning'}>
          {failCount > 0 ? `${failCount} hata` : 'Tamam'}
        </Badge>
      }
      defaultOpen={defaultOpen}
    >
      <StateWrapper loading={loading} error={error} onRetry={onRetry}>
        <div className="space-y-2">
          {checks.map((check) => {
            const config = statusConfig[check.status];
            return (
              <div
                key={check.id}
                onClick={() => onCheckClick?.(check.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  check.status === 'fail'
                    ? 'border-red-200 bg-red-50 hover:bg-red-100'
                    : check.status === 'warning'
                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                    : check.status === 'pass'
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${
                    check.status === 'pass' ? 'text-green-600' :
                    check.status === 'fail' ? 'text-red-600' :
                    check.status === 'warning' ? 'text-amber-600' :
                    'text-gray-400'
                  }`}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {advancedMode && (
                        <span className="text-[10px] font-mono text-gray-400">{check.code}</span>
                      )}
                      <h4 className="text-sm font-medium text-gray-900">{check.name}</h4>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-600">{check.description}</p>

                    {/* Expected vs Actual */}
                    {(check.expected !== undefined || check.actual !== undefined) && (
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        {check.expected !== undefined && (
                          <span className="text-gray-500">
                            Beklenen: <strong className="text-gray-700">{
                              typeof check.expected === 'number'
                                ? check.expected.toLocaleString('tr-TR')
                                : check.expected
                            }</strong>
                          </span>
                        )}
                        {check.actual !== undefined && (
                          <span className="text-gray-500">
                            Gerceklesen: <strong className={check.status === 'fail' ? 'text-red-700' : 'text-gray-700'}>{
                              typeof check.actual === 'number'
                                ? check.actual.toLocaleString('tr-TR')
                                : check.actual
                            }</strong>
                          </span>
                        )}
                        {check.difference !== undefined && (
                          <span className={check.difference !== 0 ? 'text-red-600' : 'text-gray-500'}>
                            Fark: <strong>{check.difference > 0 ? '+' : ''}{check.difference.toLocaleString('tr-TR')}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {advancedMode && check.technicalId && (
                  <div className="mt-2 pt-2 border-t border-gray-200/50 ml-7">
                    <span className="text-[10px] font-mono text-gray-400">{check.technicalId}</span>
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

export default CrossCheckAccordion;
