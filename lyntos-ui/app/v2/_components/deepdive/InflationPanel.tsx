'use client';
import React, { useState } from 'react';
import { HelpCircle, X, Info, CheckCircle2, TrendingUp } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge, TrustBadge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

// Demo data for Yİ-ÜFE indicators
const YIUFE_DEMO_DATA = {
  son3Yil: 284.7,
  son3YilEsik: 100,
  son12Ay: 44.2,
  son12AyEsik: 10,
  düzeltmeKatsayisi: 2.847,
  referansTarih: 'Aralık 2024',
};

// VUK Geçici Madde 33 Açıklaması
const VUK_GEC33_INFO = {
  baslik: 'VUK Geçici Madde 33 Nedir?',
  açıklama: `Vergi Usul Kanunu Geçici Madde 33, yüksek enflasyon dönemlerinde mali tabloların düzeltilmesini düzenler.`,
  kosullar: [
    'Yİ-ÜFE son 3 yılda %100\'ü aşmalı (Mevcut: %284.7 ✓)',
    'Yİ-ÜFE son 12 ayda %10\'u aşmalı (Mevcut: %44.2 ✓)',
    'Her iki koşul da sağlanmalıdır',
  ],
  yontem: [
    'Parasal olmayan aktif ve pasifler düzeltilir',
    'Düzeltme farkı özkaynaklar arasında muhasebeleştirilir',
    'Vergisel açıdan ayrı değerlendirme yapılır',
  ],
  uyarilar: [
    'VUK Gec.33 ile TMS 29 farklı sonuçlar verebilir',
    'Vergi matrahı hesaplamasında dikkatli olunmalı',
    'SMMM olarak mükellefi bilgilendirin',
  ],
};

interface InflationItem {
  id: string;
  hesap_grubu: string;
  hesap_grubu_tr: string;
  original_amount: number;
  adjusted_amount: number;
  adjustment_factor: number;
  difference: number;
  method: 'TMS29' | 'VUK_GEC33' | 'MIXED';
}

interface InflationResult {
  items: InflationItem[];
  summary: {
    total_original: number;
    total_adjusted: number;
    total_difference: number;
    effective_rate: number;
    method_used: string;
  };
  applicable: boolean;
  threshold_met: boolean;
}

function normalizeInflation(raw: unknown): PanelEnvelope<InflationResult> {
  return normalizeToEnvelope<InflationResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const itemsRaw = data?.items || data?.adjustments || data?.hesaplar || [];
    const items: InflationItem[] = Array.isArray(itemsRaw)
      ? itemsRaw.map((item: Record<string, unknown>, idx: number) => ({
          id: String(item.id || `inf-${idx}`),
          hesap_grubu: String(item.hesap_grubu || item.group_code || item.code || ''),
          hesap_grubu_tr: String(item.hesap_grubu_tr || item.group_name || item.name || ''),
          original_amount: typeof item.original_amount === 'number' ? item.original_amount : typeof item.original === 'number' ? item.original : 0,
          adjusted_amount: typeof item.adjusted_amount === 'number' ? item.adjusted_amount : typeof item.adjusted === 'number' ? item.adjusted : 0,
          adjustment_factor: typeof item.adjustment_factor === 'number' ? item.adjustment_factor : typeof item.factor === 'number' ? item.factor : 1,
          difference: typeof item.difference === 'number' ? item.difference : 0,
          method: mapMethod(item.method),
        }))
      : [];

    const summaryRaw = data?.summary as Record<string, unknown> | undefined;
    const totalOriginal = items.reduce((sum, i) => sum + i.original_amount, 0);
    const totalAdjusted = items.reduce((sum, i) => sum + i.adjusted_amount, 0);

    return {
      items,
      summary: {
        total_original: typeof summaryRaw?.total_original === 'number' ? summaryRaw.total_original : totalOriginal,
        total_adjusted: typeof summaryRaw?.total_adjusted === 'number' ? summaryRaw.total_adjusted : totalAdjusted,
        total_difference: typeof summaryRaw?.total_difference === 'number' ? summaryRaw.total_difference : totalAdjusted - totalOriginal,
        effective_rate: typeof summaryRaw?.effective_rate === 'number' ? summaryRaw.effective_rate : 0,
        method_used: String(summaryRaw?.method_used || 'VUK_GEC33'),
      },
      applicable: typeof data?.applicable === 'boolean' ? data.applicable : true,
      threshold_met: typeof data?.threshold_met === 'boolean' ? data.threshold_met : true,
    };
  });
}

function mapMethod(m: unknown): InflationItem['method'] {
  const str = String(m).toUpperCase();
  if (str.includes('TMS') || str.includes('29')) return 'TMS29';
  if (str.includes('VUK') || str.includes('33') || str.includes('GECICI')) return 'VUK_GEC33';
  return 'MIXED';
}

const METHOD_LABELS: Record<InflationItem['method'], { label: string; badge: 'info' | 'success' | 'warning' }> = {
  TMS29: { label: 'TMS 29', badge: 'info' },
  VUK_GEC33: { label: 'VUK Geç. 33', badge: 'success' },
  MIXED: { label: 'Karma', badge: 'warning' },
};

