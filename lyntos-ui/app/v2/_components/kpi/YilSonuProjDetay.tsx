'use client';

import React from 'react';

interface ProjeksiyonYontemi {
  yontem: string;
  kod?: string;
  aciklama: string;
  sonuc: number;
  guvenilirlik: number;
  buyume_orani?: number;
  kullanilan_donemler?: string[];
}

interface GecmisDonem {
  yil: number;
  ceyrek: string;
  period: string;
  kar_zarar: number;
  ciro: number;
}

interface YilSonuProjDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Temel bilgiler
  seciliDonem: string | null;
  yil: string | null;
  // Mevcut dönem
  mevcutDonem?: {
    kar_zarar: number;
    ciro: number;
    mizan_kayit: number;
  } | null;
  // Geçmiş veri
  gecmisVeri?: {
    toplam_donem: number;
    onceki_yil_ayni_donem: GecmisDonem | null;
    yoy_buyume: number | null;
    son_4_donem: GecmisDonem[];
  } | null;
  // Projeksiyon yöntemleri
  projeksiyonYontemleri?: ProjeksiyonYontemi[];
  // Kombine sonuç
  kombine?: {
    tahmini_kar: number;
    tahmini_vergi: number;
  } | null;
  // Senaryolar
  senaryolar?: {
    pessimist: { kar: number; vergi: number };
    baz: { kar: number; vergi: number };
    optimist: { kar: number; vergi: number };
  } | null;
  // Güven
  confidence: string | null;
  confidenceSkor?: number | null;
  confidenceAciklama: string | null;
  // Uyarılar
  uyarilar: string[] | null;
  onemliNot: string | null;
  // Metodoloji
  metodoloji?: {
    yontemler: string[];
    mevsimsellik: number;
    kaynak: string;
  } | null;
  // Eski format uyumluluğu
  donemKarZarar?: number | null;
  tahminiYillikKar?: number | null;
  tahminiVergi?: number | null;
}

