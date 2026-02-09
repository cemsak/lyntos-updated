'use client';
import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Shield,
  BarChart3,
  Calculator,
  PieChart,
  Info,
} from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { useV2Fetch } from '../hooks/useV2Fetch';
import { ENDPOINTS_V2 } from '../contracts/endpoints';
import { useScopeComplete } from '../scope/useDashboardScope';
import { HesapKartiModal } from './HesapKartiModal';
import { YatayDikeyAnaliz } from './YatayDikeyAnaliz';
import { ORAN_KATEGORILERI } from './mizanOmurgaConstants';
import { analyzeVdkRiskleri, calculateOranlar, normalizeMizan } from './mizanOmurgaHelpers';
import type { MizanResult } from './mizanOmurgaTypes';
import { MizanInfoModal } from './MizanInfoModal';
import { MizanVdkRiskTab } from './MizanVdkRiskTab';
import { MizanOranAnaliziTab } from './MizanOranAnaliziTab';
import { MizanDetayliTab } from './MizanDetayliTab';

export function MizanOmurgaPanel() {
  const scopeComplete = useScopeComplete();

  const [showSmmmInfo, setShowSmmmInfo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'vdk' | 'oranlar' | 'mizan' | 'yatay_dikey'>('vdk');
  const [selectedOranKategori, setSelectedOranKategori] = useState<keyof typeof ORAN_KATEGORILERI | 'TUMU'>('TUMU');
  const [expandedBulgu, setExpandedBulgu] = useState<string | null>(null);
  const [selectedHesapKodu, setSelectedHesapKodu] = useState<string | null>(null);

  const envelope = useV2Fetch<MizanResult>(
    ENDPOINTS_V2.MIZAN_ANALYZE,
    normalizeMizan
  );
  const { status, reason_tr, data } = envelope;

  if (!scopeComplete) {
    return (
      <Card title="Mizan Omurgası" subtitle="VDK Kritik Hesaplar">
        <div className="py-8 text-center">
          <span className="text-4xl mb-4 block">📊</span>
          <p className="text-sm text-[#969696]">Dönem seçildikten sonra mizan analizi görünecektir.</p>
        </div>
      </Card>
    );
  }

  const mizanData = data?.hesaplar || [];
  const hasData = mizanData.length > 0;
  const finansalOranlar = data?.finansal_oranlar;
  const vdkBulgular = useMemo(() => hasData ? analyzeVdkRiskleri(mizanData) : [], [mizanData, hasData]);
  const oranAnalizleri = useMemo(() => hasData ? calculateOranlar(mizanData, finansalOranlar) : [], [mizanData, hasData, finansalOranlar]);

  const smmmUyarilari = finansalOranlar?.smmm_uyarilari || [];

  const toplamBorc = data?.totals?.toplam_borc ?? mizanData.reduce((sum, h) => sum + h.borc, 0);
  const toplamAlacak = data?.totals?.toplam_alacak ?? mizanData.reduce((sum, h) => sum + h.alacak, 0);
  const fark = data?.totals?.fark ?? Math.abs(toplamBorc - toplamAlacak);
  const dengeliMi = data?.totals?.denge_ok ?? (fark < 1);

  const filteredMizan = useMemo(() => {
    if (!searchTerm) return mizanData;
    const term = searchTerm.toLowerCase();
    return mizanData.filter(h => h.kod.includes(term) || h.ad.toLowerCase().includes(term));
  }, [searchTerm, mizanData]);

  const filteredOranlar = useMemo(() => {
    if (selectedOranKategori === 'TUMU') return oranAnalizleri;
    return oranAnalizleri.filter(o => o.kategori === selectedOranKategori);
  }, [oranAnalizleri, selectedOranKategori]);

  const kritikCount = vdkBulgular.filter(b => b.durum === 'kritik').length;
  const vdkRiskCount = vdkBulgular.filter(b => b.vdkRiski).length;
  const smmmKritikCount = smmmUyarilari.filter(u => u.seviye === 'kritik').length;

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            Mizan Analizi
            <button onClick={() => setShowSmmmInfo(true)} className="text-[#969696] hover:text-[#00A651] transition-colors" title="SMMM/YMM Rehberi">
              <HelpCircle className="w-4 h-4" />
            </button>
          </span>
        }
        subtitle="YMM Seviyesi Analiz"
        headerAction={
          <div className="flex items-center gap-2">
            {hasData ? (
              dengeliMi ? (
                <Badge variant="success">Denge OK</Badge>
              ) : (
                <Badge variant="error">Denge Bozuk</Badge>
              )
            ) : null}
            {kritikCount > 0 && <Badge variant="error">{kritikCount} Kritik</Badge>}
            {vdkRiskCount > 0 && <Badge variant="warning">{vdkRiskCount} VDK Risk</Badge>}
            {smmmKritikCount > 0 && <Badge variant="error">{smmmKritikCount} Eksik Veri</Badge>}
          </div>
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {!hasData && status === 'ok' ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#FFFBEB] rounded-full flex items-center justify-center">
                <Info className="w-8 h-8 text-[#FA841E]" />
              </div>
              <h3 className="text-lg font-semibold text-[#5A5A5A] mb-2">Mizan Verisi Bulunamadı</h3>
              <p className="text-sm text-[#969696] mb-4">
                Bu dönem için mizan dosyası yüklenmemiş. Analiz yapabilmek için önce mizan dosyasını yükleyin.
              </p>
              <div className="bg-[#F5F6F8] rounded-lg p-4 text-left">
                <p className="text-xs font-medium text-[#5A5A5A] mb-2">Yapılacaklar:</p>
                <ul className="text-xs text-[#969696] space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#FFB114] rounded-full" />
                    Veri Yükleme sayfasına gidin
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#FFB114] rounded-full" />
                    Mizan dosyasını (CSV/Excel) yükleyin
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#FFB114] rounded-full" />
                    Analiz otomatik başlayacaktır
                  </li>
                </ul>
              </div>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="flex gap-1 p-1 bg-[#F5F6F8] rounded-lg">
              <button
                onClick={() => setActiveTab('vdk')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'vdk'
                    ? 'bg-white text-[#BF192B] shadow-sm'
                    : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
                }`}
              >
                <Shield className="w-4 h-4" />
                VDK Risk ({vdkBulgular.length})
              </button>
              <button
                onClick={() => setActiveTab('oranlar')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'oranlar'
                    ? 'bg-white text-[#0049AA] shadow-sm'
                    : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Oran Analizi
              </button>
              <button
                onClick={() => setActiveTab('mizan')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'mizan'
                    ? 'bg-white text-[#00804D] shadow-sm'
                    : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
                }`}
              >
                <Calculator className="w-4 h-4" />
                Detaylı Mizan
              </button>
              <button
                onClick={() => setActiveTab('yatay_dikey')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'yatay_dikey'
                    ? 'bg-white text-[#6B21A8] shadow-sm'
                    : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
                }`}
              >
                <PieChart className="w-4 h-4" />
                Yatay/Dikey
              </button>
            </div>

            {activeTab === 'vdk' && (
              <MizanVdkRiskTab
                dengeliMi={dengeliMi}
                fark={fark}
                toplamBorc={toplamBorc}
                toplamAlacak={toplamAlacak}
                vdkBulgular={vdkBulgular}
                expandedBulgu={expandedBulgu}
                setExpandedBulgu={setExpandedBulgu}
                smmmUyarilari={smmmUyarilari}
              />
            )}

            {activeTab === 'oranlar' && (
              <MizanOranAnaliziTab
                selectedOranKategori={selectedOranKategori}
                setSelectedOranKategori={setSelectedOranKategori}
                filteredOranlar={filteredOranlar}
              />
            )}

            {activeTab === 'mizan' && (
              <MizanDetayliTab
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filteredMizan={filteredMizan}
                vdkBulgular={vdkBulgular}
                toplamBorc={toplamBorc}
                toplamAlacak={toplamAlacak}
                fark={fark}
                setSelectedHesapKodu={setSelectedHesapKodu}
              />
            )}

            {activeTab === 'yatay_dikey' && (
              <YatayDikeyAnaliz />
            )}
          </div>
          )}
        </PanelState>
      </Card>

      <MizanInfoModal isOpen={showSmmmInfo} onClose={() => setShowSmmmInfo(false)} />

      <HesapKartiModal
        isOpen={selectedHesapKodu !== null}
        onClose={() => setSelectedHesapKodu(null)}
        hesapKodu={selectedHesapKodu || ''}
      />
    </>
  );
}
