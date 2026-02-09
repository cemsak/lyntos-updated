'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { RiskReviewItem as RiskReviewItemType, RiskQueueFilters, RiskLevel } from './types';
import { RISK_LEVEL_CONFIG } from './types';
import { RiskReviewItem } from './RiskReviewItem';

interface RiskReviewListProps {
  items: RiskReviewItemType[];
  onItemClick?: (item: RiskReviewItemType) => void;
  selectedId?: string;
  keyboardNav?: boolean;
}

export function RiskReviewList({ items, onItemClick, selectedId, keyboardNav = true }: RiskReviewListProps) {
  const [filters, setFilters] = useState<RiskQueueFilters>({ sortBy: 'skor', sortOrder: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.mukellefAdi.toLowerCase().includes(q) || i.mukellefVkn?.includes(q) || i.topRiskFactors.some(f => f.kod.toLowerCase().includes(q)));
    }
    if (filters.riskLevel?.length) {
      result = result.filter(i => filters.riskLevel!.includes(i.riskLevel));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (filters.sortBy === 'skor') cmp = a.riskSkoru - b.riskSkoru;
      else if (filters.sortBy === 'tarih') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else cmp = a.mukellefAdi.localeCompare(b.mukellefAdi, 'tr');
      return filters.sortOrder === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [items, searchQuery, filters]);

  useEffect(() => {
    if (!keyboardNav) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(p => Math.min(p + 1, filteredItems.length - 1)); }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(p => Math.max(p - 1, 0)); }
      if (e.key === 'Enter' && focusedIndex >= 0) onItemClick?.(filteredItems[focusedIndex]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keyboardNav, filteredItems, focusedIndex, onItemClick]);

  const toggleRiskFilter = useCallback((level: RiskLevel) => {
    setFilters(p => {
      const cur = p.riskLevel || [];
      const next = cur.includes(level) ? cur.filter(l => l !== level) : [...cur, level];
      return { ...p, riskLevel: next.length ? next : undefined };
    });
  }, []);

  const toggleSort = useCallback((by: 'skor' | 'tarih' | 'mukellef') => {
    setFilters(p => ({ ...p, sortBy: by, sortOrder: p.sortBy === by && p.sortOrder === 'desc' ? 'asc' : 'desc' }));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filter */}
      <div className="p-4 border-b border-[#E5E5E5] bg-white">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#969696]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Mükellef, VKN veya K-kodu ara..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-[#E5E5E5] rounded-lg bg-white text-[#2E2E2E] placeholder:text-[#969696] focus:outline-none focus:ring-2 focus:ring-[#0078D0]"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(Object.entries(RISK_LEVEL_CONFIG) as [RiskLevel, typeof RISK_LEVEL_CONFIG.kritik][]).map(([level, cfg]) => {
              const active = filters.riskLevel?.includes(level);
              const count = items.filter(i => i.riskLevel === level).length;
              return (
                <button key={level} onClick={() => toggleRiskFilter(level)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${active ? `${cfg.bgColor} ${cfg.color} ring-2 ring-offset-1 ring-current` : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} /><span>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {(['skor', 'tarih'] as const).map(by => (
              <button key={by} onClick={() => toggleSort(by)}
                className={`px-2 py-1 text-xs rounded ${filters.sortBy === by ? 'bg-[#E6F9FF] text-[#0049AA]' : 'text-[#969696] hover:bg-[#F5F6F8]'}`}>
                {by === 'skor' ? 'Skor' : 'Tarih'} {filters.sortBy === by && (filters.sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-[#969696]">Sonuç bulunamadı</div>
        ) : (
          filteredItems.map((item, idx) => (
            <RiskReviewItem key={item.id} item={item} onClick={onItemClick} selected={item.id === selectedId || idx === focusedIndex} />
          ))
        )}
      </div>

      {/* Keyboard hint */}
      {keyboardNav && (
        <div className="p-2 text-center text-xs text-[#969696] border-t border-[#E5E5E5] bg-[#F5F6F8]">
          <kbd className="px-1.5 py-0.5 bg-[#E5E5E5] rounded text-[10px]">J</kbd>/<kbd className="px-1.5 py-0.5 bg-[#E5E5E5] rounded text-[10px]">K</kbd> gezin, <kbd className="px-1.5 py-0.5 bg-[#E5E5E5] rounded text-[10px]">Enter</kbd> aç
        </div>
      )}
    </div>
  );
}
