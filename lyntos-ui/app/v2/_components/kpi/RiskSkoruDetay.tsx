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

interface EvidenceItem {
  type: string;
  message?: string;
  note?: string;
  beyanname_turu?: string;
  donem?: string;
  son_teslim?: string;
  teslim_tarihi?: string;
  gecikme_gun?: number;
  source?: string;
}

interface RiskSkoruDetayProps {
  isOpen: boolean;
  onClose: () => void;
  skor: number | null;  // null = veri yok (SAHTE VERİ YASAK)
  puanKiranlar: PuanKiranKriter[];
  dataCompleteness?: 'complete' | 'partial' | 'insufficient' | 'unknown';  // Veri tamlığı durumu
  evidenceRefs?: EvidenceItem[];  // Kanıt referansları
}

// Static explanation for "Risk Skoru Nedir?" (Kartela Uyumlu)
const RISK_SKORU_ACIKLAMA = {
  baslik: 'Risk Skoru Nedir?',
  aciklama: `Vergi Risk Skoru (KURGAN Skoru), VDK'nın 13 kritik denetim kriterine göre hesaplanır.
100 puan üzerinden değerlendirilen bu skor, mükellefin vergi incelemesine alınma olasılığını gösterir.`,
  seviyeler: [
    { aralik: '85-100', seviye: 'Düşük Risk', renk: 'bg-[#ECFDF5] text-[#00804D]', aciklama: 'İnceleme olasılığı çok düşük' },
    { aralik: '70-84', seviye: 'Orta Risk', renk: 'bg-[#FFFBEB] text-[#E67324]', aciklama: 'Bazı kriterler incelenmeli' },
    { aralik: '50-69', seviye: 'Yüksek Risk', renk: 'bg-[#FFC7C9] text-[#BF192B]', aciklama: 'Acil düzeltme gerekli' },
    { aralik: '0-49', seviye: 'Kritik Risk', renk: 'bg-[#FEF2F2] text-[#980F30]', aciklama: 'İnceleme riski çok yüksek' },
  ],
};

