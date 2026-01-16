'use client';
import React, { useState, Suspense, useEffect, useRef, useMemo } from 'react';
import { ListTodo, FolderOpen, BarChart3, Radio, Layers, Calculator, AlertCircle } from 'lucide-react';
import { useDashboardScope, useScopeComplete } from './_components/scope/useDashboardScope';
import { Card } from './_components/shared/Card';
import { Badge } from './_components/shared/Badge';
import { DashboardSection, scrollToSection } from './_components/layout';
import { RightRail } from './_components/layout/RightRail';

// P0: Bugünkü İşlerim
import { AksiyonKuyruguPanel, useAksiyonlar } from './_components/operations';
import type { AksiyonItem } from './_components/operations';

// P0: Dönem Verileri
import { DonemVerileriPanel, useDonemVerileri } from './_components/donem-verileri';
import type { BelgeTipi } from './_components/donem-verileri/types';

// Upload Modal
import { UploadModal } from './_components/modals';

// P1: Risk Özeti (KPI Strip)
import { KpiStrip } from './_components/kpi/KpiStrip';

// P2: Mevzuat Takibi
import { RegWatchPanel } from './_components/operations/RegWatchPanel';

// Detaylı İnceleme (Uzman Modu) - V3: Individual panels for 3-column layout
import { MizanOmurgaPanel } from './_components/deepdive/MizanOmurgaPanel';
import { CrossCheckPanel } from './_components/deepdive/CrossCheckPanel';
import { InflationPanel } from './_components/deepdive/InflationPanel';
import { DeepDiveSection } from './_components/deepdive/DeepDiveSection';

// P1: Vergi Analizi
import { GeciciVergiPanel, KurumlarVergisiPanel } from './_components/vergi-analiz';

// 5 Why Wizard
import { FiveWhyWizard } from './_components/vdk/FiveWhyWizard';

// Evidence Bundle
import { EvidenceBundlePanel } from './_components/evidence';

// Intelligence Feed
import {
  IntelligenceFeed,
  useUrlSync,
  useResetFeedSelection,
  ContextRail,
  filterByStatus,
  useFeedStore,
  useFeedSignals,
} from './_components/feed';

// ═══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD CONTENT (wrapped in Suspense for useSearchParams)
// ═══════════════════════════════════════════════════════════════════

