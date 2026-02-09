import React from 'react';
import { TYPE_COLORS } from './regwatch-types';

export function TypeBadge({ type, label }: { type: string; label?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[type] || 'bg-[#F5F6F8] text-[#2E2E2E]'}`}>
      {label || type}
    </span>
  );
}
