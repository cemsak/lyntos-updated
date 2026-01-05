'use client';

// ════════════════════════════════════════════════════════════════════════════
// TaxSummaryAccordion - Quarterly and corporate tax summary
// ════════════════════════════════════════════════════════════════════════════

import { Accordion } from './Accordion';
import { Badge } from '../shared/Badge';
import { StateWrapper } from '../shared/StateWrapper';

export interface TaxLineItem {
  code: string;
  label: string;
  amount: number;
  previousAmount?: number;
  variance?: number;
}

export interface TaxSummaryData {
  type: 'quarterly' | 'corporate';
  totalTax: number;
  previousTax?: number;
  effectiveRate?: number;
  lineItems: TaxLineItem[];
  notes?: string[];
  technicalId?: string;
}

interface TaxSummaryAccordionProps {
  data: TaxSummaryData;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  advancedMode?: boolean;
  defaultOpen?: boolean;
}

export function TaxSummaryAccordion({
  data,
  loading = false,
  error = null,
  onRetry,
  advancedMode = false,
  defaultOpen = false
}: TaxSummaryAccordionProps) {
  const title = data.type === 'quarterly' ? 'Gecici Vergi Ozeti' : 'Kurumlar Vergisi Ozeti';
  const variance = data.previousTax
    ? ((data.totalTax - data.previousTax) / data.previousTax * 100)
    : 0;

  return (
    <Accordion
      title={title}
      subtitle={data.effectiveRate ? `Efektif oran: %${data.effectiveRate.toFixed(1)}` : undefined}
      badge={
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {data.totalTax.toLocaleString('tr-TR')} TL
          </span>
          {data.previousTax && (
            <Badge variant={variance > 10 ? 'warning' : variance < -10 ? 'success' : 'neutral'}>
              {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
            </Badge>
          )}
        </div>
      }
      defaultOpen={defaultOpen}
    >
      <StateWrapper loading={loading} error={error} onRetry={onRetry}>
        <div className="space-y-4">
          {/* Line items table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-500">Kalem</th>
                  <th className="text-right py-2 font-medium text-gray-500">Tutar</th>
                  {data.lineItems.some(i => i.previousAmount !== undefined) && (
                    <th className="text-right py-2 font-medium text-gray-500">Onceki</th>
                  )}
                  {data.lineItems.some(i => i.variance !== undefined) && (
                    <th className="text-right py-2 font-medium text-gray-500">Fark</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.lineItems.map((item) => (
                  <tr key={item.code} className="border-b border-gray-100">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {advancedMode && (
                          <span className="text-[10px] font-mono text-gray-400">{item.code}</span>
                        )}
                        <span className="text-gray-900">{item.label}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 font-medium tabular-nums">
                      {item.amount.toLocaleString('tr-TR')} TL
                    </td>
                    {item.previousAmount !== undefined && (
                      <td className="text-right py-2 text-gray-500 tabular-nums">
                        {item.previousAmount.toLocaleString('tr-TR')} TL
                      </td>
                    )}
                    {item.variance !== undefined && (
                      <td className={`text-right py-2 tabular-nums ${
                        item.variance > 0 ? 'text-red-600' : item.variance < 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {item.variance > 0 ? '+' : ''}{item.variance.toLocaleString('tr-TR')} TL
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="py-2 font-semibold">Toplam</td>
                  <td className="text-right py-2 font-bold tabular-nums">
                    {data.totalTax.toLocaleString('tr-TR')} TL
                  </td>
                  {data.previousTax !== undefined && (
                    <td className="text-right py-2 font-medium text-gray-500 tabular-nums">
                      {data.previousTax.toLocaleString('tr-TR')} TL
                    </td>
                  )}
                  {data.lineItems.some(i => i.variance !== undefined) && <td />}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {data.notes && data.notes.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-blue-800 mb-1">Notlar</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                {data.notes.map((note, i) => (
                  <li key={i}>• {note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical ID */}
          {advancedMode && data.technicalId && (
            <div className="text-[10px] font-mono text-gray-400">
              {data.technicalId}
            </div>
          )}
        </div>
      </StateWrapper>
    </Accordion>
  );
}

export default TaxSummaryAccordion;
