'use client';
import React from 'react';

/**
 * Eksik Belge Tipi
 */
interface EksikBelge {
  id: string;
  belge: string;
  aciklama: string;
  neden_onemli: string;
  nasil_tamamlanir: string;
  oncelik: 'KRITIK' | 'YUKSEK' | 'ORTA' | 'DUSUK';
  puan_etkisi: number;
}

/**
 * Veri Özeti
 */
interface VeriOzeti {
  mizan_entries: number;
  beyanname_entries: number;
  banka_var: boolean;
  enflasyon_csvleri: string[];
}

interface VeriKalitesiDetayProps {
  isOpen: boolean;
  onClose: () => void;
  skor: number | null;
  eksikBelgeler: EksikBelge[];
  veriOzeti?: VeriOzeti;
}

/**
 * Veri Kalitesi Detay Modal
 *
 * SMMM'ye gösterir:
 * 1. Hangi belgeler eksik
 * 2. Neden önemli
 * 3. Nasıl tamamlanır
 * 4. Puan etkisi
 */
export function VeriKalitesiDetayModal({
  isOpen,
  onClose,
  skor,
  eksikBelgeler,
  veriOzeti,
}: VeriKalitesiDetayProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Öncelik sıralaması
  const oncelikSirasi = { 'KRITIK': 0, 'YUKSEK': 1, 'ORTA': 2, 'DUSUK': 3 };
  const siraliEksikler = [...eksikBelgeler].sort(
    (a, b) => oncelikSirasi[a.oncelik] - oncelikSirasi[b.oncelik]
  );

  // Öncelik renkleri
  const oncelikRenk = {
    'KRITIK': 'bg-[#FEF2F2] text-[#980F30] border-[#FFC7C9]',
    'YUKSEK': 'bg-[#FFFBEB] text-[#E67324] border-[#FFF08C]',
    'ORTA': 'bg-[#FFFBEB] text-[#E67324] border-[#FFF08C]',
    'DUSUK': 'bg-[#F5F6F8] text-[#5A5A5A] border-[#E5E5E5]',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E2E2E] to-[#5A5A5A] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Veri Kalitesi Detayı</h2>
              <p className="text-[#B4B4B4] text-sm mt-1">
                Eksik belgeler ve tamamlama adımları
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#B4B4B4] hover:text-white text-2xl leading-none p-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Score Summary */}
        <div className="px-6 py-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-[#5A5A5A]">Veri Tamlılık Skoru</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-bold ${
                  skor === null ? 'text-[#969696]' :
                  skor >= 80 ? 'text-[#00804D]' :
                  skor >= 50 ? 'text-[#FA841E]' :
                  'text-[#BF192B]'
                }`}>
                  {skor !== null ? `%${skor}` : '—'}
                </span>
                <span className="text-sm text-[#969696]">
                  {skor !== null ? (
                    skor >= 80 ? 'Yeterli' :
                    skor >= 50 ? 'Kısmen Yeterli' :
                    'Yetersiz'
                  ) : 'Hesaplanamadı'}
                </span>
              </div>
            </div>
            {eksikBelgeler.length > 0 && (
              <div className="text-right">
                <span className="text-sm text-[#5A5A5A]">Eksik Belge</span>
                <div className="text-2xl font-bold text-[#BF192B] mt-1">
                  {eksikBelgeler.length}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mevcut Veri Özeti */}
        {veriOzeti && (
          <div className="px-6 py-3 bg-[#ECFDF5] border-b border-[#ECFDF5]">
            <h3 className="text-xs font-semibold text-[#005A46] uppercase tracking-wide mb-2">
              Mevcut Veriler
            </h3>
            <div className="flex flex-wrap gap-2">
              {veriOzeti.mizan_entries > 0 && (
                <span className="px-2 py-1 bg-[#ECFDF5] text-[#00804D] text-xs rounded-full">
                  ✓ Mizan ({veriOzeti.mizan_entries} kayıt)
                </span>
              )}
              {veriOzeti.beyanname_entries > 0 && (
                <span className="px-2 py-1 bg-[#ECFDF5] text-[#00804D] text-xs rounded-full">
                  ✓ Beyanname ({veriOzeti.beyanname_entries} adet)
                </span>
              )}
              {veriOzeti.banka_var && (
                <span className="px-2 py-1 bg-[#ECFDF5] text-[#00804D] text-xs rounded-full">
                  ✓ Banka Verisi
                </span>
              )}
              {veriOzeti.enflasyon_csvleri.map((csv) => (
                <span key={csv} className="px-2 py-1 bg-[#ECFDF5] text-[#00804D] text-xs rounded-full">
                  ✓ {csv.replace('.csv', '').replace(/_/g, ' ')}
                </span>
              ))}
              {!veriOzeti.mizan_entries && !veriOzeti.beyanname_entries && !veriOzeti.banka_var && veriOzeti.enflasyon_csvleri.length === 0 && (
                <span className="text-xs text-[#969696] italic">Henüz veri yüklenmemiş</span>
              )}
            </div>
          </div>
        )}

        {/* Content - Eksik Belgeler */}
        <div className="flex-1 overflow-y-auto p-6">
          {siraliEksikler.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-[#00804D]">Tüm Belgeler Tamam!</h3>
              <p className="text-sm text-[#969696] mt-2">
                Gerekli tüm veriler sisteme yüklenmiş.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#5A5A5A] uppercase tracking-wide">
                Eksik Belgeler ({siraliEksikler.length})
              </h3>

              {siraliEksikler.map((belge) => (
                <div
                  key={belge.id}
                  className={`rounded-lg border-2 p-4 ${oncelikRenk[belge.oncelik]}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{belge.belge}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          belge.oncelik === 'KRITIK' ? 'bg-[#BF192B] text-white' :
                          belge.oncelik === 'YUKSEK' ? 'bg-[#FA841E] text-white' :
                          'bg-[#5A5A5A] text-white'
                        }`}>
                          {belge.oncelik}
                        </span>
                      </div>
                      <p className="text-sm mt-1 opacity-90">{belge.aciklama}</p>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-xs opacity-75">Puan Etkisi</span>
                      <div className="font-bold">+{belge.puan_etkisi}%</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
                    <div>
                      <span className="text-xs font-semibold uppercase">Neden Önemli?</span>
                      <p className="text-sm">{belge.neden_onemli}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase">Nasıl Tamamlanır?</span>
                      <p className="text-sm font-mono bg-white/50 px-2 py-1 rounded mt-1">
                        {belge.nasil_tamamlanir}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] bg-[#F5F6F8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#969696]">
              Belgeler yüklendiğinde skor otomatik güncellenir
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[#2E2E2E] text-white rounded-lg hover:bg-[#5A5A5A] transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
