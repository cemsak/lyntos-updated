'use client';

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';
import { Card } from '../shared/Card';
import { RiskReviewList } from './RiskReviewList';
import { MOCK_RISK_QUEUE, MOCK_QUEUE_STATS } from './mockData';
import type { RiskReviewItem, RiskQueueStats } from './types';
import { RISK_LEVEL_CONFIG } from './types';

interface RiskReviewQueueProps {
  onItemSelect?: (item: RiskReviewItem) => void;
  items?: RiskReviewItem[];
  stats?: RiskQueueStats;
}

function QueueStats({ stats }: { stats: RiskQueueStats }) {
  return (
    <div className="grid grid-cols-5 gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      {[
        { key: 'kritik', label: 'Kritik', count: stats.kritik, cfg: RISK_LEVEL_CONFIG.kritik },
        { key: 'yuksek', label: 'Yüksek', count: stats.yuksek, cfg: RISK_LEVEL_CONFIG.yuksek },
        { key: 'orta', label: 'Orta', count: stats.orta, cfg: RISK_LEVEL_CONFIG.orta },
        { key: 'dusuk', label: 'Düşük', count: stats.dusuk, cfg: RISK_LEVEL_CONFIG.dusuk },
        { key: 'bekleyen', label: 'Bekleyen', count: stats.bekleyen, cfg: null },
      ].map(({ key, label, count, cfg }) => (
        <div key={key} className="text-center p-2 rounded-lg bg-white dark:bg-slate-700">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {cfg && <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />}
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          </div>
          <div className={`text-2xl font-bold ${cfg?.color || 'text-slate-700 dark:text-slate-200'}`}>{count}</div>
        </div>
      ))}
    </div>
  );
}

export function RiskReviewQueue({ onItemSelect, items = MOCK_RISK_QUEUE, stats = MOCK_QUEUE_STATS }: RiskReviewQueueProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleItemClick = (item: RiskReviewItem) => {
    setSelectedId(item.id);
    onItemSelect?.(item);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsRefreshing(false);
  };

  return (
    <Card
      title={<span className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-amber-500" />VDK Risk İnceleme Kuyruğu</span>}
      subtitle={`${stats.bekleyen} mükellef inceleme bekliyor`}
      headerAction={
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50" title="Yenile">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Excel'e Aktar">
            <Download className="w-4 h-4" />
          </button>
        </div>
      }
      noPadding
    >
      <QueueStats stats={stats} />
      <div className="h-[500px]">
        <RiskReviewList items={items} onItemClick={handleItemClick} selectedId={selectedId} keyboardNav />
      </div>
    </Card>
  );
}
