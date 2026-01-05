'use client';
import React, { useState } from 'react';
import type { ExpertAnalysis, AiAnalysis, LegalBasisRef, EvidenceRef, PanelMeta } from '../contracts/envelope';
import { Badge, TrustBadge } from '../shared/Badge';
import { useDashboardScope } from '../scope/ScopeProvider';
import { useSources } from '../sources/SourcesProvider';
import { EvidenceViewer } from '../evidence/EvidenceViewer';

interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  analysis: { expert?: ExpertAnalysis; ai?: AiAnalysis };
  trust: 'low' | 'med' | 'high';
  legalBasisRefs: LegalBasisRef[];
  evidenceRefs: EvidenceRef[];
  meta: PanelMeta;
}

export function ExplainModal({ isOpen, onClose, title, analysis, trust, legalBasisRefs, evidenceRefs, meta }: ExplainModalProps) {
  const { scope } = useDashboardScope();
  const { sources, isLoaded: sourcesLoaded } = useSources();
  const [showEvidence, setShowEvidence] = useState(false);

  // Resolve legal basis refs at render time using sources context
  const resolvedRefs: LegalBasisRef[] = legalBasisRefs.map(ref => {
    // If already resolved (title_tr !== id), keep it
    if (ref.title_tr && ref.title_tr !== ref.id) return ref;
    // Otherwise try to resolve from sources
    const source = sources.find(s => s.id === ref.id);
    if (source) {
      console.log('[ExplainModal] Resolving', ref.id, '-> url:', source.url);
      return {
        id: ref.id,
        title_tr: source.baslik,
        url: source.url,
        code: source.code,
      };
    }
    return ref;
  });

  // Debug: log resolved refs
  if (isOpen && resolvedRefs.length > 0) {
    console.log('[ExplainModal] resolvedRefs:', resolvedRefs);
  }

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Analiz ve Aciklama</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* EXPERT ANALYSIS - Always on top */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Uzman Analizi</h3>
              <Badge variant="success">Deterministik</Badge>
              <TrustBadge trust="high" />
            </div>
            {analysis.expert ? (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700">{analysis.expert.summary_tr}</p>
                {analysis.expert.details_tr && (
                  <p className="text-sm text-slate-600 mt-2">{analysis.expert.details_tr}</p>
                )}
                {analysis.expert.rule_refs && analysis.expert.rule_refs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {analysis.expert.rule_refs.map((ref, i) => (
                      <Badge key={i} variant="default">{ref}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Uzman analizi mevcut degil.</p>
            )}
          </section>

          {/* AI ANALYSIS - Below expert, with disclaimer */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-900">AI Onerisi</h3>
              <Badge variant="info">Yapay Zeka</Badge>
              {analysis.ai && (
                <span className="text-xs text-slate-500">
                  Guven: %{Math.round(analysis.ai.confidence * 100)}
                </span>
              )}
            </div>
            {analysis.ai ? (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm text-slate-700">{analysis.ai.summary_tr}</p>
                {analysis.ai.details_tr && (
                  <p className="text-sm text-slate-600 mt-2">{analysis.ai.details_tr}</p>
                )}
                {/* AI Disclaimer - Always shown */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-700 italic">
                    {analysis.ai.disclaimer_tr}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">AI onerisi mevcut degil.</p>
            )}
          </section>

          {/* LEGAL BASIS */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Yasal Dayanak</h3>
            {resolvedRefs.length > 0 ? (
              <div className="space-y-2">
                {resolvedRefs.map((ref, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {ref.title_tr !== ref.id ? ref.title_tr : `Kaynak: ${ref.id}`}
                      </p>
                      {ref.code && (
                        <p className="text-xs text-slate-500 mt-0.5">{ref.code}</p>
                      )}
                      {ref.title_tr === ref.id && !sourcesLoaded && (
                        <p className="text-xs text-amber-600 mt-0.5">Kaynak detayi yukleniyor...</p>
                      )}
                      {ref.title_tr === ref.id && sourcesLoaded && (
                        <p className="text-xs text-slate-500 mt-0.5">Kaynak bulunamadi</p>
                      )}
                    </div>
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        title={ref.url}
                        onClick={() => console.log('[ExplainModal] Opening URL:', ref.url)}
                      >
                        Goruntule →
                      </a>
                    ) : (
                      <span className="ml-3 px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded">
                        {ref.id}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Yasal dayanak bilgisi yok.</p>
            )}
          </section>

          {/* EVIDENCE */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Kanit Dosyalari</h3>
              {evidenceRefs.length > 0 && (
                <button
                  onClick={() => setShowEvidence(true)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Tumunu Goruntule →
                </button>
              )}
            </div>
            {evidenceRefs.length > 0 ? (
              <div className="space-y-2">
                {evidenceRefs.slice(0, 3).map((ref, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{ref.kind}</Badge>
                      <p className="text-sm text-slate-700">{ref.title_tr}</p>
                    </div>
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Indir →
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">{ref.ref}</span>
                    )}
                  </div>
                ))}
                {evidenceRefs.length > 3 && (
                  <button
                    onClick={() => setShowEvidence(true)}
                    className="w-full text-center text-xs text-blue-600 hover:text-blue-800 py-2"
                  >
                    +{evidenceRefs.length - 3} dosya daha
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Kanit dosyasi yok.</p>
            )}
          </section>

          {/* META - Only in advanced mode */}
          {scope.advanced && (
            <section className="border-t border-slate-200 pt-4">
              <h3 className="text-xs font-semibold text-slate-500 mb-2">Teknik Bilgi</h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-500">
                <span>rulepack: {meta.rulepack_version}</span>
                <span>hash: {meta.inputs_hash}</span>
                <span>as_of: {meta.as_of}</span>
                {meta.request_id && <span>req: {meta.request_id}</span>}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <TrustBadge trust={trust} />
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>

      {/* Evidence Viewer Modal */}
      <EvidenceViewer
        isOpen={showEvidence}
        onClose={() => setShowEvidence(false)}
        evidenceRefs={evidenceRefs.map(ref => ({
          id: ref.id,
          title: ref.title_tr,
          kind: ref.kind,
          ref: ref.ref,
          url: ref.url,
          page: ref.page,
        }))}
        title={`${title} - Kanit Dosyalari`}
      />
    </div>
  );
}
