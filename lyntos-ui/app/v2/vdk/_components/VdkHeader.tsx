'use client';

/**
 * VDK Header Component
 * Mükellef bilgisi ve sayfa başlığı
 * Sektör bilgisi Vergi Levhasından alınır
 */

import React from 'react';
import { ShieldAlert, Database, AlertCircle, Building2, Tag, TrendingUp, DollarSign, Percent, RefreshCw } from 'lucide-react';
import { useDashboardScope } from '../../_components/scope/useDashboardScope';
import type { SektorBilgisi, TcmbVerileri } from '../../_hooks/useVdkFullAnalysis';

interface VdkHeaderProps {
  effectiveDate?: string;
  dataSource?: 'database' | 'json' | 'none';
  mizanEntryCount?: number;
  sektorBilgisi?: SektorBilgisi | null;
  tcmbVerileri?: TcmbVerileri | null;
}

export default function VdkHeader({
  effectiveDate = '1 Ekim 2025',
  dataSource,
  mizanEntryCount,
  sektorBilgisi,
  tcmbVerileri
}: VdkHeaderProps) {
  const { scope, selectedClient } = useDashboardScope();

  return (
    <div className="space-y-4">
      {/* Page Title with Mükellef Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-[#5A5A5A]" />
          <div>
            <h1 className="text-2xl font-bold text-[#2E2E2E]">VDK Risk Yönetimi</h1>
            <p className="text-[#969696] text-sm">Proaktif risk analizi ve savunma hazırlığı</p>
          </div>
        </div>

        {/* Mükellef Bilgi Satırı */}
        {scope.client_id && (
          <div className="bg-[#F5F6F8] border border-[#E5E5E5] rounded-lg px-4 py-2">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-[#969696]">Mükellef:</span>{' '}
                <span className="font-semibold text-[#2E2E2E]">{selectedClient?.shortName || selectedClient?.name || scope.client_id}</span>
                {selectedClient?.vkn && (
                  <span className="text-[#969696] text-xs ml-1.5">(VKN: {selectedClient.vkn})</span>
                )}
              </div>
              {scope.period && (
                <>
                  <div className="w-px h-4 bg-[#B4B4B4]" />
                  <div>
                    <span className="text-[#969696]">Dönem:</span>{' '}
                    <span className="font-semibold text-[#2E2E2E]">{scope.period}</span>
                  </div>
                </>
              )}
              {/* Veri Kaynağı Göstergesi - ŞEFFAFLIK */}
              {dataSource && (
                <>
                  <div className="w-px h-4 bg-[#B4B4B4]" />
                  <div className="flex items-center gap-1">
                    {dataSource === 'database' ? (
                      <>
                        <Database className="w-3.5 h-3.5 text-[#00804D]" />
                        <span className="text-[#00804D] font-medium">
                          Gerçek Veri
                          {mizanEntryCount && mizanEntryCount > 0 && (
                            <span className="text-[#969696] font-normal"> ({mizanEntryCount} hesap)</span>
                          )}
                        </span>
                      </>
                    ) : dataSource === 'json' ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-[#FFB114]" />
                        <span className="text-[#FA841E] font-medium">Örnek Veri</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-[#F0282D]" />
                        <span className="text-[#BF192B] font-medium">Veri Yok</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sektör + TCMB Bilgi Kartları */}
      {(sektorBilgisi || tcmbVerileri) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sektör Bilgisi Kartı - TCMB EVDS + GİB */}
          {sektorBilgisi && (
            <div className="bg-gradient-to-r from-[#E6F9FF] to-[#E6F9FF] border border-[#ABEBFF] rounded-xl px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#E6F9FF] rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#0049AA]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#0049AA] bg-[#E6F9FF] px-2 py-0.5 rounded">
                      {sektorBilgisi.nace_kodu}
                    </span>
                    <span className="text-[#5A5A5A] font-medium text-sm">
                      {sektorBilgisi.nace_adi}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#969696]">
                    <Tag className="w-3 h-3" />
                    <span>{sektorBilgisi.sektor_adi}</span>
                    {sektorBilgisi.vergi_dairesi && (
                      <>
                        <span>•</span>
                        <span>VD: {sektorBilgisi.vergi_dairesi}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sektör Ortalamaları - TCMB EVDS 2024 */}
              <div className="space-y-2 mt-3">
                {/* Likidite + Karlılık */}
                <div className="grid grid-cols-5 gap-1.5">
                  {sektorBilgisi.cari_oran != null && (
                    <div className="bg-white/60 rounded-lg p-1.5 text-center">
                      <div className="text-[9px] text-[#969696]">Cari Oran</div>
                      <div className="font-bold text-[#0049AA] text-sm">
                        {(sektorBilgisi.cari_oran * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  {sektorBilgisi.asit_test_orani != null && (
                    <div className="bg-white/60 rounded-lg p-1.5 text-center">
                      <div className="text-[9px] text-[#969696]">Asit Test</div>
                      <div className="font-bold text-[#0049AA] text-sm">
                        {(sektorBilgisi.asit_test_orani * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  {sektorBilgisi.net_kar_marji != null && (
                    <div className="bg-white/60 rounded-lg p-1.5 text-center">
                      <div className="text-[9px] text-[#969696]">Net Kâr</div>
                      <div className="font-bold text-[#0049AA] text-sm">
                        {(sektorBilgisi.net_kar_marji * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {sektorBilgisi.brut_kar_marji != null && (
                    <div className="bg-white/60 rounded-lg p-1.5 text-center">
                      <div className="text-[9px] text-[#969696]">Brüt Kâr</div>
                      <div className="font-bold text-[#0049AA] text-sm">
                        {(sektorBilgisi.brut_kar_marji * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  {sektorBilgisi.roa != null && (
                    <div className="bg-white/60 rounded-lg p-1.5 text-center">
                      <div className="text-[9px] text-[#969696]">ROA</div>
                      <div className="font-bold text-[#0049AA] text-sm">
                        {(sektorBilgisi.roa * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Finansal Yapı + Devir Hızları */}
                <div className="grid grid-cols-5 gap-1.5">
                  {sektorBilgisi.yabanci_kaynak_aktif != null && (
                    <div className="bg-white/60 rounded-lg p-1.5 text-center">
                      <div className="text-[9px] text-[#969696]">Borç/Aktif</div>
                      <div className="font-bold text-[#0049AA] text-sm">
                        {(sektorBilgisi.yabanci_kaynak_aktif * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  {sektorBilgisi.ozkaynak_aktif != null && (
                    <div className="bg-white/60 rounded-lg p-1.5 text-center">
                      <div className="text-[9px] text-[#969696]">Özkaynak</div>
                      <div className="font-bold text-[#0049AA] text-sm">
                        {(sektorBilgisi.ozkaynak_aktif * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  {sektorBilgisi.alacak_devir_hizi != null && (
                    <div className="bg-white/60 rounded-lg p-1.5 text-center">
                      <div className="text-[9px] text-[#969696]">Alacak DH</div>
                      <div className="font-bold text-[#0049AA] text-sm">
                        {sektorBilgisi.alacak_devir_hizi.toFixed(1)}x
                      </div>
                    </div>
                  )}
                  {sektorBilgisi.borc_devir_hizi != null && (
                    <div className="bg-white/60 rounded-lg p-1.5 text-center">
                      <div className="text-[9px] text-[#969696]">Borç DH</div>
                      <div className="font-bold text-[#0049AA] text-sm">
                        {sektorBilgisi.borc_devir_hizi.toFixed(1)}x
                      </div>
                    </div>
                  )}
                  {sektorBilgisi.sektor_vergi_yuku != null && (
                    <div className="bg-[#FFFBEB] rounded-lg p-1.5 text-center border border-[#FFF08C]">
                      <div className="text-[9px] text-[#FA841E]">Vergi Yükü</div>
                      <div className="font-bold text-[#FA841E] text-sm">
                        {(sektorBilgisi.sektor_vergi_yuku * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-[#00B4EB] flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" />
                {sektorBilgisi.kaynak || 'TCMB EVDS + GİB'}
                {sektorBilgisi.veri_yili && <span>• {sektorBilgisi.veri_yili}</span>}
              </div>
              {sektorBilgisi.veri_kaynak === 'statik_2023' && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[#E67324]">
                  <AlertCircle className="w-3 h-3" />
                  Sektor verileri statik (2023). EVDS baglantisi kontrol edilmeli.
                </div>
              )}
            </div>
          )}

          {/* TCMB Güncel Veriler Kartı */}
          {tcmbVerileri && (() => {
            const isTcmbFallback = tcmbVerileri.kaynak?.includes('önbellek') || tcmbVerileri.kaynak?.includes('bağlantı hatası');
            return (
            <div className={`bg-gradient-to-r from-[#ECFDF5] to-[#ECFDF5] border ${isTcmbFallback ? 'border-[#FFF08C]' : 'border-[#AAE8B8]'} rounded-xl px-5 py-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#ECFDF5] rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#00804D]" />
                </div>
                <div>
                  <div className="text-[#5A5A5A] font-semibold">TCMB Güncel Göstergeler</div>
                  <div className="text-[10px] text-[#969696] flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5" />
                    {tcmbVerileri.bulten_tarihi
                      ? `Bülten: ${tcmbVerileri.bulten_tarihi}`
                      : tcmbVerileri.guncelleme_zamani
                        ? new Date(tcmbVerileri.guncelleme_zamani).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Güncel'
                    }
                    <span className="ml-1 text-[#00804D]">• {tcmbVerileri.kaynak}</span>
                  </div>
                </div>
              </div>

              {/* TCMB Verileri Grid - Döviz Kurları */}
              <div className="grid grid-cols-5 gap-2">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-[#969696] flex items-center justify-center gap-0.5">
                    <DollarSign className="w-2.5 h-2.5" />USD
                  </div>
                  <div className="font-bold text-[#00804D]">
                    {tcmbVerileri.usd_kuru?.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-[#969696]">EUR</div>
                  <div className="font-bold text-[#00804D]">
                    {tcmbVerileri.eur_kuru?.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-[#969696]">GBP</div>
                  <div className="font-bold text-[#00804D]">
                    {tcmbVerileri.gbp_kuru?.toFixed(2) || '-'}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-[#969696] flex items-center justify-center gap-0.5">
                    <Percent className="w-2.5 h-2.5" />Faiz
                  </div>
                  <div className="font-bold text-[#00804D]">
                    %{((tcmbVerileri.politika_faizi || 0) * 100).toFixed(0)}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-[#969696]">Enflasyon</div>
                  <div className="font-bold text-[#00804D]">
                    %{((tcmbVerileri.enflasyon_yillik || 0) * 100).toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Alt satır - SMMM için önemli oranlar */}
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-3 text-[#969696]">
                  {tcmbVerileri.gecikme_faizi_aylik && (
                    <span>Gecikme Faizi: <span className="font-medium text-[#5A5A5A]">%{(tcmbVerileri.gecikme_faizi_aylik * 100).toFixed(1)}/ay</span></span>
                  )}
                  {tcmbVerileri.reeskont_faizi && (
                    <span>Reeskont: <span className="font-medium text-[#5A5A5A]">%{(tcmbVerileri.reeskont_faizi * 100).toFixed(0)}</span></span>
                  )}
                </div>
                <span className="text-[#00CB50]">
                  {tcmbVerileri.kaynak}
                  {tcmbVerileri.son_guncelleme_oranlar && (
                    <span className="ml-2 text-[#969696]">Faiz Oranlari: {tcmbVerileri.son_guncelleme_oranlar}</span>
                  )}
                </span>
              </div>
              {isTcmbFallback && (
                <div className="mt-2 px-3 py-1.5 bg-[#FFFBEB] border border-[#FFF08C] rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#E67324] flex-shrink-0" />
                  <span className="text-[11px] text-[#E67324]">
                    TCMB baglantisi kurulamadi. Gosterilen kurlar onceki verilerdir.
                  </span>
                </div>
              )}
            </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
