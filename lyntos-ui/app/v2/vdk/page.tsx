'use client';

/**
 * VDK Risk Analizi Ana Sayfası - V2
 *
 * LYNTOS'un kalbi - SMMM'nin VDK'dan koruyucu meleği
 *
 * 5 Tab:
 * 1. Genel Bakış - Risk Radar + Kritik Uyarılar
 * 2. Hesap Analizleri - Kategori bazlı tüm hesap kontrolleri
 * 3. KURGAN - 16 KURGAN Senaryosu
 * 4. Müfettiş Gözü - Simülasyon + Savunma Hazırlığı
 * 5. AI Danışman - Claude + OpenAI Orkestrasyon
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ShieldAlert,
  Eye,
  Bot,
  Loader2,
  AlertTriangle,
  Upload,
  ArrowRight,
} from 'lucide-react';
// Components
import VdkHeader from './_components/VdkHeader';
import VdkSummaryPanel from './_components/VdkSummaryPanel';
import GenelBakisTab from './_components/tabs/GenelBakisTab';
import HesapAnalizleriTab from './_components/tabs/HesapAnalizleriTab';
import KurganTab from './_components/tabs/KurganTab';
import VdkOracleTab from './_components/tabs/VdkOracleTab';
import AiDanismanTab from './_components/tabs/AiDanismanTab';

// Hooks
import { useVdkOracle } from '../_hooks/useVdkOracle';
import { useIzahGenerator } from '../_hooks/useAiAnalysis';

// Scope context - LYNTOS global scope system
import { useDashboardScope } from '../_components/scope/useDashboardScope';
import { ScopeGuide } from '../_components/shared/ScopeGuide';

type TabId = 'genel' | 'hesaplar' | 'kurgan' | 'oracle' | 'ai';

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: 'genel', label: 'Genel Bakış', icon: LayoutDashboard },
  { id: 'hesaplar', label: 'Hesap Analizleri', icon: FileSpreadsheet },
  { id: 'kurgan', label: 'KURGAN', icon: ShieldAlert },
  { id: 'oracle', label: 'VDK Oracle', icon: Eye },
  { id: 'ai', label: 'AI Danışman', icon: Bot },
];

export default function VdkRiskPage() {
  const { scope, isReady } = useDashboardScope();
  const [activeTab, setActiveTab] = useState<TabId>('genel');

  // Get scope from LYNTOS global scope system (header dropdowns)
  const clientId = scope.client_id || null;
  const period = scope.period || null;

  // Fetch VDK data (Oracle = superset of kurgan-risk + simulator)
  const { data, isLoading, isError, error, refetch } = useVdkOracle(clientId, period);

  // Izah generator
  const izahGenerator = useIzahGenerator(clientId, period);

  // Handle izah generation
  const handleGenerateIzah = async (topic: string) => {
    if (!clientId || !period) return;
    await izahGenerator.generateIzah(topic);
    // Show result in modal or switch to AI tab
    setActiveTab('ai');
  };

  // Scope loading state
  if (!isReady) {
    return (
      <div className="space-y-6">
        <VdkHeader />
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0049AA]" />
          <span className="ml-3 text-[#5A5A5A] text-lg">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  // Data loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <VdkHeader />
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0049AA]" />
          <span className="ml-3 text-[#5A5A5A] text-lg">VDK Risk Analizi yükleniyor...</span>
        </div>
      </div>
    );
  }

  // No client or period selected
  if (!clientId || !period) {
    return (
      <div className="space-y-6">
        <VdkHeader />
        <ScopeGuide variant="full" description="VDK risk analizi için üstteki menülerden bir mükellef ve dönem seçin." />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <VdkHeader />
        <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#F0282D] flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-[#980F30]">Hata Oluştu</h3>
              <p className="text-[#BF192B] text-sm mt-1">{error}</p>
              <button
                onClick={() => refetch()}
                className="mt-3 px-4 py-2 bg-[#BF192B] text-white rounded-lg text-sm font-medium hover:bg-[#BF192B]"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data - empty state (null veya no_data status)
  if (!data || data.status === 'no_data') {
    return (
      <div className="space-y-6">
        <VdkHeader />
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-[#F5F6F8] rounded-full flex items-center justify-center mb-6">
              <ShieldAlert className="w-10 h-10 text-[#B4B4B4]" />
            </div>
            <h3 className="text-xl font-semibold text-[#2E2E2E] mb-3">
              Bu Dönem İçin Veri Bulunamadı
            </h3>
            <p className="text-[#969696] max-w-lg mb-2">
              VDK 13 kriter bazında risk analizi yapabilmek için bu döneme ait
              mizan ve beyanname verilerini yüklemeniz gerekmektedir.
            </p>
            <p className="text-xs text-[#B4B4B4] mb-6">
              Veriler yüklendikten sonra KURGAN risk skoru, inceleme olasılığı ve
              acil aksiyonlar otomatik olarak hesaplanacaktır.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2 p-4 bg-[#F5F6F8] rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-[#E5E5E5]">
                  <Upload className="w-5 h-5 text-[#0049AA]" />
                </div>
                <span className="text-xs text-[#5A5A5A] font-medium">1. Veri Yükle</span>
                <span className="text-[10px] text-[#969696]">Mizan + Beyanname</span>
              </div>

              <ArrowRight className="w-5 h-5 text-[#B4B4B4]" />

              <div className="flex flex-col items-center gap-2 p-4 bg-[#F5F6F8] rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-[#E5E5E5]">
                  <ShieldAlert className="w-5 h-5 text-[#00A651]" />
                </div>
                <span className="text-xs text-[#5A5A5A] font-medium">2. Otomatik Analiz</span>
                <span className="text-[10px] text-[#969696]">KURGAN + VDK Risk</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <VdkHeader
        effectiveDate={data.effective_date}
        dataSource={data.kurgan_risk?.data_source}
        mizanEntryCount={data.kurgan_risk?.mizan_entry_count}
        sektorBilgisi={data.sektor_bilgisi}
        tcmbVerileri={data.tcmb_verileri}
      />

      {/* Summary Panel */}
      <VdkSummaryPanel
        score={data.kurgan_risk?.score || 0}
        riskLevel={data.kurgan_risk?.risk_level || 'Hesaplanıyor'}
        riskSummary={data.risk_summary}
        urgentActions={data.urgent_actions}
      />

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        <div className="border-b border-[#E5E5E5]">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              // Badge for specific tabs
              let badge = null;
              if (tab.id === 'kurgan' && data.kurgan_scenarios) {
                const triggered = data.kurgan_scenarios.filter((s) => s.tetiklendi).length;
                if (triggered > 0) {
                  badge = (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-[#FEF2F2] text-[#BF192B] rounded-full">
                      {triggered}
                    </span>
                  );
                }
              }
              if (tab.id === 'hesaplar' && data.category_analysis) {
                const kritik = Object.values(data.category_analysis).reduce(
                  (sum, cat) => sum + (cat.kritik_sayisi || 0),
                  0
                );
                if (kritik > 0) {
                  badge = (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-[#FFFBEB] text-[#FA841E] rounded-full">
                      {kritik}
                    </span>
                  );
                }
              }
              if (tab.id === 'oracle' && data.simulator) {
                const triggered = data.simulator.triggered_count || 0;
                if (triggered > 0) {
                  badge = (
                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-[#FEF2F2] text-[#BF192B] rounded-full">
                      {triggered}
                    </span>
                  );
                }
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${
                      isActive
                        ? 'border-[#0049AA] text-[#0049AA] bg-[#E6F9FF]'
                        : 'border-transparent text-[#969696] hover:text-[#5A5A5A] hover:border-[#B4B4B4]'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {badge}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'genel' && <GenelBakisTab data={data} onTabChange={(tab) => setActiveTab(tab as TabId)} />}
          {activeTab === 'hesaplar' && <HesapAnalizleriTab data={data} />}
          {activeTab === 'kurgan' && (
            <KurganTab
              scenarios={data.kurgan_scenarios}
              onGenerateIzah={(scenario) => handleGenerateIzah(scenario.senaryo_adi)}
            />
          )}
          {activeTab === 'oracle' && clientId && period && (
            <VdkOracleTab
              data={data}
              clientId={clientId}
              period={period}
              onGenerateIzah={handleGenerateIzah}
            />
          )}
          {activeTab === 'ai' && <AiDanismanTab clientId={clientId} period={period} data={data} />}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-[#969696]">
        <p>
          VDK Genelgesi: {data.vdk_reference} | Mali Milat: {data.effective_date}
        </p>
        <p className="mt-1">
          Tahmini İşlem Süresi: {data.time_estimate} | {data.what_to_do}
        </p>
      </div>
    </div>
  );
}
