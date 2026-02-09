'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LYNTOS KOKPİT - AWARD-WINNING DASHBOARD UI
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * iF Design + Red Dot + Webby + D&AD Ödül Kalitesinde UI/UX
 * Glassmorphism + Micro-interactions + Premium Animations
 *
 * SMMM/YMM için tam teşekküllü mali analiz ve risk yönetimi platformu
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, Suspense, useEffect, useRef, useMemo } from 'react';
import {
  FolderOpen,
  Layers,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { ScopeGuide } from './_components/shared/ScopeGuide';
import { ConnectionError } from './_components/shared/ConnectionError';
import { useDashboardScope, useScopeComplete } from './_components/scope/useDashboardScope';
// scrollToSection kaldırıldı - regwatch-section silindi
import { DonemDurumuKanitPaketiPanel } from './_components/layout/DonemDurumuKanitPaketiPanel';

// P0: Bugünkü İşlerim
import { useAksiyonlar } from './_components/operations';
import type { AksiyonItem } from './_components/operations';

// P0: Dönem Verileri
import { DonemVerileriPanel, useDonemVerileriV2 } from './_components/donem-verileri';
import type { BelgeTipi } from './_components/donem-verileri/types';

// Risk Score Hook
import { useDonemVdkRisks } from './_hooks/useDonemData';

// Store - dönem değişikliği kontrolü için
import { useDonemStore } from './_lib/stores/donemStore';

// Upload Modal
import { UploadModal } from './_components/modals';

// SmmmRiskOzetiPanel, SirketUyumDurumuPanel kaldırıldı (Madde 7, 8)

// Detaylı İnceleme (Uzman Modu)
import { DeepDiveSection } from './_components/deepdive/DeepDiveSection';

// Detaylı Paneller - Kokpit için (Madde 6)
import { MizanOmurgaPanel } from './_components/deepdive/MizanOmurgaPanel';
import { CrossCheckPanel } from './_components/deepdive/CrossCheckPanel';

// 5 Why Wizard
import { FiveWhyWizard } from './_components/vdk/FiveWhyWizard';

// Evidence Bundle
import { EvidenceBundlePanel } from './_components/evidence';

// Summary panelleri kaldırıldı - Detaylı paneller kullanılıyor (Madde 6)

// Dashboard V3 Components - Pencere 13 (KpiStrip ve QuickActions kaldırıldı)
import { NotificationCenter, KontrolModal } from './_components/dashboard';

// Kokpit Premium Panelleri - KpiStrip yerine
import { KokpitSektorPanel, KokpitKontrolPanel } from './_components/kokpit';
import { useVdkFullAnalysis } from './_hooks/useVdkFullAnalysis';

// Feed - ContextRail hala kullanılıyor (modal için)
import {
  useUrlSync,
  useResetFeedSelection,
  ContextRail,
  filterByStatus,
  useFeedStore,
} from './_components/feed';

// Backend Feed Hook (Sprint 4 - Real API data)
import { useBackendFeed } from './_hooks/useBackendFeed';
// Link kaldırıldı - Tax kartları silindi

// =============================================================================
// FAZA 1 TEMİZLİK: AnimatedStatCard, QuickActionCard, FeedItemCard KALDIRILDI
// Sebep: Hero'daki bilgilerle tekrar + Sol menü tekrarı + SMMM workflow'una uygun değil
// =============================================================================

// =============================================================================
// MAIN DASHBOARD CONTENT
// =============================================================================

function V2DashboardContent() {
  // === ALL HOOKS AT TOP ===
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();
  const { data: donemData, refetch: refetchDonemData } = useDonemVerileriV2();
  const { aksiyonlar } = useAksiyonlar();

  // Risk score from backend
  const { riskScore: backendRiskScore } = useDonemVdkRisks();

  // Dönem store - dönem değişikliği kontrolü için
  const storedMeta = useDonemStore(s => s.meta);

  useUrlSync();
  const resetFeedSelection = useResetFeedSelection();
  const prevScopeRef = useRef<string | null>(null);

  // Dönem değiştiğinde store'u resetle
  useEffect(() => {
    const currentScopeKey = `${scope.client_id}:${scope.period}`;
    if (prevScopeRef.current === null) {
      prevScopeRef.current = currentScopeKey;
      return;
    }
    if (prevScopeRef.current !== currentScopeKey) {
      resetFeedSelection();

      prevScopeRef.current = currentScopeKey;
    }
  }, [scope.client_id, scope.period, resetFeedSelection, storedMeta?.period]);

  // Feed data
  const resolvedIds = useFeedStore((s) => s.resolvedIds);
  const snoozedIds = useFeedStore((s) => s.snoozedIds);

  const {
    items: backendFeedItems,
    loading: feedLoading,
    error: feedError,
    stats: backendFeedStats,
    refetch: refetchFeed,
  } = useBackendFeed({
    smmm_id: scope.smmm_id || '',
    client_id: scope.client_id || '',
    period: scope.period || '',
    enabled: scopeComplete,
  });

  const feedItems = useMemo(() => {
    return filterByStatus(backendFeedItems, resolvedIds, snoozedIds);
  }, [backendFeedItems, resolvedIds, snoozedIds]);

  const feedStats = useMemo(() => ({
    criticalCount: backendFeedStats.critical,
    highCount: backendFeedStats.high,
    missingDocCount: feedItems.filter(i => i.category === 'Belge').length,
    topRecommendations: feedItems.slice(0, 3).map(i => i.title),
  }), [backendFeedStats, feedItems]);

  // === STATE ===
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadBelgeTipi, setUploadBelgeTipi] = useState<BelgeTipi | null>(null);
  const [uploadToast, setUploadToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [fiveWhyOpen, setFiveWhyOpen] = useState(false);
  const [selectedAksiyon, setSelectedAksiyon] = useState<AksiyonItem | null>(null);
  const [kontrolModalOpen, setKontrolModalOpen] = useState(false);
  const [selectedKontrol, setSelectedKontrol] = useState<{ id: string; baslik: string } | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // VDK Full Analysis - Sektör, TCMB, Risk verileri
  const {
    data: vdkData,
    isLoading: vdkLoading,
  } = useVdkFullAnalysis(scope.client_id || null, scope.period || null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handlers
  const handleUploadClick = (belgeTipi: BelgeTipi) => {
    setUploadBelgeTipi(belgeTipi);
    setUploadModalOpen(true);
  };

  const handleUploadSuccess = (belgeTipi: BelgeTipi) => {
    // Upload sonrası backend'den güncel veriyi çek
    refetchDonemData();
    // Toast göster
    setUploadToast({ show: true, message: `${belgeTipi} başarıyla yüklendi!` });
    setTimeout(() => setUploadToast({ show: false, message: '' }), 4000);
  };

  // FiveWhy handlers - şu an kullanılmıyor ama modal için gerekli olabilir
  const handleFiveWhyComplete = () => {
    setFiveWhyOpen(false);
    setSelectedAksiyon(null);
  };

  if (!mounted) return null;

  // === SCOPE LOADING STATE ===
  if (!scopeComplete) {
    return (
      <div className="space-y-6">
        <ScopeGuide variant="hero" description="Lütfen üstteki menülerden mükellef ve dönem seçin." />
      </div>
    );
  }

  // === FEED LOADING STATE ===
  if (feedLoading) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F5F6F8] to-[#F5F6F8] p-8 text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#0049AA] to-[#0078D0] flex items-center justify-center shadow-xl mb-6 animate-pulse">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-[#2E2E2E] mb-2">Veriler Yükleniyor</h2>
          <p className="text-[#969696]">{scope.client_id} - {scope.period} verileri analiz ediliyor...</p>
        </div>
      </div>
    );
  }

  // === FEED ERROR STATE ===
  if (feedError) {
    return (
      <div className="space-y-6">
        <ConnectionError variant="banner" context="Dashboard verileri" onRetry={refetchFeed} />
      </div>
    );
  }

  // === MAIN DASHBOARD ===
  return (
    <div className="space-y-6 pb-8">
      {/* ═══════════════════════════════════════════════════════════════════════
          SEKTÖR + TCMB GÖSTERGELER PANELİ
          VDK Risk sayfasından taşındı - Premium UI
          ═══════════════════════════════════════════════════════════════════════ */}
      <KokpitSektorPanel
        sektorBilgisi={vdkData?.sektor_bilgisi}
        tcmbVerileri={vdkData?.tcmb_verileri}
        isLoading={vdkLoading}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          ANA KONTROL PANELİ
          Risk Skoru + İnceleme Riski + Bugün Yapılacaklar
          ═══════════════════════════════════════════════════════════════════════ */}
      <KokpitKontrolPanel
        score={vdkData?.kurgan_risk?.score || 0}
        riskLevel={vdkData?.kurgan_risk?.risk_level || 'Hesaplanıyor'}
        riskSummary={vdkData?.risk_summary}
        urgentActions={vdkData?.urgent_actions}
        isLoading={vdkLoading}
        noData={vdkData?.status === 'no_data'}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT - SMMM/YMM "Koruyucu Melek" Layout
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
          {/* Dönem Verileri */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A651] to-[#00A651] flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#2E2E2E]">Dönem Verileri</h3>
                  <p className="text-sm text-[#969696]">Yüklenen belgeler ve durumları</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <DonemVerileriPanel onUploadClick={handleUploadClick} />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              DETAYLI ANALİZ PANELLERİ (Madde 6)
              3'lü özet grid kaldırıldı - Detaylı paneller geri getirildi
              SMMM/YMM için aksiyonabilir, kapsamlı görünümler
              ═══════════════════════════════════════════════════════════════════════ */}
          <MizanOmurgaPanel />
          <CrossCheckPanel />

          {/* SmmmRiskOzetiPanel kaldırıldı - KpiStrip ile tekrar + YasalSureler bug (Madde 7) */}

          {/* SirketUyumDurumuPanel kokpitten kaldırıldı - /v2/corporate'a taşındı (Madde 8) */}

          {/* Uzman Modu - Deep Dive */}
          {scope.advanced && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#FFFBEB] to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB114] to-[#FFB114] flex items-center justify-center">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2E2E2E]">Detaylı İnceleme (Uzman Modu)</h3>
                    <p className="text-sm text-[#969696]">İleri düzey analiz araçları</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <DeepDiveSection />
              </div>
            </div>
          )}

          {/* Dönem Durumu ve Kanıt Paketi - Birleşik Panel */}
          <DonemDurumuKanitPaketiPanel
            onUploadClick={handleUploadClick}
            onEvidenceClick={() => setEvidenceModalOpen(true)}
          />
      </div>

      {/* === MODALS === */}
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

      {/* Kontrol Modal - Extracted to separate component */}
      <KontrolModal
        isOpen={kontrolModalOpen && !!selectedKontrol}
        onClose={() => {
          setKontrolModalOpen(false);
          setSelectedKontrol(null);
        }}
        kontrolId={selectedKontrol?.id || ''}
        kontrolBaslik={selectedKontrol?.baslik || ''}
        clientId={scope.client_id}
        period={scope.period}
      />

      {evidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <EvidenceBundlePanel onClose={() => setEvidenceModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Notification Center - Pencere 13.3 */}
      <NotificationCenter
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />

      {/* Upload Success Toast */}
      {uploadToast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-gradient-to-r from-[#00A651] to-[#00A651] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-medium">{uploadToast.message}</span>
          </div>
        </div>
      )}

      <ContextRail
        items={feedItems}
        onAction={(item, actionId) => {
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

// =============================================================================
// SKELETON
// =============================================================================

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-48 bg-[#E5E5E5] rounded-3xl" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-[#E5E5E5] rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-[#E5E5E5] rounded-2xl" />
    </div>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export default function V2DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <V2DashboardContent />
    </Suspense>
  );
}
