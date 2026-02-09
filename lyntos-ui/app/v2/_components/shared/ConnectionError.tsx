'use client';

import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { UX_MESSAGES } from '../../_lib/messages';

interface ConnectionErrorProps {
  /** Görsel varyant */
  variant?: 'full' | 'banner' | 'inline';
  /** Tekrar dene callback'i */
  onRetry?: () => void;
  /** Bağlam: "Kural verileri" / "Dashboard" / "VDK analizi" vb. */
  context?: string;
  /** Ek CSS class */
  className?: string;
}

/**
 * Bağlantı/sunucu hatalarını SMMM/YMM'ye uygun profesyonel dille gösteren bileşen.
 * ASLA "Backend çalışıyor mu?", "localhost:8000" gibi teknik mesajlar göstermez.
 */
export function ConnectionError({
  variant = 'banner',
  onRetry,
  context = 'Veriler',
  className = '',
}: ConnectionErrorProps) {
  const message = UX_MESSAGES.connection.description(context);

  if (variant === 'full') {
    return (
      <div className={`min-h-[60vh] flex items-center justify-center p-6 ${className}`}>
        <div className="bg-[#FEF2F2] border border-[#FF9196] rounded-xl p-8 text-center max-w-md shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#FFC7C9] flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-7 h-7 text-[#BF192B]" />
          </div>
          <h2 className="text-lg font-semibold text-[#980F30] mb-2">
            {UX_MESSAGES.connection.title}
          </h2>
          <p className="text-sm text-[#BF192B] mb-4">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0282D] text-white rounded-lg hover:bg-[#BF192B] text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {UX_MESSAGES.connection.retry}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm text-[#BF192B] ${className}`}>
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[#F0282D] hover:text-[#980F30] underline font-medium"
          >
            {UX_MESSAGES.connection.retry}
          </button>
        )}
      </div>
    );
  }

  // banner (default)
  return (
    <div className={`bg-[#FEF2F2] border border-[#FF9196] rounded-lg p-4 flex items-start gap-3 ${className}`}>
      <WifiOff className="w-5 h-5 text-[#F0282D] flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold text-[#980F30]">{UX_MESSAGES.connection.title}</h4>
        <p className="text-sm text-[#BF192B] mt-1">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0282D] text-white rounded-lg hover:bg-[#BF192B] text-sm font-medium transition-colors flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {UX_MESSAGES.connection.retry}
        </button>
      )}
    </div>
  );
}
