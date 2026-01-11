'use client';

/**
 * LYNTOS Sidebar Item Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Single navigation item with Stripe styling
 */
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from './navigation';

interface SidebarItemProps {
  item: NavItem;
  collapsed?: boolean;
  onClick?: () => void;
}

const BADGE_COLORS = {
  danger: 'bg-[#cd3d64]',
  warning: 'bg-[#f5a623]',
  info: 'bg-[#635bff]',
};

export function SidebarItem({ item, collapsed = false, onClick }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium transition-colors
        ${isActive
          ? 'bg-[#635bff] text-white'
          : 'text-[#1a1f36] hover:bg-[#e3e8ee]'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />

      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>

          {item.badge !== undefined && item.badge > 0 && (
            <span className={`
              min-w-[20px] h-5 px-1.5 rounded-full text-[12px] font-semibold
              flex items-center justify-center text-white
              ${isActive ? 'bg-white/20' : BADGE_COLORS[item.badgeColor || 'danger']}
            `}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
