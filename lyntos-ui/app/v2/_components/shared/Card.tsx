import React from 'react';

/**
 * Card - Kaizen Görsel Sistem v2
 *
 * Animasyonlu, responsive ve erişilebilir kart komponenti
 */

type CardVariant = 'default' | 'elevated' | 'bordered' | 'glass' | 'gradient';
type CardStatus = 'default' | 'success' | 'warning' | 'error' | 'info';
type AccentColor = 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'indigo';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  headerAction?: React.ReactNode;
  className?: string;
  accent?: boolean | AccentColor; // Left accent bar with optional color
  noPadding?: boolean;
  variant?: CardVariant;
  status?: CardStatus;
  interactive?: boolean; // Enables hover effects
  animate?: boolean; // Entry animation
  loading?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-[#E5E5E5] shadow-sm',
  elevated: 'bg-white border border-[#E5E5E5] shadow-md hover:shadow-lg',
  bordered: 'bg-white border-2 border-[#E5E5E5]',
  glass: 'bg-white/70 backdrop-blur-md border border-white/20 shadow-lg',
  gradient: 'bg-gradient-to-br from-white to-[#F5F6F8] border border-[#E5E5E5] shadow-sm',
};

const statusBorderStyles: Record<CardStatus, string> = {
  default: '',
  success: 'border-l-4 border-l-[#00A651]',
  warning: 'border-l-4 border-l-[#FFB114]',
  error: 'border-l-4 border-l-[#F0282D]',
  info: 'border-l-4 border-l-[#0078D0]',
};

const accentColorMap: Record<AccentColor, string> = {
  blue: 'bg-[#0078D0]',
  emerald: 'bg-[#00A651]',
  amber: 'bg-[#FFB114]',
  red: 'bg-[#F0282D]',
  purple: 'bg-[#0049AA]',
  indigo: 'bg-[#0049AA]',
};

export function Card({
  children,
  title,
  subtitle,
  headerAction,
  className = '',
  accent = false,
  noPadding = false,
  variant = 'default',
  status = 'default',
  interactive = false,
  animate = false,
  loading = false,
  onClick,
}: CardProps) {
  const accentColor = typeof accent === 'string' ? accent : 'blue';
  const showAccent = accent !== false;

  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        ${variantStyles[variant]}
        ${status !== 'default' ? statusBorderStyles[status] : ''}
        ${showAccent ? 'pl-1' : ''}
        ${interactive || onClick ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]' : ''}
        ${animate ? 'animate-slide-up' : ''}
        ${loading ? 'animate-pulse' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Accent Bar */}
      {showAccent && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColorMap[accentColor]}`} />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#0049AA] rounded-full animate-spin" />
        </div>
      )}

      {/* Header */}
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]/80 bg-[#F5F6F8]/80">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm font-semibold text-[#2E2E2E] truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#5A5A5A] mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="ml-3 flex-shrink-0">{headerAction}</div>}
        </div>
      )}

      {/* Content */}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </div>
  );
}

/**
 * CardGrid - Responsive kart grid'i
 */
interface CardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CardGrid({
  children,
  columns = 3,
  gap = 'md',
  className = '',
}: CardGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * CardHeader - Standalone kart başlığı
 */
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className = '',
}: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-[#F5F6F8] flex items-center justify-center text-[#5A5A5A]">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-[#2E2E2E]">{title}</h3>
          {subtitle && <p className="text-sm text-[#5A5A5A]">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
