'use client';

import React from 'react';

/**
 * ═══════════════════════════════════════════════════════════════
 * ENFLASYON DETAY MODAL
 * TMS 29 Yüksek Enflasyonlu Ekonomilerde Finansal Raporlama
 * ═══════════════════════════════════════════════════════════════
 *
 * SMMM İÇİN ÖNEMLİ:
 * - Enflasyon düzeltmesi zorunlu (VUK Geçici 33)
 * - Parasal/Parasal olmayan ayrımı kritik
 * - 648: Enflasyon düzeltme zararı (gider)
 * - 658: Enflasyon düzeltme karı (gelir)
 * - 698: Net enflasyon düzeltme farkı
 */

interface TufeEndeksi {
  donem_basi: number;
  donem_sonu: number;
  katsayi: number;
  artis_orani: number;
}

interface DuzeltmeFarklari {
  '648': number;  // Enflasyon düzeltme zararı
  '658': number;  // Enflasyon düzeltme karı
  '698': number;  // Net fark
}

interface VergiEtkisi {
  mali_kar_etkisi: number;
  kv_orani: number;
  vergi_etkisi: number;
  aciklama: string;
}

interface EnflasyonDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Veri durumu
  ok: boolean | null;
  // TÜFE endeks bilgileri
  tufeEndeksi?: TufeEndeksi | null;
  // Düzeltme farkları (648, 658, 698)
  duzeltmeFarklari?: DuzeltmeFarklari | null;
  // Vergi etkisi
  vergiEtkisi?: VergiEtkisi | null;
  // Eksik veriler
  missingData?: string[] | null;
  requiredActions?: string[] | null;
}

