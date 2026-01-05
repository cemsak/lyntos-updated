'use client';

// ════════════════════════════════════════════════════════════════════════════
// InflationAccordion - Inflation adjustment analysis
// ════════════════════════════════════════════════════════════════════════════

import { Accordion } from './Accordion';
import { Badge } from '../shared/Badge';
import { StateWrapper } from '../shared/StateWrapper';

export interface InflationItem {
  category: string;
  originalValue: number;
  adjustedValue: number;
  adjustmentAmount: number;
  coefficient: number;
}

export interface InflationSummary {
  totalOriginal: number;
  totalAdjusted: number;
  netAdjustment: number;
  effectOnTax: number;
  isApplicable: boolean;
  reason?: string;
}

interface InflationAccordionProps {
  items: InflationItem[];
  summary: InflationSummary;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  advancedMode?: boolean;
  defaultOpen?: boolean;
}

export function InflationAccordion({
  items,
  summary,
  loading = false,
  error = null,
  onRetry,
  advancedMode = false,
  defaultOpen = false
}: InflationAccordionProps) {
  return (
    <Accordion
      title="Enflasyon Duzeltmesi"
      subtitle={summary.isApplicable ? 'Uygulanabilir' : 'Uygulanmaz'}
      badge={
        <div className="flex items-center gap-2">
          {summary.isApplicable ? (
            <>
              <span className="text-sm font-bold text-gray-900 tabular-nums">
                {summary.netAdjustment > 0 ? '+' : ''}{summary.netAdjustment.toLocaleString('tr-TR')} TL
              </span>
              <Badge variant={summary.effectOnTax < 0 ? 'success' : 'warning'}>
                Vergi: {summary.effectOnTax < 0 ? '' : '+'}{summary.effectOnTax.toLocaleString('tr-TR')} TL
              </Badge>
            </>
          ) : (
            <Badge variant="neutral">N/A</Badge>
          )}
        </div>
      }
      defaultOpen={defaultOpen}
    >
      <StateWrapper loading={loading} error={error} onRetry={onRetry}>
        {!summary.isApplicable ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              {summary.reason || 'Bu donem icin enflasyon duzeltmesi uygulanmamaktadir.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Orijinal Deger</p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums">
                  {summary.totalOriginal.toLocaleString('tr-TR')} TL
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Duzeltilmis Deger</p>
                <p className="text-sm font-semibold text-gray-900 tabular-nums">
                  {summary.totalAdjusted.toLocaleString('tr-TR')} TL
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Duzeltme</p>
                <p className={`text-sm font-semibold tabular-nums ${
                  summary.netAdjustment > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.netAdjustment > 0 ? '+' : ''}{summary.netAdjustment.toLocaleString('tr-TR')} TL
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vergi Etkisi</p>
                <p className={`text-sm font-semibold tabular-nums ${
                  summary.effectOnTax < 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.effectOnTax < 0 ? '' : '+'}{summary.effectOnTax.toLocaleString('tr-TR')} TL
                </p>
              </div>
            </div>

            {/* Items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-500">Kategori</th>
                    <th className="text-right py-2 font-medium text-gray-500">Orijinal</th>
                    {advancedMode && (
                      <th className="text-right py-2 font-medium text-gray-500">Katsayi</th>
                    )}
                    <th className="text-right py-2 font-medium text-gray-500">Duzeltilmis</th>
                    <th className="text-right py-2 font-medium text-gray-500">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{item.category}</td>
                      <td className="text-right py-2 tabular-nums">
                        {item.originalValue.toLocaleString('tr-TR')} TL
                      </td>
                      {advancedMode && (
                        <td className="text-right py-2 tabular-nums text-gray-500">
                          {item.coefficient.toFixed(4)}
                        </td>
                      )}
                      <td className="text-right py-2 tabular-nums">
                        {item.adjustedValue.toLocaleString('tr-TR')} TL
                      </td>
                      <td className={`text-right py-2 font-medium tabular-nums ${
                        item.adjustmentAmount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.adjustmentAmount > 0 ? '+' : ''}{item.adjustmentAmount.toLocaleString('tr-TR')} TL
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </StateWrapper>
    </Accordion>
  );
}

export default InflationAccordion;
