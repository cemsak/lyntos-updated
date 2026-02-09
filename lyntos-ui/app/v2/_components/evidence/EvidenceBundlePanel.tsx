'use client';

import React, { useState } from 'react';
import { useEvidenceBundle } from '../../_lib/evidence';
import { useMizanStore } from '../../_lib/stores/mizanStore';
import { useToast } from '../shared/Toast';

interface EvidenceBundlePanelProps {
  onClose?: () => void;
}

export function EvidenceBundlePanel({ onClose }: EvidenceBundlePanelProps) {
  const { showToast } = useToast();
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
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📁</div>
          <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">Mizan Gerekli</h3>
          <p className="text-[#5A5A5A] text-sm mb-4">
            Kanıt paketi oluşturmak için önce mizan yüklemeniz gerekiyor.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#F5F6F8] text-[#5A5A5A] rounded-lg hover:bg-[#E5E5E5] transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0049AA] to-[#0049AA] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="text-lg font-bold text-white">Kanıt Paketi Oluştur</h2>
              <p className="text-[#E6F9FF] text-sm">VDK Risk Analizi ve Dönem Sonu Raporu</p>
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
        <div className="bg-[#F5F6F8] rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#969696]">Mükellef:</span>
              <span className="ml-2 font-medium text-[#2E2E2E]">{mizanMeta?.taxpayerName || mizanMeta?.taxpayerId}</span>
            </div>
            <div>
              <span className="text-[#969696]">Dönem:</span>
              <span className="ml-2 font-medium text-[#2E2E2E]">{mizanMeta?.period}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-[#BF192B]">
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
            <h3 className="text-xl font-semibold text-[#2E2E2E] mb-2">Analiz Hazır</h3>
            <p className="text-[#5A5A5A] mb-6 max-w-md mx-auto">
              17 kural ile mizan analizi yapılacak, VDK risk kriterleri kontrol edilecek
              ve profesyonel bir kanıt paketi oluşturulacak.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-3 bg-[#0049AA] text-white rounded-lg font-medium hover:bg-[#0049AA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            <h3 className="text-xl font-semibold text-[#2E2E2E] mb-2">Analiz Yapılıyor</h3>
            <p className="text-[#5A5A5A] mb-4">Lütfen bekleyin...</p>
            <div className="w-64 mx-auto bg-[#E5E5E5] rounded-full h-2">
              <div className="bg-[#0049AA] h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && bundle && (
          <div>
            {/* Özet Kartları */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#2E2E2E]">{bundle.executiveSummary.totalFindings}</div>
                <div className="text-xs text-[#969696]">Toplam Bulgu</div>
              </div>
              <div className="bg-[#FEF2F2] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#BF192B]">{bundle.executiveSummary.criticalFindings}</div>
                <div className="text-xs text-[#F0282D]">Kritik</div>
              </div>
              <div className="bg-[#FFFBEB] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#FA841E]">{bundle.executiveSummary.highFindings}</div>
                <div className="text-xs text-[#FFB114]">Yüksek</div>
              </div>
              <div className="bg-[#E6F9FF] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#0049AA]">{bundle.executiveSummary.riskScore}</div>
                <div className="text-xs text-[#0078D0]">Risk Skoru</div>
              </div>
            </div>

            {/* Risk Seviyesi */}
            <div className={`rounded-lg p-4 mb-6 ${
              bundle.executiveSummary.riskLevel === 'CRITICAL' ? 'bg-[#FEF2F2] border border-[#FF9196]' :
              bundle.executiveSummary.riskLevel === 'HIGH' ? 'bg-[#FFFBEB] border border-[#FFE045]' :
              bundle.executiveSummary.riskLevel === 'MEDIUM' ? 'bg-yellow-100 border border-yellow-300' :
              'bg-[#ECFDF5] border border-[#6BDB83]'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {bundle.executiveSummary.riskLevel === 'CRITICAL' ? '🔴' :
                   bundle.executiveSummary.riskLevel === 'HIGH' ? '🟠' :
                   bundle.executiveSummary.riskLevel === 'MEDIUM' ? '🟡' : '🟢'}
                </span>
                <div>
                  <div className="font-semibold text-[#2E2E2E]">
                    Risk Seviyesi: {bundle.executiveSummary.riskLevel}
                  </div>
                  <div className="text-sm text-[#5A5A5A]">
                    {bundle.executiveSummary.overallAssessment}
                  </div>
                </div>
              </div>
            </div>

            {/* VDK Kriterleri */}
            <div className="mb-6">
              <h4 className="font-semibold text-[#2E2E2E] mb-3">VDK Kriterleri</h4>
              <div className="grid grid-cols-2 gap-2">
                {bundle.vdkSummary.criteria.map(c => (
                  <div
                    key={c.code}
                    className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                      c.status === 'PASSED' ? 'bg-[#ECFDF5] text-[#00804D]' :
                      c.status === 'WARNING' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-[#FEF2F2] text-[#BF192B]'
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
            <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5]">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-[#5A5A5A] hover:text-[#2E2E2E] transition-colors"
              >
                ← Yeniden Başla
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadJSON}
                  className="px-4 py-2 bg-[#F5F6F8] text-[#5A5A5A] rounded-lg hover:bg-[#E5E5E5] transition-colors flex items-center gap-2"
                >
                  <span>📄</span>
                  JSON İndir
                </button>
                <button
                  className="px-6 py-2 bg-[#0049AA] text-white rounded-lg font-medium hover:bg-[#0049AA] transition-colors flex items-center gap-2"
                  onClick={() => {
                    // TODO: Gerçek PDF indirme
                    showToast('info', 'PDF indirme özelliği yakında eklenecek. Şimdilik JSON indirin.');
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
