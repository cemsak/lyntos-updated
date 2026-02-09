'use client';

import React from 'react';
import { StatCard } from '../../_components/shared/StatCard';
import { CheckCircle2, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import type { CrossCheckSummaryRaw } from '../_types/crossCheck';

interface OzetKartlariProps {
  summary: CrossCheckSummaryRaw | null;
}

export function OzetKartlari({ summary }: OzetKartlariProps) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Toplam Kontrol"
        value={summary.total_checks}
        subtitle={`%${summary.completion_percent.toFixed(0)} tamamlandi`}
        icon={BarChart3}
      />
      <StatCard
        title="Basarili"
        value={summary.passed}
        subtitle="Eslesme var"
        icon={CheckCircle2}
        riskLevel="DUSUK"
      />
      <StatCard
        title="Basarisiz"
        value={summary.failed}
        subtitle="Fark tespit edildi"
        icon={XCircle}
        riskLevel={summary.failed > 0 ? 'YUKSEK' : 'DUSUK'}
      />
      <StatCard
        title="Kritik"
        value={summary.critical_issues + summary.high_issues}
        subtitle="Acil inceleme gerekli"
        icon={AlertTriangle}
        riskLevel={summary.critical_issues > 0 ? 'KRITIK' : summary.high_issues > 0 ? 'YUKSEK' : 'DUSUK'}
      />
    </div>
  );
}
