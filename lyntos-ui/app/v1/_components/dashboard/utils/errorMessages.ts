// ════════════════════════════════════════════════════════════════════════════
// ERROR MESSAGE HUMANIZATION
// Replace technical HTTP codes with user-friendly Turkish messages
// ════════════════════════════════════════════════════════════════════════════

export type ErrorSeverity = 'warning' | 'error' | 'info';

export interface HumanError {
  message: string;
  severity: ErrorSeverity;
  canRetry: boolean;
}

/**
 * Convert technical error messages to user-friendly Turkish messages
 */
export function getHumanError(error: string): HumanError {
  const errorLower = error.toLowerCase();

  // Auth errors (401)
  if (errorLower.includes('401')) {
    return {
      message: 'Oturum sorunu. Lütfen tekrar giriş yapın.',
      severity: 'warning',
      canRetry: false,
    };
  }

  // Forbidden (403)
  if (errorLower.includes('403')) {
    return {
      message: 'Bu veriye erişim yetkiniz yok.',
      severity: 'warning',
      canRetry: false,
    };
  }

  // Not found (404)
  if (errorLower.includes('404')) {
    return {
      message: 'Bu dönem için veri bulunamadı.',
      severity: 'info',
      canRetry: false,
    };
  }

  // Server error (500)
  if (errorLower.includes('500')) {
    return {
      message: 'Servis hatası. Yenilemeyi deneyin.',
      severity: 'error',
      canRetry: true,
    };
  }

  // Network errors
  if (errorLower.includes('fetch') || errorLower.includes('network') || errorLower.includes('timeout')) {
    return {
      message: 'Bağlantı sorunu. İnternet bağlantınızı kontrol edin.',
      severity: 'warning',
      canRetry: true,
    };
  }

  // CORS errors
  if (errorLower.includes('cors')) {
    return {
      message: 'Bağlantı sorunu. Yenilemeyi deneyin.',
      severity: 'warning',
      canRetry: true,
    };
  }

  // Default
  return {
    message: 'Beklenmeyen bir hata oluştu.',
    severity: 'error',
    canRetry: true,
  };
}

/**
 * Get Tailwind classes for error severity
 */
export function getSeverityStyles(severity: ErrorSeverity): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (severity) {
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        icon: 'text-amber-500',
      };
    case 'error':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'text-red-500',
      };
    case 'info':
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-600',
        icon: 'text-gray-400',
      };
  }
}
