'use client';

/**
 * LYNTOS Sidebar Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Collapsible sidebar with Stripe styling (240px/72px)
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, X, LogOut } from 'lucide-react';
import { NAVIGATION } from './navigation';
import { SidebarItem } from './SidebarItem';
import { clearAuthToken } from '../../_lib/auth';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    clearAuthToken();
    router.push('/v2/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col fixed left-0 top-0 h-full z-40
          bg-[#F5F6F8]
          border-r border-[#E5E5E5]
          transition-all duration-200 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}
        `}
      >
        {/* Logo */}
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-[#E5E5E5]">
          {!collapsed && (
            <span className="text-[20px] font-bold text-[#2E2E2E] tracking-tight">
              LYNTOS
            </span>
          )}
          {collapsed && (
            <span className="text-[20px] font-bold text-[#0049AA] mx-auto">L</span>
          )}

          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-md text-[#5A5A5A] hover:bg-[#E5E5E5] transition-colors ${collapsed ? 'mx-auto' : ''}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {NAVIGATION.map((section) => (
            <div key={section.id}>
              {section.label && !collapsed && (
                <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5A5A5A]">
                  {section.label}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarItem key={item.id} item={item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#E5E5E5]">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-[#5A5A5A] hover:bg-[#E5E5E5] hover:text-[#BF192B] transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
            title="Çıkış Yap"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Çıkış Yap</span>}
          </button>
          {!collapsed && (
            <div className="text-[11px] text-[#5A5A5A] mt-2 px-3">
              LYNTOS v2.0 © {new Date().getFullYear()}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`
          lg:hidden fixed left-0 top-0 h-full z-50 w-[280px]
          bg-[#F5F6F8]
          border-r border-[#E5E5E5]
          transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile Header */}
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-[#E5E5E5]">
          <span className="text-[20px] font-bold text-[#2E2E2E] tracking-tight">
            LYNTOS
          </span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-md text-[#5A5A5A] hover:bg-[#E5E5E5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {NAVIGATION.map((section) => (
            <div key={section.id}>
              {section.label && (
                <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5A5A5A]">
                  {section.label}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarItem key={item.id} item={item} collapsed={false} onClick={onCloseMobile} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Mobile Footer */}
        <div className="p-3 border-t border-[#E5E5E5]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-[#5A5A5A] hover:bg-[#E5E5E5] hover:text-[#BF192B] transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Çıkış Yap</span>
          </button>
          <div className="text-[11px] text-[#5A5A5A] mt-2 px-3">
            LYNTOS v2.0 © {new Date().getFullYear()}
          </div>
        </div>
      </aside>
    </>
  );
}
