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
  loading: { icon: '', bg: 'bg-[#F5F6F8]', text: 'text-[#5A5A5A]' },
  ok: { icon: '', bg: 'bg-white', text: 'text-[#2E2E2E]' },
  empty: { icon: '', bg: 'bg-[#F5F6F8]', text: 'text-[#969696]' },
  missing: { icon: '', bg: 'bg-[#FFFBEB]', text: 'text-[#FA841E]' },
  scope: { icon: '', bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]' },
  auth: { icon: '', bg: 'bg-[#FEF2F2]', text: 'text-[#BF192B]' },
  error: { icon: '', bg: 'bg-[#FEF2F2]', text: 'text-[#BF192B]' },
};

export function PanelState({ status, reason_tr, onRetry, children }: PanelStateProps) {
  const c = STATUS_CONFIG[status];

  if (status === 'ok') return <>{children}</>;

  if (status === 'loading') {
    return (
      <div className={`${c.bg} rounded-lg p-4 flex items-center justify-center min-h-[100px]`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin h-5 w-5 border-2 border-[#969696] border-t-transparent rounded-full" />
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
    scope: 'i',
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
            <button onClick={onRetry} className="mt-2 text-sm text-[#0049AA] hover:text-[#00287F] underline">
              Tekrar Dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PanelStatusBadge({ status }: { status: PanelStatus }) {
  const colors: Record<PanelStatus, string> = {
    loading: 'bg-[#F5F6F8] text-[#5A5A5A]',
    ok: 'bg-[#ECFDF5] text-[#00804D]',
    empty: 'bg-[#F5F6F8] text-[#969696]',
    missing: 'bg-[#FFFBEB] text-[#FA841E]',
    scope: 'bg-[#E6F9FF] text-[#0049AA]',
    auth: 'bg-[#FEF2F2] text-[#BF192B]',
    error: 'bg-[#FEF2F2] text-[#BF192B]',
  };
  const labels: Record<PanelStatus, string> = {
    loading: 'Yukleniyor',
    ok: 'Tamam',
    empty: 'Veri Yok',
    missing: 'Eksik',
    scope: 'Kapsam Gerekli',
    auth: 'Yetki Hatasi',
    error: 'Hata',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}