function V2DashboardContent() {
  // === ALL HOOKS AT TOP (React Hook Rules) ===
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();
  const { data: donemData, markAsUploaded } = useDonemVerileri();
  const { aksiyonlar, loading: aksiyonlarLoading } = useAksiyonlar();

  // URL sync for feed selection (Sprint 3.2)
  useUrlSync();

  // Reset feed selection when scope changes (Sprint 3.2.1)
  const resetFeedSelection = useResetFeedSelection();
  const prevScopeRef = useRef<string | null>(null);

  useEffect(() => {
    const currentScopeKey = `${scope.client_id}:${scope.period}`;

    // Skip on initial mount
    if (prevScopeRef.current === null) {
      prevScopeRef.current = currentScopeKey;
      return;
    }

    // Reset feed selection when scope changes
    if (prevScopeRef.current !== currentScopeKey) {
      resetFeedSelection();
      prevScopeRef.current = currentScopeKey;
    }
  }, [scope.client_id, scope.period, resetFeedSelection]);

  // ═══════════════════════════════════════════════════════════════════
  // FEED SIGNALS (Sprint 4.3 - Real signals from generators)
  // ═══════════════════════════════════════════════════════════════════

  // Get resolved/snoozed IDs from store
  const resolvedIds = useFeedStore((s) => s.resolvedIds);
  const snoozedIds = useFeedStore((s) => s.snoozedIds);

  // Get signals from generators (Mizan + CrossCheck)
  const { signals: feedSignals, stats: feedSignalStats } = useFeedSignals();

  // Filter out resolved/snoozed items
  const feedItems = useMemo(() => {
    return filterByStatus(feedSignals, resolvedIds, snoozedIds);
  }, [feedSignals, resolvedIds, snoozedIds]);

  // Get feed statistics for RightRail (derived from signal stats)
  const feedStats = useMemo(() => {
    const criticalCount = feedSignalStats.combined.critical;
    const highCount = feedSignalStats.combined.high;
    const missingDocCount = feedItems.filter(i => i.category === 'Belge').length;
    const topRecommendations = feedItems.slice(0, 3).map(i => i.title);

    return {
      criticalCount,
      highCount,
      missingDocCount,
      topRecommendations,
    };
  }, [feedSignalStats, feedItems]);

  // === ALL USESTATE HOOKS ===
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadBelgeTipi, setUploadBelgeTipi] = useState<BelgeTipi | null>(null);
  const [fiveWhyOpen, setFiveWhyOpen] = useState(false);
  const [selectedAksiyon, setSelectedAksiyon] = useState<AksiyonItem | null>(null);
  const [kontrolModalOpen, setKontrolModalOpen] = useState(false);
  const [selectedKontrol, setSelectedKontrol] = useState<{ id: string; baslik: string } | null>(null);
  const [selectedFeedItem, setSelectedFeedItem] = useState<string | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);

  // Derived values
  const kritikAksiyonlar = aksiyonlar.filter(a => a.oncelik === 'acil').length;

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

  const handleFiveWhyComplete = (analysis: { kriterId: string; problem: string; whys: string[]; kokNeden: string; onerilenAksiyonlar: string[] }) => {
    console.log('5 Why Analysis completed:', analysis);
    // TODO: Save to backend/state
    setFiveWhyOpen(false);
    setSelectedAksiyon(null);
  };

  const handleRegWatchClick = () => {
    scrollToSection('regwatch-section');
  };

  const handleFeedSelect = (item: { id: string }) => {
    setSelectedFeedItem(item.id);
    // TODO: Open context rail with item details
    console.log('Feed item selected:', item.id);
  };

  const handleFeedAction = (item: { id: string }, action: string) => {
    console.log('Feed action:', item.id, action);
    // TODO: Handle specific actions
  };

  const handleKontrolBaslat = (kontrolId: string) => {
    const isGeciciVergi = kontrolId.startsWith('GV-');
    const kontrolBaslik = isGeciciVergi
      ? `Geçici Vergi Kontrolü: ${kontrolId}`
      : `Kurumlar Vergisi Kontrolü: ${kontrolId}`;
    setSelectedKontrol({ id: kontrolId, baslik: kontrolBaslik });
    setKontrolModalOpen(true);
  };

  // Scope bekleniyor
  if (!scopeComplete) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Dashboard v2</h2>
            <p className="text-sm text-slate-600 mb-4">
              Lütfen yukarıdaki seçicilerden SMMM, Mükellef ve Dönem seçin.
            </p>
            <Badge variant="info">Kapsam Bekleniyor</Badge>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT - COL-SPAN-8 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="min-w-0 space-y-6">
        {/* CONTEXT BAR */}
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="success">Dönem Kapsamı Hazır</Badge>
            <span className="text-sm text-slate-600">
              {scope.smmm_id} / {scope.client_id} / {scope.period}
            </span>
            {scope.advanced && <Badge variant="warning">Uzman Modu</Badge>}
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BÖLÜM 1: AKILLI AKIŞ (Intelligence Feed) - Anayasa Compliance */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <DashboardSection
          id="feed-section"
          title="Akıllı Akış"
          icon={<AlertCircle className="w-6 h-6 text-blue-600" />}
          variant="default"
          badge={
            (feedStats.criticalCount + feedStats.highCount) > 0 && (
              <span className="bg-red-100 text-red-700 text-sm font-semibold px-4 py-1.5 rounded-full">
                {feedStats.criticalCount + feedStats.highCount} Acil
              </span>
            )
          }
        >
          <IntelligenceFeed
            items={feedItems}
            onSelectItem={handleFeedSelect}
            onAction={handleFeedAction}
            selectedItemId={selectedFeedItem || undefined}
            maxVisible={5}
            showFilters={true}
          />
        </DashboardSection>

        {/* Eski Aksiyon Kuyruğu (advanced mode'da göster) */}
        {scope.advanced && (
          <DashboardSection
            id="aksiyonlar-section"
            title="Detaylı İş Listesi"
            icon={<AlertCircle className="w-6 h-6 text-slate-500" />}
            variant="default"
            collapsible={true}
            defaultCollapsed={true}
          >
            <AksiyonKuyruguPanel
              aksiyonlar={aksiyonlar}
              onProblemCozmeClick={handleProblemCozmeClick}
            />
          </DashboardSection>
        )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BÖLÜM 2: DÖNEM VERİLERİ (P0) - KOMPAKT GRID */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardSection
        id="donem-verileri-section"
        title="Dönem Verileri"
        icon={<FolderOpen className="w-5 h-5 text-green-600" />}
      >
        <DonemVerileriPanel onUploadClick={handleUploadClick} />
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BÖLÜM 3: RİSK ÖZETİ - KPI Strip (P1) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardSection
        id="risk-ozeti-section"
        title="Risk Özeti"
        icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
      >
        <KpiStrip onRegWatchClick={handleRegWatchClick} />
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BÖLÜM 4: VERGİ ANALİZİ (P1) - White Card Style */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        {/* Geçici Vergi - White Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Geçici Vergi Analizi</h2>
                <p className="text-slate-500 text-sm">{scope.period} - 12 Kritik Kontrol</p>
              </div>
            </div>
          </div>
          <GeciciVergiPanel donem={scope.period} onKontrolClick={handleKontrolBaslat} />
        </div>

        {/* Kurumlar Vergisi */}
        <KurumlarVergisiPanel yil={2024} onKontrolClick={handleKontrolBaslat} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BÖLÜM 5: V3 3-COLUMN BOTTOM LAYOUT - KOMPAKT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-6" id="bottom-section">
        {/* Column 1: Detaylı İnceleme */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>🔍</span> Detaylı İnceleme
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <MizanOmurgaPanel />
            <CrossCheckPanel />
          </div>
        </div>

        {/* Column 2: Enflasyon Muhasebesi */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>📈</span> Enflasyon Muhasebesi
            </h2>
          </div>
          <div className="p-4">
            <InflationPanel />
          </div>
        </div>

        {/* Column 3: Mevzuat Takibi */}
        <div id="regwatch-section" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>📡</span> Mevzuat Takibi
            </h2>
          </div>
          <div className="p-4">
            <RegWatchPanel />
          </div>
        </div>
      </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BÖLÜM 6: DETAYLI İNCELEME - Uzman Modu (Full panels when advanced mode) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {scope.advanced && (
          <DashboardSection
            id="deep-dive-section"
            title="Tüm Detaylı İncelemeler"
            icon={<Layers className="w-5 h-5 text-slate-600" />}
            collapsible={true}
            defaultCollapsed={false}
          >
            <DeepDiveSection />
          </DashboardSection>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* KANIT PAKETİ BUTONU */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setEvidenceModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <span>📋</span>
            Kanıt Paketi Oluştur
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* RIGHT RAIL - COL-SPAN-4 (Sticky Sidebar) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        <RightRail
          kritikSayisi={feedStats.criticalCount}
          yuksekSayisi={feedStats.highCount}
          eksikBelgeSayisi={feedStats.missingDocCount}
          oneriler={feedStats.topRecommendations}
          kanitPaketiDurumu={donemData.tamamlanmaYuzdesi >= 80 ? 'hazir' : donemData.tamamlanmaYuzdesi >= 50 ? 'eksik' : 'bekliyor'}
          kanitPaketiYuzde={donemData.tamamlanmaYuzdesi}
          tamamlananBelgeler={['Mizan', 'KDV Beyanı']}
        />
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        belgeTipi={uploadBelgeTipi}
        onSuccess={handleUploadSuccess}
      />

      {/* 5 Why Wizard */}
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

      {/* Vergi Kontrol Modal */}
      {kontrolModalOpen && selectedKontrol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800 mb-2">{selectedKontrol.baslik}</h2>
            <p className="text-slate-600 mb-6">
              Bu kontrol için gerekli veriler analiz edilecek. Devam etmek istiyor musunuz?
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600">
                <strong>Kontrol ID:</strong> {selectedKontrol.id}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                <strong>Mükellef:</strong> {scope.client_id}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                <strong>Dönem:</strong> {scope.period}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setKontrolModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  console.log('Kontrol başlatılıyor:', selectedKontrol.id);
                  // TODO: Start actual kontrol logic
                  setKontrolModalOpen(false);
                  setSelectedKontrol(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kontrolü Başlat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Bundle Modal */}
      {evidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <EvidenceBundlePanel onClose={() => setEvidenceModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Context Rail - Detail Panel (Sprint 3.3 + 4.0) */}
      <ContextRail
        items={feedItems}
        onAction={(item, actionId) => {
          console.log('Context Rail action:', actionId, item.id);
          // Handle navigate actions
          if (item.actions) {
            const action = item.actions.find(a => a.id === actionId);
            if (action?.kind === 'navigate' && action.href) {
              window.location.href = action.href;
            }
          }
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD SKELETON (Loading state)
// ═══════════════════════════════════════════════════════════════════

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-12 bg-slate-200 rounded-lg" />
      <div className="h-64 bg-slate-200 rounded-lg" />
      <div className="h-32 bg-slate-200 rounded-lg" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXPORT (Suspense wrapper for useSearchParams)
// ═══════════════════════════════════════════════════════════════════

export default function V2DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <V2DashboardContent />
    </Suspense>
  );
}
