'use client';
import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const STYLES: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STYLES[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const map: Record<string, BadgeVariant> = {
    'Dusuk': 'success',
    'Orta': 'warning',
    'Yuksek': 'error',
    'Kritik': 'error',
  };
  return <Badge variant={map[level] || 'default'}>{level}</Badge>;
}

export function TrustBadge({ trust }: { trust: 'low' | 'med' | 'high' }) {
  const cfg: Record<typeof trust, { v: BadgeVariant; l: string }> = {
    low: { v: 'warning', l: 'Dusuk Guven' },
    med: { v: 'info', l: 'Orta Guven' },
    high: { v: 'success', l: 'Yuksek Guven' },
  };
  return <Badge variant={cfg[trust].v}>{cfg[trust].l}</Badge>;
}
