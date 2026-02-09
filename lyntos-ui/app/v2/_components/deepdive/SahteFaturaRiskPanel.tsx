'use client';
import React, { useState } from 'react';
import { HelpCircle, Shield, AlertTriangle, XCircle, Building2, FileText, FileSearch, Activity, BookOpen } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { useScopeComplete } from '../scope/useDashboardScope';
import type { SahteFaturaAnaliziResult } from './crosscheck-types';
import { normalizeSahteFaturaAnalizi, getRiskSeviyeConfig, getKaynakConfig } from './crosscheck-helpers';
import { SahteFaturaInfoModal } from './SahteFaturaInfoModal';
import { RiskGauge, BarChart3 } from './RiskGauge';

export function SahteFaturaRiskPanel() {
  const scopeComplete = useScopeComplete();
  const [showInfo, setShowInfo] = useState(false);
  const [expandedTedarikci, setExpandedTedarikci] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ozet' | 'tedarikciler' | 'bulgular'>('ozet');

  const envelope = useFailSoftFetch<SahteFaturaAnaliziResult>(
    scopeComplete ? ENDPOINTS.FAKE_INVOICE_RISK : null,
    normalizeSahteFaturaAnalizi
  );
  const { status, reason_tr, data } = envelope;

  if (!scopeComplete) {
    return (
      <Card title="Sahte Fatura Risk Analizi" subtitle="Vergi Levhası + Ticaret Sicil + e-Fatura">
        <div className="py-8 text-center">
          <span className="text-4xl mb-4 block">🔍</span>
          <p className="text-sm text-[#969696]">Dönem seçildikten sonra sahte fatura risk analizi görünecektir.</p>
        </div>
      </Card>
    );
  }

  const hasData = data && (data.bulgular.length > 0 || data.riskliTedarikçiler.length > 0);
  const riskConfig = getRiskSeviyeConfig(data?.riskSeviyesi || 'DUSUK');

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            Sahte Fatura Risk Analizi
            <button
              onClick={() => setShowInfo(true)}
              className="text-[#969696] hover:text-[#BF192B] transition-colors"
              title="Detaylı Bilgi"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </span>
        }
        subtitle="Vergi Levhası + Ticaret Sicil + e-Fatura Çapraz Kontrolü"
        headerAction={
          hasData ? (
            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${riskConfig.badge}`}>
              {data?.riskliTedarikciSayisi || 0} Riskli Tedarikçi
            </div>
          ) : (
            <Badge variant="default">Veri Bekleniyor</Badge>
          )
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {!hasData ? (
            <div className="py-8">
              <div className="text-center mb-6">
                <Shield className="w-12 h-12 text-[#B4B4B4] mx-auto mb-3" />
                <h4 className="font-semibold text-[#5A5A5A] mb-1">Sahte Fatura Risk Analizi</h4>
                <p className="text-sm text-[#969696]">Tedarikçi risk analizi için veri bekleniyor</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { icon: <FileText className="w-4 h-4" />, label: 'Vergi Levhası', desc: 'Matrah, NACE kodu analizi' },
                  { icon: <Building2 className="w-4 h-4" />, label: 'Ticaret Sicili', desc: 'Kuruluş tarihi, sermaye' },
                  { icon: <FileSearch className="w-4 h-4" />, label: 'e-Fatura', desc: 'Fatura paterni analizi' },
                  { icon: <Activity className="w-4 h-4" />, label: 'Sektör Benchmark', desc: 'KDV yükü karşılaştırması' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-[#F5F6F8] rounded-lg text-[#969696]">
                    {item.icon}
                    <div>
                      <div className="text-xs font-medium">{item.label}</div>
                      <div className="text-[10px]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-2 text-[#FA841E] font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Kontrol Edilen Kriterler
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-[#5A5A5A]">
                  <span>• Yeni kuruluş tedarikçiler</span>
                  <span>• NACE kodu uyumsuzluğu</span>
                  <span>• Sık adres değişikliği</span>
                  <span>• Yıl sonu fatura yoğunluğu</span>
                  <span>• Düşük sermaye / yüksek ciro</span>
                  <span>• Tasfiye halindeki şirketler</span>
                </div>
              </div>

              <p className="text-xs text-[#0049AA] mt-4 text-center">
                📤 e-Fatura ve Vergi Levhası yüklendiğinde risk analizi yapılacak
              </p>
            </div>
          ) : (
            <>
        {/* Tabs */}
        <div className="flex border-b border-[#E5E5E5] mb-4">
          {[
            { id: 'ozet', label: 'Özet', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'tedarikciler', label: `Tedarikçiler (${data?.riskliTedarikçiler?.length || 0})`, icon: <Building2 className="w-4 h-4" /> },
            { id: 'bulgular', label: `Bulgular (${data?.bulgular?.length || 0})`, icon: <AlertTriangle className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#F0282D] text-[#BF192B]'
                  : 'border-transparent text-[#969696] hover:text-[#5A5A5A]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'ozet' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${riskConfig.bg} ${riskConfig.border} border`}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-5 h-5 ${riskConfig.text}`} />
                    <h4 className="font-semibold text-[#2E2E2E]">Genel Risk Durumu</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#969696]">İncelenen Tedarikçi:</span>
                      <span className="ml-2 font-semibold">{data?.incelenenTedarikciSayisi || 0}</span>
                    </div>
                    <div>
                      <span className="text-[#969696]">Riskli Tedarikçi:</span>
                      <span className={`ml-2 font-semibold ${riskConfig.text}`}>{data?.riskliTedarikciSayisi || 0}</span>
                    </div>
                    <div>
                      <span className="text-[#969696]">Kritik Bulgu:</span>
                      <span className="ml-2 font-semibold text-[#BF192B]">
                        {data?.bulgular?.filter(b => b.seviye === 'KRITIK').length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#969696]">Analiz Tarihi:</span>
                      <span className="ml-2">{data?.analizTarihi ? new Date(data.analizTarihi).toLocaleDateString('tr-TR') : '-'}</span>
                    </div>
                  </div>
                </div>
                <RiskGauge score={data?.toplamRiskPuani || 0} level={data?.riskSeviyesi || 'DUSUK'} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['vergi_levhasi', 'ticaret_sicil', 'e_fatura', 'sektor_analizi'].map((kaynak) => {
                const cfg = getKaynakConfig(kaynak);
                const count = data?.bulgular?.filter(b => b.kaynak === kaynak).length || 0;
                return (
                  <div key={kaynak} className={`p-2 rounded-lg text-center ${cfg.color}`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {cfg.icon}
                      <span className="text-xs font-medium">{cfg.label}</span>
                    </div>
                    <div className="text-lg font-bold">{count}</div>
                  </div>
                );
              })}
            </div>

            {(data?.bulgular?.filter(b => b.seviye === 'KRITIK').length || 0) > 0 && (
              <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-[#BF192B]" />
                  <h4 className="font-semibold text-[#980F30]">Kritik Uyarılar</h4>
                </div>
                <div className="space-y-2">
                  {data?.bulgular?.filter(b => b.seviye === 'KRITIK').map((bulgu, i) => (
                    <div key={i} className="text-sm text-[#BF192B]">
                      <strong>{bulgu.kod}:</strong> {bulgu.aciklama}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tedarikciler' && data?.riskliTedarikçiler && (
          <div className="space-y-3">
            {data.riskliTedarikçiler.map((tedarikci) => {
              const cfg = getRiskSeviyeConfig(tedarikci.riskSeviyesi);
              const isExpanded = expandedTedarikci === tedarikci.vkn;

              return (
                <div
                  key={tedarikci.vkn}
                  className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}
                >
                  <button
                    onClick={() => setExpandedTedarikci(isExpanded ? null : tedarikci.vkn)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${cfg.badge}`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[#2E2E2E]">{tedarikci.unvan}</h4>
                          <p className="text-xs text-[#969696]">VKN: {tedarikci.vkn}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${cfg.text}`}>{tedarikci.riskPuani}</div>
                        <div className="text-xs text-[#969696]">Risk Puanı</div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {tedarikci.riskFaktorleri.map((faktor, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-white/50 rounded-full text-[#5A5A5A]">
                          {faktor}
                        </span>
                      ))}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-[#E5E5E5]/50 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-[#969696]">Toplam Alım:</span>
                          <span className="ml-2 font-semibold">₺{tedarikci.toplamAlimTutari.toLocaleString('tr-TR')}</span>
                        </div>
                        <div>
                          <span className="text-[#969696]">Son İşlem:</span>
                          <span className="ml-2">{new Date(tedarikci.sonIslemTarihi).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>

                      {tedarikci.uyarilar.length > 0 && (
                        <div className="bg-white/50 rounded-lg p-2">
                          <h5 className="text-xs font-semibold text-[#BF192B] mb-1">⚠️ Uyarılar</h5>
                          <ul className="space-y-1">
                            {tedarikci.uyarilar.map((uyari, i) => (
                              <li key={i} className="text-xs text-[#5A5A5A]">• {uyari}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button className="flex-1 text-xs px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg hover:bg-[#F5F6F8]">
                          GİB Sorgula
                        </button>
                        <button className="flex-1 text-xs px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg hover:bg-[#F5F6F8]">
                          Ticaret Sicil
                        </button>
                        <button className="flex-1 text-xs px-3 py-1.5 bg-[#FEF2F2] text-[#BF192B] border border-[#FFC7C9] rounded-lg hover:bg-[#FFC7C9]">
                          Mükellefe Bildir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'bulgular' && data?.bulgular && (
          <div className="space-y-3">
            {data.bulgular.map((bulgu, i) => {
              const cfg = getRiskSeviyeConfig(bulgu.seviye);
              const kaynakCfg = getKaynakConfig(bulgu.kaynak);
              const Icon = cfg.icon;

              return (
                <div key={i} className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${cfg.badge}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#2E2E2E]">{bulgu.ad}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-[#F5F6F8] rounded text-[#5A5A5A]">{bulgu.kod}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${kaynakCfg.color}`}>
                          {kaynakCfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-[#5A5A5A] mb-2">{bulgu.aciklama}</p>

                      <div className="bg-white/50 rounded-lg p-2">
                        <h5 className="text-xs font-semibold text-[#5A5A5A] mb-1">💡 Öneri</h5>
                        <p className="text-xs text-[#5A5A5A]">{bulgu.oneri}</p>
                      </div>

                      {bulgu.mevzuat && bulgu.mevzuat.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-[#969696]">
                          <BookOpen className="w-3 h-3" />
                          <span>Mevzuat: {bulgu.mevzuat.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${cfg.text}`}>{bulgu.puan}</div>
                      <div className="text-xs text-[#969696]">puan</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
            </>
          )}
        </PanelState>
      </Card>

      <SahteFaturaInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
    </>
  );
}
