'use client';

/**
 * Premium Header Component - KOMPAKT TASARIM
 * LYNTOS Kokpit Premium UI
 *
 * 2 SATIR TASARIM (Scroll'suz her zaman aynı):
 * - Row 1: SMMM selamlama + Bildirim + Avatar
 * - Row 2: Mükellef + INLINE Dönem Seçici
 *
 * Header yüksekliği: ~110px (sabit)
 */

import React, { useState } from 'react';
import { Menu, Bell, Building2, ChevronDown } from 'lucide-react';
import { useLayoutContext } from './useLayoutContext';
import { InlinePeriodSelector } from './InlinePeriodSelector';
import { ClientSelector } from './ClientSelector';

interface PremiumHeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
  onNotificationClick?: () => void;
  notificationCount?: number;
}

export function PremiumHeader({
  sidebarCollapsed,
  onMobileMenuToggle,
  onNotificationClick,
  notificationCount = 0,
}: PremiumHeaderProps) {
  const { user, selectedClient, highlightSelectors, setHighlightSelectors } = useLayoutContext();
  const [showClientSelector, setShowClientSelector] = useState(false);

  // Highlight efekti class'ı — ScopeGuide tarafından tetiklenir
  const highlightClass = highlightSelectors
    ? 'ring-2 ring-[#0078D0]/60 ring-offset-2 ring-offset-[#0049AA] animate-pulse rounded-xl'
    : '';

  // Saate göre selamlama
  const hour = new Date().getHours();
  let greeting = 'Merhaba';
  if (hour < 12) greeting = 'Günaydın';
  else if (hour < 18) greeting = 'İyi günler';
  else greeting = 'İyi akşamlar';

  const firstName = user?.name.split(' ')[0] || 'Kullanıcı';

  return (
    <header
      className="fixed top-0 right-0 z-30 transition-all duration-300"
      style={{
        left: sidebarCollapsed ? '72px' : '240px',
      }}
    >
      {/* Premium Gradient Background - LYNTOS Blue */}
      <div className="relative bg-gradient-to-br from-[#00287F] to-[#0049AA]">
        {/* Animated Background Elements - overflow-hidden only on decorative layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-inherit">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-[#0078D0]/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#00B4EB]/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        {/* Row 1: SMMM Info + Actions */}
        <div className="relative px-5 py-2 border-b border-white/10">
          <div className="flex items-center justify-between">
            {/* Left: Mobile Menu + SMMM Info */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={onMobileMenuToggle}
                className="lg:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* SMMM Greeting */}
              <div className="flex items-center gap-2">
                <p className="text-white/60 text-sm">
                  {greeting}, <span className="text-white font-medium">{firstName}</span>
                </p>
                {user?.title && (
                  <span className="text-[#5ED6FF] text-xs font-medium hidden sm:inline">• {user.title}</span>
                )}
              </div>
            </div>

            {/* Right: Notifications + User Avatar */}
            <div className="flex items-center gap-3">
              {/* Notification Button */}
              <button
                onClick={onNotificationClick}
                className="relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F0282D] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              {/* User Avatar */}
              {user && (
                <button className="flex items-center gap-2 px-2 py-1 hover:bg-white/10 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0078D0] to-[#00B4EB] flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {user.initials}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Mükellef + Inline Period Selector */}
        <div className="relative px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Mükellef Seçici / Info */}
            {selectedClient ? (
              <div className="flex items-center gap-3 min-w-0">
                {/* Company Icon */}
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>

                {/* Company Info */}
                <div className="min-w-0">
                  <button
                    onClick={() => setShowClientSelector(!showClientSelector)}
                    className="flex items-center gap-2 group"
                  >
                    <h2 className="text-base font-bold text-white truncate group-hover:text-[#5ED6FF] transition-all max-w-[200px]">
                      {selectedClient.shortName}
                    </h2>
                    <ChevronDown className={`w-4 h-4 text-white/60 transition-transform flex-shrink-0 ${showClientSelector ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-white/50">VKN: {selectedClient.vkn}</span>
                  </div>
                </div>

                {/* Client Selector Dropdown */}
                {showClientSelector && (
                  <div className="absolute top-full left-0 mt-2 z-[9999]">
                    <div className="bg-white rounded-xl shadow-2xl border border-[#E5E5E5]">
                      <ClientSelector onSelect={() => setShowClientSelector(false)} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`flex-1 ${highlightClass}`} onClick={() => highlightSelectors && setHighlightSelectors(false)}>
                <ClientSelector />
              </div>
            )}

            {/* Inline Period Selector - Sağ Taraf */}
            {selectedClient && (
              <div className={`flex-shrink-0 ${highlightClass}`} onClick={() => highlightSelectors && setHighlightSelectors(false)}>
                <InlinePeriodSelector />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// Mobile Header (basitleştirilmiş)
export function MobilePremiumHeader({
  onMobileMenuToggle,
  onNotificationClick,
  notificationCount = 0,
}: {
  onMobileMenuToggle: () => void;
  onNotificationClick?: () => void;
  notificationCount?: number;
}) {
  const { user, selectedClient, selectedPeriod } = useLayoutContext();

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-gradient-to-r from-[#00287F] to-[#0049AA]">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-white">LYNTOS</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNotificationClick}
            className="relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F0282D] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>
          {user && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0078D0] to-[#00B4EB] flex items-center justify-center text-white text-xs font-bold">
              {user.initials}
            </div>
          )}
        </div>
      </div>

      {/* Mükellef + Dönem Strip */}
      {selectedClient && (
        <div className="px-4 pb-3 flex items-center gap-2 text-sm">
          <span className="text-white font-medium truncate">{selectedClient.shortName}</span>
          {selectedPeriod && (
            <>
              <span className="text-white/40">•</span>
              <span className="text-[#5ED6FF]">Q{selectedPeriod.periodNumber} {selectedPeriod.year}</span>
            </>
          )}
        </div>
      )}
    </header>
  );
}
