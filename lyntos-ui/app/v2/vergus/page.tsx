'use client';

/**
 * VERGUS Tax Strategist Page
 * Sprint 9.0 - LYNTOS V2
 *
 * Tax optimization analysis and recommendations page.
 */

import React from 'react';
import { VergusStrategistPanel } from '../_components/vergus-strategist';
import { useLayoutContext } from '../_components/layout/useLayoutContext';

export default function VergusPage() {
  const { selectedClient, selectedPeriod } = useLayoutContext();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <VergusStrategistPanel
        clientId={selectedClient?.id || 'OZKAN_KIRTASIYE'}
        clientName={selectedClient?.name || 'Ozkan Kirtasiye'}
        period={selectedPeriod?.id || '2024'}
      />
    </div>
  );
}
