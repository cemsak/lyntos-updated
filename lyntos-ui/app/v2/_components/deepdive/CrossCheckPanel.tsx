'use client';
import React, { useState } from 'react';
import { HelpCircle, X, CheckCircle2, AlertTriangle, BookOpen, Check, Minus } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge, TrustBadge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

import { Info } from 'lucide-react';

// Empty state placeholder structure for cross-check matrix (SMMM terminology)
const EMPTY_STATE_STRUCTURE = [
  { source: 'Mizan (600-602)', target: 'KDV-1 Beyannamesi', icon: '📋', threshold: '≤%2' },
  { source: 'Mizan (153/253)', target: 'e-Fatura Alış Listesi', icon: '🧾', threshold: '≤%1' },
  { source: 'Mizan (102)', target: 'Banka Ekstresi', icon: '🏦', threshold: '₺0' },
  { source: 'Ba-Bs Formu', target: 'e-Fatura Listesi', icon: '📄', threshold: '₺0' },
];

// SMMM Context Info for Cross-Check Panel
const CROSS_CHECK_SMMM_INFO = {
  title: 'Cross-Check Matrisi Nedir?',
  description: 'Kaynak belgeler arası tutarlılık kontrolü',
  context: [
    'Cross-Check, farklı veri kaynaklarını karşılaştırarak tutarsızlıkları tespit eder.',
    'Mizan vs KDV Beyannamesi: Satış/alış tutarları eşleşmeli.',
    'Mizan vs E-Fatura: Fatura toplamları mizan ile uyumlu olmalı.',
    'Mizan vs Banka: Tahsilat/ödeme kayıtları tutarlı olmalı.',
    'VDK incelemelerinde bu tutarsızlıklar ilk kontrol noktasıdır.',
  ],
  farkTipleri: [
    { level: 'Eşleşme', desc: 'Fark yok - Kayıtlar tutarlı', color: 'bg-green-50 text-green-700' },
    { level: 'Küçük Fark', desc: '≤%5 fark - Yuvarlama/zamanlama farkı olabilir', color: 'bg-amber-50 text-amber-700' },
    { level: 'Büyük Fark', desc: '%5-10 fark - İncelenmeli, muhtemel kayıt hatası', color: 'bg-orange-50 text-orange-700' },
    { level: 'Kritik', desc: '>%10 fark - Acil düzeltme gerekli', color: 'bg-red-50 text-red-700' },
  ],
  actions: [
    'Kritik farkları öncelikli olarak inceleyin',
    'Fark nedenini belirleyin (zamanlama, kur, hata)',
    'Düzeltme fişlerini hazırlayın',
    'Mutabakat dosyasını arşivleyin',
  ],
};

interface CrossCheckItem {
  id: string;
  check_type: 'kdv' | 'e_fatura' | 'banka' | 'beyan' | 'other';
  source_label: string;
  target_label: string;
  source_amount: number;
  target_amount: number;
  difference: number;
  difference_pct: number;
  status: 'match' | 'minor' | 'major' | 'critical';
  explanation_tr?: string;
}

interface CrossCheckResult {
  checks: CrossCheckItem[];
  summary: {
    total: number;
    matched: number;
    discrepancies: number;
    critical: number;
  };
}

function normalizeCrossCheck(raw: unknown): PanelEnvelope<CrossCheckResult> {
  return normalizeToEnvelope<CrossCheckResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const checksRaw = data?.checks || data?.items || data?.comparisons || [];
    const checks: CrossCheckItem[] = Array.isArray(checksRaw)
      ? checksRaw.map((c: Record<string, unknown>, idx: number) => {
          const checkType = mapCheckType(c.type || c.check_type);
          const fallbackLabels = getFallbackLabels(checkType, idx);
          return {
            id: String(c.id || `cc-${idx}`),
            check_type: checkType,
            source_label: String(c.source_label || c.source || fallbackLabels.source),
            target_label: String(c.target_label || c.target || fallbackLabels.target),
            source_amount: typeof c.source_amount === 'number' ? c.source_amount : 0,
            target_amount: typeof c.target_amount === 'number' ? c.target_amount : 0,
            difference: typeof c.difference === 'number' ? c.difference : 0,
            difference_pct: typeof c.difference_pct === 'number' ? c.difference_pct : 0,
            status: mapStatus(c.status || c.result),
            explanation_tr: c.explanation_tr ? String(c.explanation_tr) : undefined,
          };
        })
      : [];

    const summaryRaw = data?.summary as Record<string, unknown> | undefined;
    const matched = checks.filter(c => c.status === 'match').length;
    const critical = checks.filter(c => c.status === 'critical').length;

    return {
      checks,
      summary: {
        total: checks.length,
        matched: typeof summaryRaw?.matched === 'number' ? summaryRaw.matched : matched,
        discrepancies: typeof summaryRaw?.discrepancies === 'number' ? summaryRaw.discrepancies : checks.length - matched,
        critical: typeof summaryRaw?.critical === 'number' ? summaryRaw.critical : critical,
      },
    };
  });
}

