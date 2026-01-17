/**
 * LYNTOS Dashboard V3 - Beyaz Tema + Tam Ozellikli
 * V2'deki tum component'leri kullanir, beyaz tema ile
 */

'use client';

import React, { useState } from 'react';
import { AlertCircle, FolderOpen, BarChart3, Calculator, Layers, Radio } from 'lucide-react';

// Scope
import { useDashboardScope, useScopeComplete } from '../_components/scope/useDashboardScope';

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
import { CrossCheckPanel } from '../_components/deepdive/CrossCheckPanel';
import { InflationPanel } from '../_components/deepdive/InflationPanel';

// RegWatch
import { RegWatchPanel } from '../_components/operations/RegWatchPanel';

// Modals
import { UploadModal } from '../_components/modals';
import { FiveWhyWizard } from '../_components/vdk/FiveWhyWizard';

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

  const handleKontrolBaslat = (kontrolId: string) => {
    console.log('Kontrol baslatiliyor:', kontrolId);
  };

  // Scope bekleniyor
  if (!scopeComplete) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Dashboard V3</h2>
            <p className="text-sm text-slate-600 mb-4">
              Lütfen yukarıdaki seçicilerden SMMM, Mükellef ve Dönem seçin.
            </p>
            <Badge variant="info">Kapsam Bekleniyor</Badge>
          </div>
        </Card>
      </div>
    );
  }

  const acilSayisi = aksiyonlar.filter(a => a.oncelik === 'acil').length;

  return (
    <div className="space-y-6">
      {/* Context Bar */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="success">V3 Aktif</Badge>
          <span className="text-sm text-slate-600">
            {scope.smmm_id} / {scope.client_id} / {scope.period}
          </span>
          <Badge variant="info">Beyaz Tema</Badge>
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
            <span className="bg-red-500 text-white text-sm font-bold px-5 py-2 rounded-full shadow-lg animate-pulse">
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

      {/* ROW 2: DONEM VERILERI (11 Belge) */}
      <DashboardSection
        id="donem-verileri-section"
        title="Donem Verileri"
        icon={<FolderOpen className="w-5 h-5 text-green-600" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DonemVerileriPanel onUploadClick={handleUploadClick} />
          <button
            onClick={() => handleUploadClick('MIZAN')}
            className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-6 flex items-center justify-center min-h-[200px] hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer"
          >
            <div className="text-center text-slate-400">
              <span className="text-3xl block mb-2">+</span>
              <p className="text-sm font-medium">Belge yuklemek icin tiklayin</p>
            </div>
          </button>
        </div>
      </DashboardSection>

      {/* ROW 3: KPI STRIP (8 Kart) */}
      <DashboardSection
        id="risk-ozeti-section"
        title="Dönem Özeti"
        icon={<BarChart3 className="w-5 h-5 text-amber-600" />}
      >
        <KpiStrip />
      </DashboardSection>

      {/* ROW 4 & 5: VERGI ANALIZLERI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gecici Vergi - Beyaz Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Geçici Vergi Analizi</h2>
              <p className="text-slate-500 text-sm">{scope.period} - 12 Kritik Kontrol</p>
            </div>
          </div>
          <GeciciVergiPanel donem={scope.period} onKontrolClick={handleKontrolBaslat} />
        </div>

        {/* Kurumlar Vergisi - Beyaz Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Kurumlar Vergisi Analizi</h2>
              <p className="text-slate-500 text-sm">2025 - 20 Kontrol (6+6+8)</p>
            </div>
          </div>
          <KurumlarVergisiPanel yil={2025} onKontrolClick={handleKontrolBaslat} />
        </div>
      </div>

      {/* ROW 6: DETAYLI ANALIZ (3 Kolon) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mizan Analizi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔍</span>
            <h2 className="text-lg font-bold text-slate-800">Mizan Analizi</h2>
          </div>
          <MizanOmurgaPanel />
        </div>

        {/* Mutabakat Matrisi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔗</span>
            <h2 className="text-lg font-bold text-slate-800">Mutabakat Matrisi</h2>
          </div>
          <CrossCheckPanel />
        </div>

        {/* Enflasyon Muhasebesi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📈</span>
            <h2 className="text-lg font-bold text-slate-800">Enflasyon Muhasebesi</h2>
          </div>
          <InflationPanel />
        </div>
      </div>

      {/* ROW 7: REGWATCH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Mevzuat Takibi</h2>
          <span className="text-sm text-slate-500">8 Guvenilir Kaynak</span>
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
