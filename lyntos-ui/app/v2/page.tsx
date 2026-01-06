'use client';
import React from 'react';
import { useDashboardScope, useScopeComplete } from './_components/scope/useDashboardScope';
import { Card } from './_components/shared/Card';
import { Badge } from './_components/shared/Badge';
import { KpiStrip } from './_components/kpi/KpiStrip';
import { OperationsRow } from './_components/operations/OperationsRow';
import { DonemVerileriPanel } from './_components/donem-verileri';
import { DeepDiveSection } from './_components/deepdive/DeepDiveSection';

export default function V2DashboardPage() {
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

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
    <div className="space-y-6">
      {/* Status Banner */}
      <Card>
        <div className="flex items-center gap-4">
          <Badge variant="success">Scope Hazir</Badge>
          <span className="text-sm text-slate-600">
            {scope.smmm_id} / {scope.client_id} / {scope.period}
          </span>
          <Badge variant="info">V2</Badge>
          {scope.advanced && <Badge variant="warning">Uzman Modu</Badge>}
        </div>
      </Card>

      {/* Layer 2: KPI Strip - NOW WITH REAL DATA */}
      <KpiStrip />

      {/* Layer 3: Operations Row */}
      <OperationsRow />

      {/* Layer 3.5: Donem Verileri - Period Documents */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Donem Verileri</h2>
        <div className="grid grid-cols-2 gap-4">
          <DonemVerileriPanel />
          <div id="upload-section" className="bg-white border border-dashed border-slate-300 rounded-lg p-6 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <span className="text-2xl block mb-2">+</span>
              <p className="text-sm">Belge yuklemek icin tiklayin veya surukleyin</p>
            </div>
          </div>
        </div>
      </section>

      {/* Layer 4: Deep Dive Panels */}
      <DeepDiveSection />

      {/* Sprint Status - Dev only */}
      {process.env.NODE_ENV === 'development' && (
        <Card title="Sprint Durumu" subtitle="V2 Dashboard gelistirme (DEV only)">
          <div className="space-y-2 text-sm">
            <StatusRow label="Sprint 0: Contract & Scope" status="ok" />
            <StatusRow label="Sprint 1: KPI Strip + ExplainModal" status="ok" />
            <StatusRow label="Sprint 2: Operations Row" status="ok" />
            <StatusRow label="Sprint 3: Deep Dive Panels" status="ok" />
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
