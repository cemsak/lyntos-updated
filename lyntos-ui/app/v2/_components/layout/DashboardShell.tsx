'use client';

/**
 * LYNTOS Dashboard Shell Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Main layout wrapper with sidebar, topbar, and content area
 */
import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar, MobileTopBar } from './TopBar';
import { LayoutProvider } from './useLayoutContext';
import { useSidebarState } from './useSidebarState';
import { ToastProvider } from '../shared/Toast';

interface DashboardShellProps {
  children: React.ReactNode;
}

function DashboardShellInner({ children }: DashboardShellProps) {
  const { collapsed, mobileOpen, toggleCollapsed, toggleMobile, closeMobile } = useSidebarState();

  return (
    <div className="min-h-screen bg-[#f6f9fc] dark:bg-[#0a0d14]">
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

      {/* Desktop Top Bar */}
      <div className="hidden lg:block">
        <TopBar
          sidebarCollapsed={collapsed}
          onMobileMenuToggle={toggleMobile}
        />
      </div>

      {/* Mobile Top Bar */}
      <MobileTopBar onMobileMenuToggle={toggleMobile} />

      {/* Main Content */}
      <main
        className="pt-[64px] min-h-screen transition-all duration-200"
        style={{
          paddingLeft: collapsed ? '72px' : '240px',
        }}
      >
        {/* Desktop content */}
        <div className="hidden lg:block p-6">
          {children}
        </div>

        {/* Mobile content (no left padding) */}
        <div className="lg:hidden p-4" style={{ paddingLeft: '16px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <LayoutProvider>
      <ToastProvider>
        <DashboardShellInner>{children}</DashboardShellInner>
      </ToastProvider>
    </LayoutProvider>
  );
}
