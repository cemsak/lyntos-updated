'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCard } from '../shared/StatCard';

interface RiskSummaryWidgetProps {
  kritikCount: number;
  dikkatCount: number;
  tamamCount: number;
  onKritikClick?: () => void;
  onDikkatClick?: () => void;
  onTamamClick?: () => void;
  className?: string;
}

export const RiskSummaryWidget: React.FC<RiskSummaryWidgetProps> = ({
  kritikCount,
  dikkatCount,
  tamamCount,
  onKritikClick,
  onDikkatClick,
  onTamamClick,
  className,
}) => {
  return (
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      <StatCard
        title="Kritik"
        value={kritikCount}
        subtitle="Acil işlem gerekli"
        icon={AlertTriangle}
        riskLevel="KRITIK"
        onClick={onKritikClick}
      />
      <StatCard
        title="Dikkat"
        value={dikkatCount}
        subtitle="Takip edilmeli"
        icon={AlertCircle}
        riskLevel="ORTA"
        onClick={onDikkatClick}
      />
      <StatCard
        title="Tamam"
        value={tamamCount}
        subtitle="Sorun yok"
        icon={CheckCircle2}
        riskLevel="DUSUK"
        onClick={onTamamClick}
      />
    </div>
  );
};

export default RiskSummaryWidget;
