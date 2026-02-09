'use client';

/**
 * Genel Bakış Tab
 * Risk Radar + Kritik Uyarılar + Trend Grafiği
 */

import React from 'react';
import { AlertTriangle, TrendingUp, Shield, ArrowRight, Database, AlertCircle, BarChart3, CheckCircle2 } from 'lucide-react';
import type { VdkFullAnalysisData, KategoriAnalizi, AcilAksiyon } from '../../../_hooks/useVdkFullAnalysis';
import { KATEGORI_LABELS, getScoreColor } from '../../../_hooks/useVdkFullAnalysis';
import SektorKarsilastirma, { type MukellefOranlari } from '../SektorKarsilastirma';

// Kategori → Hesap Kodu Mapping (SMMM için şeffaflık)
const KATEGORI_HESAP_KODLARI: Record<string, { kodlar: string[]; aciklama: string }> = {
  likidite: {
    kodlar: ['100', '102', '108'],
    aciklama: 'Kasa, Bankalar, Diğer Hazır Değerler'
  },
  ortaklar: {
    kodlar: ['131', '231', '331', '431'],
    aciklama: 'Ortaklardan Alacaklar/Borçlar (Adat Faizi)'
  },
  kdv: {
    kodlar: ['190', '191', '391', '392'],
    aciklama: 'Devreden KDV, İndirilecek KDV, Hesaplanan KDV'
  },
  ticari: {
    kodlar: ['120', '121', '128', '129', '320', '321'],
    aciklama: 'Alıcılar, Alacak Senetleri, Şüpheli Alacaklar'
  },
  vergi_sgk: {
    kodlar: ['360', '361', '368'],
    aciklama: 'Ödenecek Vergi/Fonlar, SGK, Vadesi Geçmiş Ertelenmiş'
  },
  sermaye: {
    kodlar: ['500', '501', '502', '540', '570', '580'],
    aciklama: 'Sermaye, Yasal Yedekler, Geçmiş Yıl Kar/Zararları'
  },
  gelir_gider: {
    kodlar: ['600', '620', '642', '660', '689'],
    aciklama: 'Satışlar, SMM, Faiz Gelirleri, Finansman Giderleri'
  },
  stok: {
    kodlar: ['150', '151', '152', '153', '157'],
    aciklama: 'İlk Madde, Yarı Mamul, Mamul, Ticari Mal, Diğer Stoklar'
  },
  duran_varlik: {
    kodlar: ['252', '253', '254', '255', '257', '260'],
    aciklama: 'Binalar, Tesis Makine, Taşıtlar, Demirbaşlar, Amortisman'
  },
};

interface GenelBakisTabProps {
  data: VdkFullAnalysisData;
  onTabChange?: (tab: string) => void; // Tab değiştirme fonksiyonu
}

/**
 * Backend'den gelen mukellef_finansal_oranlari'nı MukellefOranlari formatına dönüştür
 * TÜM HESAPLAMALAR BACKEND'DE YAPILIR - FRONTEND TAHMİN YAPMAZ!
 */
function getMukellefOranlariFromBackend(data: VdkFullAnalysisData): MukellefOranlari | null {
  // Backend'den gelen hesaplanmış oranları al
  const backendOranlar = data.mukellef_finansal_oranlari;

  if (!backendOranlar) {
    console.warn('[GenelBakisTab] Backend\'den mukellef_finansal_oranlari gelmedi');
    return null;
  }

  // Backend formatını frontend MukellefOranlari formatına map et
  return {
    cari_oran: backendOranlar.cari_oran ?? undefined,
    asit_test_orani: backendOranlar.asit_test_orani ?? undefined,
    nakit_orani: backendOranlar.nakit_orani ?? undefined,
    yabanci_kaynak_aktif: backendOranlar.yabanci_kaynak_aktif ?? undefined,
    ozkaynak_aktif: backendOranlar.ozkaynak_aktif ?? undefined,
    net_kar_marji: backendOranlar.net_kar_marji ?? undefined,
    brut_kar_marji: backendOranlar.brut_kar_marji ?? undefined,
    roa: backendOranlar.roa ?? undefined,
    alacak_devir_hizi: backendOranlar.alacak_devir_hizi ?? undefined,
    borc_devir_hizi: backendOranlar.borc_devir_hizi ?? undefined,
    stok_devir_hizi: backendOranlar.stok_devir_hizi ?? undefined,
    vergi_yuku: backendOranlar.vergi_yuku ?? undefined,
  };
}

