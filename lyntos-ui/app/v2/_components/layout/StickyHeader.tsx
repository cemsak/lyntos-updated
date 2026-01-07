'use client';
import React from 'react';
import { ScopeSelector } from '../scope/ScopeSelector';
import { useDashboardScope } from '../scope/useDashboardScope';
import { PdfExportButton } from '../pdf/PdfExportButton';

export function StickyHeader() {
  const { scope, setScope } = useDashboardScope();

  return (
    <header className="sticky top-0 z-50 bg-lyntos-bg-secondary border-b border-lyntos-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-lyntos-text-primary">LYNTOS</h1>
            <span className="text-xs text-lyntos-accent bg-lyntos-bg-elevated px-2 py-0.5 rounded font-semibold">v2</span>
          </div>

          <div className="flex-1 max-w-2xl">
            <ScopeSelector />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-lyntos-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={scope.advanced}
                onChange={(e) => setScope({ advanced: e.target.checked })}
                className="w-4 h-4 rounded border-lyntos-border bg-lyntos-bg-input text-lyntos-accent focus:ring-lyntos-accent"
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
