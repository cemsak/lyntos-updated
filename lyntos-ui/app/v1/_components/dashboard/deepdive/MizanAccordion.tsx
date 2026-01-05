'use client';

// ════════════════════════════════════════════════════════════════════════════
// MizanAccordion - Trial balance analysis deep dive
// ════════════════════════════════════════════════════════════════════════════

import { Accordion } from './Accordion';
import { Badge } from '../shared/Badge';
import { StateWrapper } from '../shared/StateWrapper';

export interface MizanAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;
  previousBalance?: number;
  variance?: number;
  flag?: 'anomaly' | 'attention' | 'ok';
}

export interface MizanSummary {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
  accountCount: number;
  flaggedCount: number;
}

interface MizanAccordionProps {
  accounts: MizanAccount[];
  summary: MizanSummary;
  loading?: boolean;
  error?: string | null;
  onAccountClick?: (code: string) => void;
  onRetry?: () => void;
  advancedMode?: boolean;
  defaultOpen?: boolean;
}

export function MizanAccordion({
  accounts,
  summary,
  loading = false,
  error = null,
  onAccountClick,
  onRetry,
  advancedMode = false,
  defaultOpen = false
}: MizanAccordionProps) {
  return (
    <Accordion
      title="Mizan Analizi"
      subtitle={`${summary.accountCount} hesap`}
      badge={
        <div className="flex items-center gap-2">
          <Badge variant={summary.isBalanced ? 'success' : 'error'}>
            {summary.isBalanced ? 'Dengeli' : 'Dengesiz'}
          </Badge>
          {summary.flaggedCount > 0 && (
            <Badge variant="warning">{summary.flaggedCount} dikkat</Badge>
          )}
        </div>
      }
      defaultOpen={defaultOpen}
    >
      <StateWrapper loading={loading} error={error} onRetry={onRetry}>
        <div className="space-y-4">
          {/* Summary totals */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Toplam Borc</p>
              <p className="text-sm font-semibold text-gray-900 tabular-nums">
                {summary.totalDebit.toLocaleString('tr-TR')} TL
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Toplam Alacak</p>
              <p className="text-sm font-semibold text-gray-900 tabular-nums">
                {summary.totalCredit.toLocaleString('tr-TR')} TL
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fark</p>
              <p className={`text-sm font-semibold tabular-nums ${
                summary.difference === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.difference === 0 ? '0' : summary.difference.toLocaleString('tr-TR')} TL
              </p>
            </div>
          </div>

          {/* Accounts table */}
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-500">Hesap</th>
                  <th className="text-right py-2 font-medium text-gray-500">Borc</th>
                  <th className="text-right py-2 font-medium text-gray-500">Alacak</th>
                  <th className="text-right py-2 font-medium text-gray-500">Bakiye</th>
                  {accounts.some(a => a.variance !== undefined) && (
                    <th className="text-right py-2 font-medium text-gray-500">Degisim</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.code}
                    onClick={() => onAccountClick?.(account.code)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      account.flag === 'anomaly'
                        ? 'bg-red-50'
                        : account.flag === 'attention'
                        ? 'bg-amber-50'
                        : ''
                    }`}
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">{account.code}</span>
                        <span className="text-gray-900">{account.name}</span>
                        {account.flag === 'anomaly' && (
                          <Badge variant="error">Anomali</Badge>
                        )}
                        {account.flag === 'attention' && (
                          <Badge variant="warning">Dikkat</Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-2 tabular-nums">
                      {account.debit.toLocaleString('tr-TR')}
                    </td>
                    <td className="text-right py-2 tabular-nums">
                      {account.credit.toLocaleString('tr-TR')}
                    </td>
                    <td className="text-right py-2 font-medium tabular-nums">
                      {account.balance.toLocaleString('tr-TR')}
                    </td>
                    {account.variance !== undefined && (
                      <td className={`text-right py-2 tabular-nums ${
                        account.variance > 20 ? 'text-red-600' :
                        account.variance > 10 ? 'text-amber-600' :
                        'text-gray-500'
                      }`}>
                        {account.variance > 0 ? '+' : ''}{account.variance.toFixed(1)}%
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </StateWrapper>
    </Accordion>
  );
}

export default MizanAccordion;
