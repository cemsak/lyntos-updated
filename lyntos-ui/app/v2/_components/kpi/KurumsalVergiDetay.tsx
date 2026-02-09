'use client';

import React from 'react';

interface KurumsalVergiDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  seciliDonem: string | null;
  gerekliDonem: string | null;
  aciklama: string | null;
  // Q4 verisi varsa detaylar
  ticariKar?: {
    donem_kari: number;
    donem_zarari: number;
    net_donem_kari: number;
  } | null;
  maliKar?: {
    ticari_kar: number;
    kkeg: number;
    istisna_kazanclar: number;
    gecmis_zarar: number;
    mali_kar: number;
  } | null;
  matrah?: number | null;
  vergiOrani?: number | null;
  hesaplananVergi?: number | null;
  odenecekVergi?: number | null;
}

export function KurumsalVergiDetayModal({
  isOpen,
  onClose,
  seciliDonem,
  gerekliDonem,
  aciklama,
  ticariKar,
  maliKar,
  matrah,
  vergiOrani,
  hesaplananVergi,
  odenecekVergi,
}: KurumsalVergiDetayModalProps) {
  if (!isOpen) return null;

  const hasData = ticariKar && maliKar && typeof matrah === 'number';
  const isQ4Required = gerekliDonem === 'Q4' && seciliDonem !== 'Q4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-[#2E2E2E]">Kurumlar Vergisi</h2>
            <p className="text-sm text-[#969696]">Yıllık Beyan (Nisan)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F5F6F8] rounded-lg transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Q4 Gerekli Uyarısı */}
          {isQ4Required && (
            <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-medium text-[#E67324]">Q4 Verisi Gerekli</h3>
                  <p className="text-sm text-[#FA841E] mt-1">
                    {aciklama || 'Kurumlar Vergisi yıllık beyan olup sadece Q4 verisi tamamlandığında hesaplanabilir.'}
                  </p>
                  <p className="text-sm text-[#FA841E] mt-2">
                    Şu an seçili dönem: <strong>{seciliDonem}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Muhasebe Mantığı Açıklaması */}
          <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
            <h3 className="font-medium text-[#00287F] mb-2">📚 Muhasebe Mantığı</h3>
            <ul className="text-sm text-[#00287F] space-y-1">
              <li>• Kurumlar Vergisi <strong>YILLIK</strong> beyan (Nisan ayında)</li>
              <li>• Q1-Q3 dönemlerinde sadece <strong>Geçici Vergi</strong> hesaplanır</li>
              <li>• Kesin hesaplama için <strong>yıl sonu kapanış mizanı</strong> gerekli</li>
              <li>• Vergi oranı: <strong>%25</strong> (2025 itibariyle)</li>
            </ul>
          </div>

          {/* Q4 Verisi Varsa - Hesaplama Detayları */}
          {hasData && (
            <>
              {/* Ticari Kar */}
              <div className="bg-[#F5F6F8] rounded-lg p-4">
                <h3 className="font-medium text-[#2E2E2E] mb-2">1. Ticari Kar (Gelir Tablosundan)</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-[#5A5A5A]">Dönem Karı:</span>
                  <span className="text-right font-mono">{ticariKar.donem_kari.toLocaleString('tr-TR')} TL</span>
                  <span className="text-[#5A5A5A]">Dönem Zararı:</span>
                  <span className="text-right font-mono text-[#BF192B]">-{ticariKar.donem_zarari.toLocaleString('tr-TR')} TL</span>
                  <span className="text-[#5A5A5A] font-medium">Net Dönem Karı:</span>
                  <span className={`text-right font-mono font-medium ${ticariKar.net_donem_kari >= 0 ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>
                    {ticariKar.net_donem_kari.toLocaleString('tr-TR')} TL
                  </span>
                </div>
              </div>

              {/* Mali Kar */}
              <div className="bg-[#F5F6F8] rounded-lg p-4">
                <h3 className="font-medium text-[#2E2E2E] mb-2">2. Mali Kar (Vergi Matrahı)</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-[#5A5A5A]">Ticari Kar:</span>
                  <span className="text-right font-mono">{maliKar.ticari_kar.toLocaleString('tr-TR')} TL</span>
                  <span className="text-[#5A5A5A]">+ KKEG:</span>
                  <span className="text-right font-mono">{maliKar.kkeg.toLocaleString('tr-TR')} TL</span>
                  <span className="text-[#5A5A5A]">- İstisna Kazançlar:</span>
                  <span className="text-right font-mono">-{maliKar.istisna_kazanclar.toLocaleString('tr-TR')} TL</span>
                  <span className="text-[#5A5A5A]">- Geçmiş Yıl Zararları:</span>
                  <span className="text-right font-mono">-{maliKar.gecmis_zarar.toLocaleString('tr-TR')} TL</span>
                  <span className="text-[#5A5A5A] font-medium border-t pt-1">Mali Kar:</span>
                  <span className={`text-right font-mono font-medium border-t pt-1 ${maliKar.mali_kar >= 0 ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>
                    {maliKar.mali_kar.toLocaleString('tr-TR')} TL
                  </span>
                </div>
              </div>

              {/* Vergi Hesabı */}
              <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-4">
                <h3 className="font-medium text-[#005A46] mb-2">3. Vergi Hesabı</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-[#5A5A5A]">Matrah:</span>
                  <span className="text-right font-mono">{(matrah || 0).toLocaleString('tr-TR')} TL</span>
                  <span className="text-[#5A5A5A]">Vergi Oranı:</span>
                  <span className="text-right font-mono">%{((vergiOrani || 0.25) * 100).toFixed(0)}</span>
                  <span className="text-[#5A5A5A]">Hesaplanan Vergi:</span>
                  <span className="text-right font-mono">{(hesaplananVergi || 0).toLocaleString('tr-TR')} TL</span>
                  <span className="text-[#5A5A5A] font-medium border-t pt-1">Ödenecek Vergi:</span>
                  <span className="text-right font-mono font-bold text-[#00804D] border-t pt-1">
                    {(odenecekVergi || 0).toLocaleString('tr-TR')} TL
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Yasal Dayanak */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-[#2E2E2E] mb-2">Yasal Dayanak</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">5520 Sayılı Kurumlar Vergisi Kanunu</p>
                <p className="text-xs text-[#969696]">Kanun</p>
              </div>
              <a
                href="https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#0049AA] text-white text-sm rounded-lg hover:bg-[#0049AA] transition-colors"
              >
                Görüntüle →
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2E2E2E] text-white rounded-lg hover:bg-[#2E2E2E] transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
