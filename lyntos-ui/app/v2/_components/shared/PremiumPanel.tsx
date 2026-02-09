'use client';

/**
 * Premium Panel Component
 * LYNTOS Kokpit Premium UI Revizyonu
 * Glassmorphism tasarımlı, expand/collapse özellikli panel wrapper
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface PremiumPanelProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconGradient: string; // "from-[#00A651] to-[#00A651]"
  statusBadge?: React.ReactNode;
  defaultExpanded?: boolean;
  onOpenDetail?: () => void;
  detailHref?: string;
  children: React.ReactNode;
  summaryContent?: React.ReactNode; // Collapsed durumda gösterilecek özet
}

export function PremiumPanel({
  title,
  subtitle,
  icon,
  iconGradient,
  statusBadge,
  defaultExpanded = false,
  onOpenDetail,
  detailHref,
  children,
  summaryContent,
}: PremiumPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleDetailClick = () => {
    if (onOpenDetail) {
      onOpenDetail();
    } else if (detailHref) {
      window.location.href = detailHref;
    }
  };

  return (
    <div
      className={`
        bg-white/95 backdrop-blur-sm rounded-2xl
        border border-[#E5E5E5]/50 shadow-lg shadow-[#E5E5E5]/50
        transition-all duration-300
        hover:shadow-xl hover:border-[#B4B4B4]
        ${isExpanded ? 'ring-2 ring-[#0049AA]/20' : ''}
      `}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8]/80 to-white">
        <div className="flex items-center justify-between">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-3">
            <div
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center
                bg-gradient-to-br ${iconGradient} shadow-lg
              `}
            >
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#2E2E2E]">{title}</h3>
                {statusBadge}
              </div>
              {subtitle && (
                <p className="text-xs text-[#5A5A5A] mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Detail Button */}
            {(onOpenDetail || detailHref) && (
              <button
                onClick={handleDetailClick}
                className="
                  px-3 py-1.5 text-sm font-medium text-[#0049AA]
                  hover:bg-[#E6F9FF] rounded-lg transition-colors
                  flex items-center gap-1
                "
              >
                Detay
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="
                p-2 rounded-lg hover:bg-[#F5F6F8] transition-colors
                text-[#969696] hover:text-[#5A5A5A]
              "
              aria-label={isExpanded ? 'Daralt' : 'Genişlet'}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Content (Collapsed) */}
      {!isExpanded && summaryContent && (
        <div className="px-5 py-3 bg-[#F5F6F8]/50">
          {summaryContent}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}

// Variant Badge Component (Kartela Uyumlu)
// Not: StatusBadge ismi Badge.tsx'te iş akışı durumları için kullanılıyor
export function VariantBadge({
  variant,
  children
}: {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
}) {
  const variants = {
    success: 'bg-[#ECFDF5] text-[#00804D] border-[#6BDB83]',
    warning: 'bg-[#FFFBEB] text-[#E67324] border-[#FFE045]',
    danger: 'bg-[#FEF2F2] text-[#BF192B] border-[#FF9196]',
    info: 'bg-[#E6F9FF] text-[#0049AA] border-[#ABEBFF]',
    neutral: 'bg-[#F5F6F8] text-[#5A5A5A] border-[#E5E5E5]',
  };

  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5
      text-xs font-medium rounded-full border
      ${variants[variant]}
    `}>
      {children}
    </span>
  );
}

// Metric Card for Summary (Kartela Uyumlu)
export function MetricCard({
  icon,
  label,
  value,
  color = 'slate',
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: 'emerald' | 'amber' | 'red' | 'blue' | 'slate' | 'indigo' | 'purple';
  trend?: 'up' | 'down';
}) {
  const colors = {
    emerald: 'text-[#00804D] bg-[#ECFDF5]',
    amber: 'text-[#E67324] bg-[#FFFBEB]',
    red: 'text-[#BF192B] bg-[#FEF2F2]',
    blue: 'text-[#0049AA] bg-[#E6F9FF]',
    slate: 'text-[#5A5A5A] bg-[#F5F6F8]',
    indigo: 'text-[#0049AA] bg-[#E6F9FF]',
    purple: 'text-[#0049AA] bg-[#E6F9FF]',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${colors[color].split(' ')[1]}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color].split(' ')[1]} ${colors[color].split(' ')[0]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-[#5A5A5A] uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-1">
          <p className={`text-sm font-bold ${colors[color].split(' ')[0]}`}>{value}</p>
          {trend === 'up' && <span className="text-[#00A651] text-xs">↑</span>}
          {trend === 'down' && <span className="text-[#F0282D] text-xs">↓</span>}
        </div>
      </div>
    </div>
  );
}
