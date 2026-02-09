'use client';
/**
 * LYNTOS Risk Review Queue Component
 * Sprint MOCK-006: Connected to real API via useRiskReviewQueue hook
 */

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Download, Loader2 } from 'lucide-react';
import { Card } from '../shared/Card';
import { RiskReviewList } from './RiskReviewList';
import { useRiskReviewQueue } from './useRiskReviewQueue';
import type { RiskReviewItem, RiskQueueStats } from './types';
import { RISK_LEVEL_CONFIG } from './types';

interface RiskReviewQueueProps {
  onItemSelect?: (item: RiskReviewItem) => void;
}

function QueueStats({ stats }: { stats: RiskQueueStats }) {
  return (
    <div className="grid grid-cols-5 gap-2 p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
      {[
        { key: 'kritik', label: 'Kritik', count: stats.kritik, cfg: RISK_LEVEL_CONFIG.kritik },
        { key: 'yuksek', label: 'Yuksek', count: stats.yuksek, cfg: RISK_LEVEL_CONFIG.yuksek },
        { key: 'orta', label: 'Orta', count: stats.orta, cfg: RISK_LEVEL_CONFIG.orta },
        { key: 'dusuk', label: 'Dusuk', count: stats.dusuk, cfg: RISK_LEVEL_CONFIG.dusuk },
        { key: 'bekleyen', label: 'Bekleyen', count: stats.bekleyen, cfg: null },
      ].map(({ key, label, count, cfg }) => (
        <div key={key} className="text-center p-2 rounded-lg bg-white">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {cfg && <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />}
            <span className="text-xs text-[#969696]">{label}</span>
          </div>
          <div className={`text-2xl font-bold ${cfg?.color || 'text-[#5A5A5A]'}`}>{count}</div>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-[#F5F6F8] rounded-lg">
          <div className="w-12 h-12 bg-[#E5E5E5] rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#E5E5E5] rounded w-3/4" />
            <div className="h-3 bg-[#E5E5E5] rounded w-1/2" />
          </div>
          <div className="w-16 h-8 bg-[#E5E5E5] rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-8 text-center">
      <AlertCircle className="w-12 h-12 text-[#FFB114] mx-auto mb-4" />
      <p className="text-[#5A5A5A] mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors"
      >
        Tekrar Dene
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">✓</span>
      </div>
      <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">
        Inceleme Kuyrugu Bos
      </h3>
      <p className="text-[#5A5A5A]">
        Su anda inceleme bekleyen risk bulgusu yok.
      </p>
    </div>
  );
}

export function RiskReviewQueue({ onItemSelect }: RiskReviewQueueProps) {
  const { items, stats, isLoading, error, refresh } = useRiskReviewQueue();
  const [selectedId, setSelectedId] = useState<string>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleItemClick = (item: RiskReviewItem) => {
    setSelectedId(item.id);
    onItemSelect?.(item);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  return (
    <Card
      title={<span className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-[#FFB114]" />VDK Risk İnceleme Kuyruğu</span>}
      subtitle={isLoading ? 'Yükleniyor...' : `${stats.bekleyen} mükellef inceleme bekliyor`}
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="p-2 text-[#969696] hover:text-[#5A5A5A] hover:bg-[#F5F6F8] rounded-lg disabled:opacity-50"
            title="Yenile"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            )}
          </button>
          <button
            className="p-2 text-[#969696] hover:text-[#5A5A5A] hover:bg-[#F5F6F8] rounded-lg"
            title="Excel'e Aktar"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      }
      noPadding
    >
      <QueueStats stats={stats} />
      <div className="h-[500px]">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <RiskReviewList items={items} onItemClick={handleItemClick} selectedId={selectedId} keyboardNav />
        )}
      </div>
    </Card>
  );
}
