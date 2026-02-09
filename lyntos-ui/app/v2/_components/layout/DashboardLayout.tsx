'use client';
import React, { useState } from 'react';

type Priority = 'P0' | 'P1' | 'P2';
type Variant = 'default' | 'urgent' | 'dark';

interface DashboardSectionProps {
  id?: string;
  title: string;
  icon: React.ReactNode;
  priority?: Priority;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  variant?: Variant;
  badge?: React.ReactNode;
}

const PRIORITY_STYLES: Record<Priority, { border: string; badge: string }> = {
  P0: { border: 'border-l-[#F0282D]', badge: 'bg-[#FEF2F2] text-[#BF192B]' },
  P1: { border: 'border-l-[#FFB114]', badge: 'bg-[#FFFBEB] text-[#FA841E]' },
  P2: { border: 'border-l-[#0078D0]', badge: 'bg-[#E6F9FF] text-[#0049AA]' },
};

// TÜM VARIANT'LAR BEYAZ TEMALI
const VARIANT_STYLES: Record<Variant, { container: string; title: string; iconBox: string }> = {
  default: {
    container: '',
    title: 'text-[#2E2E2E]',
    iconBox: '',
  },
  urgent: {
    container: 'bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm',
    title: 'text-[#2E2E2E] text-xl font-bold',
    iconBox: 'w-12 h-12 bg-[#FEF2F2] rounded-xl flex items-center justify-center',
  },
  dark: {
    container: 'bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm',
    title: 'text-[#2E2E2E] text-xl font-black',
    iconBox: 'w-12 h-12 bg-[#F5F6F8] rounded-xl flex items-center justify-center',
  },
};

export function DashboardSection({
  id,
  title,
  icon,
  priority,
  children,
  className = '',
  collapsible = false,
  defaultCollapsed = false,
  variant = 'default',
  badge,
}: DashboardSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const priorityStyle = priority ? PRIORITY_STYLES[priority] : null;
  const variantStyle = VARIANT_STYLES[variant];

  // For urgent/dark variants, use special layout
  if (variant !== 'default') {
    return (
      <section id={id} className={`scroll-mt-20 ${variantStyle.container} ${className}`}>
        {/* Section Header */}
        <div
          className={`flex items-center justify-between mb-5 ${collapsible ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
        >
          <div className="flex items-center gap-4">
            <div className={variantStyle.iconBox}>
              {icon}
            </div>
            <div>
              <h2 className={variantStyle.title}>{title}</h2>
              {variant === 'urgent' && (
                <p className="text-[#969696] text-sm">Acil işler ve bekleyen görevler</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {badge}
            {collapsible && (
              <span className="text-[#969696] text-sm">
                {collapsed ? '▼ Göster' : '▲ Gizle'}
              </span>
            )}
          </div>
        </div>

        {/* Section Content */}
        {!collapsed && children}
      </section>
    );
  }

  // Default variant
  return (
    <section
      id={id}
      className={`scroll-mt-20 ${priorityStyle ? `border-l-4 ${priorityStyle.border} pl-4` : ''} ${className}`}
    >
      {/* Section Header */}
      <div
        className={`flex items-center justify-between mb-4 ${collapsible ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold text-[#2E2E2E]">{title}</h2>
          {priority && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityStyle?.badge}`}>
              {priority}
            </span>
          )}
        </div>

        {collapsible && (
          <span className="text-[#969696] text-sm">
            {collapsed ? '▼ Göster' : '▲ Gizle'}
          </span>
        )}
      </div>

      {/* Section Content */}
      {!collapsed && children}
    </section>
  );
}

// Scroll helper
export function scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
