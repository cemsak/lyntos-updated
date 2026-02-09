import React from 'react';

/**
 * Badge - Kaizen Görsel Sistem v2
 *
 * Durum göstergeleri, etiketler ve bildirimler için
 */

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'money';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
type BadgeStyle = 'solid' | 'outline' | 'soft' | 'gradient';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: BadgeStyle;
  icon?: React.ReactNode;
  dot?: boolean; // Pulsing dot indicator
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

// Soft style - hafif arka plan, koyu metin (Kartela Uyumlu)
const softVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#F5F6F8] text-[#5A5A5A]',
  success: 'bg-[#ECFDF5] text-[#00804D] border border-[#6BDB83]',
  warning: 'bg-[#FFFBEB] text-[#E67324] border border-[#FFE045]',
  error: 'bg-[#FEF2F2] text-[#BF192B] border border-[#FF9196]',
  info: 'bg-[#E6F9FF] text-[#0049AA] border border-[#ABEBFF]',
  purple: 'bg-[#E6F9FF] text-[#0049AA] border border-[#ABEBFF]', // Map purple to blue
  money: 'bg-[#ECFDF5] text-[#00804D] border border-[#6BDB83]',
};

// Solid style - dolu arka plan (Kartela Uyumlu)
const solidVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#5A5A5A] text-white',
  success: 'bg-[#00A651] text-white',
  warning: 'bg-[#FFB114] text-[#2E2E2E]', // Dark text on yellow
  error: 'bg-[#F0282D] text-white',
  info: 'bg-[#0078D0] text-white',
  purple: 'bg-[#0049AA] text-white',
  money: 'bg-gradient-to-r from-[#00A651] to-[#00CB50] text-white',
};

// Outline style - sadece çerçeve (Kartela Uyumlu)
const outlineVariantClasses: Record<BadgeVariant, string> = {
  default: 'border border-[#B4B4B4] text-[#5A5A5A] bg-transparent',
  success: 'border border-[#00A651] text-[#00804D] bg-transparent',
  warning: 'border border-[#FFB114] text-[#E67324] bg-transparent',
  error: 'border border-[#F0282D] text-[#BF192B] bg-transparent',
  info: 'border border-[#0078D0] text-[#0049AA] bg-transparent',
  purple: 'border border-[#0049AA] text-[#0049AA] bg-transparent',
  money: 'border border-[#00A651] text-[#00804D] bg-transparent',
};

// Gradient style - gradyan arka plan (Kartela Uyumlu)
const gradientVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gradient-to-r from-[#5A5A5A] to-[#969696] text-white',
  success: 'bg-gradient-to-r from-[#00A651] to-[#00CB50] text-white',
  warning: 'bg-gradient-to-r from-[#FFB114] to-[#FA841E] text-[#2E2E2E]',
  error: 'bg-gradient-to-r from-[#F0282D] to-[#BF192B] text-white',
  info: 'bg-gradient-to-r from-[#0078D0] to-[#0049AA] text-white',
  purple: 'bg-gradient-to-r from-[#0049AA] to-[#00287F] text-white',
  money: 'bg-gradient-to-r from-[#00A651] via-[#00CB50] to-[#6BDB83] text-white shadow-sm',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px] leading-tight',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[#969696]',
  success: 'bg-[#00A651]',
  warning: 'bg-[#FFB114]',
  error: 'bg-[#F0282D]',
  info: 'bg-[#0078D0]',
  purple: 'bg-[#0049AA]',
  money: 'bg-[#00A651]',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  style = 'soft',
  icon,
  dot = false,
  removable = false,
  onRemove,
  className = '',
}: BadgeProps) {
  const styleClasses = {
    soft: softVariantClasses,
    solid: solidVariantClasses,
    outline: outlineVariantClasses,
    gradient: gradientVariantClasses,
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap
        transition-all duration-150
        ${styleClasses[style][variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* Pulsing Dot */}
      {dot && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColors[variant]} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`} />
        </span>
      )}

      {/* Icon */}
      {icon && <span className="flex-shrink-0">{icon}</span>}

      {/* Content */}
      {children}

      {/* Remove Button */}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Kaldır"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

/**
 * TrustBadge - Güven seviyesi göstergesi
 */
export function TrustBadge({ trust }: { trust: 'low' | 'med' | 'high' }) {
  const cfg: Record<typeof trust, { variant: BadgeVariant; label: string }> = {
    low: { variant: 'warning', label: 'Düşük Güven' },
    med: { variant: 'info', label: 'Orta Güven' },
    high: { variant: 'success', label: 'Yüksek Güven' },
  };
  return <Badge variant={cfg[trust].variant} style="soft">{cfg[trust].label}</Badge>;
}

/**
 * StatusBadge - İş akışı durumu göstergesi
 */
export function StatusBadge({ status }: { status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked' }) {
  const cfg: Record<typeof status, { variant: BadgeVariant; label: string; dot: boolean }> = {
    pending: { variant: 'default', label: 'Bekliyor', dot: false },
    in_progress: { variant: 'info', label: 'Devam Ediyor', dot: true },
    completed: { variant: 'success', label: 'Tamamlandı', dot: false },
    failed: { variant: 'error', label: 'Başarısız', dot: false },
    blocked: { variant: 'warning', label: 'Engellendi', dot: true },
  };
  return <Badge variant={cfg[status].variant} dot={cfg[status].dot} style="soft">{cfg[status].label}</Badge>;
}

/**
 * CountBadge - Sayı göstergesi (bildirimler, miktar vb.)
 */
export function CountBadge({ count, max = 99, variant = 'error' }: { count: number; max?: number; variant?: BadgeVariant }) {
  const display = count > max ? `${max}+` : count.toString();
  return (
    <Badge variant={variant} size="xs" style="solid" className="min-w-[1.25rem] justify-center">
      {display}
    </Badge>
  );
}

/**
 * DeadlineBadge - Tarih/süre göstergesi
 */
export function DeadlineBadge({ daysRemaining }: { daysRemaining: number }) {
  let variant: BadgeVariant = 'default';
  let label = `${daysRemaining} gün`;

  if (daysRemaining < 0) {
    variant = 'error';
    label = `${Math.abs(daysRemaining)} gün gecikme`;
  } else if (daysRemaining === 0) {
    variant = 'error';
    label = 'Bugün!';
  } else if (daysRemaining <= 3) {
    variant = 'warning';
  } else if (daysRemaining <= 7) {
    variant = 'info';
  } else {
    variant = 'success';
  }

  return <Badge variant={variant} dot={daysRemaining <= 3} style="soft">{label}</Badge>;
}