function mapCheckType(t: unknown): CrossCheckItem['check_type'] {
  const str = String(t).toLowerCase();
  if (str.includes('kdv')) return 'kdv';
  if (str.includes('fatura') || str.includes('e-fatura') || str.includes('efatura')) return 'e_fatura';
  if (str.includes('bank') || str.includes('banka')) return 'banka';
  if (str.includes('beyan')) return 'beyan';
  return 'other';
}

function mapStatus(s: unknown): CrossCheckItem['status'] {
  const str = String(s).toLowerCase();
  if (str === 'match' || str === 'ok' || str === 'esit') return 'match';
  if (str === 'minor' || str === 'warning') return 'minor';
  if (str === 'major') return 'major';
  if (str === 'critical' || str === 'error') return 'critical';
  return 'minor';
}

// Fallback labels for cross-check types when API doesn't provide source/target labels
function getFallbackLabels(type: CrossCheckItem['check_type'], index: number): { source: string; target: string } {
  const typeLabels: Record<CrossCheckItem['check_type'], { source: string; target: string }> = {
    kdv: { source: 'Mizan (191/391 KDV)', target: 'KDV-1 Beyannamesi' },
    e_fatura: { source: 'Mizan (600-602 Satislar)', target: 'e-Fatura Satis Listesi' },
    banka: { source: 'Mizan (102 Bankalar)', target: 'Banka Ekstresi' },
    beyan: { source: 'Ba-Bs Formu', target: 'e-Fatura Listesi' },
    other: { source: `Kaynak #${index + 1}`, target: `Hedef #${index + 1}` },
  };
  return typeLabels[type] || typeLabels.other;
}

const STATUS_CONFIG: Record<CrossCheckItem['status'], { badge: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
  match: { badge: 'success', label: 'Eşleşme' },
  minor: { badge: 'warning', label: 'Küçük Fark' },
  major: { badge: 'error', label: 'Büyük Fark' },
  critical: { badge: 'error', label: 'Kritik' },
};

