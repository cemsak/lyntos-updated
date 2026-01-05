'use client';

// ════════════════════════════════════════════════════════════════════════════
// KpiStrip - Layer 2: Horizontal strip of 8 KPI cards
// ════════════════════════════════════════════════════════════════════════════

import { KpiCard, KpiTrend } from './KpiCard';
import { BadgeVariant } from '../shared/Badge';

export interface KpiData {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  trend?: KpiTrend;
  trendValue?: string;
  status?: BadgeVariant;
  statusLabel?: string;
  subtitle?: string;
  technicalId?: string;
}

interface KpiStripProps {
  kpis: KpiData[];
  loading?: boolean;
  advancedMode?: boolean;
}

export function KpiStrip({ kpis, loading = false, advancedMode = false }: KpiStripProps) {
  // When loading, show skeleton cards
  if (loading) {
    return (
      <div className="w-full overflow-x-auto pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 min-w-max lg:min-w-0">
          {Array(8).fill(null).map((_, index) => (
            <KpiCard
              key={`skeleton-${index}`}
              label=""
              value=""
              loading={true}
              advancedMode={advancedMode}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 min-w-max lg:min-w-0">
        {kpis.map((kpi, index) => (
          <KpiCard
            key={kpi.id || index}
            label={kpi.label}
            value={kpi.value}
            unit={kpi.unit}
            trend={kpi.trend}
            trendValue={kpi.trendValue}
            status={kpi.status}
            statusLabel={kpi.statusLabel}
            subtitle={kpi.subtitle}
            loading={false}
            advancedMode={advancedMode}
            technicalId={kpi.technicalId}
          />
        ))}
      </div>
    </div>
  );
}

export default KpiStrip;
