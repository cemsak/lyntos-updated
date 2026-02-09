'use client';

/**
 * LYNTOS Page Header Component - Kaizen Görsel Sistem
 *
 * Tüm V2 sayfaları için tutarlı header bileşeni
 * Gradient banner, breadcrumb, KPI strip desteği
 */

import React from 'react';
import Link from 'next/link';
import { ChevronRight, LucideIcon } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface KpiItem {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface PageHeaderProps {
  // Core
  title: string;
  description?: string;
  icon?: LucideIcon;

  // Style variant
  variant?: 'default' | 'gradient' | 'compact';
  gradientColors?: string; // Tailwind gradient classes

  // Badge
  badge?: {
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'money';
  };

  // Navigation
  breadcrumbs?: Breadcrumb[];

  // KPI Strip
  kpis?: KpiItem[];

  // Actions
  actions?: React.ReactNode;

  // Extra info (sağ üst köşe)
  extraInfo?: React.ReactNode;
}

// =============================================================================
// BADGE VARIANTS
// =============================================================================

const badgeVariants = {
  default: 'bg-[#F5F6F8] text-[#5A5A5A]',
  success: 'bg-[#ECFDF5] text-[#00804D]',
  warning: 'bg-[#FFFBEB] text-[#FA841E]',
  error: 'bg-[#FEF2F2] text-[#BF192B]',
  money: 'bg-gradient-to-r from-[#FFCE19] to-[#FFB114] text-white',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function PageHeader({
  title,
  description,
  icon: Icon,
  variant = 'default',
  gradientColors = 'from-[#0049AA] to-[#0049AA]',
  badge,
  breadcrumbs,
  kpis,
  actions,
  extraInfo,
}: PageHeaderProps) {
  // Gradient variant
  if (variant === 'gradient') {
    return (
      <div className="space-y-4">
        {/* Breadcrumbs (outside gradient) */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm text-[#969696]">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="w-4 h-4" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-[#5A5A5A] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[#5A5A5A] font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Gradient Banner */}
        <div className={`bg-gradient-to-r ${gradientColors} rounded-2xl p-6 text-white`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {Icon && (
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Icon className="w-7 h-7" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{title}</h1>
                  {badge && (
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${badgeVariants[badge.variant || 'default']}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                {description && (
                  <p className="text-white/80 mt-1">{description}</p>
                )}
              </div>
            </div>

            {/* Extra Info / Actions */}
            <div className="flex items-start gap-4">
              {extraInfo && <div className="text-right">{extraInfo}</div>}
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>

          {/* KPI Strip (inside gradient) */}
          {kpis && kpis.length > 0 && (
            <div className={`grid grid-cols-${Math.min(kpis.length, 4)} gap-4 mt-6`}>
              {kpis.map((kpi, index) => (
                <div key={index} className="bg-white/10 rounded-lg p-3 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-[10px] text-white/70 uppercase tracking-wide">{kpi.label}</p>
                  {kpi.subValue && (
                    <p className="text-xs text-white/60 mt-0.5">{kpi.subValue}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 bg-[#E6F9FF] rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#0049AA]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#2E2E2E]">{title}</h1>
              {badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeVariants[badge.variant || 'default']}`}>
                  {badge.label}
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-[#969696]">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  // Default variant
  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-[#969696]">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[#5A5A5A] transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[#5A5A5A] font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="w-12 h-12 bg-[#E6F9FF] rounded-xl flex items-center justify-center">
              <Icon className="w-6 h-6 text-[#0049AA]" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#2E2E2E]">{title}</h1>
              {badge && (
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${badgeVariants[badge.variant || 'default']}`}>
                  {badge.label}
                </span>
              )}
            </div>
            {description && (
              <p className="text-[#5A5A5A] mt-1">{description}</p>
            )}
          </div>
        </div>

        {/* Extra Info / Actions */}
        <div className="flex items-start gap-4">
          {extraInfo && <div className="text-right">{extraInfo}</div>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {/* KPI Strip (outside, white cards) */}
      {kpis && kpis.length > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(kpis.length, 4)} gap-4`}>
          {kpis.map((kpi, index) => (
            <div key={index} className="bg-white border border-[#E5E5E5] rounded-xl p-4">
              <p className="text-xs text-[#969696] uppercase tracking-wide">{kpi.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-[#2E2E2E]">{kpi.value}</p>
                {kpi.trend && kpi.trendValue && (
                  <span className={`text-xs font-medium ${
                    kpi.trend === 'up' ? 'text-[#00804D]' :
                    kpi.trend === 'down' ? 'text-[#BF192B]' : 'text-[#969696]'
                  }`}>
                    {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'} {kpi.trendValue}
                  </span>
                )}
              </div>
              {kpi.subValue && (
                <p className="text-xs text-[#969696] mt-0.5">{kpi.subValue}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
