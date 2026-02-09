'use client';

/**
 * KpiStrip - Dönem sonu KPI gösterim şeridi
 */

import React from 'react';
import {
  TrendingUp,
  FileSpreadsheet,
  Calculator,
  Shield,
} from 'lucide-react';
import { type KpiStripProps } from '../_types';
import { KpiCard } from './KpiCard';

export function KpiStrip({
  progressPercent,
  completedCount,
  hasData,
  effectiveCompletedSteps,
}: KpiStripProps) {
  return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="İlerleme"
          value={`%${Math.round(progressPercent)}`}
          subValue={`${completedCount} adım tamamlandı`}
          status={completedCount === 4 ? 'success' : completedCount > 0 ? 'warning' : 'neutral'}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KpiCard
          label="Mizan"
          value={hasData ? 'Hazır' : 'Bekliyor'}
          subValue={hasData ? 'Veri yüklendi' : 'Yükleme gerekli'}
          status={hasData ? 'success' : 'neutral'}
          icon={<FileSpreadsheet className="w-5 h-5" />}
        />
        <KpiCard
          label="Yen. Değerleme"
          value={effectiveCompletedSteps.includes(2) ? 'Tamam' : 'Bekliyor'}
          subValue={effectiveCompletedSteps.includes(2) ? 'Değerleme yapıldı' : 'VUK 298/Ç'}
          status={effectiveCompletedSteps.includes(2) ? 'success' : 'neutral'}
          icon={<Calculator className="w-5 h-5" />}
        />
        <KpiCard
          label="Vergi"
          value={effectiveCompletedSteps.includes(3) ? 'Tamam' : 'Bekliyor'}
          subValue={effectiveCompletedSteps.includes(3) ? 'Hesaplandı' : 'Hesaplama gerekli'}
          status={effectiveCompletedSteps.includes(3) ? 'success' : 'neutral'}
          icon={<Shield className="w-5 h-5" />}
        />
      </div>
  );
}
