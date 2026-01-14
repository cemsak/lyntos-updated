'use client';

/**
 * LYNTOS Intelligence Feed Component
 * Sprint 2.3 - Feed List with filtering and grouping
 * Sprint 3.1 - Zustand store integration
 *
 * The heart of the Kokpit - shows prioritized action items.
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Filter, Bell, BellOff } from 'lucide-react';
import { FeedCard } from './FeedCard';
import {
  type FeedItem,
  type FeedSeverity,
  SEVERITY_CONFIG,
} from './types';
import { useFeedStore, useSelectedCardId, useSeverityFilter, useFeedActions } from './useFeedStore';

interface IntelligenceFeedProps {
  items: FeedItem[];
  onSelectItem?: (item: FeedItem) => void;
  onAction?: (item: FeedItem, action: string) => void;
  onSnooze?: (item: FeedItem) => void;
  onDismiss?: (item: FeedItem) => void;
  selectedItemId?: string;
  maxVisible?: number;
  title?: string;
  showFilters?: boolean;
}

type FilterSeverity = FeedSeverity | 'ALL';

/**
 * Group items by severity for summary
 */
function groupBySeverity(items: FeedItem[]): Record<FeedSeverity, number> {
  return items.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {} as Record<FeedSeverity, number>);
}

/**
 * Sort items: CRITICAL first, then by score
 */
function sortItems(items: FeedItem[]): FeedItem[] {
  const severityOrder: FeedSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  return [...items].sort((a, b) => {
    const severityDiff = severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
    if (severityDiff !== 0) return severityDiff;
    return b.score - a.score;
  });
}

export function IntelligenceFeed({
  items,
  onSelectItem,
  onAction,
  onSnooze,
  onDismiss,
  selectedItemId: propSelectedItemId,
  maxVisible = 7,
  title = 'Akıllı Akış',
  showFilters = true,
}: IntelligenceFeedProps) {
  // Store state
  const storeSelectedCardId = useSelectedCardId();
  const filterSeverity = useSeverityFilter();
  const { selectCard, setSeverityFilter, dismissCard } = useFeedActions();
  const dismissedIds = useFeedStore((s) => s.dismissedIds);

  // Use store selectedCardId, fallback to prop for backwards compatibility
  const selectedCardId = storeSelectedCardId ?? propSelectedItemId;

  // Local state (only for UI)
  const [showAll, setShowAll] = useState(false);

  // Filter out dismissed items
  const activeItems = useMemo(() =>
    items.filter(item => !dismissedIds.has(item.id)),
    [items, dismissedIds]
  );

  // Apply severity filter
  const filteredItems = useMemo(() => {
    if (filterSeverity === 'ALL') return activeItems;
    return activeItems.filter(item => item.severity === filterSeverity);
  }, [activeItems, filterSeverity]);

  // Sort items
  const sortedItems = useMemo(() => sortItems(filteredItems), [filteredItems]);

  // Limit visible items
  const visibleItems = showAll ? sortedItems : sortedItems.slice(0, maxVisible);
  const hiddenCount = sortedItems.length - visibleItems.length;

  // Severity counts for filter badges
  const severityCounts = useMemo(() => groupBySeverity(activeItems), [activeItems]);

  // Handle dismiss - now uses store
  const handleDismiss = (item: FeedItem) => {
    dismissCard(item.id);
    onDismiss?.(item);
  };

  // Handle select - now uses store
  const handleSelect = (item: FeedItem) => {
    selectCard(item.id);
    onSelectItem?.(item);
  };

  // Critical + High count for header badge
  const urgentCount = (severityCounts.CRITICAL || 0) + (severityCounts.HIGH || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            {title}
          </h2>
          {urgentCount > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {urgentCount} Acil
            </span>
          )}
        </div>

        {/* Filter controls */}
        {showFilters && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <div className="flex gap-1">
              <FilterButton
                active={filterSeverity === 'ALL'}
                onClick={() => setSeverityFilter('ALL')}
                count={activeItems.length}
              >
                Tümü
              </FilterButton>
              {(['CRITICAL', 'HIGH', 'MEDIUM'] as FeedSeverity[]).map(sev => (
                <FilterButton
                  key={sev}
                  active={filterSeverity === sev}
                  onClick={() => setSeverityFilter(sev)}
                  count={severityCounts[sev] || 0}
                  severity={sev}
                >
                  {SEVERITY_CONFIG[sev].label}
                </FilterButton>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feed List */}
      {visibleItems.length > 0 ? (
        <div className="space-y-3">
          {visibleItems.map(item => (
            <FeedCard
              key={item.id}
              item={item}
              onSelect={handleSelect}
              onAction={onAction}
              onSnooze={onSnooze}
              onDismiss={handleDismiss}
              selected={item.id === selectedCardId}
            />
          ))}
        </div>
      ) : (
        <EmptyState filtered={filterSeverity !== 'ALL'} />
      )}

      {/* Show more/less toggle */}
      {sortedItems.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Daha az göster
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {hiddenCount} daha göster
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Filter button component
interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  count: number;
  severity?: FeedSeverity;
  children: React.ReactNode;
}

function FilterButton({ active, onClick, count, severity, children }: FilterButtonProps) {
  const baseClasses = "text-xs font-medium px-2 py-1 rounded transition-colors";
  const activeClasses = severity
    ? `${SEVERITY_CONFIG[severity].bgColor} ${SEVERITY_CONFIG[severity].color}`
    : 'bg-blue-100 text-blue-700';
  const inactiveClasses = "bg-slate-100 text-slate-600 hover:bg-slate-200";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
    >
      {children}
      {count > 0 && <span className="ml-1">({count})</span>}
    </button>
  );
}

// Empty state component
function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BellOff className="w-12 h-12 text-slate-300 mb-4" />
      <h3 className="text-lg font-medium text-slate-600 mb-1">
        {filtered ? 'Bu filtrede öğe yok' : 'Tüm işlemler tamamlandı'}
      </h3>
      <p className="text-sm text-slate-400">
        {filtered
          ? 'Farklı bir filtre deneyin'
          : 'Harika! Şu an bekleyen kritik iş yok.'}
      </p>
    </div>
  );
}
