'use client';

/**
 * DataFreshness - Veri tazeliği göstergesi
 *
 * Her sayfanın altında veya üstünde son veri yükleme zamanını gösterir.
 * API'den `son_yukleme` veya response header'dan alınabilir.
 */

import { Clock } from 'lucide-react';

interface DataFreshnessProps {
  /** ISO date string of last data load */
  lastUpdated?: string | null;
  /** Optional label */
  label?: string;
}

export function DataFreshness({ lastUpdated, label = 'Son güncelleme' }: DataFreshnessProps) {
  if (!lastUpdated) return null;

  const date = new Date(lastUpdated);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relativeTime: string;
  if (diffMin < 1) {
    relativeTime = 'Az önce';
  } else if (diffMin < 60) {
    relativeTime = `${diffMin} dk önce`;
  } else if (diffHours < 24) {
    relativeTime = `${diffHours} saat önce`;
  } else {
    relativeTime = `${diffDays} gün önce`;
  }

  const isStale = diffHours > 24;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
      isStale
        ? 'bg-[#FFFBEB] text-[#FA841E]'
        : 'bg-[#F5F6F8] text-[#969696]'
    }`}>
      <Clock className="w-3 h-3" />
      <span>{label}: {relativeTime}</span>
      <span className="text-[10px] opacity-60">
        ({date.toLocaleDateString('tr-TR')} {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })})
      </span>
    </div>
  );
}
