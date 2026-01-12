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

// Demo data with real source labels
const DEMO_CHECKS: CrossCheckItem[] = [
  {
    id: 'kdv-mizan',
    check_type: 'kdv',
    source_label: 'KDV Beyannamesi',
    target_label: 'Mizan 391 Hesap',
    source_amount: 1250000,
    target_amount: 1250000,
    difference: 0,
    difference_pct: 0,
    status: 'match',
    explanation_tr: 'KDV beyannamesi ile mizan 391 hesabı tam eşleşiyor.',
  },
  {
    id: 'efatura-mizan',
    check_type: 'e_fatura',
    source_label: 'e-Fatura Toplamı',
    target_label: 'Mizan 600 Hesap',
    source_amount: 3855280,
    target_amount: 3420000,
    difference: 435280,
    difference_pct: 11.3,
    status: 'major',
    explanation_tr: 'UYUMSUZLUK NEDENİ: 5 adet Aralık faturası Ocak ayına kaydedilmiş. ÖNERİ: 600 Yurtiçi Satışlar hesabını kontrol edin.',
  },
  {
    id: 'banka-mizan',
    check_type: 'banka',
    source_label: 'Banka Hesap Özeti',
    target_label: 'Mizan 102 Hesap',
    source_amount: 890000,
    target_amount: 890000,
    difference: 0,
    difference_pct: 0,
    status: 'match',
    explanation_tr: 'Banka hesap özeti ile mizan 102 hesabı eşleşiyor.',
  },
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
      ? checksRaw.map((c: Record<string, unknown>, idx: number) => ({
          id: String(c.id || `cc-${idx}`),
          check_type: mapCheckType(c.type || c.check_type),
          source_label: String(c.source_label || c.source || 'Kaynak'),
          target_label: String(c.target_label || c.target || 'Hedef'),
          source_amount: typeof c.source_amount === 'number' ? c.source_amount : 0,
          target_amount: typeof c.target_amount === 'number' ? c.target_amount : 0,
          difference: typeof c.difference === 'number' ? c.difference : 0,
          difference_pct: typeof c.difference_pct === 'number' ? c.difference_pct : 0,
          status: mapStatus(c.status || c.result),
          explanation_tr: c.explanation_tr ? String(c.explanation_tr) : undefined,
        }))
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

  // Use demo data if no real data
  const isDemo = status === 'empty' || status === 'error' || !data || data.checks.length === 0;
  const displayChecks = isDemo ? DEMO_CHECKS : data?.checks || [];
  const displaySummary = isDemo ? {
    total: DEMO_CHECKS.length,
    matched: DEMO_CHECKS.filter(c => c.status === 'match').length,
    discrepancies: DEMO_CHECKS.filter(c => c.status !== 'match').length,
    critical: DEMO_CHECKS.filter(c => c.status === 'critical').length,
  } : data?.summary || { total: 0, matched: 0, discrepancies: 0, critical: 0 };

  const handleRowClick = (check: CrossCheckItem) => {
    if (check.difference !== 0 && check.explanation_tr) {
      setExpandedRowId(expandedRowId === check.id ? null : check.id);
    }
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
          <div className="flex items-center gap-2">
            {isDemo && (
              <Badge variant="default">Demo Veri</Badge>
            )}
            <Badge variant="success">{displaySummary.matched} eşleşti</Badge>
            {displaySummary.discrepancies > 0 && (
              <Badge variant="warning">{displaySummary.discrepancies} fark</Badge>
            )}
          </div>
        }
      >
        <PanelState status={isDemo ? 'ok' : status} reason_tr={reason_tr}>
          <div className="space-y-2">
            {/* Dense Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-semibold text-slate-600 whitespace-nowrap">Karşılaştırma</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 whitespace-nowrap tabular-nums">Kaynak</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 whitespace-nowrap tabular-nums">Hedef</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-600 whitespace-nowrap tabular-nums">Fark</th>
                    <th className="text-center py-2 px-2 font-semibold text-slate-600 whitespace-nowrap">Durum</th>
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
                          <div className="flex flex-col">
                            <span className="text-slate-800 font-medium">{check.source_label}</span>
                            <span className="text-slate-400 text-[10px]">vs {check.target_label}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums text-slate-700">
                          {formatAmount(check.source_amount)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums text-slate-700">
                          {formatAmount(check.target_amount)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                          {check.difference === 0 ? (
                            <span className="text-slate-300 flex items-center justify-end gap-1">
                              <Check className="w-3 h-3 text-green-500" />
                            </span>
                          ) : (
                            <span className="text-red-600 font-medium flex items-center justify-end gap-1">
                              {formatAmount(check.difference)}
                              {check.explanation_tr && (
                                <span className="text-[10px] text-slate-400">{expandedRowId === check.id ? '▲' : '▼'}</span>
                              )}
                            </span>
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
                      </tr>
                      {/* Expanded Row - Explanation */}
                      {expandedRowId === check.id && check.explanation_tr && (
                        <tr className="bg-amber-50">
                          <td colSpan={5} className="py-2 px-3">
                            <div className="flex items-start gap-2 text-xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span className="text-slate-700">{check.explanation_tr}</span>
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
