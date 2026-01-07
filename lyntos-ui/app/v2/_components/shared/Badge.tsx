import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-lyntos-bg-elevated text-lyntos-text-secondary',
  success: 'bg-lyntos-success-bg text-lyntos-success-light',
  warning: 'bg-lyntos-warning-bg text-lyntos-warning-light',
  error: 'bg-lyntos-risk-bg text-lyntos-risk-light',
  info: 'bg-lyntos-info-bg text-lyntos-info-light',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
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
    low: { v: 'warning', l: 'Düşük Güven' },
    med: { v: 'info', l: 'Orta Güven' },
    high: { v: 'success', l: 'Yüksek Güven' },
  };
  return <Badge variant={cfg[trust].v}>{cfg[trust].l}</Badge>;
}
