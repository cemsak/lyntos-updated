'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Lightbulb, AlertTriangle } from 'lucide-react';

interface FiveWhyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  kriterId: string;
  kriterBaslik: string;
  problemAciklama: string;
  onComplete: (analysis: FiveWhyAnalysis) => void;
}

export interface FiveWhyAnalysis {
  kriterId: string;
  problem: string;
  whys: string[];
  kokNeden: string;
  onerilenAksiyonlar: string[];
  tarih: Date;
}

const WHY_PROMPTS = [
  'Bu sorun neden olustu?',
  'Bu durum neden var?',
  'Bunun sebebi ne?',
  'Neden boyle oldu?',
  'Asil neden ne?',
];

export function FiveWhyWizard({
  isOpen,
  onClose,
  kriterId,
  kriterBaslik,
  problemAciklama,
  onComplete,
}: FiveWhyWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [whys, setWhys] = useState<string[]>(['', '', '', '', '']);
  const [kokNeden, setKokNeden] = useState('');
  const [aksiyonlar, setAksiyonlar] = useState<string[]>(['']);

  if (!isOpen) return null;

  const handleWhyChange = (index: number, value: string) => {
    const newWhys = [...whys];
    newWhys[index] = value;
    setWhys(newWhys);
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const analysis: FiveWhyAnalysis = {
      kriterId,
      problem: problemAciklama,
      whys: whys.filter(w => w.trim() !== ''),
      kokNeden,
      onerilenAksiyonlar: aksiyonlar.filter(a => a.trim() !== ''),
      tarih: new Date(),
    };
    onComplete(analysis);
    resetState();
    onClose();
  };

  const resetState = () => {
    setCurrentStep(0);
    setWhys(['', '', '', '', '']);
    setKokNeden('');
    setAksiyonlar(['']);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const addAksiyon = () => {
    setAksiyonlar([...aksiyonlar, '']);
  };

  const updateAksiyon = (index: number, value: string) => {
    const newAksiyonlar = [...aksiyonlar];
    newAksiyonlar[index] = value;
    setAksiyonlar(newAksiyonlar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <span className="px-2 py-0.5 bg-white/20 rounded font-mono">
                  {kriterId}
                </span>
                <span>5 Why Analizi</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {kriterBaslik}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-slate-50 border-b">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>Adim {currentStep + 1} / 7</span>
            <span>{Math.round(((currentStep + 1) / 7) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
          {/* Step 0: Problem */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">Tespit Edilen Sorun</h3>
                  <p className="text-red-700 mt-1">{problemAciklama}</p>
                </div>
              </div>
              <p className="text-slate-600">
                Bu sorunun kok nedenini bulmak icin 5 Why metodunu kullanacagiz.
                Her adimda "Neden?" sorusunu sorarak sorunun gercek kaynagina ulasacagiz.
              </p>
            </div>
          )}

          {/* Steps 1-5: Why Questions */}
          {currentStep >= 1 && currentStep <= 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 bg-amber-100 text-amber-700 font-bold rounded-full">
                  {currentStep}
                </span>
                <h3 className="text-lg font-semibold text-slate-800">
                  {WHY_PROMPTS[currentStep - 1]}
                </h3>
              </div>

              {currentStep > 1 && (
                <div className="space-y-2 mb-4">
                  {whys.slice(0, currentStep - 1).map((why, idx) => (
                    why && (
                      <div key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-amber-500 font-medium">Why {idx + 1}:</span>
                        <span>{why}</span>
                      </div>
                    )
                  ))}
                </div>
              )}

              <textarea
                className="w-full h-32 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                placeholder="Cevabinizi yazin..."
                value={whys[currentStep - 1]}
                onChange={(e) => handleWhyChange(currentStep - 1, e.target.value)}
              />

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  {currentStep < 5
                    ? 'Verdiginiz cevabi bir sonraki "Neden?" sorusuyla sorgulayacagiz.'
                    : 'Son soruya verdiginiz cevap genellikle kok nedeni gosterir.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Root Cause & Actions */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3">
                  Analiz Ozeti
                </h3>
                <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                  {whys.map((why, idx) => (
                    why && (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-600 font-medium whitespace-nowrap">
                          Why {idx + 1}:
                        </span>
                        <span className="text-slate-700">{why}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Kok Neden
                </h3>
                <textarea
                  className="w-full h-24 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Tespit ettiginiz kok nedeni ozetleyin..."
                  value={kokNeden}
                  onChange={(e) => setKokNeden(e.target.value)}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Onerilen Aksiyonlar
                </h3>
                <div className="space-y-2">
                  {aksiyonlar.map((aksiyon, idx) => (
                    <input
                      key={idx}
                      type="text"
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                      placeholder={`Aksiyon ${idx + 1}...`}
                      value={aksiyon}
                      onChange={(e) => updateAksiyon(idx, e.target.value)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addAksiyon}
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    + Aksiyon Ekle
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Geri
          </button>

          {currentStep < 6 ? (
            <button
              onClick={handleNext}
              disabled={currentStep >= 1 && currentStep <= 5 && !whys[currentStep - 1]?.trim()}
              className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ileri
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!kokNeden.trim()}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Analizi Tamamla
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FiveWhyWizard;