export function YilSonuProjDetayModal({
  isOpen,
  onClose,
  seciliDonem,
  yil,
  mevcutDonem,
  gecmisVeri,
  projeksiyonYontemleri,
  kombine,
  senaryolar,
  confidence,
  confidenceSkor,
  confidenceAciklama,
  uyarilar,
  onemliNot,
  metodoloji,
  donemKarZarar,
  tahminiYillikKar,
  tahminiVergi,
}: YilSonuProjDetayModalProps) {
  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════════
  // VERİ KONTROLÜ - Veri yoksa "Veri Yok" göster
  // ═══════════════════════════════════════════════════════════════
  const hasNewFormat = !!projeksiyonYontemleri && projeksiyonYontemleri.length > 0;
  const hasAnyData = hasNewFormat || mevcutDonem || kombine || tahminiVergi !== null;
  const karZarar = mevcutDonem?.kar_zarar ?? donemKarZarar ?? 0;
  const bazVergi = kombine?.tahmini_vergi ?? tahminiVergi ?? 0;

  // Header subtitle
  const headerSubtitle = yil && seciliDonem
    ? `${yil} - ${seciliDonem} verisiyle`
    : 'Veri bekleniyor...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#E6F9FF] to-[#E6F9FF]">
          <div>
            <h2 className="text-lg font-semibold text-[#2E2E2E]">Yıl Sonu Projeksiyonu</h2>
            <p className="text-sm text-[#969696]">{headerSubtitle}</p>
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
          {/* VERİ YOK DURUMU */}
          {!hasAnyData && (
            <div className="bg-[#F5F6F8] border border-[#E5E5E5] rounded-lg p-6 text-center">
              <span className="text-4xl mb-3 block">📊</span>
              <h3 className="font-medium text-[#2E2E2E] mb-2">Projeksiyon Verisi Yok</h3>
              <p className="text-sm text-[#5A5A5A]">
                Yıl sonu projeksiyonu için dönem mizan verisi gerekli.
                Lütfen önce mizan yükleyin.
              </p>
            </div>
          )}

          {/* ÖNEMLİ UYARI - Sadece veri varsa göster */}
          {hasAnyData && (
            <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚨</span>
                <div>
                  <h3 className="font-medium text-[#980F30]">BU BİR PROJEKSİYONDUR</h3>
                  <p className="text-sm text-[#BF192B] mt-1">
                    {onemliNot || 'Bu rakamlar resmi beyan için kullanılamaz. Kesin hesaplama için Q4 verilerini bekleyin.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Güven Seviyesi - Sadece confidence değeri varsa göster */}
          {hasAnyData && confidence && (
            <div className={`rounded-lg p-4 ${
              confidence === 'low' ? 'bg-[#FEF2F2] border border-[#FFC7C9]' :
              confidence === 'medium' ? 'bg-[#FFFBEB] border border-[#FFF08C]' :
              'bg-[#ECFDF5] border border-[#AAE8B8]'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Güven Seviyesi:</span>
                  {confidenceSkor !== null && confidenceSkor !== undefined && (
                    <span className="ml-2 text-sm text-[#969696]">({(confidenceSkor * 100).toFixed(0)}%)</span>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  confidence === 'low' ? 'bg-[#FFC7C9] text-[#980F30]' :
                  confidence === 'medium' ? 'bg-[#FFF08C] text-[#E67324]' :
                  'bg-[#AAE8B8] text-[#005A46]'
                }`}>
                  {confidence === 'low' ? '⚠️ Düşük' :
                   confidence === 'medium' ? '⚡ Orta' : '✅ Yüksek'}
                </span>
              </div>
              {confidenceAciklama && (
                <p className="text-sm text-[#5A5A5A] mt-2">{confidenceAciklama}</p>
              )}
            </div>
          )}

          {/* Mevcut Dönem Verisi */}
          {mevcutDonem && (
            <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
              <h3 className="font-medium text-[#00287F] mb-2">📊 Mevcut Dönem ({seciliDonem})</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#5A5A5A]">Dönem Kar/Zarar:</span>
                  <span className={`ml-2 font-mono font-medium ${karZarar >= 0 ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>
                    {karZarar.toLocaleString('tr-TR')} TL
                  </span>
                </div>
                <div>
                  <span className="text-[#5A5A5A]">Mizan Kayıt:</span>
                  <span className="ml-2 font-mono">{mevcutDonem.mizan_kayit}</span>
                </div>
              </div>
            </div>
          )}

          {/* Projeksiyon Yöntemleri */}
          {hasNewFormat && projeksiyonYontemleri && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-[#2E2E2E] mb-3">📐 Projeksiyon Yöntemleri</h3>
              <div className="space-y-3">
                {projeksiyonYontemleri.map((y, i) => (
                  <div key={i} className="bg-[#F5F6F8] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{y.yontem}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#969696]">
                          Güvenilirlik: {(y.guvenilirlik * 100).toFixed(0)}%
                        </span>
                        <span className={`font-mono text-sm ${y.sonuc >= 0 ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>
                          {y.sonuc.toLocaleString('tr-TR')} TL
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#969696]">{y.aciklama}</p>
                    {y.buyume_orani !== undefined && (
                      <p className="text-xs text-[#0049AA] mt-1">
                        YoY Büyüme: {(y.buyume_orani * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Senaryolar */}
          {senaryolar && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-[#2E2E2E] mb-3">🎯 Senaryo Analizi</h3>
              <div className="grid grid-cols-3 gap-3">
                {/* Pessimist */}
                <div className="bg-[#FEF2F2] rounded-lg p-3 text-center">
                  <span className="text-xs text-[#BF192B] font-medium">Düşük</span>
                  <div className="text-lg font-bold text-[#BF192B] mt-1">
                    {senaryolar.pessimist.vergi.toLocaleString('tr-TR')} TL
                  </div>
                  <span className="text-xs text-[#969696]">-20%</span>
                </div>
                {/* Baz */}
                <div className="bg-[#E6F9FF] rounded-lg p-3 text-center border-2 border-[#5ED6FF]">
                  <span className="text-xs text-[#0049AA] font-medium">Baz</span>
                  <div className="text-lg font-bold text-[#0049AA] mt-1">
                    {senaryolar.baz.vergi.toLocaleString('tr-TR')} TL
                  </div>
                  <span className="text-xs text-[#969696]">En olası</span>
                </div>
                {/* Optimist */}
                <div className="bg-[#ECFDF5] rounded-lg p-3 text-center">
                  <span className="text-xs text-[#00804D] font-medium">Yüksek</span>
                  <div className="text-lg font-bold text-[#00804D] mt-1">
                    {senaryolar.optimist.vergi.toLocaleString('tr-TR')} TL
                  </div>
                  <span className="text-xs text-[#969696]">+20%</span>
                </div>
              </div>
            </div>
          )}

          {/* Geçmiş Veri */}
          {gecmisVeri && gecmisVeri.toplam_donem > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-[#2E2E2E] mb-2">📈 Geçmiş Veri Analizi</h3>
              <div className="text-sm space-y-2">
                <p>Analiz edilen dönem sayısı: <strong>{gecmisVeri.toplam_donem}</strong></p>
                {gecmisVeri.onceki_yil_ayni_donem && (
                  <p>
                    Önceki yıl aynı dönem ({gecmisVeri.onceki_yil_ayni_donem.period}): {' '}
                    <strong>{gecmisVeri.onceki_yil_ayni_donem.kar_zarar.toLocaleString('tr-TR')} TL</strong>
                  </p>
                )}
                {gecmisVeri.yoy_buyume !== null && (
                  <p className={gecmisVeri.yoy_buyume >= 0 ? 'text-[#00804D]' : 'text-[#BF192B]'}>
                    YoY Büyüme: <strong>{(gecmisVeri.yoy_buyume * 100).toFixed(1)}%</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Metodoloji */}
          {metodoloji && (
            <div className="bg-[#F5F6F8] border rounded-lg p-4">
              <h3 className="font-medium text-[#2E2E2E] mb-2">📚 Metodoloji</h3>
              <ul className="text-sm text-[#5A5A5A] space-y-1">
                <li>• Kullanılan yöntemler: {metodoloji.yontemler.join(', ')}</li>
                <li>• Mevsimsellik katsayısı: %{(metodoloji.mevsimsellik * 100).toFixed(0)}</li>
                <li>• Kaynak: {metodoloji.kaynak}</li>
              </ul>
            </div>
          )}

          {/* Uyarılar */}
          {uyarilar && uyarilar.length > 0 && (
            <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4">
              <h3 className="font-medium text-[#E67324] mb-2">⚠️ Uyarılar</h3>
              <ul className="text-sm text-[#E67324] space-y-1">
                {uyarilar.map((uyari, i) => (
                  <li key={i}>{uyari}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-[#F5F6F8]">
          {hasAnyData ? (
            <span className="text-xs text-[#BF192B] font-medium">
              ⚠️ Resmi beyan için kullanılamaz
            </span>
          ) : (
            <span className="text-xs text-[#969696]">
              Mizan yükleyerek projeksiyon oluşturun
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
