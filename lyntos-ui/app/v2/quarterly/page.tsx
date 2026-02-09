/**
 * LYNTOS Quarterly Analysis Page
 * Ana donem analizi sayfasi
 *
 * Scope'dan (header dropdown) client+period bilgisi alır.
 * DB'de mizan verisi varsa otomatik olarak cross-check sonuçlarını gösterir.
 * Veri yoksa ZIP yükleme ekranı gösterir.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { QuarterlyUpload } from '../_components/quarterly/QuarterlyUpload';
import { AnalysisProgress } from '../_components/quarterly/AnalysisProgress';
import { CrossCheckDashboard } from '../_components/quarterly/CrossCheckDashboard';
import { useQuarterlyAnalysis } from '../_hooks/useQuarterlyAnalysis';
import { useDashboardScope, useScopeComplete } from '../_components/scope/useDashboardScope';

export default function QuarterlyPage() {
  const analysis = useQuarterlyAnalysis();
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();
  const loadedRef = useRef<string | null>(null);

  // Scope hazır olduğunda mevcut verileri otomatik yükle
  useEffect(() => {
    if (!scopeComplete || !scope.client_id || !scope.period) return;

    // Aynı scope için tekrar yükleme yapma
    const scopeKey = `${scope.client_id}__${scope.period}`;
    if (loadedRef.current === scopeKey) return;
    if (analysis.isComplete || analysis.isProcessing) return;

    loadedRef.current = scopeKey;
    analysis.loadExistingResults(
      scope.client_id,
      scope.period,
      scope.smmm_id || 'default'
    );
  }, [scopeComplete, scope.client_id, scope.period, scope.smmm_id, analysis]);

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-[#2E2E2E]">LYNTOS</h1>
          <p className="text-[#969696]">Dönemsel Vergi Analizi</p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Auto-loading indicator */}
        {analysis.isAutoLoading && (
          <section className="mb-8">
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center">
              <Loader2 className="w-10 h-10 text-[#0049AA] animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">
                Dönem Verileri Yükleniyor
              </h3>
              <p className="text-[#969696]">
                {scope.period} dönemi için mevcut analiz sonuçları kontrol ediliyor...
              </p>
            </div>
          </section>
        )}

        {/* Upload section — sadece veri yoksa ve auto-load tamamlandıysa göster */}
        {!analysis.isComplete && !analysis.isAutoLoading && (
          <section className="mb-8">
            <QuarterlyUpload
              onFileSelect={analysis.analyzeZip}
              isProcessing={analysis.isProcessing}
              isComplete={analysis.isComplete}
            />
          </section>
        )}

        {/* Progress section — ZIP upload progress */}
        {analysis.isProcessing && (
          <section className="mb-8">
            <AnalysisProgress
              phase={analysis.phase}
              progress={analysis.progress}
              currentFile={analysis.currentFile}
              fileStats={analysis.fileStats}
            />
          </section>
        )}

        {/* Error section */}
        {analysis.isError && (
          <section className="mb-8">
            <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[#BF192B] mb-2">Hata Oluştu</h3>
              <p className="text-[#BF192B] mb-4">{analysis.error}</p>
              <button
                onClick={analysis.reset}
                className="px-4 py-2 bg-[#BF192B] text-white rounded-lg hover:bg-[#980F30]"
              >
                Tekrar Dene
              </button>
            </div>
          </section>
        )}

        {/* Results section */}
        {analysis.isComplete && analysis.checkReport && (
          <section>
            <CrossCheckDashboard
              report={analysis.checkReport}
              duration={analysis.duration}
              onReset={analysis.reset}
              parsedData={analysis.parsedData}
              startTime={analysis.startTime}
              endTime={analysis.endTime}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E5E5E5] mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-[#969696]">
          LYNTOS v2 - VDK/YMM Uyumlu Dönemsel Vergi Analizi
        </div>
      </footer>
    </div>
  );
}