// VUK Geç.33 Info Modal
function VukInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="p-4 flex items-center justify-between bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-800">{VUK_GEC33_INFO.baslik}</h2>
              <p className="text-sm text-slate-600">Enflasyon Düzeltmesi Mevzuatı</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-600">{VUK_GEC33_INFO.açıklama}</p>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Uygulama Koşulları</h3>
            <ul className="space-y-2">
              {VUK_GEC33_INFO.kosullar.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Düzeltme Yöntemi</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              {VUK_GEC33_INFO.yontem.map((item, i) => (
                <li key={i} className="pl-4 border-l-2 border-blue-300">{item}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">Dikkat Edilmesi Gerekenler</h3>
            <ul className="space-y-1 text-xs text-amber-700">
              {VUK_GEC33_INFO.uyarilar.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}

export function InflationPanel() {
  const [showExplain, setShowExplain] = useState(false);
  const [showVukInfo, setShowVukInfo] = useState(false);
  const envelope = useFailSoftFetch<InflationResult>(ENDPOINTS.INFLATION_ADJUSTMENT, normalizeInflation);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  const formatCurrency = (n: number) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  const formatPct = (n: number) => `%${(n * 100).toFixed(2)}`;

  // Use demo data if no real data
  const isDemo = status === 'empty' || status === 'error' || !data;

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            Enflasyon Muhasebesi
            <button
              onClick={() => setShowVukInfo(true)}
              className="text-slate-400 hover:text-blue-600 transition-colors"
              title="VUK Geçici Madde 33 Nedir?"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </span>
        }
        subtitle="TMS 29 & VUK Geçici 33"
        headerAction={
          <div className="flex items-center gap-2">
            {isDemo && <Badge variant="warning">Demo Veri</Badge>}
            {data?.applicable ? (
              <Badge variant="info">Uygulanabilir</Badge>
            ) : (
              <Badge variant="default">Uygulanamaz</Badge>
            )}
          </div>
        }
      >
        {/* Yİ-ÜFE Indicators - Always Show */}
        <div className="mb-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-800">Yİ-ÜFE Göstergeleri ({YIUFE_DEMO_DATA.referansTarih})</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-white rounded border border-indigo-100">
              <p className="text-[10px] text-slate-500 mb-0.5">Son 3 Yıl</p>
              <p className="text-lg font-bold text-indigo-700">%{YIUFE_DEMO_DATA.son3Yil}</p>
              <p className="text-[10px] text-green-600">Eşik %{YIUFE_DEMO_DATA.son3YilEsik} ✓</p>
            </div>
            <div className="p-2 bg-white rounded border border-indigo-100">
              <p className="text-[10px] text-slate-500 mb-0.5">Son 12 Ay</p>
              <p className="text-lg font-bold text-indigo-700">%{YIUFE_DEMO_DATA.son12Ay}</p>
              <p className="text-[10px] text-green-600">Eşik %{YIUFE_DEMO_DATA.son12AyEsik} ✓</p>
            </div>
            <div className="p-2 bg-white rounded border border-indigo-100">
              <p className="text-[10px] text-slate-500 mb-0.5">Düzeltme Katsayısı</p>
              <p className="text-lg font-bold text-purple-700">{YIUFE_DEMO_DATA.düzeltmeKatsayisi}</p>
              <p className="text-[10px] text-slate-400">TÜİK Kaynak</p>
            </div>
          </div>
        </div>

        <PanelState status={isDemo ? 'ok' : status} reason_tr={reason_tr}>
          {(data || isDemo) && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Düzeltme Öncesi</p>
                  <p className="text-lg font-bold text-slate-900">
                    {data ? formatCurrency(data.summary.total_original) : '₺1.250.000'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Düzeltme Sonrası</p>
                  <p className="text-lg font-bold text-indigo-700">
                    {data ? formatCurrency(data.summary.total_adjusted) : '₺3.558.750'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Toplam Etki</p>
                  <p className="text-sm font-bold text-green-600">
                    {data ? (data.summary.total_difference >= 0 ? '+' : '') + formatCurrency(data.summary.total_difference) : '+₺2.308.750'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Efektif Oran</p>
                  <p className="text-sm font-bold text-slate-700">
                    {data ? formatPct(data.summary.effective_rate) : '%184.7'}
                  </p>
                </div>
              </div>

              {/* Not Applicable Warning */}
              {data && !data.applicable && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">
                    Enflasyon muhasebesi koşulları karşılanmıyor veya eşik değerine ulaşılmamış.
                  </p>
                </div>
              )}

              {/* Items Table */}
              {data && data.items.length > 0 && (
                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-slate-600">Hesap Grubu</th>
                        <th className="text-right p-2 font-medium text-slate-600">Orijinal</th>
                        <th className="text-right p-2 font-medium text-slate-600">Düzeltilmiş</th>
                        <th className="text-center p-2 font-medium text-slate-600">Yöntem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2">
                            <p className="font-mono text-[10px] text-slate-400">{item.hesap_grubu}</p>
                            <p className="text-slate-900">{item.hesap_grubu_tr}</p>
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700">
                            {formatCurrency(item.original_amount)}
                          </td>
                          <td className="p-2 text-right">
                            <p className="font-mono text-indigo-700">{formatCurrency(item.adjusted_amount)}</p>
                            <p className="text-[10px] text-slate-400">x{item.adjustment_factor.toFixed(3)}</p>
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
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <TrustBadge trust={trust} />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowVukInfo(true)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    VUK Geç.33 Nedir? →
                  </button>
                  {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) && (
                    <button
                      onClick={() => setShowExplain(true)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Neden? →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </PanelState>
      </Card>

      <ExplainModal
        isOpen={showExplain}
        onClose={() => setShowExplain(false)}
        title="Enflasyon Muhasebesi Analizi"
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={meta}
      />

      <VukInfoModal isOpen={showVukInfo} onClose={() => setShowVukInfo(false)} />
    </>
  );
}
