'use client';
import React from 'react';

/**
 * Kanıt Dosyası
 */
interface KanitDosya {
  id: string;
  kind: string;
  title_tr: string;
  ref: string;
  url?: string;
}

/**
 * Eksik Belge
 */
interface EksikBelge {
  belge: string;
  nasil_tamamlanir: string;
}

/**
 * Dönem Verisi
 */
interface DonemVerisi {
  current_profit: number;
  calculated_tax: number;
  payable: number;
  is_zarar: boolean;
  zarar_tutari: number;
}

interface GeciciVergiDetayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuarter: string | null;
  year: string | null;
  donemVerisi: DonemVerisi | null;
  kanitlar: KanitDosya[];
  eksikBelgeler: EksikBelge[];
}

/**
 * Geçici Vergi Detay Modal
 *
 * SMMM'ye gösterir:
 * 1. Dönem kar/zarar durumu
 * 2. Hesaplanan vergi
 * 3. Beyanname/Tahakkuk kanıtları
 * 4. Eksik belgeler
 */
export function GeciciVergiDetayModal({
  isOpen,
  onClose,
  selectedQuarter,
  year,
  donemVerisi,
  kanitlar,
  eksikBelgeler,
}: GeciciVergiDetayProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const isZarar = donemVerisi?.is_zarar ?? false;
  const karZarar = donemVerisi?.current_profit ?? 0;
  const zararTutari = donemVerisi?.zarar_tutari ?? 0;
  const hesaplananVergi = donemVerisi?.calculated_tax ?? 0;
  const odenecekVergi = donemVerisi?.payable ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 ${isZarar ? 'bg-gradient-to-r from-[#FA841E] to-[#FA841E]' : 'bg-gradient-to-r from-[#00804D] to-[#00804D]'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                {year} {selectedQuarter} Geçici Vergi
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {isZarar ? 'Dönem Zararı - Vergi Tahakkuk Etmez' : 'Dönem Karı - Vergi Hesaplaması'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl leading-none p-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Dönem Özeti */}
          <section className="bg-[#F5F6F8] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#5A5A5A] uppercase tracking-wide mb-4">
              Dönem Özeti
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Kar/Zarar */}
              <div className={`rounded-lg p-4 ${isZarar ? 'bg-[#FEF2F2] border-2 border-[#FFC7C9]' : 'bg-[#ECFDF5] border-2 border-[#AAE8B8]'}`}>
                <span className="text-xs text-[#5A5A5A] uppercase">Dönem Kar/Zarar</span>
                <div className={`text-2xl font-bold mt-1 ${isZarar ? 'text-[#BF192B]' : 'text-[#00804D]'}`}>
                  {isZarar ? '-' : ''}{Math.abs(karZarar).toLocaleString('tr-TR')} TL
                </div>
                {isZarar && (
                  <p className="text-xs text-[#BF192B] mt-1">
                    {zararTutari.toLocaleString('tr-TR')} TL zarar
                  </p>
                )}
              </div>

              {/* Ödenecek Vergi */}
              <div className="bg-white rounded-lg p-4 border-2 border-[#E5E5E5]">
                <span className="text-xs text-[#5A5A5A] uppercase">Ödenecek Vergi</span>
                <div className="text-2xl font-bold mt-1 text-[#2E2E2E]">
                  {odenecekVergi.toLocaleString('tr-TR')} TL
                </div>
                {isZarar && (
                  <p className="text-xs text-[#969696] mt-1">
                    Zarar nedeniyle vergi yok
                  </p>
                )}
              </div>
            </div>

            {/* Açıklama */}
            <div className="mt-4 p-3 bg-[#E6F9FF] rounded-lg border border-[#ABEBFF]">
              <p className="text-sm text-[#00287F]">
                <strong>5520 KVK Madde 32:</strong>{' '}
                {isZarar
                  ? 'Zarar dönemlerinde geçici vergi tahakkuk etmez. Zarar sonraki dönemlere devreder.'
                  : `Dönem karı üzerinden %25 oranında geçici vergi hesaplanır.`
                }
              </p>
            </div>
          </section>

          {/* Kanıt Dosyaları */}
          <section>
            <h3 className="text-sm font-semibold text-[#5A5A5A] uppercase tracking-wide mb-3">
              Kanıt Dosyaları
            </h3>

            {kanitlar.length > 0 ? (
              <div className="space-y-2">
                {kanitlar.map((kanit, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#ECFDF5] rounded-lg p-3 border border-[#AAE8B8]">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        kanit.kind === 'beyanname' ? 'bg-[#E6F9FF] text-[#0049AA]' :
                        kanit.kind === 'tahakkuk' ? 'bg-[#E6F9FF] text-[#0049AA]' :
                        'bg-[#F5F6F8] text-[#5A5A5A]'
                      }`}>
                        {kanit.kind === 'beyanname' ? 'Beyanname' :
                         kanit.kind === 'tahakkuk' ? 'Tahakkuk' : kanit.kind}
                      </span>
                      <span className="text-sm text-[#5A5A5A]">{kanit.title_tr}</span>
                    </div>
                    {kanit.url && (
                      <a
                        href={kanit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#00804D] text-white text-xs rounded hover:bg-[#00804D] transition-colors"
                      >
                        İndir →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#FFFBEB] rounded-lg p-4 border border-[#FFF08C]">
                <p className="text-sm text-[#E67324]">
                  <strong>Uyarı:</strong> Henüz yüklenmiş kanıt dosyası yok.
                </p>
              </div>
            )}
          </section>

          {/* Eksik Belgeler */}
          {eksikBelgeler.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[#5A5A5A] uppercase tracking-wide mb-3">
                Eksik Belgeler
              </h3>

              <div className="space-y-2">
                {eksikBelgeler.map((belge, i) => (
                  <div key={i} className="bg-[#FEF2F2] rounded-lg p-4 border border-[#FFC7C9]">
                    <div className="flex items-start gap-3">
                      <span className="text-[#F0282D] text-lg">⚠️</span>
                      <div>
                        <p className="font-medium text-[#980F30]">{belge.belge}</p>
                        <p className="text-sm text-[#BF192B] mt-1 font-mono bg-white/50 px-2 py-1 rounded">
                          {belge.nasil_tamamlanir}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Hesaplama Detayı */}
          {!isZarar && hesaplananVergi > 0 && (
            <section className="bg-[#F5F6F8] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#5A5A5A] uppercase tracking-wide mb-3">
                Hesaplama Detayı
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#5A5A5A]">Dönem Karı</span>
                  <span className="font-medium">{karZarar.toLocaleString('tr-TR')} TL</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#5A5A5A]">Vergi Oranı</span>
                  <span className="font-medium">%25</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
                  <span className="text-[#5A5A5A]">Hesaplanan Vergi</span>
                  <span className="font-medium">{hesaplananVergi.toLocaleString('tr-TR')} TL</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-lg">
                  <span>Ödenecek</span>
                  <span className="text-[#00804D]">{odenecekVergi.toLocaleString('tr-TR')} TL</span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] bg-[#F5F6F8]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#969696]">
              Yasal Dayanak: 5520 KVK Madde 32
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
