'use client';
import React, { useState } from 'react';

type Priority = 'P0' | 'P1' | 'P2';

interface DashboardSectionProps {
  id?: string;
  title: string;
  icon: React.ReactNode;
  priority?: Priority;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const PRIORITY_STYLES: Record<Priority, { border: string; badge: string }> = {
  P0: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700' },
  P1: { border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700' },
  P2: { border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700' },
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
}: DashboardSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const priorityStyle = priority ? PRIORITY_STYLES[priority] : null;

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
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {priority && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityStyle?.badge}`}>
              {priority}
            </span>
          )}
        </div>

        {collapsible && (
          <span className="text-slate-500 text-sm">
            {collapsed ? '▼ Goster' : '▲ Gizle'}
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
