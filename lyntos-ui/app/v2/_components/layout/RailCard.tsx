'use client';

/**
 * RailCard
 * Compact status card used in the RightRail panel
 */

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface RailCardProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  status?: 'danger' | 'warning' | 'success' | 'neutral';
  href?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const STATUS_COLORS = {
  danger: 'border-l-[#F0282D] bg-[#FEF2F2]/50',
  warning: 'border-l-[#FFB114] bg-[#FFFBEB]/50',
  success: 'border-l-[#00A651] bg-[#ECFDF5]/50',
  neutral: 'border-l-[#B4B4B4] bg-[#F5F6F8]/50',
};

const VALUE_COLORS = {
  danger: 'text-[#BF192B]',
  warning: 'text-[#FA841E]',
  success: 'text-[#00804D]',
  neutral: 'text-[#969696]',
};

export function RailCard({ title, icon, value, status = 'neutral', href, onClick, children }: RailCardProps) {
  const content = (
    <div className={`border-l-4 rounded-r-lg p-3 ${STATUS_COLORS[status]} ${(href || onClick) ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#969696]">{icon}</span>
          <span className="text-[11px] font-semibold text-[#5A5A5A] uppercase tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-lg font-bold tabular-nums ${VALUE_COLORS[status]}`}>{value}</span>
          {href && <ChevronRight className="w-4 h-4 text-[#969696]" />}
        </div>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default RailCard;
