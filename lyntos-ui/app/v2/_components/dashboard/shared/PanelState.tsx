/**
 * PanelState - Universal state renderer for all panels
 * Handles: Loading, Error, Empty, Missing, Auth states
 *
 * Rule: Every panel uses this for non-ok states
 */

'use client';

import React from 'react';
import type { PanelEnvelope } from '../types';
import { presets } from '../design-tokens';
import {
  Loader2,
  AlertCircle,
  FileQuestion,
  Lock,
  Inbox,
  Info,
  RefreshCw
} from 'lucide-react';

// ============================================
// PROPS
// ============================================
interface PanelStateProps<T> {
  envelope: PanelEnvelope<T>;
  children: (data: T) => React.ReactNode;
  /** Custom loading skeleton */
  loadingSkeleton?: React.ReactNode;
  /** Minimum height for the panel */
  minHeight?: string;
  /** Custom class names */
  className?: string;
}

// ============================================
// STATE RENDERERS
// ============================================

interface StateRendererProps {
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  minHeight?: string;
}

function LoadingState({ minHeight = '200px' }: { minHeight?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-[#969696]"
      style={{ minHeight }}
    >
      <Loader2 className="w-8 h-8 animate-spin mb-3" />
      <p className="text-sm">Yükleniyor...</p>
    </div>
  );
}

function ErrorState({ message, action, minHeight = '200px' }: StateRendererProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-4"
      style={{ minHeight }}
    >
      <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6 text-[#F0282D]" />
      </div>
      <p className="text-sm font-medium text-[#5A5A5A] mb-1">Bir hata oluştu</p>
      <p className="text-xs text-[#969696] mb-3">{message || 'Lütfen tekrar deneyin'}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={`${presets.button.secondary} text-xs flex items-center gap-1`}
        >
          <RefreshCw className="w-3 h-3" />
          {action.label}
        </button>
      )}
    </div>
  );
}

function EmptyState({ message, minHeight = '200px' }: StateRendererProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-4"
      style={{ minHeight }}
    >
      <div className="w-12 h-12 rounded-full bg-[#F5F6F8] flex items-center justify-center mb-3">
        <Inbox className="w-6 h-6 text-[#969696]" />
      </div>
      <p className="text-sm font-medium text-[#5A5A5A] mb-1">Veri bulunamadı</p>
      <p className="text-xs text-[#969696]">{message || 'Bu dönem için kayıt yok'}</p>
    </div>
  );
}

function MissingState({ message, action, minHeight = '200px' }: StateRendererProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-4"
      style={{ minHeight }}
    >
      <div className="w-12 h-12 rounded-full bg-[#FFFBEB] flex items-center justify-center mb-3">
        <FileQuestion className="w-6 h-6 text-[#FFB114]" />
      </div>
      <p className="text-sm font-medium text-[#5A5A5A] mb-1">Eksik Veri</p>
      <p className="text-xs text-[#969696] mb-3">{message || 'Gerekli belgeler yüklenmemiş'}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={`${presets.button.primary} text-xs`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function AuthState({ message, minHeight = '200px' }: StateRendererProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-4"
      style={{ minHeight }}
    >
      <div className="w-12 h-12 rounded-full bg-[#F5F6F8] flex items-center justify-center mb-3">
        <Lock className="w-6 h-6 text-[#969696]" />
      </div>
      <p className="text-sm font-medium text-[#5A5A5A] mb-1">Yetki Gerekli</p>
      <p className="text-xs text-[#969696]">{message || 'Bu içeriği görüntüleme yetkiniz yok'}</p>
    </div>
  );
}

function ScopeState({ message, minHeight = '200px' }: StateRendererProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-4"
      style={{ minHeight }}
    >
      <div className="w-12 h-12 rounded-full bg-[#E6F9FF] flex items-center justify-center mb-3">
        <Info className="w-6 h-6 text-[#0078D0]" />
      </div>
      <p className="text-sm font-medium text-[#00287F] mb-1">Mükellef ve Dönem Seçin</p>
      <p className="text-xs text-[#0049AA]">{message || 'Verileri görüntülemek için üstteki menülerden seçim yapın.'}</p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function PanelState<T>({
  envelope,
  children,
  loadingSkeleton,
  minHeight = '200px',
}: PanelStateProps<T>) {

  // Handle each status
  switch (envelope.status) {
    case 'loading':
      return loadingSkeleton ? <>{loadingSkeleton}</> : <LoadingState minHeight={minHeight} />;

    case 'error':
      return (
        <ErrorState
          message={envelope.message}
          action={envelope.action}
          minHeight={minHeight}
        />
      );

    case 'empty':
      return (
        <EmptyState
          message={envelope.message}
          minHeight={minHeight}
        />
      );

    case 'missing':
      return (
        <MissingState
          message={envelope.message}
          action={envelope.action}
          minHeight={minHeight}
        />
      );

    case 'scope':
      return (
        <ScopeState
          message={envelope.message}
          minHeight={minHeight}
        />
      );

    case 'auth':
      return (
        <AuthState
          message={envelope.message}
          minHeight={minHeight}
        />
      );

    case 'ok':
      if (envelope.data === null) {
        return <EmptyState minHeight={minHeight} />;
      }
      return <>{children(envelope.data)}</>;

    default:
      return <ErrorState message="Bilinmeyen durum" minHeight={minHeight} />;
  }
}

// ============================================
// LOADING SKELETONS
// ============================================
export function KpiCardSkeleton() {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-4 bg-[#E5E5E5] rounded w-24"></div>
        <div className="h-5 bg-[#E5E5E5] rounded w-16"></div>
      </div>
      <div className="h-8 bg-[#E5E5E5] rounded w-20 mb-2"></div>
      <div className="h-3 bg-[#F5F6F8] rounded w-32"></div>
    </div>
  );
}

export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#E5E5E5] rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-[#E5E5E5] rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-[#F5F6F8] rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-[#E5E5E5] mb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-[#E5E5E5] rounded flex-1"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-[#F5F6F8] rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Default export
export default PanelState;
