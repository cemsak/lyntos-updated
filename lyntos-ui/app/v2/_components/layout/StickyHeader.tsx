'use client';
import React from 'react';
import { ScopeSelector } from '../scope/ScopeSelector';
import { useDashboardScope } from '../scope/useDashboardScope';
import { PdfExportButton } from '../pdf/PdfExportButton';

export function StickyHeader() {
  const { scope, setScope } = useDashboardScope();

  return (
    <header className="sticky top-0 z-50 bg-[#F5F6F8] border-b border-[#E5E5E5] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-[#2E2E2E]">LYNTOS</h1>
          </div>

          <div className="flex-1 max-w-2xl">
            <ScopeSelector />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#5A5A5A] cursor-pointer">
              <input
                type="checkbox"
                checked={scope.advanced}
                onChange={(e) => setScope({ advanced: e.target.checked })}
                className="w-4 h-4 rounded border-[#E5E5E5] bg-[#F5F6F8] text-[#0078D0] focus:ring-[#0078D0]"
              />
              <span>Uzman Modu</span>
            </label>
            <PdfExportButton />
          </div>
        </div>
      </div>
    </header>
  );
}
