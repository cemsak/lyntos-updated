'use client';

import { useState } from 'react';
import type { InflationAdjustmentData, ExplainData } from './types';
import { getHumanError, getSeverityStyles } from './utils/errorMessages';

// ════════════════════════════════════════════════════════════════════════════
// INFLATION PANEL - TMS 29 Enflasyon Muhasebesi (IP10)
// ════════════════════════════════════════════════════════════════════════════

interface InflationPanelProps {
  data: InflationAdjustmentData | null | undefined;
  error?: string;
  onExplain?: (data: ExplainData) => void;
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
  return `%${(value * 100).toFixed(2)}`;
}

function formatNumber(value: number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
  return value.toFixed(decimals);
}

export function InflationPanel({ data, error, onExplain }: InflationPanelProps) {
  const [showJournal, setShowJournal] = useState(false);

  if (error) {
    const humanError = getHumanError(error);
    const styles = getSeverityStyles(humanError.severity);
    return (
      <div className={`${styles.bg} border ${styles.border} rounded-lg p-4`}>
        <h3 className={`text-sm font-semibold ${styles.text} mb-2`}>Enflasyon Duzeltmesi</h3>
        <p className={`text-sm ${styles.text} opacity-80`}>{humanError.message}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  // Handle missing data case
  if (data.missing_data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-sm font-semibold text-yellow-800">Enflasyon Duzeltmesi - Eksik Veri</h3>
        </div>
        <p className="text-sm text-yellow-700 mb-2">{data.missing_data.reason}</p>
        {data.missing_data.required_docs && data.missing_data.required_docs.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-yellow-600 mb-1">Gerekli belgeler:</p>
            <ul className="list-disc list-inside text-xs text-yellow-700">
              {data.missing_data.required_docs.map((doc, i) => (
                <li key={i}>{doc}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const tufe = data.tufe_endeksi;
  const pozisyon = data.parasal_pozisyon;
  const farklar = data.duzeltme_farklari;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-purple-50 px-4 py-3 flex items-center justify-between border-b border-purple-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0049AA]">Enflasyon Duzeltmesi (TMS 29)</h3>
            <p className="text-xs text-purple-600">Donem: {data.donem || '—'}</p>
          </div>
        </div>
        {onExplain && (
          <button
            onClick={() => {
              const expert = data.analysis?.expert;
              onExplain({
                title: 'Enflasyon Duzeltmesi',
                reason: expert?.reason_tr || 'TMS 29 uyarinca enflasyon duzeltmesi hesaplandi.',
                method: expert?.method,
                legal_basis: expert?.legal_basis_refs?.[0] || 'SRC-0006',
                legal_basis_refs: expert?.legal_basis_refs || ['SRC-0006', 'SRC-0008'],
                evidence_refs: expert?.evidence_refs || [],
                trust_score: expert?.trust_score || 1.0
              });
            }}
            className="text-xs text-purple-600 hover:underline"
          >
            Neden?
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* TUFE Info Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-purple-50 rounded">
            <p className="text-xs text-purple-600 mb-1">TUFE Katsayisi</p>
            <p className="text-lg font-mono font-bold text-[#0049AA]">{formatNumber(tufe?.katsayi)}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded">
            <p className="text-xs text-purple-600 mb-1">Artis Orani</p>
            <p className="text-lg font-mono font-bold text-[#0049AA]">{formatPercent(tufe?.artis_orani)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">Baslangic</p>
            <p className="text-sm font-mono text-gray-900">{formatNumber(tufe?.baslangic, 2)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-xs text-gray-600 mb-1">Bitis</p>
            <p className="text-sm font-mono text-gray-900">{formatNumber(tufe?.bitis, 2)}</p>
          </div>
        </div>

        {/* Parasal Pozisyon */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Parasal Pozisyon</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Parasal Varliklar</span>
              <span className="text-sm font-mono text-gray-900">{formatCurrency(pozisyon?.parasal_varliklar)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Parasal Borclar</span>
              <span className="text-sm font-mono text-gray-900">{formatCurrency(pozisyon?.parasal_borclar)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-sm text-gray-600">Net Pozisyon</span>
              <span className="text-sm font-mono font-medium text-gray-900">{formatCurrency(pozisyon?.net_parasal_pozisyon)}</span>
            </div>
            <div className="flex justify-between items-center py-2 bg-purple-50 rounded px-2">
              <span className="text-sm font-medium text-purple-800">Enflasyon Kaybi/Kazanci</span>
              <span className={`text-sm font-mono font-bold ${(pozisyon?.enflasyon_kaybi_kazanci || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(pozisyon?.enflasyon_kaybi_kazanci)}
              </span>
            </div>
          </div>
        </div>

        {/* Duzeltme Farklari */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">Duzeltme Farklari (Hesap Kayitlari)</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-red-50 rounded border border-red-100">
              <p className="text-xs text-red-600 mb-1">648 - Zarar</p>
              <p className="text-sm font-mono font-bold text-red-700">{formatCurrency(farklar?.['648'])}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded border border-green-100">
              <p className="text-xs text-green-600 mb-1">658 - Kar</p>
              <p className="text-sm font-mono font-bold text-green-700">{formatCurrency(farklar?.['658'])}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded border border-blue-100">
              <p className="text-xs text-blue-600 mb-1">698 - Ozet</p>
              <p className="text-sm font-mono font-bold text-blue-700">{formatCurrency(farklar?.['698'])}</p>
            </div>
          </div>
        </div>

        {/* Vergi Etkisi */}
        {data.vergi_etkisi && (
          <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
            <p className="text-xs text-yellow-700 mb-1">Vergi Etkisi (Matrah Degisimi)</p>
            <p className="text-lg font-mono font-bold text-yellow-900">
              {formatCurrency(data.vergi_etkisi.vergi_etkisi)}
            </p>
          </div>
        )}

        {/* Yevmiye Accordion */}
        {data.yevmiye_kayitlari && data.yevmiye_kayitlari.length > 0 && (
          <div>
            <button
              onClick={() => setShowJournal(!showJournal)}
              className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2"
            >
              <span>Yevmiye Kayitlari ({data.yevmiye_kayitlari.length} kayit)</span>
              <svg
                className={`w-4 h-4 transition-transform ${showJournal ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showJournal && (
              <div className="mt-2 border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Tarih</th>
                      <th className="px-2 py-1 text-left">Aciklama</th>
                      <th className="px-2 py-1 text-left">Borc</th>
                      <th className="px-2 py-1 text-left">Alacak</th>
                      <th className="px-2 py-1 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.yevmiye_kayitlari.map((kayit, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-1 font-mono">{kayit.tarih}</td>
                        <td className="px-2 py-1">{kayit.aciklama}</td>
                        <td className="px-2 py-1 font-mono">{kayit.borc_hesap}</td>
                        <td className="px-2 py-1 font-mono">{kayit.alacak_hesap}</td>
                        <td className="px-2 py-1 text-right font-mono">{formatCurrency(kayit.tutar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default InflationPanel;