export function EnflasyonDetayModal({
  isOpen,
  onClose,
  ok,
  tufeEndeksi,
  duzeltmeFarklari,
  vergiEtkisi,
  missingData,
  requiredActions,
}: EnflasyonDetayModalProps) {
  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════════
  // SIFIR TOLERANS: SAHTE VERİ YASAK
  // ═══════════════════════════════════════════════════════════════
  // TMS 29 enflasyon düzeltmesi için GEREKLİ VERİLER:
  // 1. Mizan verisi (hesap bakiyeleri)
  // 2. TÜFE endeks serileri (TÜİK/TCMB)
  // 3. Sabit kıymet edinim tarihleri (252, 253, 254, 255, 260 vb.)
  //
  // Backend ok:false dönerse veya duzeltme_farklari null ise
  // HİÇBİR HESAPLANAN DEĞER GÖSTERİLMEZ

  // Veri durumu kontrolü - SADECE ok:true VE duzeltmeFarklari varsa veri göster
  const hasData = ok === true && duzeltmeFarklari !== null && duzeltmeFarklari !== undefined;
  const noData = !hasData;  // ok:false VEYA duzeltmeFarklari null ise veri yok

  // Net 698 değeri - SADECE hasData true ise kullan
  const net698 = hasData ? (duzeltmeFarklari?.['698'] ?? 0) : 0;
  const isKar = hasData && net698 > 0;
  const isZarar = hasData && net698 < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#FFFBEB] to-[#FFFBEB]">
          <div>
            <h2 className="text-lg font-semibold text-[#2E2E2E]">Enflasyon Düzeltmesi</h2>
            <p className="text-sm text-[#969696]">TMS 29 · VUK Geçici 33</p>
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
          {/* VERİ YOK DURUMU - ok:false veya duzeltmeFarklari null */}
          {noData && (
            <div className="bg-[#F5F6F8] border border-[#E5E5E5] rounded-lg p-6 text-center">
              <span className="text-4xl mb-3 block">📊</span>
              <h3 className="font-medium text-[#2E2E2E] mb-2">Enflasyon Verisi Yok</h3>
              <p className="text-sm text-[#5A5A5A] mb-4">
                TMS 29 enflasyon düzeltmesi için gerekli veriler eksik.
              </p>

              {/* Eksik veriler listesi */}
              {missingData && missingData.length > 0 && (
                <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4 text-left mt-4">
                  <h4 className="font-medium text-[#E67324] mb-2">Eksik Veriler:</h4>
                  <ul className="text-sm text-[#E67324] space-y-1">
                    {missingData.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gerekli aksiyonlar */}
              {requiredActions && requiredActions.length > 0 && (
                <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4 text-left mt-4">
                  <h4 className="font-medium text-[#00287F] mb-2">Tamamlanması Gerekenler:</h4>
                  <ul className="text-sm text-[#00287F] space-y-1">
                    {requiredActions.map((action, i) => (
                      <li key={i}>• {action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TÜFE ENDEKSİ - SADECE hasData true ise göster */}
          {hasData && tufeEndeksi && (
            <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
              <h3 className="font-medium text-[#00287F] mb-3">📈 TÜFE Endeks Bilgileri</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#5A5A5A]">Dönem Başı:</span>
                  <span className="ml-2 font-mono font-medium">{tufeEndeksi.donem_basi.toLocaleString('tr-TR')}</span>
                </div>
                <div>
                  <span className="text-[#5A5A5A]">Dönem Sonu:</span>
                  <span className="ml-2 font-mono font-medium">{tufeEndeksi.donem_sonu.toLocaleString('tr-TR')}</span>
                </div>
                <div>
                  <span className="text-[#5A5A5A]">Düzeltme Katsayısı:</span>
                  <span className="ml-2 font-mono font-medium">{tufeEndeksi.katsayi.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-[#5A5A5A]">Artış Oranı:</span>
                  <span className="ml-2 font-mono font-medium text-[#BF192B]">%{tufeEndeksi.artis_orani.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* DÜZELTME FARKLARI - SADECE hasData true ise göster */}
          {hasData && duzeltmeFarklari && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-[#2E2E2E] mb-3">📊 Enflasyon Düzeltme Farkları</h3>
              <div className="space-y-3">
                {/* 648 - Zarar */}
                <div className="flex items-center justify-between bg-[#FEF2F2] rounded-lg p-3">
                  <div>
                    <span className="font-medium text-[#980F30]">648</span>
                    <span className="text-sm text-[#BF192B] ml-2">Enflasyon Düzeltme Zararı</span>
                  </div>
                  <span className="font-mono text-[#BF192B]">
                    {duzeltmeFarklari['648'].toLocaleString('tr-TR')} TL
                  </span>
                </div>
                {/* 658 - Kar */}
                <div className="flex items-center justify-between bg-[#ECFDF5] rounded-lg p-3">
                  <div>
                    <span className="font-medium text-[#005A46]">658</span>
                    <span className="text-sm text-[#00804D] ml-2">Enflasyon Düzeltme Karı</span>
                  </div>
                  <span className="font-mono text-[#00804D]">
                    {duzeltmeFarklari['658'].toLocaleString('tr-TR')} TL
                  </span>
                </div>
                {/* 698 - Net */}
                <div className={`flex items-center justify-between rounded-lg p-3 border-2 ${
                  isKar ? 'bg-[#ECFDF5] border-[#6BDB83]' : isZarar ? 'bg-[#FEF2F2] border-[#FF9196]' : 'bg-[#F5F6F8] border-[#B4B4B4]'
                }`}>
                  <div>
                    <span className="font-bold">698</span>
                    <span className="text-sm ml-2">Net Enflasyon Düzeltme Farkı</span>
                  </div>
                  <span className={`font-mono font-bold text-lg ${
                    isKar ? 'text-[#00804D]' : isZarar ? 'text-[#BF192B]' : 'text-[#5A5A5A]'
                  }`}>
                    {net698.toLocaleString('tr-TR')} TL
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* VERGİ ETKİSİ - SADECE hasData true ise göster */}
          {hasData && vergiEtkisi && (
            <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
              <h3 className="font-medium text-[#0049AA] mb-3">💰 Kurumlar Vergisi Etkisi</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5A5A5A]">Mali Kar Etkisi:</span>
                  <span className={`font-mono ${vergiEtkisi.mali_kar_etkisi >= 0 ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>
                    {vergiEtkisi.mali_kar_etkisi.toLocaleString('tr-TR')} TL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A5A5A]">KV Oranı:</span>
                  <span className="font-mono">%{(vergiEtkisi.kv_orani * 100).toFixed(0)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Vergi Etkisi:</span>
                  <span className={`font-mono font-medium ${vergiEtkisi.vergi_etkisi >= 0 ? 'text-[#BF192B]' : 'text-[#00804D]'}`}>
                    {vergiEtkisi.vergi_etkisi.toLocaleString('tr-TR')} TL
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#0049AA] mt-3">{vergiEtkisi.aciklama}</p>
            </div>
          )}

          {/* GEREKLİ AKSIYONLAR - Bu bölüm noData içinde zaten gösteriliyor, burada tekrar gösterme */}

          {/* YASAL DAYANAK */}
          {hasData && (
            <div className="bg-[#F5F6F8] border rounded-lg p-4">
              <h3 className="font-medium text-[#2E2E2E] mb-2">📚 Yasal Dayanak</h3>
              <ul className="text-sm text-[#5A5A5A] space-y-1">
                <li>• TMS 29: Yüksek Enflasyonlu Ekonomilerde Finansal Raporlama</li>
                <li>• VUK Geçici Madde 33: Enflasyon Düzeltmesi</li>
                <li>• VUK Mükerrer Madde 298: Enflasyon Düzeltmesi Usul ve Esasları</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-[#F5F6F8]">
          {hasData ? (
            <span className="text-xs text-[#00804D] font-medium">
              ✅ TMS 29 uyumlu hesaplama
            </span>
          ) : (
            <span className="text-xs text-[#969696]">
              Gerekli verileri tamamlayarak hesaplama yapın
            </span>
          )}
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
