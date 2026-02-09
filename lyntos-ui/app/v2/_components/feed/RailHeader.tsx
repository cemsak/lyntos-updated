'use client';

import React from 'react';
import { X } from 'lucide-react';
import { type FeedItem, SEVERITY_CONFIG, CATEGORY_CONFIG } from './types';

interface RailHeaderProps {
  item: FeedItem;
  closeButtonRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
}

export function RailHeader({ item, closeButtonRef, onClose }: RailHeaderProps) {
  const severityConfig = SEVERITY_CONFIG[item.severity];
  const categoryConfig = CATEGORY_CONFIG[item.category];

  return (
    <div className="flex-shrink-0 border-b border-[#E5E5E5] p-4">
      {/* Close button */}
      <button
        ref={closeButtonRef}
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#F5F6F8] text-[#969696] hover:text-[#5A5A5A] transition-colors"
        aria-label="Kapat"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Category + Severity badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3 pr-10">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${categoryConfig.color} bg-[#F5F6F8]`}
        >
          <span>{categoryConfig.icon}</span>
          {categoryConfig.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${severityConfig.color} ${severityConfig.bgColor}`}
        >
          <span>{severityConfig.icon}</span>
          {severityConfig.label}
        </span>
      </div>

      {/* Title */}
      <h2
        id="rail-title"
        className="text-lg font-bold text-[#2E2E2E] leading-tight"
      >
        {item.title}
      </h2>

      {/* Summary */}
      <p className="text-sm text-[#5A5A5A] mt-2 leading-relaxed">
        {item.summary}
      </p>
    </div>
  );
}
