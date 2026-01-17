/**
 * LYNTOS Quarterly Analysis Page
 * Ana donem analizi sayfasi
 */

'use client';

import React from 'react';
import { QuarterlyUpload } from '../_components/quarterly/QuarterlyUpload';
import { AnalysisProgress } from '../_components/quarterly/AnalysisProgress';
import { CrossCheckDashboard } from '../_components/quarterly/CrossCheckDashboard';
import { useQuarterlyAnalysis } from '../_hooks/useQuarterlyAnalysis';

export default function QuarterlyPage() {
  const analysis = useQuarterlyAnalysis();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-800">LYNTOS</h1>
          <p className="text-gray-500">Donemsel Vergi Analizi</p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Upload section */}
        {!analysis.isComplete && (
          <section className="mb-8">
            <QuarterlyUpload
              onFileSelect={analysis.analyzeZip}
              isProcessing={analysis.isProcessing}
              isComplete={analysis.isComplete}
            />
          </section>
        )}

        {/* Progress section */}
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
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-700 mb-2">Hata Olustu</h3>
              <p className="text-red-600 mb-4">{analysis.error}</p>
              <button
                onClick={analysis.reset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          LYNTOS v2 - VDK/YMM Uyumlu Donemsel Vergi Analizi
        </div>
      </footer>
    </div>
  );
}
