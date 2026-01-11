'use client';

/**
 * LYNTOS Sidebar Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Collapsible sidebar with Stripe styling (240px/72px)
 */
import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { NAVIGATION } from './navigation';
import { SidebarItem } from './SidebarItem';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col fixed left-0 top-0 h-full z-40
          bg-[#f6f9fc]
          border-r border-[#e3e8ee]
          transition-all duration-200 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}
        `}
      >
        {/* Logo */}
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-[#e3e8ee]">
          {!collapsed && (
            <span className="text-[20px] font-bold text-[#1a1f36] tracking-tight">
              LYNTOS
            </span>
          )}
          {collapsed && (
            <span className="text-[20px] font-bold text-[#635bff] mx-auto">L</span>
          )}

          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-md text-[#697386] hover:bg-[#e3e8ee] transition-colors ${collapsed ? 'mx-auto' : ''}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {NAVIGATION.map((section) => (
            <div key={section.id}>
              {section.label && !collapsed && (
                <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
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
        {!collapsed && (
          <div className="p-4 border-t border-[#e3e8ee]">
            <div className="text-[11px] text-[#697386]">
              LYNTOS v2.0 © 2025
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`
          lg:hidden fixed left-0 top-0 h-full z-50 w-[280px]
          bg-[#f6f9fc]
          border-r border-[#e3e8ee]
          transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile Header */}
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-[#e3e8ee]">
          <span className="text-[20px] font-bold text-[#1a1f36] tracking-tight">
            LYNTOS
          </span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-md text-[#697386] hover:bg-[#e3e8ee] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          {NAVIGATION.map((section) => (
            <div key={section.id}>
              {section.label && (
                <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
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
        <div className="p-4 border-t border-[#e3e8ee]">
          <div className="text-[11px] text-[#697386]">
            LYNTOS v2.0 © 2025
          </div>
        </div>
      </aside>
    </>
  );
}