export function RiskSkoruDetayModal({
  isOpen,
  onClose,
  skor,
  puanKiranlar,
  dataCompleteness = 'unknown',
  evidenceRefs = []
}: RiskSkoruDetayProps) {
  const [showInfo, setShowInfo] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // SAHTE VERİ YASAK - skor null ise "Veri yok" göster
  if (skor === null) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#2E2E2E]">Vergi Risk Skoru</h2>
            <button onClick={onClose} className="p-2 text-[#969696] hover:text-[#5A5A5A]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#F5F6F8] rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-[#969696]" />
            </div>
            <p className="text-[#5A5A5A] font-medium">Veri Yüklenemedi</p>
            <p className="text-sm text-[#969696] mt-2">Risk skoru hesaplanamadı. Lütfen mizan verilerinin yüklendiğinden emin olun.</p>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 bg-[#2E2E2E] text-white rounded-lg font-medium hover:bg-[#5A5A5A]"
          >
            Anladım
          </button>
        </div>
      </div>
    );
  }

  const toplamKesinti = puanKiranlar.reduce((acc, k) => acc + Math.abs(k.puan), 0);
  // Başlangıç puanı HER ZAMAN 100 - VDK KURGAN standardı
  const tamPuan = 100;

  // Determine risk level (Kartela Uyumlu)
  const getRiskLevel = (score: number) => {
    if (score >= 85) return { level: 'Düşük', color: 'text-[#00A651]', bg: 'bg-[#ECFDF5]' };
    if (score >= 70) return { level: 'Orta', color: 'text-[#E67324]', bg: 'bg-[#FFFBEB]' };
    if (score >= 50) return { level: 'Yüksek', color: 'text-[#F0282D]', bg: 'bg-[#FFC7C9]' };
    return { level: 'Kritik', color: 'text-[#980F30]', bg: 'bg-[#FEF2F2]' };
  };

  const riskLevel = getRiskLevel(skor);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-[#F5F6F8] border-b border-[#E5E5E5] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${riskLevel.bg}`}>
              <span className={`text-2xl font-black ${riskLevel.color}`}>{skor}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2E2E2E]">Vergi Risk Skoru Detayı</h2>
              <p className={`text-sm font-medium ${riskLevel.color}`}>
                {riskLevel.level} Risk · 100 üzerinden
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 text-[#969696] hover:text-[#0049AA] transition-colors"
              title="Risk Skoru Nedir?"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-[#969696] hover:text-[#5A5A5A]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Info Section (collapsible) */}
          {showInfo && (
            <div className="mb-4 p-4 bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg">
              <h3 className="text-sm font-bold text-[#0049AA] mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                {RISK_SKORU_ACIKLAMA.baslik}
              </h3>
              <p className="text-xs text-[#0078D0] mb-3">{RISK_SKORU_ACIKLAMA.aciklama}</p>
              <div className="grid grid-cols-2 gap-2">
                {RISK_SKORU_ACIKLAMA.seviyeler.map((s, i) => (
                  <div key={i} className={`p-2 rounded text-xs ${s.renk}`}>
                    <strong>{s.aralik}:</strong> {s.seviye}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Veri Tamlığı Uyarısı */}
          {dataCompleteness !== 'complete' && (
            <div className="mb-4 p-3 bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#0078D0] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#0049AA]">
                    {dataCompleteness === 'partial' ? 'Kısmi Veri ile Hesaplandı' : 'Yetersiz Veri'}
                  </p>
                  <p className="text-xs text-[#0078D0] mt-1">
                    Kanıt olmadan kesinti yapılmaz. Eksik veriler için skor düşürülmedi.
                  </p>
                  {evidenceRefs.filter(e => e.type === 'no_data').map((ev, idx) => (
                    <p key={idx} className="text-xs text-[#0078D0] mt-1 italic">
                      • {ev.message || ev.note}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Score Breakdown */}
          <div className="mb-4 p-3 bg-[#F5F6F8] rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#5A5A5A]">Başlangıç Puanı</span>
              <span className="font-bold text-[#2E2E2E]">{tamPuan}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-[#F0282D]">Toplam Kesinti</span>
              <span className="font-bold text-[#F0282D]">-{toplamKesinti}</span>
            </div>
            <div className="border-t border-[#E5E5E5] mt-2 pt-2 flex items-center justify-between">
              <span className="font-semibold text-[#2E2E2E]">Net Skor</span>
              <span className={`text-xl font-black ${riskLevel.color}`}>{skor}</span>
            </div>
          </div>

          {/* Puan Kıran Kriterler */}
          <h3 className="text-sm font-bold text-[#2E2E2E] mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[#F0282D]" />
            Puan Kıran Kriterler ({puanKiranlar.length})
          </h3>

          {puanKiranlar.length === 0 ? (
            <div className="p-4 bg-[#ECFDF5] border border-[#6BDB83] rounded-lg text-center">
              <CheckCircle2 className="w-8 h-8 text-[#00A651] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#005A46]">Tüm kriterler başarılı!</p>
              <p className="text-xs text-[#00804D] mt-1">Puan kesintisi yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {puanKiranlar.map((kriter, idx) => (
                <div key={idx} className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                  {/* Kriter Header */}
                  <div className="flex items-center justify-between p-3 bg-[#FEF2F2]">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#F0282D]" />
                      <span className="text-sm font-bold text-[#2E2E2E]">{kriter.kod}</span>
                      <span className="text-sm text-[#5A5A5A]">{kriter.baslik}</span>
                    </div>
                    <span className="text-sm font-bold text-[#F0282D]">{kriter.puan} puan</span>
                  </div>
                  {/* Kriter Details */}
                  <div className="p-3 bg-white">
                    <p className="text-xs text-[#5A5A5A] mb-2">{kriter.aciklama}</p>
                    <div className="p-2 bg-[#FFFBEB] border border-[#FFE045] rounded">
                      <p className="text-xs text-[#E67324]">
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
        <div className="p-4 border-t border-[#E5E5E5] bg-[#F5F6F8] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#00287F] transition-colors text-sm font-medium"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}

// DEFAULT_PUAN_KIRANLAR kaldırıldı - Mock data yasak
// Puan kıranlar backend API'den gelecek
// export edilmiyor - component puanKiranlar prop'u zorunlu

// Type export for external use
export type { PuanKiranKriter };
