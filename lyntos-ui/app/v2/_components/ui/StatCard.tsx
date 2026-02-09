'use client';

/**
 * LYNTOS Stat Card Component - Kaizen Görsel Sistem
 *
 * KPI ve istatistik gösterimi için tutarlı kart bileşeni
 */

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface StatCardProps {
  // Core
  label: string;
  value: string | number;

  // Style
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'sm' | 'md' | 'lg';

  // Icon
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';

  // Trend
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;

  // Extra
  subValue?: string;
  description?: string;

  // Interactive
  onClick?: () => void;
  href?: string;
}

// =============================================================================
// VARIANT STYLES
// =============================================================================

const variantStyles = {
  default: {
    container: 'bg-white border border-[#E5E5E5]',
    icon: 'bg-[#F5F6F8] text-[#5A5A5A]',
    label: 'text-[#969696]',
    value: 'text-[#2E2E2E]',
    trend: { up: 'text-[#00804D]', down: 'text-[#BF192B]', neutral: 'text-[#969696]' },
  },
  primary: {
    container: 'bg-white border border-[#ABEBFF]',
    icon: 'bg-[#E6F9FF] text-[#0049AA]',
    label: 'text-[#0049AA]',
    value: 'text-[#0049AA]',
    trend: { up: 'text-[#00804D]', down: 'text-[#BF192B]', neutral: 'text-[#969696]' },
  },
  success: {
    container: 'bg-[#ECFDF5] border border-[#AAE8B8]',
    icon: 'bg-[#ECFDF5] text-[#00804D]',
    label: 'text-[#00804D]',
    value: 'text-[#00804D]',
    trend: { up: 'text-[#00804D]', down: 'text-[#BF192B]', neutral: 'text-[#969696]' },
  },
  warning: {
    container: 'bg-[#FFFBEB] border border-[#FFF08C]',
    icon: 'bg-[#FFFBEB] text-[#FA841E]',
    label: 'text-[#FA841E]',
    value: 'text-[#FA841E]',
    trend: { up: 'text-[#00804D]', down: 'text-[#BF192B]', neutral: 'text-[#969696]' },
  },
  error: {
    container: 'bg-[#FEF2F2] border border-[#FFC7C9]',
    icon: 'bg-[#FEF2F2] text-[#BF192B]',
    label: 'text-[#BF192B]',
    value: 'text-[#BF192B]',
    trend: { up: 'text-[#00804D]', down: 'text-[#BF192B]', neutral: 'text-[#969696]' },
  },
  gradient: {
    container: 'bg-gradient-to-br from-[#0078D0] to-[#0049AA] text-white border-0',
    icon: 'bg-white/20 text-white',
    label: 'text-white/80',
    value: 'text-white',
    trend: { up: 'text-[#6BDB83]', down: 'text-[#FF9196]', neutral: 'text-white/60' },
  },
};

const sizeStyles = {
  sm: {
    container: 'p-3 rounded-lg',
    icon: 'w-8 h-8 rounded-md',
    iconInner: 'w-4 h-4',
    label: 'text-[10px]',
    value: 'text-xl',
    trend: 'text-[10px]',
  },
  md: {
    container: 'p-4 rounded-xl',
    icon: 'w-10 h-10 rounded-lg',
    iconInner: 'w-5 h-5',
    label: 'text-xs',
    value: 'text-2xl',
    trend: 'text-xs',
  },
  lg: {
    container: 'p-5 rounded-xl',
    icon: 'w-12 h-12 rounded-xl',
    iconInner: 'w-6 h-6',
    label: 'text-sm',
    value: 'text-3xl',
    trend: 'text-sm',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function StatCard({
  label,
  value,
  variant = 'default',
  size = 'md',
  icon: Icon,
  iconPosition = 'right',
  trend,
  trendValue,
  trendLabel,
  subValue,
  description,
  onClick,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const content = (
    <>
      {/* Header with Icon */}
      <div className={`flex items-center ${iconPosition === 'right' ? 'justify-between' : 'gap-3'}`}>
        {/* Label (and icon if left) */}
        <div className={iconPosition === 'left' ? 'flex items-center gap-3' : ''}>
          {iconPosition === 'left' && Icon && (
            <div className={`${sizes.icon} ${styles.icon} flex items-center justify-center`}>
              <Icon className={sizes.iconInner} />
            </div>
          )}
          <div>
            <p className={`${sizes.label} font-medium uppercase tracking-wide ${styles.label}`}>
              {label}
            </p>
            {description && (
              <p className={`${sizes.label} ${styles.label} opacity-70 mt-0.5`}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Icon (if right) */}
        {iconPosition === 'right' && Icon && (
          <div className={`${sizes.icon} ${styles.icon} flex items-center justify-center`}>
            <Icon className={sizes.iconInner} />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-2">
        <div className="flex items-baseline gap-2">
          <p className={`${sizes.value} font-bold ${styles.value}`}>{value}</p>
          {subValue && (
            <span className={`${sizes.label} ${styles.label}`}>{subValue}</span>
          )}
        </div>

        {/* Trend */}
        {trend && trendValue && (
          <div className={`flex items-center gap-1 mt-1 ${sizes.trend} font-medium ${styles.trend[trend]}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{trendValue}</span>
            {trendLabel && <span className="opacity-60">{trendLabel}</span>}
          </div>
        )}
      </div>
    </>
  );

  const containerClasses = `
    ${sizes.container}
    ${styles.container}
    ${onClick ? 'cursor-pointer hover:shadow-md transition-all active:scale-[0.98]' : ''}
  `;

  if (onClick) {
    return (
      <button onClick={onClick} className={`${containerClasses} w-full text-left`}>
        {content}
      </button>
    );
  }

  return <div className={containerClasses}>{content}</div>;
}

// =============================================================================
// STAT CARD GROUP
// =============================================================================

interface StatCardGroupProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export function StatCardGroup({ children, columns = 4 }: StatCardGroupProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-4`}>
      {children}
    </div>
  );
}

export default StatCard;
