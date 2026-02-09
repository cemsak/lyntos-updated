'use client';

/**
 * LYNTOS Skeleton Components - Kaizen Görsel Sistem
 *
 * Loading state için placeholder bileşenleri
 */

import React from 'react';

// =============================================================================
// BASE SKELETON
// =============================================================================

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'rounded';
  animation?: 'pulse' | 'shimmer' | 'none';
}

export function Skeleton({ className = '', variant = 'default', animation = 'pulse' }: SkeletonProps) {
  const variants = {
    default: 'rounded',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
  };

  const animations = {
    pulse: 'animate-pulse',
    shimmer: 'animate-shimmer bg-gradient-to-r from-[#E5E5E5] via-[#F5F6F8] to-[#E5E5E5] bg-[length:200%_100%]',
    none: '',
  };

  return (
    <div
      className={`
        ${animation === 'shimmer' ? '' : 'bg-[#E5E5E5]'}
        ${variants[variant]}
        ${animations[animation]}
        ${className}
      `}
    />
  );
}

// =============================================================================
// SKELETON PRIMITIVES
// =============================================================================

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return <Skeleton variant="circular" className={sizes[size]} />;
}

export function SkeletonButton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };

  return <Skeleton variant="rounded" className={sizes[size]} />;
}

// =============================================================================
// COMPOSITE SKELETONS
// =============================================================================

// Card Skeleton
export function SkeletonCard({ hasIcon = false, hasAction = false }: { hasIcon?: boolean; hasAction?: boolean }) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {hasIcon && <SkeletonAvatar size="md" />}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        {hasAction && <SkeletonButton size="sm" />}
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

// Stat Card Skeleton
export function SkeletonStatCard() {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <SkeletonAvatar size="lg" />
      </div>
    </div>
  );
}

// Table Row Skeleton
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-[#E5E5E5]">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${
            i === 0 ? 'w-8' : i === 1 ? 'w-32' : i === columns - 1 ? 'w-20' : 'w-24'
          }`}
        />
      ))}
    </div>
  );
}

// List Item Skeleton
export function SkeletonListItem({ hasAvatar = true }: { hasAvatar?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      {hasAvatar && <SkeletonAvatar size="md" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

// Page Header Skeleton
export function SkeletonPageHeader({ hasKpis = false }: { hasKpis?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <SkeletonAvatar size="xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      {hasKpis && (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// Dashboard Skeleton (Full page)
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <SkeletonPageHeader hasKpis />

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonCard hasIcon hasAction />
        <SkeletonCard hasIcon hasAction />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#E5E5E5]">
          <Skeleton className="h-6 w-40" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonTableRow key={i} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SHIMMER ANIMATION (add to global CSS or tailwind config)
// =============================================================================

// Add this to your global CSS:
// @keyframes shimmer {
//   0% { background-position: -200% 0; }
//   100% { background-position: 200% 0; }
// }
// .animate-shimmer {
//   animation: shimmer 1.5s infinite;
// }

export default Skeleton;
