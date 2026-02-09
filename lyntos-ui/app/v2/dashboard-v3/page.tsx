/**
 * LYNTOS Dashboard V3 - Beyaz Tema + Tam Ozellikli
 * V2'deki tum component'leri kullanir, beyaz tema ile
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, FolderOpen, BarChart3, Calculator, Layers, Radio, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { ScopeGuide } from '../_components/shared/ScopeGuide';

// Scope
import { useDashboardScope, useScopeComplete } from '../_components/scope/useDashboardScope';

// Dashboard Data Hook (Backend API)
import { useDashboardData } from '../_hooks/useDashboardData';

// Shared
import { Card } from '../_components/shared/Card';
import { Badge } from '../_components/shared/Badge';

// Layout
import { DashboardSection } from '../_components/layout';

// Operations
import { AksiyonKuyruguPanel, useAksiyonlar } from '../_components/operations';
import type { AksiyonItem } from '../_components/operations';

// Donem Verileri
import { DonemVerileriPanel, useDonemVerileri } from '../_components/donem-verileri';
import type { BelgeTipi } from '../_components/donem-verileri/types';

// KPI
import { KpiStrip } from '../_components/kpi/KpiStrip';

// Vergi Analiz
import { GeciciVergiPanel, KurumlarVergisiPanel } from '../_components/vergi-analiz';

// Deep Dive
import { MizanOmurgaPanel } from '../_components/deepdive/MizanOmurgaPanel';
import Link from 'next/link';
import { InflationPanel } from '../_components/deepdive/InflationPanel';

// RegWatch
import { RegWatchPanel } from '../_components/operations/RegWatchPanel';

// Modals
import { UploadModal } from '../_components/modals';
import { FiveWhyWizard } from '../_components/vdk/FiveWhyWizard';

// Missing Documents Card (Backend Big-6 Status)
import { MissingDocumentsCard } from '../_components/MissingDocumentsCard';

export default function DashboardV3Page() {
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadBelgeTipi, setUploadBelgeTipi] = useState<BelgeTipi | null>(null);

  // 5 Why Wizard State
  const [fiveWhyOpen, setFiveWhyOpen] = useState(false);
  const [selectedAksiyon, setSelectedAksiyon] = useState<AksiyonItem | null>(null);

  // Hooks
  const { markAsUploaded } = useDonemVerileri();
  const { aksiyonlar } = useAksiyonlar();

  // Backend Sync Status - fetch from API
  const {
    data: backendData,
    isLoading: isBackendLoading,
    isError: isBackendError,
    isEmpty: isBackendEmpty,
    refetch: refetchBackendData,
    docTypeCounts,
  } = useDashboardData(
    scopeComplete ? scope.period : null,
    scope.smmm_id || 'default',
    scope.client_id || 'default'
  );

  // Handlers
  const handleUploadClick = (belgeTipi: BelgeTipi) => {
    setUploadBelgeTipi(belgeTipi);
    setUploadModalOpen(true);
  };

  const handleUploadSuccess = (belgeTipi: BelgeTipi) => {
    markAsUploaded(belgeTipi);
  };

  const handleProblemCozmeClick = (aksiyon: AksiyonItem) => {
    setSelectedAksiyon(aksiyon);
    setFiveWhyOpen(true);
  };

  const handleFiveWhyComplete = () => {
    setFiveWhyOpen(false);
    setSelectedAksiyon(null);
  };

  const handleKontrolBaslat = (_kontrolId: string) => {
    // TODO: implement kontrol baslat
  };

  // Scope bekleniyor
  if (!scopeComplete) {
    return (
      <div className="space-y-6">
        <ScopeGuide variant="hero" />
      </div>
    );
  }

  const acilSayisi = aksiyonlar.filter(a => a.oncelik === 'acil').length;

  return (
    <div className="space-y-6">
      {/* Context Bar */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="success">V3 Aktif</Badge>
            <span className="text-sm text-[#5A5A5A]">
              {scope.smmm_id} / {scope.client_id} / {scope.period}
            </span>
            <Badge variant="info">Beyaz Tema</Badge>
          </div>

          {/* Backend Sync Status */}
          <div className="flex items-center gap-2">
            {isBackendLoading ? (
              <div className="flex items-center gap-2 text-[#969696]">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-xs">Yükleniyor...</span>
              </div>
            ) : isBackendError ? (
              <button
                onClick={() => refetchBackendData()}
                className="flex items-center gap-2 text-[#F0282D] hover:text-[#BF192B]"
                title="Yeniden dene"
              >
                <CloudOff className="w-4 h-4" />
                <span className="text-xs">Bağlantı hatası</span>
              </button>
            ) : isBackendEmpty ? (
              <div className="flex items-center gap-2 text-[#FFB114]" title="Backend'de veri yok">
                <Cloud className="w-4 h-4" />
                <span className="text-xs">Senkronize edilmedi</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#00804D]" title={`${backendData?.totalCount || 0} dosya senkronize`}>
                <Cloud className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {backendData?.totalCount || 0} dosya senkronize
                </span>
                {backendData?.syncedAt && (
                  <span className="text-xs text-[#969696]">
                    ({new Date(backendData.syncedAt).toLocaleDateString('tr-TR')})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ROW 1: ACIL ISLER */}
      <DashboardSection
        id="aksiyonlar-section"
        title="Bugun Ne Yapmaliyim?"
        icon={<AlertCircle className="w-7 h-7 text-white" />}
        variant="urgent"
        badge={
          acilSayisi > 0 && (
            <span className="bg-[#F0282D] text-white text-sm font-bold px-5 py-2 rounded-full shadow-lg animate-pulse">
              {acilSayisi} Acil İş
            </span>
          )
        }
      >
        <AksiyonKuyruguPanel
          aksiyonlar={aksiyonlar}
          onProblemCozmeClick={handleProblemCozmeClick}
        />
      </DashboardSection>

      {/* ROW 2: DONEM VERILERI (11 Belge) + Backend Big-6 Status */}
      <DashboardSection
        id="donem-verileri-section"
        title="Donem Verileri"
        icon={<FolderOpen className="w-5 h-5 text-[#00804D]" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DonemVerileriPanel onUploadClick={handleUploadClick} />
          <MissingDocumentsCard
            byDocType={backendData?.byDocType}
            period={scope.period}
            onCategoryClick={(docType) => {
              // Map Big-6 to BelgeTipi for upload modal
              const docTypeToUpload: Record<string, BelgeTipi> = {
                'MIZAN': 'MIZAN',
                'BEYANNAME': 'beyan_kdv',
                'TAHAKKUK': 'vergi_tahakkuk',
                'BANKA': 'banka_ekstresi',
                'EDEFTER_BERAT': 'E_DEFTER',
                'EFATURA_ARSIV': 'e_fatura_listesi',
              };
              const belgeTipi = docTypeToUpload[docType];
              if (belgeTipi) {
                handleUploadClick(belgeTipi);
              }
            }}
          />
        </div>
      </DashboardSection>

      {/* ROW 3: KPI STRIP (8 Kart) */}
      <DashboardSection
        id="risk-ozeti-section"
        title="Dönem Özeti"
        icon={<BarChart3 className="w-5 h-5 text-[#FA841E]" />}
      >
        <KpiStrip />
      </DashboardSection>

      {/* ROW 4 & 5: VERGI ANALIZLERI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gecici Vergi - Beyaz Panel */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#E6F9FF] rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#0049AA]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2E2E2E]">Geçici Vergi Analizi</h2>
              <p className="text-[#969696] text-sm">{scope.period} - 12 Kritik Kontrol</p>
            </div>
          </div>
          <GeciciVergiPanel donem={scope.period} onKontrolClick={handleKontrolBaslat} />
        </div>

        {/* Kurumlar Vergisi - Beyaz Panel */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#00804D]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2E2E2E]">Kurumlar Vergisi Analizi</h2>
              <p className="text-[#969696] text-sm">2025 - 20 Kontrol (6+6+8)</p>
            </div>
          </div>
          <KurumlarVergisiPanel yil={2025} onKontrolClick={handleKontrolBaslat} />
        </div>
      </div>

      {/* ROW 6: DETAYLI ANALIZ (3 Kolon) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mizan Analizi */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔍</span>
            <h2 className="text-lg font-bold text-[#2E2E2E]">Mizan Analizi</h2>
          </div>
          <MizanOmurgaPanel />
        </div>

        {/* Mutabakat Matrisi - Sol menüye taşındı */}
        <Link href="/v2/mutabakat-matrisi" className="block">
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-sm hover:border-[#0078D0] hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🔗</span>
              <h2 className="text-lg font-bold text-[#2E2E2E] group-hover:text-[#0078D0]">Mutabakat Matrisi</h2>
              <span className="ml-auto text-xs bg-[#E6F9FF] text-[#0049AA] px-2 py-1 rounded-full">Yeni</span>
            </div>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-sm text-[#5A5A5A] mb-4">
                Çapraz kontrol paneli sol menüye taşındı.
              </p>
              <span className="inline-flex items-center gap-2 text-[#0078D0] text-sm font-medium group-hover:underline">
                Mutabakat Matrisi'ne Git →
              </span>
            </div>
          </div>
        </Link>

        {/* Enflasyon Muhasebesi */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📈</span>
            <h2 className="text-lg font-bold text-[#2E2E2E]">Enflasyon Muhasebesi</h2>
          </div>
          <InflationPanel />
        </div>
      </div>

      {/* ROW 7: REGWATCH */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-[#0049AA]" />
          <h2 className="text-lg font-bold text-[#2E2E2E]">Mevzuat Takibi</h2>
          <span className="text-sm text-[#969696]">8 Guvenilir Kaynak</span>
        </div>
        <RegWatchPanel />
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        belgeTipi={uploadBelgeTipi}
        onSuccess={handleUploadSuccess}
      />

      {selectedAksiyon && (
        <FiveWhyWizard
          isOpen={fiveWhyOpen}
          onClose={() => {
            setFiveWhyOpen(false);
            setSelectedAksiyon(null);
          }}
          kriterId={selectedAksiyon.iliskiliVeri?.id || selectedAksiyon.id}
          kriterBaslik={selectedAksiyon.baslik}
          problemAciklama={selectedAksiyon.aciklama}
          onComplete={handleFiveWhyComplete}
        />
      )}
    </div>
  );
}
