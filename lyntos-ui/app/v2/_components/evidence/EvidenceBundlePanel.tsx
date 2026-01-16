'use client';

import React, { useState } from 'react';
import { useEvidenceBundle } from '../../_lib/evidence';
import { useMizanStore } from '../../_lib/stores/mizanStore';

interface EvidenceBundlePanelProps {
  onClose?: () => void;
}

export function EvidenceBundlePanel({ onClose }: EvidenceBundlePanelProps) {
  const {
    bundle,
    loading,
    error,
    generateBundle,
    generatePDF,
    downloadJSON,
    reset,
  } = useEvidenceBundle();

  const mizanLoaded = useMizanStore(s => s.loaded);
  const mizanMeta = useMizanStore(s => s.meta);

  const [step, setStep] = useState<'ready' | 'generating' | 'complete'>('ready');

  const handleGenerate = async () => {
    setStep('generating');
    const result = await generateBundle();
    if (result) {
      generatePDF();
      setStep('complete');
    } else {
      setStep('ready');
    }
  };

  const handleReset = () => {
    reset();
    setStep('ready');
  };

  // Mizan yüklenmemişse uyarı göster
  if (!mizanLoaded) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📁</div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Mizan Gerekli</h3>
          <p className="text-slate-600 text-sm mb-4">
            Kanıt paketi oluşturmak için önce mizan yüklemeniz gerekiyor.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="text-lg font-bold text-white">Kanıt Paketi Oluştur</h2>
              <p className="text-blue-100 text-sm">VDK Risk Analizi ve Dönem Sonu Raporu</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Mükellef Bilgisi */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Mükellef:</span>
              <span className="ml-2 font-medium text-slate-800">{mizanMeta?.taxpayerName || mizanMeta?.taxpayerId}</span>
            </div>
            <div>
              <span className="text-slate-500">Dönem:</span>
              <span className="ml-2 font-medium text-slate-800">{mizanMeta?.period}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700">
              <span>⚠️</span>
              <span className="font-medium">Hata:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Step: Ready */}
        {step === 'ready' && (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Analiz Hazır</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              17 kural ile mizan analizi yapılacak, VDK risk kriterleri kontrol edilecek
              ve profesyonel bir kanıt paketi oluşturulacak.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Analiz Yapılıyor...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    Analizi Başlat
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4 animate-pulse">⚙️</div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Analiz Yapılıyor</h3>
            <p className="text-slate-600 mb-4">Lütfen bekleyin...</p>
            <div className="w-64 mx-auto bg-slate-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && bundle && (
          <div>
            {/* Özet Kartları */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{bundle.executiveSummary.totalFindings}</div>
                <div className="text-xs text-slate-500">Toplam Bulgu</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{bundle.executiveSummary.criticalFindings}</div>
                <div className="text-xs text-red-500">Kritik</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{bundle.executiveSummary.highFindings}</div>
                <div className="text-xs text-orange-500">Yüksek</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{bundle.executiveSummary.riskScore}</div>
                <div className="text-xs text-blue-500">Risk Skoru</div>
              </div>
            </div>

            {/* Risk Seviyesi */}
            <div className={`rounded-lg p-4 mb-6 ${
              bundle.executiveSummary.riskLevel === 'CRITICAL' ? 'bg-red-100 border border-red-300' :
              bundle.executiveSummary.riskLevel === 'HIGH' ? 'bg-orange-100 border border-orange-300' :
              bundle.executiveSummary.riskLevel === 'MEDIUM' ? 'bg-yellow-100 border border-yellow-300' :
              'bg-green-100 border border-green-300'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {bundle.executiveSummary.riskLevel === 'CRITICAL' ? '🔴' :
                   bundle.executiveSummary.riskLevel === 'HIGH' ? '🟠' :
                   bundle.executiveSummary.riskLevel === 'MEDIUM' ? '🟡' : '🟢'}
                </span>
                <div>
                  <div className="font-semibold text-slate-800">
                    Risk Seviyesi: {bundle.executiveSummary.riskLevel}
                  </div>
                  <div className="text-sm text-slate-600">
                    {bundle.executiveSummary.overallAssessment}
                  </div>
                </div>
              </div>
            </div>

            {/* VDK Kriterleri */}
            <div className="mb-6">
              <h4 className="font-semibold text-slate-800 mb-3">VDK Kriterleri</h4>
              <div className="grid grid-cols-2 gap-2">
                {bundle.vdkSummary.criteria.map(c => (
                  <div
                    key={c.code}
                    className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                      c.status === 'PASSED' ? 'bg-green-50 text-green-700' :
                      c.status === 'WARNING' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}
                  >
                    <span>{c.status === 'PASSED' ? '✓' : c.status === 'WARNING' ? '⚠' : '✗'}</span>
                    <span className="font-medium">{c.code}</span>
                    <span className="text-xs opacity-75">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                ← Yeniden Başla
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadJSON}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <span>📄</span>
                  JSON İndir
                </button>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  onClick={() => {
                    // TODO: Gerçek PDF indirme
                    alert('PDF indirme özelliği yakında eklenecek. Şimdilik JSON indirin.');
                  }}
                >
                  <span>📑</span>
                  PDF İndir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EvidenceBundlePanel;
