import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  badge,
  children
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  badge: string;
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] mb-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F5F6F8] transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-[#2E2E2E]">{title}</span>
          <span className="px-2 py-0.5 bg-[#F5F6F8] text-[#5A5A5A] text-xs rounded-full">{badge}</span>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-[#969696]" /> : <ChevronRight className="w-5 h-5 text-[#969696]" />}
      </button>
      {expanded && (
        <div className="px-6 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
