'use client';

/**
 * LYNTOS Alert Banner Component - Kaizen Görsel Sistem
 *
 * Uyarı, bilgi ve başarı mesajları için tutarlı banner bileşeni
 */

import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
  X,
  LucideIcon,
  Zap,
  Clock,
  Shield,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface AlertBannerProps {
  // Core
  title: string;
  description?: string | React.ReactNode;

  // Style
  variant: 'info' | 'success' | 'warning' | 'error' | 'critical' | 'neutral';
  size?: 'sm' | 'md' | 'lg';

  // Icon override
  icon?: LucideIcon;

  // Actions
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };

  // Dismissible
  onDismiss?: () => void;

  // Animation
  animate?: boolean;
}

// =============================================================================
// VARIANT STYLES
// =============================================================================

const variantStyles = {
  info: {
    container: 'bg-[#E6F9FF] border-[#ABEBFF]',
    icon: 'text-[#0049AA]',
    title: 'text-[#00287F]',
    description: 'text-[#0049AA]',
    action: 'bg-[#0049AA] text-white hover:bg-[#0049AA]',
    secondaryAction: 'text-[#0049AA] hover:text-[#00287F]',
    defaultIcon: Info,
  },
  success: {
    container: 'bg-[#ECFDF5] border-[#AAE8B8]',
    icon: 'text-[#00804D]',
    title: 'text-[#005A46]',
    description: 'text-[#00804D]',
    action: 'bg-[#00804D] text-white hover:bg-[#00804D]',
    secondaryAction: 'text-[#00804D] hover:text-[#005A46]',
    defaultIcon: CheckCircle2,
  },
  warning: {
    container: 'bg-[#FFFBEB] border-[#FFF08C]',
    icon: 'text-[#FA841E]',
    title: 'text-[#E67324]',
    description: 'text-[#FA841E]',
    action: 'bg-[#FA841E] text-white hover:bg-[#FA841E]',
    secondaryAction: 'text-[#FA841E] hover:text-[#E67324]',
    defaultIcon: AlertTriangle,
  },
  error: {
    container: 'bg-[#FEF2F2] border-[#FFC7C9]',
    icon: 'text-[#BF192B]',
    title: 'text-[#980F30]',
    description: 'text-[#BF192B]',
    action: 'bg-[#BF192B] text-white hover:bg-[#BF192B]',
    secondaryAction: 'text-[#BF192B] hover:text-[#980F30]',
    defaultIcon: XCircle,
  },
  critical: {
    container: 'bg-gradient-to-r from-[#BF192B] to-[#BF192B] text-white border-0',
    icon: 'text-white',
    title: 'text-white',
    description: 'text-[#FEF2F2]',
    action: 'bg-white text-[#BF192B] hover:bg-[#FEF2F2]',
    secondaryAction: 'text-white hover:text-[#FEF2F2]',
    defaultIcon: Zap,
  },
  neutral: {
    container: 'bg-[#F5F6F8] border-[#E5E5E5]',
    icon: 'text-[#969696]',
    title: 'text-[#2E2E2E]',
    description: 'text-[#5A5A5A]',
    action: 'bg-[#5A5A5A] text-white hover:bg-[#5A5A5A]',
    secondaryAction: 'text-[#5A5A5A] hover:text-[#2E2E2E]',
    defaultIcon: AlertCircle,
  },
};

const sizeStyles = {
  sm: {
    container: 'p-3 rounded-lg',
    icon: 'w-4 h-4',
    title: 'text-sm font-medium',
    description: 'text-xs',
    action: 'text-xs px-2 py-1',
  },
  md: {
    container: 'p-4 rounded-xl',
    icon: 'w-5 h-5',
    title: 'text-base font-semibold',
    description: 'text-sm',
    action: 'text-sm px-3 py-1.5',
  },
  lg: {
    container: 'p-6 rounded-xl',
    icon: 'w-6 h-6',
    title: 'text-lg font-bold',
    description: 'text-base',
    action: 'text-sm px-4 py-2',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function AlertBanner({
  title,
  description,
  variant,
  size = 'md',
  icon: CustomIcon,
  action,
  secondaryAction,
  onDismiss,
  animate = false,
}: AlertBannerProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  const Icon = CustomIcon || styles.defaultIcon;

  return (
    <div
      className={`
        ${sizes.container}
        ${styles.container}
        border
        ${animate ? 'animate-pulse' : ''}
        transition-all duration-200
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`${styles.icon} flex-shrink-0 mt-0.5`}>
          <Icon className={sizes.icon} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`${sizes.title} ${styles.title}`}>{title}</h4>
          {description && (
            <div className={`${sizes.description} ${styles.description} mt-1`}>
              {typeof description === 'string' ? <p>{description}</p> : description}
            </div>
          )}

          {/* Actions */}
          {(action || secondaryAction) && (
            <div className="flex items-center gap-3 mt-3">
              {action && (
                <button
                  onClick={action.onClick}
                  className={`${sizes.action} ${styles.action} rounded-lg font-medium transition-colors`}
                >
                  {action.label}
                </button>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className={`${sizes.action} ${styles.secondaryAction} font-medium transition-colors`}
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${styles.icon} opacity-60 hover:opacity-100 transition-opacity flex-shrink-0`}
          >
            <X className={sizes.icon} />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SPECIALIZED ALERTS
// =============================================================================

// Deadline Alert
interface DeadlineAlertProps {
  title: string;
  deadline: string;
  daysRemaining: number;
  onAction?: () => void;
}

export function DeadlineAlert({ title, deadline, daysRemaining, onAction }: DeadlineAlertProps) {
  const variant = daysRemaining <= 0 ? 'critical' : daysRemaining <= 7 ? 'error' : daysRemaining <= 30 ? 'warning' : 'info';

  return (
    <AlertBanner
      variant={variant}
      icon={Clock}
      title={title}
      description={
        <span>
          Son tarih: <strong>{deadline}</strong>
          {daysRemaining > 0 ? ` (${daysRemaining} gün kaldı)` : ' (SÜRESİ DOLDU!)'}
        </span>
      }
      action={onAction ? { label: daysRemaining <= 0 ? 'Acil Aksiyon Al' : 'Detaylar', onClick: onAction } : undefined}
      animate={daysRemaining <= 7}
    />
  );
}

// VDK Risk Alert
interface VDKRiskAlertProps {
  riskCount: number;
  criticalCount: number;
  onAction?: () => void;
}

export function VDKRiskAlert({ riskCount, criticalCount, onAction }: VDKRiskAlertProps) {
  if (riskCount === 0) {
    return (
      <AlertBanner
        variant="success"
        icon={Shield}
        title="VDK Risk Analizi Temiz"
        description="Mevcut dönemde tespit edilen risk bulunmamaktadır."
      />
    );
  }

  return (
    <AlertBanner
      variant={criticalCount > 0 ? 'critical' : 'warning'}
      icon={Shield}
      title={`VDK Risk Tespiti: ${riskCount} Bulgu`}
      description={
        criticalCount > 0
          ? `${criticalCount} kritik, ${riskCount - criticalCount} uyarı seviyesinde risk tespit edildi.`
          : `${riskCount} uyarı seviyesinde risk tespit edildi.`
      }
      action={onAction ? { label: 'Riskleri İncele', onClick: onAction } : undefined}
    />
  );
}

export default AlertBanner;
