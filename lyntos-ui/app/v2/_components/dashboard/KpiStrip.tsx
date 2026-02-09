'use client';

/**
 * KPI Strip - Dashboard V3
 * Pencere 13.1 - Ana Dashboard Yenileme
 *
 * 4 ana KPI metriği kompakt strip formatında
 */

import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Shield, FileText, Calculator, Activity } from 'lucide-react';

interface KpiItem {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'indigo';
  icon: React.ReactNode;
}

interface KpiStripProps {
  items: KpiItem[];
  compact?: boolean;
}

const colorClasses = {
  emerald: {
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#AAE8B8]',
    text: 'text-[#00804D]',
    value: 'text-[#00804D]',
    icon: 'bg-[#ECFDF5] text-[#00804D]',
  },
  red: {
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FFC7C9]',
    text: 'text-[#BF192B]',
    value: 'text-[#BF192B]',
    icon: 'bg-[#FEF2F2] text-[#BF192B]',
  },
  amber: {
    bg: 'bg-[#FFFBEB]',
    border: 'border-[#FFF08C]',
    text: 'text-[#FA841E]',
    value: 'text-[#FA841E]',
    icon: 'bg-[#FFFBEB] text-[#FA841E]',
  },
  blue: {
    bg: 'bg-[#E6F9FF]',
    border: 'border-[#ABEBFF]',
    text: 'text-[#0049AA]',
    value: 'text-[#0049AA]',
    icon: 'bg-[#E6F9FF] text-[#0049AA]',
  },
  purple: {
    bg: 'bg-[#E6F9FF]',
    border: 'border-[#ABEBFF]',
    text: 'text-[#0049AA]',
    value: 'text-[#0049AA]',
    icon: 'bg-[#E6F9FF] text-[#0049AA]',
  },
  indigo: {
    bg: 'bg-[#E6F9FF]',
    border: 'border-[#ABEBFF]',
    text: 'text-[#0049AA]',
    value: 'text-[#0049AA]',
    icon: 'bg-[#E6F9FF] text-[#0049AA]',
  },
};

export function KpiStrip({ items, compact = false }: KpiStripProps) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
      {items.map((item) => {
        const colors = colorClasses[item.color];
        return (
          <div
            key={item.id}
            className={`${colors.bg} ${colors.border} border rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-lg ${colors.icon} flex items-center justify-center`}>
                {item.icon}
              </div>
              {item.trend && (
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  item.trend === 'up' ? 'text-[#00804D]' :
                  item.trend === 'down' ? 'text-[#BF192B]' :
                  'text-[#969696]'
                }`}>
                  {item.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                  {item.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                  {item.trendValue}
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className={`text-2xl font-bold ${colors.value}`}>{item.value}</p>
              <p className={`text-sm font-medium ${colors.text} mt-0.5`}>{item.label}</p>
              {item.subtext && (
                <p className="text-xs text-[#969696] mt-1">{item.subtext}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Default KPI items for dashboard
export function useDashboardKpis(data: {
  riskSkoru?: number;
  tamamlanmaYuzdesi?: number;
  kritikBulgu?: number;
  bekleyenIslem?: number;
}) {
  const items: KpiItem[] = [
    {
      id: 'risk-skoru',
      label: 'Risk Skoru',
      value: data.riskSkoru ?? 0,
      subtext: 'VDK KURGAN bazlı',
      color: (data.riskSkoru ?? 0) > 70 ? 'red' : (data.riskSkoru ?? 0) > 40 ? 'amber' : 'emerald',
      icon: <Shield className="w-5 h-5" />,
      trend: 'down',
      trendValue: '-5',
    },
    {
      id: 'tamamlanma',
      label: 'Dönem Tamamlanma',
      value: `${data.tamamlanmaYuzdesi ?? 0}%`,
      subtext: 'Belge yükleme durumu',
      color: (data.tamamlanmaYuzdesi ?? 0) >= 80 ? 'emerald' : (data.tamamlanmaYuzdesi ?? 0) >= 50 ? 'amber' : 'red',
      icon: <CheckCircle2 className="w-5 h-5" />,
      trend: 'up',
      trendValue: '+12%',
    },
    {
      id: 'kritik-bulgu',
      label: 'Kritik Bulgu',
      value: data.kritikBulgu ?? 0,
      subtext: 'Acil aksiyon gerektiren',
      color: (data.kritikBulgu ?? 0) > 0 ? 'red' : 'emerald',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: 'bekleyen-islem',
      label: 'Bekleyen İşlem',
      value: data.bekleyenIslem ?? 0,
      subtext: 'Tamamlanacak görevler',
      color: (data.bekleyenIslem ?? 0) > 5 ? 'amber' : 'blue',
      icon: <Activity className="w-5 h-5" />,
    },
  ];

  return items;
}

export default KpiStrip;
