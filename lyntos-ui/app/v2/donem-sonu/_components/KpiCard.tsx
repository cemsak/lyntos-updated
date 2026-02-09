'use client';

/**
 * KpiCard - Dönem sonu KPI gösterim kartı
 */

import { type KpiCardProps } from '../_types';

export function KpiCard({
  label,
  value,
  subValue,
  status = 'neutral',
  icon,
  animate = true,
}: KpiCardProps) {
  const statusConfig = {
    success: {
      bg: 'bg-gradient-to-br from-[#ECFDF5] to-[#ECFDF5]',
      border: 'border-[#AAE8B8]',
      text: 'text-[#00804D]',
      value: 'text-[#00804D]',
      icon: 'text-[#00A651]',
    },
    warning: {
      bg: 'bg-gradient-to-br from-[#FFFBEB] to-[#FFFBEB]',
      border: 'border-[#FFF08C]',
      text: 'text-[#FA841E]',
      value: 'text-[#FA841E]',
      icon: 'text-[#FFB114]',
    },
    error: {
      bg: 'bg-gradient-to-br from-[#FEF2F2] to-[#FEF2F2]',
      border: 'border-[#FFC7C9]',
      text: 'text-[#BF192B]',
      value: 'text-[#BF192B]',
      icon: 'text-[#F0282D]',
    },
    neutral: {
      bg: 'bg-gradient-to-br from-[#F5F6F8] to-[#F5F6F8]',
      border: 'border-[#E5E5E5]',
      text: 'text-[#5A5A5A]',
      value: 'text-[#969696]',
      icon: 'text-[#969696]',
    },
    info: {
      bg: 'bg-gradient-to-br from-[#E6F9FF] to-[#E6F9FF]',
      border: 'border-[#ABEBFF]',
      text: 'text-[#0049AA]',
      value: 'text-[#0049AA]',
      icon: 'text-[#0078D0]',
    },
  };

  const cfg = statusConfig[status];

  return (
    <div
      className={`
        ${cfg.bg} border ${cfg.border} rounded-xl p-4
        transition-all duration-300 hover:shadow-md hover:-translate-y-0.5
        ${animate ? 'animate-slide-up' : ''}
      `}
      style={{ animationDelay: animate ? '0.1s' : '0s' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium uppercase tracking-wide ${cfg.text} truncate`}>
            {label}
          </p>
          <p className={`text-2xl font-bold mt-1 ${cfg.value}`}>{value}</p>
          {subValue && (
            <p className="text-xs text-[#969696] mt-0.5">{subValue}</p>
          )}
        </div>
        {icon && (
          <div className={`${cfg.icon} flex-shrink-0 ml-2`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
