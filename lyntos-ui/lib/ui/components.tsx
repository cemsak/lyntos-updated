// LYNTOS Reusable UI Components
// Design tokens'dan türetilmiş standart bileşenler

import { STATES, ICON_SIZES, getSpinnerClasses, getButtonClasses } from './design-tokens';
import { AlertCircle, CheckCircle, AlertTriangle, Info, Inbox, RefreshCw } from 'lucide-react';

// ============================================
// SPINNER
// ============================================
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return <div className={`${getSpinnerClasses(size)} ${className}`} />;
}

// ============================================
// LOADING STATE
// ============================================
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
}

export function LoadingState({ message = 'Yükleniyor...', size = 'md', overlay = false }: LoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <Spinner size={size} />
      {message && <p className="text-sm text-slate-500">{message}</p>}
    </div>
  );

  if (overlay) {
    return <div className={STATES.loading.overlay}>{content}</div>;
  }

  return content;
}

// ============================================
// ERROR STATE
// ============================================
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Hata Oluştu',
  message = 'Bir şeyler yanlış gitti. Lütfen tekrar deneyin.',
  onRetry,
  retryLabel = 'Tekrar Dene',
}: ErrorStateProps) {
  return (
    <div className={STATES.error.container}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`${ICON_SIZES.lg} ${STATES.error.icon} flex-shrink-0 mt-0.5`} />
        <div>
          <h4 className={STATES.error.title}>{title}</h4>
          <p className={`${STATES.error.message} mt-1`}>{message}</p>
          {onRetry && (
            <button onClick={onRetry} className={STATES.error.retryButton}>
              <RefreshCw className={`${ICON_SIZES.sm} mr-2`} />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================
interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title = 'Veri Bulunamadı',
  message = 'Henüz gösterilecek veri yok.',
  action,
}: EmptyStateProps) {
  return (
    <div className={STATES.empty.container}>
      <div className={`${ICON_SIZES.xl} ${STATES.empty.icon}`}>
        {icon || <Inbox className="w-full h-full" />}
      </div>
      <h4 className={STATES.empty.title}>{title}</h4>
      {message && <p className={STATES.empty.message}>{message}</p>}
      {action && <div className={STATES.empty.action}>{action}</div>}
    </div>
  );
}

// ============================================
// SUCCESS STATE
// ============================================
interface SuccessStateProps {
  title?: string;
  message?: string;
}

export function SuccessState({
  title = 'Başarılı',
  message,
}: SuccessStateProps) {
  return (
    <div className={STATES.success.container}>
      <div className="flex items-start gap-3">
        <CheckCircle className={`${ICON_SIZES.lg} ${STATES.success.icon} flex-shrink-0 mt-0.5`} />
        <div>
          <h4 className={STATES.success.title}>{title}</h4>
          {message && <p className={`${STATES.success.message} mt-1`}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================
// WARNING STATE
// ============================================
interface WarningStateProps {
  title?: string;
  message?: string;
}

export function WarningState({
  title = 'Dikkat',
  message,
}: WarningStateProps) {
  return (
    <div className={STATES.warning.container}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`${ICON_SIZES.lg} ${STATES.warning.icon} flex-shrink-0 mt-0.5`} />
        <div>
          <h4 className={STATES.warning.title}>{title}</h4>
          {message && <p className={`${STATES.warning.message} mt-1`}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================
// INFO STATE
// ============================================
interface InfoStateProps {
  title?: string;
  message?: string;
}

export function InfoState({
  title,
  message,
}: InfoStateProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Info className={`${ICON_SIZES.lg} text-blue-500 flex-shrink-0 mt-0.5`} />
        <div>
          {title && <h4 className="text-blue-800 font-semibold">{title}</h4>}
          {message && <p className="text-blue-700 text-sm mt-1">{message}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SKELETON LOADERS
// ============================================
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = 'h-4 w-full' }: SkeletonProps) {
  return <div className={`${STATES.loading.skeleton} ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// ============================================
// PANEL STATE WRAPPER
// ============================================
type PanelStatus = 'loading' | 'error' | 'empty' | 'success';

interface PanelStateProps {
  status: PanelStatus;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  emptyTitle?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}

export function PanelState({
  status,
  loadingMessage,
  errorMessage,
  emptyMessage,
  emptyTitle,
  onRetry,
  children,
}: PanelStateProps) {
  switch (status) {
    case 'loading':
      return <LoadingState message={loadingMessage} />;
    case 'error':
      return <ErrorState message={errorMessage} onRetry={onRetry} />;
    case 'empty':
      return <EmptyState title={emptyTitle} message={emptyMessage} />;
    case 'success':
      return <>{children}</>;
    default:
      return <>{children}</>;
  }
}
