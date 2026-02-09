'use client';
import React, { ReactNode } from 'react';
import { useDashboardScope } from './ScopeProvider';
import { Info, Lock, Unlock } from 'lucide-react';

interface DataEntryGuardProps {
  children: ReactNode;
  /** If true, blocks data entry even when scope is complete */
  locked?: boolean;
  /** Custom message when locked */
  lockedMessage?: string;
  /** Show in compact mode (no description) */
  compact?: boolean;
}

/**
 * DataEntryGuard - Protects data entry sections
 *
 * Behavior:
 * - If scope is incomplete: Shows warning + blocks interaction
 * - If locked=true: Shows lock icon + blocks interaction
 * - If scope complete + not locked: Renders children normally
 */
export function DataEntryGuard({
  children,
  locked = false,
  lockedMessage = 'Bu dönem kilitlendi, düzenleme yapılamaz.',
  compact = false,
}: DataEntryGuardProps) {
  const { scope, isReady } = useDashboardScope();

  // Check if scope is complete
  const scopeComplete = isReady && Boolean(scope.smmm_id && scope.client_id && scope.period);

  // Scope incomplete - show warning
  if (!scopeComplete) {
    return (
      <div className="relative">
        {/* Overlay */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
          <div className={`text-center ${compact ? 'p-4' : 'p-8'}`}>
            <Info className="w-8 h-8 text-[#0078D0] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#2E2E2E]">
              Mükellef ve Dönem Seçin
            </p>
            {!compact && (
              <p className="text-xs text-[#969696] mt-1 max-w-xs">
                İşlem yapmak için üstteki menülerden mükellef ve dönem seçiniz.
              </p>
            )}
          </div>
        </div>

        {/* Blurred children */}
        <div className="pointer-events-none select-none opacity-50 blur-[2px]">
          {children}
        </div>
      </div>
    );
  }

  // Period locked - show lock
  if (locked) {
    return (
      <div className="relative">
        {/* Overlay */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
          <div className={`text-center ${compact ? 'p-4' : 'p-8'}`}>
            <Lock className="w-8 h-8 text-[#969696] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#2E2E2E]">
              Dönem Kilitli
            </p>
            {!compact && (
              <p className="text-xs text-[#969696] mt-1 max-w-xs">
                {lockedMessage}
              </p>
            )}
          </div>
        </div>

        {/* Blurred children */}
        <div className="pointer-events-none select-none opacity-50 blur-[2px]">
          {children}
        </div>
      </div>
    );
  }

  // All good - render normally
  return <>{children}</>;
}

/**
 * DataEntryStatus - Shows current data entry status inline
 */
export function DataEntryStatus({ locked = false }: { locked?: boolean }) {
  const { scope, isReady } = useDashboardScope();
  const scopeComplete = isReady && Boolean(scope.smmm_id && scope.client_id && scope.period);

  if (!scopeComplete) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#0078D0]">
        <Info className="w-3 h-3" />
        Mükellef ve dönem seçin
      </span>
    );
  }

  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#969696]">
        <Lock className="w-3 h-3" />
        Kilitli
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#00804D]">
      <Unlock className="w-3 h-3" />
      Düzenlenebilir
    </span>
  );
}
