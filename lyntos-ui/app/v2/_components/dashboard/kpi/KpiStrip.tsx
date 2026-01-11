/**
 * KpiStrip - 8 KPI cards in a responsive grid
 * Uses PanelEnvelope for data handling
 */

'use client';

import React from 'react';
import type { PanelEnvelope, KpiStripData, KpiData } from '../types';
import { PanelState, KpiCardSkeleton } from '../shared/PanelState';
import { KpiCard } from './KpiCard';

interface KpiStripProps {
  envelope: PanelEnvelope<KpiStripData>;
  onKpiClick?: (kpi: KpiData) => void;
  onInfoClick?: (kpi: KpiData) => void;
}

export function KpiStrip({ envelope, onKpiClick, onInfoClick }: KpiStripProps) {
  // Custom loading skeleton for KPI grid
  const loadingSkeleton = (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );

  return (
    <div className="w-full">
      <PanelState
        envelope={envelope}
        loadingSkeleton={loadingSkeleton}
        minHeight="120px"
      >
        {(data) => (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {data.kpis.map((kpi) => (
              <KpiCard
                key={kpi.id}
                data={kpi}
                onClick={onKpiClick ? () => onKpiClick(kpi) : undefined}
                onInfoClick={onInfoClick ? () => onInfoClick(kpi) : undefined}
              />
            ))}
          </div>
        )}
      </PanelState>
    </div>
  );
}

export default KpiStrip;
