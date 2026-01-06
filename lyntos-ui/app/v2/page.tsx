'use client';
import React from 'react';
import { ListTodo, FolderOpen, BarChart3, Radio, Layers } from 'lucide-react';
import { useDashboardScope, useScopeComplete } from './_components/scope/useDashboardScope';
import { Card } from './_components/shared/Card';
import { Badge } from './_components/shared/Badge';
import { DashboardSection, scrollToSection } from './_components/layout';

// P0: Bugunku Islerim
import { AksiyonKuyruguPanel, MOCK_AKSIYONLAR } from './_components/operations';
import type { AksiyonItem } from './_components/operations';

// P0: Donem Verileri
import { DonemVerileriPanel } from './_components/donem-verileri';

// P1: Risk Ozeti (KPI Strip)
import { KpiStrip } from './_components/kpi/KpiStrip';

// P2: Mevzuat Takibi
import { RegWatchPanel } from './_components/operations/RegWatchPanel';

// Deep Dive (Uzman Modu)
import { DeepDiveSection } from './_components/deepdive/DeepDiveSection';

export default function V2DashboardPage() {
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  // Handlers
  const handleAksiyonClick = (aksiyon: AksiyonItem) => {
    console.log('Aksiyon:', aksiyon.aksiyonUrl);
    // TODO: Router navigation
  };

  const handleProblemCozmeClick = (aksiyon: AksiyonItem) => {
    console.log('Problem cozme:', aksiyon.id);
    // TODO: Open 5 Why modal
  };

  const handleRegWatchClick = () => {
    scrollToSection('regwatch-section');
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
          onAksiyonClick={handleAksiyonClick}
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
          <DonemVerileriPanel />
          <div id="upload-section" className="bg-white border border-dashed border-slate-300 rounded-lg p-6 flex items-center justify-center min-h-[200px]">
            <div className="text-center text-slate-400">
              <span className="text-2xl block mb-2">+</span>
              <p className="text-sm">Belge yuklemek icin tiklayin veya surukleyin</p>
            </div>
          </div>
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
      {/* BOLUM 4: MEVZUAT TAKIBI (P2) */}
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
      {/* BOLUM 5: DEEP DIVE - Uzman Modu veya Collapsed */}
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
          </div>
        </Card>
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
