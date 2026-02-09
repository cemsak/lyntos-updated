'use client';

import React, { useEffect, useCallback } from 'react';
import { Info, Sparkles } from 'lucide-react';
import { UX_MESSAGES } from '../../_lib/messages';
import { useLayoutContext } from '../layout/useLayoutContext';

interface ScopeGuideProps {
  /** Görsel varyant */
  variant?: 'hero' | 'full' | 'banner' | 'inline';
  /** Başlık (varsayılan: "Mükellef ve Dönem Seçin") */
  title?: string;
  /** Açıklama metni */
  description?: string;
  /** Header dropdown'larını pulse ile vurgula (varsayılan: true) */
  highlightHeader?: boolean;
  /** Ek CSS class */
  className?: string;
}

/**
 * Scope seçilmediğinde gösterilen yönlendirme bileşeni.
 * SMMM/YMM profesyonellerine uygun, MAVİ bilgi tonunda.
 * "Scope seçilmedi" bir HATA değil, bir yönlendirmedir.
 */
export function ScopeGuide({
  variant = 'full',
  title,
  description,
  highlightHeader = true,
  className = '',
}: ScopeGuideProps) {
  const { setHighlightSelectors } = useLayoutContext();

  const displayTitle = title || UX_MESSAGES.scope.title;
  const displayDescription = description || UX_MESSAGES.scope.generic;

  // Header dropdown'larını vurgula
  const triggerHighlight = useCallback(() => {
    if (!highlightHeader) return;
    setHighlightSelectors(true);
    const timer = setTimeout(() => setHighlightSelectors(false), 4000);
    return () => clearTimeout(timer);
  }, [highlightHeader, setHighlightSelectors]);

  useEffect(() => {
    const cleanup = triggerHighlight();
    return cleanup;
  }, [triggerHighlight]);

  // === HERO VARIANT (Dashboard premium) ===
  if (variant === 'hero') {
    return (
      <div className={`relative overflow-hidden rounded-3xl ${className}`}>
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00287F] via-[#0049AA] to-[#0078D0]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-72 h-72 bg-[#0078D0] rounded-full filter blur-3xl animate-pulse" />
            <div
              className="absolute bottom-0 right-0 w-96 h-96 bg-[#00B4EB] rounded-full filter blur-3xl animate-pulse"
              style={{ animationDelay: '1s' }}
            />
          </div>
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>
        {/* Content */}
        <div className="relative p-8 text-center py-16">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm flex items-center justify-center shadow-2xl mb-6 border border-white/20">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4">LYNTOS Kokpit</h1>
          <p className="text-[#ABEBFF] text-lg max-w-md mx-auto">
            {displayDescription}
          </p>
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/80 text-sm backdrop-blur-sm border border-white/10">
            <Info className="w-4 h-4" />
            {displayTitle}
          </div>
        </div>
      </div>
    );
  }

  // === FULL VARIANT (tam sayfa, ortalanmış kart) ===
  if (variant === 'full') {
    return (
      <div className={`min-h-[50vh] flex items-center justify-center p-6 ${className}`}>
        <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-xl p-8 text-center max-w-md shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#ABEBFF] flex items-center justify-center mx-auto mb-4">
            <Info className="w-7 h-7 text-[#0049AA]" />
          </div>
          <h2 className="text-lg font-semibold text-[#00287F] mb-2">{displayTitle}</h2>
          <p className="text-sm text-[#0049AA]">{displayDescription}</p>
        </div>
      </div>
    );
  }

  // === INLINE VARIANT (küçük satır içi) ===
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm text-[#0049AA] ${className}`}>
        <Info className="w-4 h-4 text-[#0078D0] flex-shrink-0" />
        <span>{displayDescription}</span>
      </div>
    );
  }

  // === BANNER VARIANT (yatay banner — default) ===
  return (
    <div className={`bg-[#E6F9FF] border border-[#ABEBFF] rounded-xl p-6 text-center max-w-lg mx-auto ${className}`}>
      <Info className="w-10 h-10 text-[#0078D0] mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-[#00287F] mb-2">{displayTitle}</h2>
      <p className="text-sm text-[#0049AA]">{displayDescription}</p>
    </div>
  );
}