export default function GenelBakisTab({ data, onTabChange }: GenelBakisTabProps) {
  const categories = data.category_analysis || {};
  const warnings = data.kurgan_risk?.warnings || [];
  const score = data.kurgan_risk?.score || 0;

  // Kategorileri risk skoruna göre sırala
  const sortedCategories = Object.entries(categories)
    .map(([id, cat]) => ({ id, ...cat }))
    .sort((a, b) => (b.toplam_risk || 0) - (a.toplam_risk || 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sol Panel - Risk Radar */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#0049AA]" />
          Risk Radar
        </h3>

        {/* Simple bar chart representation - with hesap kodu transparency */}
        <div className="space-y-4">
          {sortedCategories.map((cat) => {
            const risk = cat.toplam_risk || 0;
            const barColor =
              risk >= 70 ? 'bg-[#F0282D]' : risk >= 40 ? 'bg-[#FFB114]' : 'bg-[#00A651]';
            const hesapInfo = KATEGORI_HESAP_KODLARI[cat.id];
            // Veri durumu: "Genel Durum" = hesap verisi yok, "Normal" = veri var ama sorun yok, diger = sorun var
            const hasNoData = (cat.kontroller?.length || 0) === 0 ||
              cat.kontroller?.every(k => k.kontrol_adi === 'Genel Durum');
            const isClean = !hasNoData && cat.kontroller?.every(k => k.kontrol_adi === 'Normal' || k.risk_puani === 0);
            const hasRealIssues = !hasNoData && !isClean;

            return (
              <div key={cat.id} className="group">
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#5A5A5A] font-medium">
                      {KATEGORI_LABELS[cat.id] || cat.kategori_adi || cat.id}
                    </span>
                    {/* Veri kaynağı göstergesi */}
                    {hasNoData ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#F5F6F8] text-[#969696] rounded flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Veri Yok
                      </span>
                    ) : hasRealIssues ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#ECFDF5] text-[#00804D] rounded flex items-center gap-0.5">
                        <Database className="w-2.5 h-2.5" />
                        Gercek Veri
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#ECFDF5] text-[#00804D] rounded flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Sorun Yok
                      </span>
                    )}
                  </div>
                  <span className={`font-semibold ${getScoreColor(risk)}`}>{risk}/100</span>
                </div>
                <div className="w-full h-2 bg-[#F5F6F8] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.max(risk, 2)}%` }}
                  />
                </div>
                {/* Hesap kodları - hover'da göster */}
                {hesapInfo && (
                  <div className="mt-1 text-[10px] text-[#969696] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-mono">{hesapInfo.kodlar.join(', ')}</span>
                    <span className="mx-1">→</span>
                    <span>{hesapInfo.aciklama}</span>
                  </div>
                )}
                {(cat.kritik_sayisi > 0 || cat.uyari_sayisi > 0) && (
                  <div className="flex gap-2 mt-1 text-xs">
                    {cat.kritik_sayisi > 0 && (
                      <span className="text-[#BF192B]">{cat.kritik_sayisi} kritik</span>
                    )}
                    {cat.uyari_sayisi > 0 && (
                      <span className="text-[#FA841E]">{cat.uyari_sayisi} uyarı</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Genel Risk + Hesaplama Açıklaması */}
        <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#5A5A5A] font-medium">Genel Risk Puani <span className="text-[10px] text-[#969696] font-normal">(yuksek = kotu)</span></span>
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}/100</span>
          </div>
          {/* Hesaplama formülü */}
          <div className="bg-[#F5F6F8] rounded-lg p-3 text-xs text-[#969696]">
            <div className="font-medium text-[#5A5A5A] mb-1">📊 Hesaplama:</div>
            <div className="font-mono text-[10px] bg-white px-2 py-1 rounded">
              Skor = 100 - (Tüm Kategorilerin Risk Ortalaması) - (KURGAN Tetikleme × 5)
            </div>
            <div className="mt-2 text-[#969696]">
              {sortedCategories.length} kategori analiz edildi, {sortedCategories.filter(c =>
                (c.kontroller?.length || 0) > 0 && c.kontroller?.some((k: { kontrol_adi: string }) => k.kontrol_adi !== 'Genel Durum')
              ).length} kategoride gerçek veri bulundu.
            </div>
          </div>
        </div>
      </div>

      {/* Sağ Panel - Kritik Uyarılar */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#BF192B]" />
          Kritik Uyarılar
          {warnings.length > 0 && (
            <span className="text-xs font-normal text-[#969696]">
              ({warnings.length} adet)
            </span>
          )}
        </h3>

        {warnings.length > 0 ? (
          <div className="space-y-3">
            {warnings.slice(0, 7).map((warning, idx) => {
              const isKritik = warning.includes('KRITIK') || warning.includes('🔴');
              const isUyari = warning.includes('⚠️') || warning.includes('UYARI');

              // Hesap kodu çıkar (varsa)
              const hesapMatch = warning.match(/\b(1\d{2}|2\d{2}|3\d{2}|4\d{2}|5\d{2}|6\d{2}|7\d{2})\b/);
              const hesapKodu = hesapMatch ? hesapMatch[0] : null;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    isKritik
                      ? 'bg-[#FEF2F2] border-[#FFC7C9]'
                      : isUyari
                        ? 'bg-[#FFFBEB] border-[#FFF08C]'
                        : 'bg-[#F5F6F8] border-[#E5E5E5]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                        isKritik ? 'bg-[#F0282D]' : isUyari ? 'bg-[#FFB114]' : 'bg-[#969696]'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          isKritik
                            ? 'text-[#980F30]'
                            : isUyari
                              ? 'text-[#E67324]'
                              : 'text-[#5A5A5A]'
                        }`}
                      >
                        {warning.replace('⚠️', '').replace('🔴', '').trim()}
                      </p>
                      {/* Kaynak göstergesi */}
                      {hesapKodu && (
                        <div className="mt-1 text-[10px] text-[#969696] flex items-center gap-1">
                          <Database className="w-2.5 h-2.5" />
                          <span>Kaynak: Hesap {hesapKodu} (Mizan)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {warnings.length > 7 && (
              <button
                className="w-full text-center py-2 text-sm text-[#0049AA] hover:text-[#0049AA] hover:bg-[#E6F9FF] rounded-lg transition-colors"
                onClick={() => onTabChange?.('hesaplar')}
              >
                +{warnings.length - 7} daha fazla uyarı → Detayları gör
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-[#00804D]">
            <Shield className="w-8 h-8 mr-2" />
            <span className="font-medium">Kritik uyarı yok</span>
          </div>
        )}
      </div>

      {/* Sektör Karşılaştırması - TCMB EVDS */}
      {/* Sektör bilgisi varsa her zaman göster - mükellef oranları opsiyonel */}
      {data.sektor_bilgisi && (
        <div className="lg:col-span-2">
          <SektorKarsilastirma
            sektorBilgisi={data.sektor_bilgisi}
            mukellefOranlari={getMukellefOranlariFromBackend(data) || {}}
          />
        </div>
      )}

      {/* Öncelikli Aksiyonlar - SMMM için anlamlı özet */}
      {data.urgent_actions && data.urgent_actions.items.length > 0 && (
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E5E5] p-6">
          <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#0049AA]" />
            Yapılması Gereken İşlemler
            <span className="text-sm font-normal text-[#969696]">
              (Tahmini süre: {data.urgent_actions.estimated_time})
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5]">
                  <th className="text-left py-2 px-3 text-[#969696] font-medium">Öncelik</th>
                  <th className="text-left py-2 px-3 text-[#969696] font-medium">İşlem</th>
                  <th className="text-left py-2 px-3 text-[#969696] font-medium">İlgili Hesap</th>
                  <th className="text-left py-2 px-3 text-[#969696] font-medium">Süre</th>
                  <th className="text-right py-2 px-3 text-[#969696] font-medium">Risk Etkisi</th>
                </tr>
              </thead>
              <tbody>
                {data.urgent_actions.items.map((action, idx) => (
                  <tr key={idx} className="border-b border-[#E5E5E5] hover:bg-[#F5F6F8]">
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          action.oncelik === 'high'
                            ? 'bg-[#FEF2F2] text-[#BF192B]'
                            : action.oncelik === 'medium'
                              ? 'bg-[#FFFBEB] text-[#FA841E]'
                              : 'bg-[#ECFDF5] text-[#00804D]'
                        }`}
                      >
                        {action.oncelik === 'high' ? '1. Acil' : action.oncelik === 'medium' ? '2. Orta' : '3. Normal'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#5A5A5A]">{action.aksiyon}</td>
                    <td className="py-3 px-3">
                      {action.ilgili_hesap ? (
                        <span className="font-mono text-[#5A5A5A] bg-[#F5F6F8] px-2 py-0.5 rounded">{action.ilgili_hesap}</span>
                      ) : (
                        <span className="text-[#969696]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#969696]">{action.tahmini_sure}</td>
                    <td className="py-3 px-3 text-right">
                      {action.puan_etkisi && (
                        <span className="text-[#00804D] font-medium">{action.puan_etkisi} puan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.urgent_actions.toplam_puan_etkisi && data.urgent_actions.toplam_puan_etkisi !== 0 && (
            <div className="mt-4 pt-4 border-t border-[#E5E5E5] text-sm text-[#5A5A5A]">
              <strong>Not:</strong> Bu işlemleri tamamladığınızda risk skoru tahminen{' '}
              <span className="text-[#00804D] font-semibold">
                {data.kurgan_risk?.score || 0} → {Math.min(100, (data.kurgan_risk?.score || 0) + Math.abs(data.urgent_actions.toplam_puan_etkisi))}
              </span>
              {' '}olur. (Yüksek skor = düşük risk)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
