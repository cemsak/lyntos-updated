'use client';
import React from 'react';
import type { PanelStatus } from '../contracts/envelope';

interface PanelStateProps {
  status: PanelStatus;
  reason_tr: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

const STATUS_CONFIG: Record<PanelStatus, { icon: string; bg: string; text: string }> = {
  loading: { icon: '', bg: 'bg-slate-50', text: 'text-slate-600' },
  ok: { icon: '', bg: 'bg-white', text: 'text-slate-900' },
  empty: { icon: '', bg: 'bg-slate-50', text: 'text-slate-500' },
  missing: { icon: '', bg: 'bg-amber-50', text: 'text-amber-700' },
  auth: { icon: '', bg: 'bg-red-50', text: 'text-red-700' },
  error: { icon: '', bg: 'bg-red-50', text: 'text-red-700' },
};

export function PanelState({ status, reason_tr, onRetry, children }: PanelStateProps) {
  const c = STATUS_CONFIG[status];

  if (status === 'ok') return <>{children}</>;

  if (status === 'loading') {
    return (
      <div className={`${c.bg} rounded-lg p-4 flex items-center justify-center min-h-[100px]`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full" />
          <span className={c.text}>{reason_tr}</span>
        </div>
      </div>
    );
  }

  const icons: Record<PanelStatus, string> = {
    loading: '',
    ok: '',
    empty: 'O',
    missing: '!',
    auth: 'X',
    error: 'X',
  };

  return (
    <div className={`${c.bg} rounded-lg p-4 min-h-[100px]`}>
      <div className="flex items-start gap-3">
        <span className="text-lg font-bold">{icons[status]}</span>
        <div className="flex-1">
          <p className={`${c.text} text-sm`}>{reason_tr}</p>
          {onRetry && status === 'error' && (
            <button onClick={onRetry} className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline">
              Tekrar Dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: PanelStatus }) {
  const colors: Record<PanelStatus, string> = {
    loading: 'bg-slate-100 text-slate-600',
    ok: 'bg-green-100 text-green-700',
    empty: 'bg-slate-100 text-slate-500',
    missing: 'bg-amber-100 text-amber-700',
    auth: 'bg-red-100 text-red-700',
    error: 'bg-red-100 text-red-700',
  };
  const labels: Record<PanelStatus, string> = {
    loading: 'Yukleniyor',
    ok: 'Tamam',
    empty: 'Veri Yok',
    missing: 'Eksik',
    auth: 'Yetki Hatasi',
    error: 'Hata',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}
