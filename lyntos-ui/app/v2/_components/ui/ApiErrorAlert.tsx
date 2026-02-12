'use client';

/**
 * LYNTOS Reusable API Error Alert
 * M-04: Tutarli hata gosterimi
 *
 * Kullanim:
 *   const { data, error } = await api.get(...);
 *   if (error) return <ApiErrorAlert message={error} onRetry={refetch} />;
 */

import React from 'react';

interface ApiErrorAlertProps {
  /** Error message to display */
  message: string;
  /** Optional title (default: "Hata") */
  title?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Severity: "error" | "warning" | "info" */
  severity?: 'error' | 'warning' | 'info';
  /** Compact mode (inline, no padding) */
  compact?: boolean;
}

const SEVERITY_STYLES = {
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    text: 'text-red-700',
    button: 'bg-red-100 hover:bg-red-200 text-red-800',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-500',
    title: 'text-yellow-800',
    text: 'text-yellow-700',
    button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
    text: 'text-blue-700',
    button: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
  },
};

export function ApiErrorAlert({
  message,
  title = 'Hata',
  onRetry,
  onDismiss,
  severity = 'error',
  compact = false,
}: ApiErrorAlertProps) {
  const styles = SEVERITY_STYLES[severity];
  const padding = compact ? 'p-3' : 'p-4';

  return (
    <div className={`${styles.bg} border rounded-lg ${padding} flex items-start gap-3`} role="alert">
      {/* Icon */}
      <div className={`${styles.icon} flex-shrink-0 mt-0.5`}>
        {severity === 'error' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        )}
        {severity === 'warning' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        )}
        {severity === 'info' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!compact && <h3 className={`${styles.title} font-medium text-sm`}>{title}</h3>}
        <p className={`${styles.text} text-sm ${compact ? '' : 'mt-1'}`}>{message}</p>

        {/* Actions */}
        {(onRetry || onDismiss) && (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`${styles.button} text-xs font-medium px-3 py-1.5 rounded-md transition-colors`}
              >
                Tekrar Dene
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-500 hover:text-gray-700 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                Kapat
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ApiErrorAlert;
