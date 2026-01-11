'use client';

/**
 * LYNTOS Top Bar Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Top navigation with selectors, breadcrumb, and user menu
 */
import React from 'react';
import { Menu, Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutContext } from './useLayoutContext';
import { ClientSelector } from './ClientSelector';
import { PeriodSelector } from './PeriodSelector';
import { UserGreeting } from './UserGreeting';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
}

interface Breadcrumb {
  label: string;
  href: string;
  isLast: boolean;
}

function useBreadcrumbs(): Breadcrumb[] {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const labels: Record<string, string> = {
    'v2': 'Ana Sayfa',
    'upload': 'Veri Yükleme',
    'risk': 'Bekleyen Islemler',
    'clients': 'Mükellefler',
    'declarations': 'Beyannameler',
    'reports': 'Raporlar',
    'settings': 'Ayarlar',
    'help': 'Yardım',
  };

  return segments.map((seg, idx) => ({
    label: labels[seg] || seg,
    href: '/' + segments.slice(0, idx + 1).join('/'),
    isLast: idx === segments.length - 1,
  }));
}

export function TopBar({ sidebarCollapsed, onMobileMenuToggle }: TopBarProps) {
  const breadcrumbs = useBreadcrumbs();
  const { user } = useLayoutContext();

  return (
    <header
      className="fixed top-0 right-0 h-[64px] z-30 bg-white border-b border-[#e3e8ee] transition-all duration-200"
      style={{
        left: sidebarCollapsed ? '72px' : '240px',
      }}
    >
      <div className="h-full px-4 lg:px-6 flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 text-[#697386] hover:bg-[#f6f9fc] rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Greeting (desktop only) */}
        <UserGreeting />

        {/* Selectors */}
        <div className="flex items-center gap-3 flex-1">
          <ClientSelector />
          <PeriodSelector />
        </div>

        {/* Breadcrumbs (desktop) */}
        <nav className="hidden xl:flex items-center gap-1 text-[13px]">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-[#697386]" />}
              {crumb.isLast ? (
                <span className="text-[#1a1f36] font-medium">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-[#697386] hover:text-[#1a1f36] transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button className="relative p-2 text-[#697386] hover:bg-[#f6f9fc] rounded-md">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#cd3d64] rounded-full" />
          </button>

          {/* User Avatar */}
          {user && (
            <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#f6f9fc] rounded-md">
              <div className="w-8 h-8 rounded-full bg-[#635bff] flex items-center justify-center text-white text-[12px] font-semibold">
                {user.initials}
              </div>
              <span className="hidden md:block text-[14px] font-medium text-[#1a1f36]">
                {user.name.split(' ')[0]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// Mobile-responsive TopBar that doesn't use left offset
export function MobileTopBar({ onMobileMenuToggle }: { onMobileMenuToggle: () => void }) {
  const { user } = useLayoutContext();

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-[64px] z-30 bg-white border-b border-[#e3e8ee]">
      <div className="h-full px-4 flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuToggle}
          className="p-2 text-[#697386] hover:bg-[#f6f9fc] rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <span className="text-[18px] font-bold text-[#1a1f36]">LYNTOS</span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notifications */}
        <button className="relative p-2 text-[#697386] hover:bg-[#f6f9fc] rounded-md">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#cd3d64] rounded-full" />
        </button>

        {/* User Avatar */}
        {user && (
          <div className="w-8 h-8 rounded-full bg-[#635bff] flex items-center justify-center text-white text-[12px] font-semibold">
            {user.initials}
          </div>
        )}
      </div>
    </header>
  );
}
