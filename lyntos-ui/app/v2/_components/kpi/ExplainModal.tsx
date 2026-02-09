'use client';
import React, { useState } from 'react';
import type { ExpertAnalysis, AiAnalysis, LegalBasisRef, EvidenceRef, PanelMeta, TrustFactor, TrustFactorDetay } from '../contracts/envelope';
import { Badge, TrustBadge } from '../shared/Badge';
import { useDashboardScope } from '../scope/ScopeProvider';
import { useSources } from '../sources/SourcesProvider';
import { EvidenceViewer } from '../evidence/EvidenceViewer';
import { CheckCircle2, AlertTriangle, XCircle, Shield, FileText, Scale, Calculator } from 'lucide-react';

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
      return {
        id: ref.id,
        title_tr: source.baslik,
        url: source.url,
        code: source.code,
      };
    }
    return ref;
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="explain-modal-title"
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <div>
            <h2 id="explain-modal-title" className="text-lg font-semibold text-[#2E2E2E]">{title}</h2>
            <p className="text-xs text-[#969696] mt-0.5">Analiz ve Aciklama</p>
          </div>
          <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A] text-2xl leading-none">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* EXPERT ANALYSIS - Always on top */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-[#2E2E2E]">Uzman Analizi</h3>
              <Badge variant="success">Deterministik</Badge>
              {analysis.expert && (
                <Badge
                  variant={analysis.expert.trust_score >= 0.9 ? 'success' : analysis.expert.trust_score >= 0.7 ? 'warning' : 'error'}
                >
                  Güven: %{Math.round(analysis.expert.trust_score * 100)}
                </Badge>
              )}
            </div>
            {analysis.expert ? (
              <div className="space-y-4">
                {/* Özet */}
                <div className="bg-[#F5F6F8] rounded-lg p-4 border border-[#E5E5E5]">
                  <p className="text-sm font-medium text-[#2E2E2E]">{analysis.expert.summary_tr}</p>
                  {analysis.expert.method && (
                    <p className="text-xs text-[#969696] mt-2 flex items-center gap-1">
                      <Calculator className="w-3 h-3" />
                      Yöntem: {analysis.expert.method}
                    </p>
                  )}
                </div>

                {/* GÜVEN FAKTÖRLERİ - SMMM İÇİN ÖNEMLİ */}
                {analysis.expert.trust_factors && analysis.expert.trust_factors.length > 0 && (
                  <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-[#F5F6F8] border-b border-[#E5E5E5]">
                      <h4 className="text-xs font-semibold text-[#5A5A5A] flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Güven Skoru Detayları (SMMM için)
                      </h4>
                    </div>
                    <div className="divide-y divide-[#E5E5E5]">
                      {analysis.expert.trust_factors.map((factor: TrustFactor, i: number) => (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {factor.durum === 'ok' ? (
                                <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
                              ) : factor.durum === 'warning' ? (
                                <AlertTriangle className="w-5 h-5 text-[#FFB114]" />
                              ) : (
                                <XCircle className="w-5 h-5 text-[#F0282D]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-[#2E2E2E]">{factor.faktor}</p>
                                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                                  factor.skor >= 0.9 ? 'bg-[#ECFDF5] text-[#00804D]' :
                                  factor.skor >= 0.7 ? 'bg-[#FFFBEB] text-[#FA841E]' :
                                  'bg-[#FEF2F2] text-[#BF192B]'
                                }`}>
                                  %{Math.round(factor.skor * 100)}
                                </span>
                              </div>
                              <p className="text-xs text-[#5A5A5A] mt-0.5">{factor.aciklama}</p>

                              {/* SMMM İÇİN DETAYLI BİLGİ */}
                              {factor.detay && (
                                <div className="mt-2 space-y-2">
                                  {/* Hatalı Hesaplar Listesi - SMMM İÇİN NEDEN BİLGİSİ KRİTİK */}
                                  {factor.detay.hata_hesaplar && factor.detay.hata_hesaplar.length > 0 && (
                                    <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded p-2">
                                      <p className="text-xs font-semibold text-[#980F30] mb-1">❌ Kritik Hata Olan Hesaplar:</p>
                                      <div className="space-y-2">
                                        {factor.detay.hata_hesaplar.map((h, idx) => (
                                          <div key={idx} className="bg-white/60 rounded p-1.5 border border-[#FFC7C9]/50">
                                            <div className="flex justify-between items-start">
                                              <span className="text-xs font-medium text-[#980F30]">
                                                <strong>{h.kod}</strong> {h.ad}
                                              </span>
                                              <span className="text-xs font-mono text-[#BF192B]">
                                                {h.bakiye?.toLocaleString('tr-TR')} TL
                                              </span>
                                            </div>
                                            {/* NEDEN bilgisi - SMMM için kritik! */}
                                            {h.neden && (
                                              <p className="text-[11px] text-[#BF192B] mt-0.5 italic">
                                                → {h.neden}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Uyarılı Hesaplar Listesi - SMMM İÇİN NEDEN BİLGİSİ KRİTİK */}
                                  {factor.detay.uyari_hesaplar && factor.detay.uyari_hesaplar.length > 0 && (
                                    <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded p-2">
                                      <p className="text-xs font-semibold text-[#E67324] mb-1">⚠️ Uyarı Olan Hesaplar:</p>
                                      <div className="space-y-2">
                                        {factor.detay.uyari_hesaplar.slice(0, 5).map((h, idx) => (
                                          <div key={idx} className="bg-white/60 rounded p-1.5 border border-[#FFF08C]/50">
                                            <div className="flex justify-between items-start">
                                              <span className="text-xs font-medium text-[#E67324]">
                                                <strong>{h.kod}</strong> {h.ad}
                                              </span>
                                              <span className="text-xs font-mono text-[#FA841E]">
                                                {h.bakiye?.toLocaleString('tr-TR')} TL
                                              </span>
                                            </div>
                                            {/* NEDEN bilgisi - SMMM için kritik! */}
                                            {h.neden && (
                                              <p className="text-[11px] text-[#FA841E] mt-0.5 italic">
                                                → {h.neden}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                        {factor.detay.uyari_hesaplar.length > 5 && (
                                          <p className="text-xs text-[#FA841E] italic">
                                            +{factor.detay.uyari_hesaplar.length - 5} hesap daha...
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Oran Hesaplama Formülü */}
                                  {factor.detay.formul && (
                                    <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded p-2">
                                      <p className="text-xs font-semibold text-[#00287F] mb-1">📊 Hesaplama Formülü:</p>
                                      <p className="text-xs text-[#0049AA] font-mono">{factor.detay.formul}</p>
                                      {factor.detay.donen_varliklar !== undefined && (
                                        <div className="mt-1 text-xs text-[#0049AA]">
                                          <p>• Dönen Varlıklar (1xx): {factor.detay.donen_varliklar?.toLocaleString('tr-TR')} TL</p>
                                          <p>• KVYK (3xx): {factor.detay.kvyk?.toLocaleString('tr-TR')} TL</p>
                                          <p>• Stoklar (15x): {factor.detay.stoklar?.toLocaleString('tr-TR')} TL</p>
                                          <p className="font-semibold mt-1">= Sonuç: {factor.detay.sonuc?.toFixed(2)}x</p>
                                        </div>
                                      )}
                                      {factor.detay.kaynak && (
                                        <p className="text-xs text-[#0078D0] mt-1 italic">Kaynak: {factor.detay.kaynak}</p>
                                      )}
                                    </div>
                                  )}

                                  {/* Eksik Veri Uyarısı */}
                                  {factor.detay.eksik_veri && (
                                    <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded p-2">
                                      <p className="text-xs font-semibold text-[#E67324]">⚠️ Eksik Veri: {factor.detay.eksik_veri}</p>
                                      {factor.detay.kontrol && (
                                        <p className="text-xs text-[#FA841E] mt-1">Kontrol: {factor.detay.kontrol}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detaylı Açıklama */}
                {analysis.expert.details_tr && (
                  <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
                    <h4 className="text-xs font-semibold text-[#00287F] mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Detaylı Değerlendirme
                    </h4>
                    <pre className="text-xs text-[#00287F] whitespace-pre-wrap font-sans">
                      {analysis.expert.details_tr}
                    </pre>
                  </div>
                )}

                {/* Uygulanan Kurallar */}
                {analysis.expert.rule_refs && analysis.expert.rule_refs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#5A5A5A] mb-2">Uygulanan Kurallar:</h4>
                    <div className="flex flex-wrap gap-1">
                      {analysis.expert.rule_refs.map((ref, i) => (
                        <Badge key={i} variant="info" size="sm">{ref}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4">
                <p className="text-sm text-[#E67324] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Uzman analizi henüz hesaplanmadı veya veri yetersiz.
                </p>
              </div>
            )}
          </section>

          {/* AI ANALYSIS - Below expert, with disclaimer */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-[#2E2E2E]">AI Onerisi</h3>
              <Badge variant="info">Yapay Zeka</Badge>
              {analysis.ai && (
                <span className="text-xs text-[#969696]">
                  Guven: %{Math.round(analysis.ai.confidence * 100)}
                </span>
              )}
            </div>
            {analysis.ai ? (
              <div className="bg-[#E6F9FF] rounded-lg p-4 border border-[#E6F9FF]">
                <p className="text-sm text-[#5A5A5A]">{analysis.ai.summary_tr}</p>
                {analysis.ai.details_tr && (
                  <p className="text-sm text-[#5A5A5A] mt-2">{analysis.ai.details_tr}</p>
                )}
                {/* AI Disclaimer - Always shown */}
                <div className="mt-3 pt-3 border-t border-[#ABEBFF]">
                  <p className="text-xs text-[#0049AA] italic">
                    {analysis.ai.disclaimer_tr}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#969696] italic">AI onerisi mevcut degil.</p>
            )}
          </section>

          {/* LEGAL BASIS */}
          <section>
            <h3 className="text-sm font-semibold text-[#2E2E2E] mb-3">Yasal Dayanak</h3>
            {resolvedRefs.length > 0 ? (
              <div className="space-y-2">
                {resolvedRefs.map((ref, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F5F6F8] rounded-lg p-3 border border-[#E5E5E5]">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#2E2E2E]">
                        {ref.title_tr !== ref.id ? ref.title_tr : `Kaynak: ${ref.id}`}
                      </p>
                      {ref.code && (
                        <p className="text-xs text-[#969696] mt-0.5">{ref.code}</p>
                      )}
                      {ref.title_tr === ref.id && !sourcesLoaded && (
                        <p className="text-xs text-[#FA841E] mt-0.5">Kaynak detayı yükleniyor...</p>
                      )}
                      {ref.title_tr === ref.id && sourcesLoaded && (
                        <p className="text-xs text-[#969696] mt-0.5">Kaynak bulunamadı</p>
                      )}
                    </div>
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 px-3 py-1.5 text-xs bg-[#0049AA] text-white rounded hover:bg-[#0049AA] transition-colors"
                        title={ref.url}
                      >
                        Goruntule →
                      </a>
                    ) : (
                      <span className="ml-3 px-2 py-1 text-xs bg-[#E5E5E5] text-[#5A5A5A] rounded">
                        {ref.id}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#969696] italic">Yasal dayanak bilgisi yok.</p>
            )}
          </section>

          {/* EVIDENCE */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#2E2E2E]">Kanit Dosyalari</h3>
              {evidenceRefs.length > 0 && (
                <button
                  onClick={() => setShowEvidence(true)}
                  className="text-xs text-[#0049AA] hover:text-[#00287F]"
                >
                  Tumunu Goruntule →
                </button>
              )}
            </div>
            {evidenceRefs.length > 0 ? (
              <div className="space-y-2">
                {evidenceRefs.slice(0, 3).map((ref, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F5F6F8] rounded p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{ref.kind}</Badge>
                      <p className="text-sm text-[#5A5A5A]">{ref.title_tr}</p>
                    </div>
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#0049AA] hover:text-[#00287F]"
                      >
                        Indir →
                      </a>
                    ) : (
                      <span className="text-xs text-[#969696]">{ref.ref}</span>
                    )}
                  </div>
                ))}
                {evidenceRefs.length > 3 && (
                  <button
                    onClick={() => setShowEvidence(true)}
                    className="w-full text-center text-xs text-[#0049AA] hover:text-[#00287F] py-2"
                  >
                    +{evidenceRefs.length - 3} dosya daha
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#969696] italic">Kanit dosyasi yok.</p>
            )}
          </section>

          {/* META - Only in advanced mode */}
          {scope.advanced && (
            <section className="border-t border-[#E5E5E5] pt-4">
              <h3 className="text-xs font-semibold text-[#969696] mb-2">Teknik Bilgi</h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#969696]">
                <span>rulepack: {meta.rulepack_version}</span>
                <span>hash: {meta.inputs_hash}</span>
                <span>as_of: {meta.as_of}</span>
                {meta.request_id && <span>req: {meta.request_id}</span>}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] bg-[#F5F6F8]">
          <div className="flex items-center justify-between">
            <TrustBadge trust={trust} />
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[#2E2E2E] text-white rounded hover:bg-[#2E2E2E] transition-colors"
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
