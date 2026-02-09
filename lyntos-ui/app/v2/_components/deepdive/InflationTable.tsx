import React from 'react';
import { Info } from 'lucide-react';
import { Badge, TrustBadge } from '../shared/Badge';
import type { ExpertAnalysis, AiAnalysis, LegalBasisRef } from '../contracts/envelope';
import type { InflationResult, InflationItem } from './inflationTypes';
import { METHOD_LABELS } from './inflationTypes';

interface InflationEmptyTableProps {}

export function InflationEmptyTable({}: InflationEmptyTableProps) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-[#969696]" />
        <h3 className="text-sm font-semibold text-[#5A5A5A]">Enflasyon Düzeltmesi (Örnek Yapı)</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[#969696] border-b border-[#E5E5E5]">
              <th className="pb-2 font-medium">Hesap Grubu</th>
              <th className="pb-2 text-right font-medium">Düzeltme Öncesi</th>
              <th className="pb-2 text-right font-medium">Katsayı</th>
              <th className="pb-2 text-right font-medium">Düzeltme Sonrası</th>
              <th className="pb-2 text-right font-medium">Fark</th>
            </tr>
          </thead>
          <tbody className="text-[#969696]">
            <tr className="border-b border-[#F5F6F8]">
              <td className="py-2">Parasal Olmayan Aktifler</td>
              <td className="text-right">₺---</td>
              <td className="text-right">---</td>
              <td className="text-right">₺---</td>
              <td className="text-right">₺---</td>
            </tr>
            <tr className="border-b border-[#F5F6F8]">
              <td className="py-2">Parasal Olmayan Pasifler</td>
              <td className="text-right">₺---</td>
              <td className="text-right">---</td>
              <td className="text-right">₺---</td>
              <td className="text-right">₺---</td>
            </tr>
            <tr className="border-b border-[#F5F6F8]">
              <td className="py-2">Özkaynaklar</td>
              <td className="text-right">₺---</td>
              <td className="text-right">---</td>
              <td className="text-right">₺---</td>
              <td className="text-right">₺---</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#0049AA] mt-4 text-center">
        📤 Bilanço yüklendiğinde enflasyon düzeltmesi hesaplanır
      </p>
    </div>
  );
}

interface InflationDataViewProps {
  data: InflationResult;
  trust: 'low' | 'med' | 'high';
  analysis: { expert?: ExpertAnalysis; ai?: AiAnalysis };
  legal_basis_refs: LegalBasisRef[];
  formatCurrency: (n: number) => string;
  formatPct: (n: number) => string;
  onShowVukInfo: () => void;
  onShowExplain: () => void;
}

export function InflationDataView({
  data,
  trust,
  analysis,
  legal_basis_refs,
  formatCurrency,
  formatPct,
  onShowVukInfo,
  onShowExplain,
}: InflationDataViewProps) {
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-[#F5F6F8] rounded-lg">
        <div>
          <p className="text-xs text-[#969696]">Düzeltme Öncesi</p>
          <p className="text-lg font-bold text-[#2E2E2E]">
            {formatCurrency(data.summary.total_original)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#969696]">Düzeltme Sonrası</p>
          <p className="text-lg font-bold text-[#0049AA]">
            {formatCurrency(data.summary.total_adjusted)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#969696]">Toplam Etki</p>
          <p className="text-sm font-bold text-[#00804D]">
            {(data.summary.total_difference >= 0 ? '+' : '') + formatCurrency(data.summary.total_difference)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#969696]">Efektif Oran</p>
          <p className="text-sm font-bold text-[#5A5A5A]">
            {formatPct(data.summary.effective_rate)}
          </p>
        </div>
      </div>

      {/* Not Applicable Warning */}
      {!data.applicable && (
        <div className="p-3 bg-[#FFFBEB] border border-[#FFF08C] rounded-lg">
          <p className="text-sm text-[#FA841E]">
            Enflasyon muhasebesi koşulları karşılanmıyor veya eşik değerine ulaşılmamış.
          </p>
        </div>
      )}

      {/* Items Table */}
      {data.items.length > 0 && (
        <div className="overflow-x-auto max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F5F6F8] sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium text-[#5A5A5A]">Hesap Grubu</th>
                <th className="text-right p-2 font-medium text-[#5A5A5A]">Orijinal</th>
                <th className="text-right p-2 font-medium text-[#5A5A5A]">Düzeltilmiş</th>
                <th className="text-center p-2 font-medium text-[#5A5A5A]">Yöntem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {data.items.map((item: InflationItem) => (
                <tr key={item.id} className="hover:bg-[#F5F6F8]">
                  <td className="p-2">
                    <p className="font-mono text-[10px] text-[#969696]">{item.hesap_grubu}</p>
                    <p className="text-[#2E2E2E]">{item.hesap_grubu_tr}</p>
                  </td>
                  <td className="p-2 text-right font-mono text-[#5A5A5A]">
                    {formatCurrency(item.original_amount)}
                  </td>
                  <td className="p-2 text-right">
                    <p className="font-mono text-[#0049AA]">{formatCurrency(item.adjusted_amount)}</p>
                    <p className="text-[10px] text-[#969696]">x{item.adjustment_factor.toFixed(3)}</p>
                  </td>
                  <td className="p-2 text-center">
                    <Badge variant={METHOD_LABELS[item.method].badge}>
                      {METHOD_LABELS[item.method].label}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] text-xs">
        <TrustBadge trust={trust} />
        <div className="flex items-center gap-2">
          <button
            onClick={onShowVukInfo}
            className="text-[#0049AA] hover:text-[#00287F] font-medium"
          >
            VUK Geç.33 Nedir? →
          </button>
          {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) && (
            <button
              onClick={onShowExplain}
              className="text-[#0049AA] hover:text-[#00287F] font-medium"
            >
              Neden? →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
