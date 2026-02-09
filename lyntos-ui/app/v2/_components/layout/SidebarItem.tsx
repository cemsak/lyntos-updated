'use client';

/**
 * LYNTOS Sidebar Item Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Single navigation item with Stripe styling
 */
import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from './navigation';
import { useLayoutContext } from './useLayoutContext';

interface SidebarItemProps {
  item: NavItem;
  collapsed?: boolean;
  onClick?: () => void;
}

const BADGE_COLORS = {
  danger: 'bg-[#980F30]',     // LYNTOS Risk Critical (Karteladan)
  warning: 'bg-[#FFB114]',    // LYNTOS Risk Medium (Karteladan)
  info: 'bg-[#0049AA]',       // LYNTOS Primary Blue
};

export function SidebarItem({ item, collapsed = false, onClick }: SidebarItemProps) {
  const pathname = usePathname();
  const { selectedPeriod } = useLayoutContext();

  // Support hash anchors: /v2#section should be active when pathname is /v2
  const baseHref = item.href.split('#')[0];
  const hashPart = item.href.includes('#') ? item.href.split('#')[1] : null;
  const isActive = pathname === baseHref || (baseHref !== '' && pathname.startsWith(baseHref + '/'));
  const Icon = item.icon;

  // Dinamik dönem etiketi: "2025 Q1 Beyanname Özet & Risk Kontrolü"
  const displayLabel = useMemo(() => {
    if (item.dynamicLabel && selectedPeriod?.label) {
      return `${selectedPeriod.label} ${item.label}`;
    }
    return item.label;
  }, [item.dynamicLabel, item.label, selectedPeriod?.label]);

  // Handle smooth scroll for same-page hash navigation
  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // If href has a hash and we're already on that base path
    if (hashPart && pathname === baseHref) {
      const targetElement = document.getElementById(hashPart);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update URL hash without triggering navigation
        window.history.pushState(null, '', item.href);
      }
      // If element doesn't exist, let default navigation happen
    }
    // Call parent onClick if provided
    onClick?.();
  }, [hashPart, pathname, baseHref, item.href, onClick]);

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium transition-colors
        ${isActive
          ? 'bg-[#0049AA] text-white'
          : 'text-[#2E2E2E] hover:bg-[#E5E5E5]'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
      title={collapsed ? displayLabel : undefined}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />

      {!collapsed && (
        <>
          <span className="flex-1">{displayLabel}</span>

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
