'use client';

/**
 * LYNTOS Rail Detail Panel (Context Rail)
 * Sprint 3.3 - Feed card detail drawer
 *
 * Shows detailed information for selected feed card.
 * Uses store for selectedCardId + railOpen state.
 * Finds card from feedItems prop (no big objects in store).
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertTriangle,
  FileText,
  ExternalLink,
  X,
  TrendingDown,
  Percent,
  Hash,
} from 'lucide-react';
import { useFeedStore, useSelectedCardId, useRailOpen } from './useFeedStore';
import { type FeedItem, SEVERITY_CONFIG, CATEGORY_CONFIG } from './types';

interface RailDetailPanelProps {
  feedItems: FeedItem[];
}

/**
 * Format impact value for display
 */
function formatImpact(impact: FeedItem['impact']): React.ReactNode {
  const parts: React.ReactNode[] = [];

  if (impact.amount_try !== undefined && impact.amount_try > 0) {
    const formatted = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(impact.amount_try);
    parts.push(
      <span key="amount" className="flex items-center gap-1.5">
        <TrendingDown className="w-4 h-4 text-red-500" />
        <span className="font-semibold text-red-600">{formatted}</span>
      </span>
    );
  }

  if (impact.pct !== undefined && impact.pct > 0) {
    parts.push(
      <span key="pct" className="flex items-center gap-1.5">
        <Percent className="w-4 h-4 text-amber-500" />
        <span className="font-semibold text-amber-600">%{impact.pct.toFixed(1)}</span>
      </span>
    );
  }

  if (impact.points !== undefined && impact.points > 0) {
    parts.push(
      <span key="points" className="flex items-center gap-1.5">
        <Hash className="w-4 h-4 text-blue-500" />
        <span className="font-semibold text-blue-600">{impact.points} puan</span>
      </span>
    );
  }

  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {parts}
    </div>
  );
}

/**
 * Rail Detail Panel - Context Rail for feed card details
 */
export function RailDetailPanel({ feedItems }: RailDetailPanelProps) {
  const selectedCardId = useSelectedCardId();
  const railOpen = useRailOpen();
  const selectCard = useFeedStore((s) => s.selectCard);

  // Find selected item from feedItems (no big objects in store)
  const selectedItem = useMemo(() => {
    if (!selectedCardId) return null;
    return feedItems.find((item) => item.id === selectedCardId) || null;
  }, [feedItems, selectedCardId]);

  // Handle sheet close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      selectCard(null);
    }
  };

  // Get severity and category config
  const severityConfig = selectedItem ? SEVERITY_CONFIG[selectedItem.severity] : null;
  const categoryConfig = selectedItem ? CATEGORY_CONFIG[selectedItem.category] : null;

  return (
    <Sheet open={railOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {selectedItem && severityConfig && categoryConfig ? (
          <>
            {/* Header */}
            <SheetHeader className="space-y-3">
              {/* Category + Severity badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${categoryConfig.color} bg-slate-100`}
                >
                  <span>{categoryConfig.icon}</span>
                  {categoryConfig.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${severityConfig.color} ${severityConfig.bgColor}`}
                >
                  <span>{severityConfig.icon}</span>
                  {severityConfig.label}
                </span>
              </div>

              {/* Title */}
              <SheetTitle className="text-lg font-bold text-slate-900 leading-tight">
                {selectedItem.title}
              </SheetTitle>

              {/* Summary */}
              <SheetDescription className="text-sm text-slate-600 leading-relaxed">
                {selectedItem.summary}
              </SheetDescription>
            </SheetHeader>

            {/* Body */}
            <div className="mt-6 space-y-6 px-4">
              {/* Impact Section */}
              {selectedItem.impact && formatImpact(selectedItem.impact) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Etki
                  </h3>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    {formatImpact(selectedItem.impact)}
                  </div>
                </div>
              )}

              {/* Evidence References */}
              {selectedItem.evidence_refs && selectedItem.evidence_refs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Kanıt Referansları
                  </h3>
                  <ul className="space-y-1.5">
                    {selectedItem.evidence_refs.map((ref, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-slate-600 p-2 bg-slate-50 rounded"
                      >
                        <span className="text-slate-400 text-xs mt-0.5">{idx + 1}.</span>
                        <span>{ref}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {selectedItem.actions && selectedItem.actions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Aksiyonlar
                  </h3>
                  <div className="flex flex-col gap-2">
                    {selectedItem.actions.map((action, idx) => {
                      const variant = action.variant || 'secondary';
                      const baseClasses =
                        'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors';
                      const variantClasses = {
                        primary: 'bg-blue-600 text-white hover:bg-blue-700',
                        secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                        danger: 'bg-red-600 text-white hover:bg-red-700',
                      };

                      return (
                        <button
                          key={idx}
                          className={`${baseClasses} ${variantClasses[variant]}`}
                          onClick={() => {
                            console.log('Action clicked:', action.action, selectedItem.id);
                            // TODO: Implement action handlers
                          }}
                        >
                          {action.label}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-slate-100">
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-slate-400">Kart ID</dt>
                    <dd className="font-mono text-slate-600">{selectedItem.id}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Skor</dt>
                    <dd className="font-semibold text-slate-600">{selectedItem.score}</dd>
                  </div>
                  {selectedItem.created_at && (
                    <div className="col-span-2">
                      <dt className="text-slate-400">Oluşturulma</dt>
                      <dd className="text-slate-600">{selectedItem.created_at}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </>
        ) : (
          /* Not Found State */
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Kart Bulunamadı
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-xs">
              Seçilen kart bulunamadı. Dönem veya mükellef değişmiş olabilir.
            </p>
            <button
              onClick={() => selectCard(null)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Kapat
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
