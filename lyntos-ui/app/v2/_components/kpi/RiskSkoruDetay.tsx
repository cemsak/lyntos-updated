'use client';
import React, { useState } from 'react';
import { X, HelpCircle, AlertTriangle, TrendingDown, CheckCircle2, Info } from 'lucide-react';

interface PuanKiranKriter {
  kod: string;
  baslik: string;
  puan: number;
  aciklama: string;
  oneri: string;
}

interface RiskSkoruDetayProps {
  isOpen: boolean;
  onClose: () => void;
  skor: number;
  puanKiranlar: PuanKiranKriter[];
}

// Static explanation for "Risk Skoru Nedir?"
const RISK_SKORU_ACIKLAMA = {
  baslik: 'Risk Skoru Nedir?',
  aciklama: `Vergi Risk Skoru (KURGAN Skoru), VDK'nın 13 kritik denetim kriterine göre hesaplanır.
100 puan üzerinden değerlendirilen bu skor, mükellefin vergi incelemesine alınma olasılığını gösterir.`,
  seviyeler: [
    { aralik: '85-100', seviye: 'Düşük Risk', renk: 'bg-green-100 text-green-800', aciklama: 'İnceleme olasılığı çok düşük' },
    { aralik: '70-84', seviye: 'Orta Risk', renk: 'bg-amber-100 text-amber-800', aciklama: 'Bazı kriterler incelenmeli' },
    { aralik: '50-69', seviye: 'Yüksek Risk', renk: 'bg-orange-100 text-orange-800', aciklama: 'Acil düzeltme gerekli' },
    { aralik: '0-49', seviye: 'Kritik Risk', renk: 'bg-red-100 text-red-800', aciklama: 'İnceleme riski çok yüksek' },
  ],
};

export function RiskSkoruDetayModal({ isOpen, onClose, skor, puanKiranlar }: RiskSkoruDetayProps) {
  const [showInfo, setShowInfo] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const toplamKesinti = puanKiranlar.reduce((acc, k) => acc + Math.abs(k.puan), 0);
  const tamPuan = skor + toplamKesinti;

  // Determine risk level
  const getRiskLevel = (score: number) => {
    if (score >= 85) return { level: 'Düşük', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 70) return { level: 'Orta', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (score >= 50) return { level: 'Yüksek', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { level: 'Kritik', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const riskLevel = getRiskLevel(skor);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${riskLevel.bg}`}>
              <span className={`text-2xl font-black ${riskLevel.color}`}>{skor}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Vergi Risk Skoru Detayı</h2>
              <p className={`text-sm font-medium ${riskLevel.color}`}>
                {riskLevel.level} Risk · 100 üzerinden
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="Risk Skoru Nedir?"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Info Section (collapsible) */}
          {showInfo && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                {RISK_SKORU_ACIKLAMA.baslik}
              </h3>
              <p className="text-xs text-blue-700 mb-3">{RISK_SKORU_ACIKLAMA.aciklama}</p>
              <div className="grid grid-cols-2 gap-2">
                {RISK_SKORU_ACIKLAMA.seviyeler.map((s, i) => (
                  <div key={i} className={`p-2 rounded text-xs ${s.renk}`}>
                    <strong>{s.aralik}:</strong> {s.seviye}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score Breakdown */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Başlangıç Puanı</span>
              <span className="font-bold text-slate-800">{tamPuan}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-red-600">Toplam Kesinti</span>
              <span className="font-bold text-red-600">-{toplamKesinti}</span>
            </div>
            <div className="border-t border-slate-200 mt-2 pt-2 flex items-center justify-between">
              <span className="font-semibold text-slate-800">Net Skor</span>
              <span className={`text-xl font-black ${riskLevel.color}`}>{skor}</span>
            </div>
          </div>

          {/* Puan Kıran Kriterler */}
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            Puan Kıran Kriterler ({puanKiranlar.length})
          </h3>

          {puanKiranlar.length === 0 ? (
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">Tüm kriterler başarılı!</p>
              <p className="text-xs text-green-600 mt-1">Puan kesintisi yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {puanKiranlar.map((kriter, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Kriter Header */}
                  <div className="flex items-center justify-between p-3 bg-red-50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-bold text-slate-800">{kriter.kod}</span>
                      <span className="text-sm text-slate-600">{kriter.baslik}</span>
                    </div>
                    <span className="text-sm font-bold text-red-600">{kriter.puan} puan</span>
                  </div>
                  {/* Kriter Details */}
                  <div className="p-3 bg-white">
                    <p className="text-xs text-slate-600 mb-2">{kriter.aciklama}</p>
                    <div className="p-2 bg-amber-50 border border-amber-100 rounded">
                      <p className="text-xs text-amber-800">
                        <strong>Öneri:</strong> {kriter.oneri}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}

// Default data for demo
export const DEFAULT_PUAN_KIRANLAR: PuanKiranKriter[] = [
  {
    kod: 'K-09',
    baslik: 'Kasa/Aktif Oranı',
    puan: -5,
    aciklama: 'Kasa bakiyesi toplam aktiflerin %10\'undan fazla. Bu oran vergi idaresi tarafından şüpheli bulunabilir.',
    oneri: 'Kasa bakiyesini azaltın, banka hesabına aktarım yapın veya dönem sonu kasa sayımı tutanağı hazırlayın.',
  },
  {
    kod: 'K-12',
    baslik: 'Stok Devir Hızı',
    puan: -4,
    aciklama: 'Stok devir hızı sektör ortalamasının altında. Bu durum hayali stok şüphesi oluşturabilir.',
    oneri: 'Stok sayım tutanaklarını güncelleyin, fire ve zayiat kayıtlarını kontrol edin.',
  },
  {
    kod: 'K-15',
    baslik: 'Alacak Tahsilat Süresi',
    puan: -3,
    aciklama: 'Alacak tahsilat süresi 120 günü aşıyor. Şüpheli alacak karşılığı ayrılması gerekebilir.',
    oneri: 'Vadesi geçmiş alacaklar için yasal takip başlatın veya karşılık ayırın.',
  },
];
