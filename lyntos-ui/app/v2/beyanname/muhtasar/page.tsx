'use client';

/**
 * Muhtasar Beyanname Risk Kontrol Sayfası (Thin Wrapper)
 *
 * Uses the shared MuhtasarRiskPanel component with scope from useDashboardScope.
 */

import { RefreshCw } from 'lucide-react';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { MuhtasarRiskPanel } from '../../_components/beyanname/MuhtasarRiskPanel';
import { ScopeGuide } from '../../_components/shared/ScopeGuide';

export default function MuhtasarRiskKontrolPage() {
  const { scope, isReady } = useDashboardScope();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin" />
      </div>
    );
  }

  if (!scope.client_id || !scope.period) {
    return (
      <div className="min-h-screen bg-[#F5F6F8]">
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Muhtasar Risk Kontrol</h1>
        </div>
        <div className="p-6">
          <ScopeGuide variant="banner" description="Muhtasar beyanname analizi için üstteki menülerden bir mükellef ve dönem seçin." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] p-6">
      <MuhtasarRiskPanel clientId={scope.client_id} periodId={scope.period} />
    </div>
  );
}