// Cross-Check SMMM Info Modal
function CrossCheckInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-indigo-50 border-b border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-100">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-indigo-800">{CROSS_CHECK_SMMM_INFO.title}</h2>
              <p className="text-sm text-slate-600">{CROSS_CHECK_SMMM_INFO.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Context */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Cross-Check Nasıl Çalışır?</h3>
            <ul className="space-y-2">
              {CROSS_CHECK_SMMM_INFO.context.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Fark Tipleri */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Fark Seviyeleri</h3>
            <div className="space-y-2">
              {CROSS_CHECK_SMMM_INFO.farkTipleri.map((fark, i) => (
                <div key={i} className={`p-2 rounded text-sm ${fark.color}`}>
                  <strong>{fark.level}:</strong> {fark.desc}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SMMM Olarak Ne Yapmalısınız?
            </h3>
            <ul className="space-y-1">
              {CROSS_CHECK_SMMM_INFO.actions.map((action, i) => (
                <li key={i} className="text-sm text-slate-700 pl-4 border-l-2 border-indigo-300">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}

export function CrossCheckPanel() {
  const [showExplain, setShowExplain] = useState(false);
  const [showSmmmInfo, setShowSmmmInfo] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const envelope = useFailSoftFetch<CrossCheckResult>(ENDPOINTS.CROSS_CHECK, normalizeCrossCheck);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  const formatAmount = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // Check if we have real data
  const hasData = data && data.checks && data.checks.length > 0;
  const displayChecks = hasData ? data.checks : [];
  const displaySummary = hasData ? data.summary : { total: 0, matched: 0, discrepancies: 0, critical: 0 };

  const handleRowClick = (check: CrossCheckItem) => {
    setExpandedRowId(expandedRowId === check.id ? null : check.id);
  };

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            Mutabakat Matrisi
            <button
              onClick={() => setShowSmmmInfo(true)}
              className="text-slate-400 hover:text-indigo-600 transition-colors"
              title="SMMM Rehberi"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </span>
        }
        subtitle="Mizan vs KDV / e-Fatura / Banka"
        headerAction={
          hasData ? (
            <div className="flex items-center gap-2">
              <Badge variant="success">{displaySummary.matched} eşleşti</Badge>
              {displaySummary.discrepancies > 0 && (
                <Badge variant="warning">{displaySummary.discrepancies} fark</Badge>
              )}
            </div>
          ) : (
            <Badge variant="default">Veri Bekleniyor</Badge>
          )
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {!hasData && status === 'ok' ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-600">Mutabakat Kontrolleri (Örnek Yapı)</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
                      <th className="py-2 px-2 font-semibold">Muhasebe (Mizan)</th>
                      <th className="py-2 px-2 font-semibold">Karşı Veri</th>
                      <th className="py-2 px-2 text-right font-semibold">Tutar</th>
                      <th className="py-2 px-2 text-right font-semibold">Fark</th>
                      <th className="py-2 px-2 text-center font-semibold">Eşik</th>
                      <th className="py-2 px-2 text-center font-semibold">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-400">
                    {EMPTY_STATE_STRUCTURE.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2 px-2">
                          <span className="mr-1">{item.icon}</span>
                          <span className="text-slate-600">{item.source}</span>
                        </td>
                        <td className="py-2 px-2 text-slate-500">{item.target}</td>
                        <td className="text-right px-2">₺---</td>
                        <td className="text-right px-2">₺---</td>
                        <td className="text-center px-2">
                          <span className="text-slate-400 text-[10px]">{item.threshold}</span>
                        </td>
                        <td className="text-center px-2">
                          <button disabled className="text-[10px] text-slate-300 px-2 py-0.5 border border-slate-200 rounded">
                            Detay
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-blue-600 mt-4 text-center">
                📤 Mizan ve Beyanname yüklendiğinde mutabakat analizi yapılır
              </p>
            </div>
          ) : (
            <div className="space-y-2">
            {/* Dense Comparison Table - SMMM Terminology */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-semibold text-slate-600 whitespace-nowrap">Muhasebe (Mizan)</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-600 whitespace-nowrap">Karşı Veri</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 whitespace-nowrap tabular-nums">Tutar</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 whitespace-nowrap tabular-nums">Fark</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 whitespace-nowrap tabular-nums">%</th>
                    <th className="text-center py-2 px-2 font-semibold text-slate-600 whitespace-nowrap">Durum</th>
                    <th className="text-center py-2 px-2 font-semibold text-slate-600 whitespace-nowrap">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayChecks.map((check) => (
                    <React.Fragment key={check.id}>
                      <tr
                        className={`hover:bg-slate-50 ${check.difference !== 0 && check.explanation_tr ? 'cursor-pointer' : ''}`}
                        onClick={() => handleRowClick(check)}
                      >
                        <td className="py-1.5 px-2">
                          <span className="text-slate-800 font-medium">{check.source_label}</span>
                        </td>
                        <td className="py-1.5 px-2">
                          <span className="text-slate-600">{check.target_label}</span>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums text-slate-700">
                          ₺{formatAmount(check.source_amount)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                          {check.difference === 0 ? (
                            <span className="text-green-500 flex items-center justify-end gap-1">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-red-600 font-medium">
                              ₺{formatAmount(Math.abs(check.difference))}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                          {check.difference_pct !== 0 ? (
                            <span className={check.difference_pct > 5 ? 'text-red-600' : 'text-amber-600'}>
                              %{check.difference_pct.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-green-500">%0</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {check.status === 'match' ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                              <Check className="w-3 h-3 text-green-600" />
                            </span>
                          ) : (
                            <Badge variant={STATUS_CONFIG[check.status].badge}>
                              {STATUS_CONFIG[check.status].label}
                            </Badge>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRowClick(check); }}
                            className="text-[10px] text-blue-600 hover:text-blue-800 px-2 py-0.5 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                          >
                            Detay
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Row - Explanation */}
                      {expandedRowId === check.id && (
                        <tr className="bg-amber-50">
                          <td colSpan={7} className="py-3 px-4">
                            <div className="space-y-2">
                              {check.explanation_tr ? (
                                <div className="flex items-start gap-2 text-xs">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-slate-700">{check.explanation_tr}</span>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-600">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-medium text-slate-500">Kaynak:</span>
                                      <span className="ml-2">{check.source_label}</span>
                                      <span className="ml-2 font-mono">₺{check.source_amount.toLocaleString('tr-TR')}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium text-slate-500">Hedef:</span>
                                      <span className="ml-2">{check.target_label}</span>
                                      <span className="ml-2 font-mono">₺{check.target_amount.toLocaleString('tr-TR')}</span>
                                    </div>
                                  </div>
                                  {check.difference !== 0 && (
                                    <p className="mt-2 text-amber-700">
                                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                                      Fark tespit edildi. Kayitlari kontrol edin.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Compact Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-3 text-slate-500">
                <span><strong className="text-green-600">{displaySummary.matched}</strong> eşleşen</span>
                <span><strong className="text-amber-600">{displaySummary.discrepancies}</strong> uyumsuz</span>
                {displaySummary.critical > 0 && (
                  <span><strong className="text-red-600">{displaySummary.critical}</strong> kritik</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TrustBadge trust={trust} />
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
        title="Cross-Check Analizi"
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={meta}
      />

      <CrossCheckInfoModal isOpen={showSmmmInfo} onClose={() => setShowSmmmInfo(false)} />
    </>
  );
}
