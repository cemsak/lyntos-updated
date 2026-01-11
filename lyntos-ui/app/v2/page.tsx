'use client';
import React, { useState } from 'react';
import { ListTodo, FolderOpen, BarChart3, Radio, Layers, Calculator, AlertCircle } from 'lucide-react';
import { useDashboardScope, useScopeComplete } from './_components/scope/useDashboardScope';
import { Card } from './_components/shared/Card';
import { Badge } from './_components/shared/Badge';
import { DashboardSection, scrollToSection } from './_components/layout';

// P0: Bugunku Islerim
import { AksiyonKuyruguPanel, useAksiyonlar } from './_components/operations';
import type { AksiyonItem } from './_components/operations';

// P0: Donem Verileri
import { DonemVerileriPanel, useDonemVerileri } from './_components/donem-verileri';
import type { BelgeTipi } from './_components/donem-verileri/types';

// Upload Modal
import { UploadModal } from './_components/modals';

// P1: Risk Ozeti (KPI Strip)
import { KpiStrip } from './_components/kpi/KpiStrip';

// P2: Mevzuat Takibi
import { RegWatchPanel } from './_components/operations/RegWatchPanel';

// Deep Dive (Uzman Modu) - V3: Individual panels for 3-column layout
import { MizanOmurgaPanel } from './_components/deepdive/MizanOmurgaPanel';
import { CrossCheckPanel } from './_components/deepdive/CrossCheckPanel';
import { InflationPanel } from './_components/deepdive/InflationPanel';
import { DeepDiveSection } from './_components/deepdive/DeepDiveSection';

// P1: Vergi Analizi
import { GeciciVergiPanel, KurumlarVergisiPanel } from './_components/vergi-analiz';

// 5 Why Wizard
import { FiveWhyWizard } from './_components/vdk/FiveWhyWizard';

export default function V2DashboardPage() {
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadBelgeTipi, setUploadBelgeTipi] = useState<BelgeTipi | null>(null);

  // 5 Why Wizard State
  const [fiveWhyOpen, setFiveWhyOpen] = useState(false);
  const [selectedAksiyon, setSelectedAksiyon] = useState<AksiyonItem | null>(null);

  // Vergi Kontrol Modal State
  const [kontrolModalOpen, setKontrolModalOpen] = useState(false);
  const [selectedKontrol, setSelectedKontrol] = useState<{ id: string; baslik: string } | null>(null);

  // Donem Verileri Hook
  const { markAsUploaded } = useDonemVerileri();

  // Aksiyonlar Hook - Real API data with fail-soft fallback
  const { aksiyonlar, loading: aksiyonlarLoading } = useAksiyonlar();

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

  const handleKontrolBaslat = (kontrolId: string) => {
    const isGeciciVergi = kontrolId.startsWith('GV-');
    const kontrolBaslik = isGeciciVergi
      ? `Gecici Vergi Kontrolu: ${kontrolId}`
      : `Kurumlar Vergisi Kontrolu: ${kontrolId}`;
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
              Lutfen yukaridaki secicilerden SMMM, Mukellef ve Donem secin.
            </p>
            <Badge variant="info">Scope Bekleniyor</Badge>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONTEXT BAR */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="success">Donem Kapsami Hazir</Badge>
          <span className="text-sm text-slate-600">
            {scope.smmm_id} / {scope.client_id} / {scope.period}
          </span>
          {scope.advanced && <Badge variant="warning">Uzman Modu</Badge>}
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 1: BUGUN NE YAPMALIYIM? (P0) - V3 Urgent Gradient Style */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardSection
        id="aksiyonlar-section"
        title="Bugun Ne Yapmaliyim?"
        icon={<AlertCircle className="w-6 h-6 text-amber-600" />}
        variant="urgent"
        badge={
          aksiyonlar.filter(a => a.oncelik === 'acil').length > 0 && (
            <span className="bg-red-100 text-red-700 text-sm font-semibold px-4 py-1.5 rounded-full">
              {aksiyonlar.filter(a => a.oncelik === 'acil').length} Acil İş
            </span>
          )
        }
      >
        <AksiyonKuyruguPanel
          aksiyonlar={aksiyonlar}
          onProblemCozmeClick={handleProblemCozmeClick}
        />
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 2: DONEM VERILERI (P0) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardSection
        id="donem-verileri-section"
        title="Donem Verileri"
        icon={<FolderOpen className="w-5 h-5 text-green-600" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
          <DonemVerileriPanel onUploadClick={handleUploadClick} />
          <button
            id="upload-section"
            onClick={() => handleUploadClick('MIZAN')}
            className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-6 flex items-center justify-center min-h-[120px] hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
          >
            <div className="text-center text-slate-400">
              <span className="text-3xl block mb-2">+</span>
              <p className="text-sm font-medium">Belge yuklemek icin tiklayin</p>
              <p className="text-xs mt-1">veya surukleyin</p>
            </div>
          </button>
        </div>
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 3: RISK OZETI - KPI Strip (P1) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardSection
        id="risk-ozeti-section"
        title="Risk Ozeti"
        icon={<BarChart3 className="w-5 h-5 text-amber-600" />}
      >
        <KpiStrip onRegWatchClick={handleRegWatchClick} />
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 4: VERGI ANALIZI (P1) - White Card Style */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        {/* Gecici Vergi - White Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Gecici Vergi Analizi</h2>
                <p className="text-slate-500 text-sm">{scope.period} - 12 Kritik Kontrol</p>
              </div>
            </div>
          </div>
          <GeciciVergiPanel donem={scope.period} onKontrolClick={handleKontrolBaslat} />
        </div>

        {/* Kurumlar Vergisi - Already has dark header, keep as is */}
        <KurumlarVergisiPanel yil={2024} onKontrolClick={handleKontrolBaslat} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 5: V3 3-COLUMN BOTTOM LAYOUT */}
      {/* Detayli Analiz | Enflasyon | Mevzuat Takibi */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="bottom-section">
        {/* Column 1: Detayli Analiz */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[320px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>🔍</span> Detaylı Analiz
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <MizanOmurgaPanel />
            <CrossCheckPanel />
          </div>
        </div>

        {/* Column 2: Enflasyon Muhasebesi */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[320px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📈</span> Enflasyon Muhasebesi
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <InflationPanel />
          </div>
        </div>

        {/* Column 3: Mevzuat Takibi */}
        <div id="regwatch-section" className="bg-white rounded-xl border border-slate-200 shadow-sm h-[320px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📡</span> Mevzuat Takibi
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <RegWatchPanel />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 6: DEEP DIVE - Uzman Modu (Full panels when advanced mode) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {scope.advanced && (
        <DashboardSection
          id="deep-dive-section"
          title="Tüm Detaylı Analizler"
          icon={<Layers className="w-5 h-5 text-slate-600" />}
          collapsible={true}
          defaultCollapsed={false}
        >
          <DeepDiveSection />
        </DashboardSection>
      )}

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
              Bu kontrol icin gerekli veriler analiz edilecek. Devam etmek istiyor musunuz?
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600">
                <strong>Kontrol ID:</strong> {selectedKontrol.id}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                <strong>Mukellef:</strong> {scope.client_id}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                <strong>Donem:</strong> {scope.period}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setKontrolModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={() => {
                  console.log('Kontrol baslatiliyor:', selectedKontrol.id);
                  // TODO: Start actual kontrol logic
                  setKontrolModalOpen(false);
                  setSelectedKontrol(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kontrolu Baslat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
