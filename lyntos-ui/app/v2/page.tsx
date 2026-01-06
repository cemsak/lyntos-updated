'use client';
import React, { useState } from 'react';
import { ListTodo, FolderOpen, BarChart3, Radio, Layers, Calculator } from 'lucide-react';
import { useDashboardScope, useScopeComplete } from './_components/scope/useDashboardScope';
import { Card } from './_components/shared/Card';
import { Badge } from './_components/shared/Badge';
import { DashboardSection, scrollToSection } from './_components/layout';

// P0: Bugunku Islerim
import { AksiyonKuyruguPanel, MOCK_AKSIYONLAR } from './_components/operations';
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

// Deep Dive (Uzman Modu)
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
          <Badge variant="success">Scope Hazir</Badge>
          <span className="text-sm text-slate-600">
            {scope.smmm_id} / {scope.client_id} / {scope.period}
          </span>
          <Badge variant="info">V2</Badge>
          {scope.advanced && <Badge variant="warning">Uzman Modu</Badge>}
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 1: BUGUN NE YAPMALIYIM? (P0) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardSection
        id="aksiyonlar-section"
        title="Bugun Ne Yapmaliyim?"
        icon={<ListTodo className="w-5 h-5 text-blue-600" />}
        priority="P0"
      >
        <AksiyonKuyruguPanel
          aksiyonlar={MOCK_AKSIYONLAR}
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
        priority="P0"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DonemVerileriPanel onUploadClick={handleUploadClick} />
          <button
            id="upload-section"
            onClick={() => handleUploadClick('MIZAN')}
            className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-6 flex items-center justify-center min-h-[200px] hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
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
        priority="P1"
      >
        <KpiStrip onRegWatchClick={handleRegWatchClick} />
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 4: VERGI ANALIZI (P1) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardSection
        id="vergi-analizi-section"
        title="Vergi Analizi"
        icon={<Calculator className="w-5 h-5 text-indigo-600" />}
        priority="P1"
      >
        <div className="space-y-6">
          {/* Gecici Vergi - Ceyreklik */}
          <GeciciVergiPanel donem={scope.period} onKontrolClick={handleKontrolBaslat} />

          {/* Kurumlar Vergisi - Yillik */}
          <KurumlarVergisiPanel yil={2024} onKontrolClick={handleKontrolBaslat} />
        </div>
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 5: MEVZUAT TAKIBI (P2) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardSection
        id="regwatch-section"
        title="Mevzuat Takibi"
        icon={<Radio className="w-5 h-5 text-purple-600" />}
        priority="P2"
      >
        <RegWatchPanel />
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOLUM 6: DEEP DIVE - Uzman Modu veya Collapsed */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <DashboardSection
        id="deep-dive-section"
        title="Detayli Analizler"
        icon={<Layers className="w-5 h-5 text-slate-600" />}
        collapsible={true}
        defaultCollapsed={!scope.advanced}
      >
        <DeepDiveSection />
      </DashboardSection>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SPRINT STATUS - Dev only */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {process.env.NODE_ENV === 'development' && (
        <Card title="Sprint Durumu" subtitle="V2 Dashboard gelistirme (DEV only)">
          <div className="space-y-2 text-sm">
            <StatusRow label="Sprint 0: Contract & Scope" status="ok" />
            <StatusRow label="Sprint 1: KPI Strip + ExplainModal" status="ok" />
            <StatusRow label="Sprint 2: Operations Row" status="ok" />
            <StatusRow label="Sprint 3: Deep Dive Panels" status="ok" />
            <StatusRow label="Sprint 5.5: Donem Verileri Panel" status="ok" />
            <StatusRow label="Sprint 5.6: Operations Kaizen" status="ok" />
            <StatusRow label="Sprint 5.7: Dashboard Layout" status="ok" />
            <StatusRow label="Sprint 5.8: Full Functionality + Design" status="ok" />
            <StatusRow label="Sprint 5.9: Vergi Analiz Sistemi" status="ok" />
          </div>
        </Card>
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

function StatusRow({ label, status }: { label: string; status: 'ok' | 'pending' }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-600">{label}</span>
      {status === 'ok' ? (
        <Badge variant="success">Tamamlandi</Badge>
      ) : (
        <Badge variant="default">Bekliyor</Badge>
      )}
    </div>
  );
}
