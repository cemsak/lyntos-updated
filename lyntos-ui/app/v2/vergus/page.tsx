'use client';

/**
 * VERGUS Tax Strategist Page
 * Sprint 9.0 - LYNTOS V2
 *
 * Tax optimization analysis and recommendations page.
 */

import React from 'react';
import { AlertCircle, Building2 } from 'lucide-react';
import { VergusStrategistPanel } from '../_components/vergus-strategist';
import { useLayoutContext } from '../_components/layout/useLayoutContext';

export default function VergusPage() {
  const { selectedClient, selectedPeriod } = useLayoutContext();

  // Mükellef seçimi zorunlu
  if (!selectedClient || !selectedPeriod) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Mükellef Seçilmedi</h3>
          <p className="text-slate-600 text-center max-w-md mb-6">
            Vergi stratejisti analizini görüntülemek için lütfen önce mükellef ve dönem seçin.
          </p>
          <a
            href="/v2/clients"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            Mükellef Seç
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <VergusStrategistPanel
        clientId={selectedClient.id}
        clientName={selectedClient.name}
        period={selectedPeriod.id}
      />
    </div>
  );
}
