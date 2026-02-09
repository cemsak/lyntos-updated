'use client';

/**
 * LYNTOS Dashboard Shell Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Main layout wrapper with sidebar, premium header, and content area
 *
 * Provider sıralaması kritik:
 * 1. LayoutProvider (user, client, period seçimleri)
 * 2. ScopeProvider (LayoutContext'i dinler, dashboard scope'u yönetir)
 *
 * KOMPAKT HEADER: 110px sabit yükseklik (scroll-aware değil)
 */
import React from 'react';
import { Sidebar } from './Sidebar';
import { PremiumHeader, MobilePremiumHeader } from './PremiumHeader';
import { LayoutProvider } from './useLayoutContext';
import { ScopeProvider } from '../scope/ScopeProvider';
import { useSidebarState } from './useSidebarState';
import { ToastProvider } from '../shared/Toast';

interface DashboardShellProps {
  children: React.ReactNode;
}

// Sabit header yüksekliği - kompakt tasarım
const HEADER_HEIGHT = 110;

function DashboardShellInner({ children }: DashboardShellProps) {
  const { collapsed, mobileOpen, toggleCollapsed, toggleMobile, closeMobile } = useSidebarState();
  const notificationCount: number | undefined = undefined; // Backend hazır olana kadar gizli (Madde 3)

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggleCollapsed}
        onCloseMobile={closeMobile}
      />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Desktop Premium Header */}
      <div className="hidden lg:block">
        <PremiumHeader
          sidebarCollapsed={collapsed}
          onMobileMenuToggle={toggleMobile}
          notificationCount={notificationCount}
        />
      </div>

      {/* Mobile Premium Header */}
      <div className="lg:hidden">
        <MobilePremiumHeader
          onMobileMenuToggle={toggleMobile}
          notificationCount={notificationCount}
        />
      </div>

      {/* Main Content - Sabit padding */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{
          paddingLeft: collapsed ? '72px' : '240px',
        }}
      >
        {/* Desktop content - Sabit padding-top */}
        <div
          className="hidden lg:block p-6"
          style={{ paddingTop: `${HEADER_HEIGHT}px` }}
        >
          {children}
        </div>

        {/* Mobile content - Sabit padding */}
        <div className="lg:hidden p-4 pt-[100px]" style={{ paddingLeft: '16px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <LayoutProvider>
      {/* ScopeProvider MUST be inside LayoutProvider to access useLayoutContext */}
      <ScopeProvider>
        <ToastProvider>
          <DashboardShellInner>{children}</DashboardShellInner>
        </ToastProvider>
      </ScopeProvider>
    </LayoutProvider>
  );
}
