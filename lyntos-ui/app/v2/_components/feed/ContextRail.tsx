'use client';

/**
 * LYNTOS Context Rail (Detail Panel)
 * Sprint 3.3 - Feed card detail drawer
 *
 * Shows detailed information for selected feed card.
 * Uses store for selectedCardId + railOpen state.
 * Click-outside closes rail (except clicks on feed cards).
 */

import React, { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  FileText,
  ExternalLink,
  X,
  TrendingDown,
  Percent,
  Hash,
  Scale,
  Copy,
  Check,
  HelpCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useFeedStore, useSelectedCardId, useRailOpen, useFeedActions } from './useFeedStore';
import { useResetFeedSelection } from './useUrlSync';
import {
  type FeedItem,
  type FeedImpact,
  type EvidenceRef,
  SEVERITY_CONFIG,
  CATEGORY_CONFIG,
  EVIDENCE_KIND_CONFIG,
} from './types';

interface ContextRailProps {
  items: FeedItem[];
  onAction?: (item: FeedItem, actionId: string) => void;
}

/**
 * Format impact for display in rail
 */
function formatImpact(impact: FeedImpact): React.ReactNode {
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

  return <div className="flex flex-wrap gap-4">{parts}</div>;
}

/**
 * Context Rail - Detail drawer for feed items
 */
export function ContextRail({ items, onAction }: ContextRailProps) {
  // ─────────────────────────────────────────────────────────────────
  // ALL HOOKS AT TOP LEVEL (React Rules of Hooks)
  // ─────────────────────────────────────────────────────────────────
  const selectedCardId = useSelectedCardId();
  const railOpen = useRailOpen();
  const resetFeedSelection = useResetFeedSelection();
  const { resolveCard, snoozeCard } = useFeedActions();

  // Refs
  const railRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastSelectedCardIdRef = useRef<string | null>(null);

  // Local state
  const [copied, setCopied] = React.useState(false);

  // Find selected item
  const selectedItem = React.useMemo(() => {
    if (!selectedCardId) return null;
    return items.find((item) => item.id === selectedCardId) || null;
  }, [items, selectedCardId]);

  // Get configs
  const severityConfig = selectedItem ? SEVERITY_CONFIG[selectedItem.severity] : null;
  const categoryConfig = selectedItem ? CATEGORY_CONFIG[selectedItem.category] : null;

  // ─────────────────────────────────────────────────────────────────
  // TRACK LAST SELECTED CARD ID (for focus return)
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedCardId) {
      lastSelectedCardIdRef.current = selectedCardId;
    }
  }, [selectedCardId]);

  // ─────────────────────────────────────────────────────────────────
  // FOCUS MANAGEMENT: Focus close button when rail opens
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (railOpen && closeButtonRef.current) {
      // Use requestAnimationFrame for smooth focus after render
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    }
  }, [railOpen]);

  // ─────────────────────────────────────────────────────────────────
  // UNIFIED CLOSE HANDLER: Store + URL + Focus Return
  // ─────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    // Capture card ID for focus return BEFORE closing
    const cardIdToFocus = lastSelectedCardIdRef.current;

    // Close rail + clear URL (deterministic)
    resetFeedSelection();

    // Return focus to the last selected card
    if (cardIdToFocus) {
      requestAnimationFrame(() => {
        const cardEl = document.querySelector(
          `[data-feed-card][data-card-id="${cardIdToFocus}"]`
        ) as HTMLElement;
        cardEl?.focus();
      });
    }
  }, [resetFeedSelection]);

  // ─────────────────────────────────────────────────────────────────
  // CLICK-OUTSIDE HANDLER (with composedPath for robustness)
  // ─────────────────────────────────────────────────────────────────
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (!railOpen) return;

      // Use composedPath for robustness (handles Shadow DOM)
      const path = e.composedPath?.() ?? [e.target];

      // Guard: Don't close if clicking on a feed card
      // This prevents flicker when switching between cards
      const clickedOnFeedCard = path.some(
        (el) => el instanceof HTMLElement && el.hasAttribute('data-feed-card')
      );
      if (clickedOnFeedCard) return;

      // Guard: Don't close if clicking inside the rail
      const clickedInsideRail = railRef.current && path.includes(railRef.current);
      if (clickedInsideRail) return;

      // Close rail with focus return
      handleClose();
    },
    [railOpen, handleClose]
  );

  // ─────────────────────────────────────────────────────────────────
  // ESCAPE KEY HANDLER
  // ─────────────────────────────────────────────────────────────────
  const handleEscapeKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && railOpen) {
        handleClose();
      }
    },
    [railOpen, handleClose]
  );

  // ─────────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [handleClickOutside, handleEscapeKey]);

  // ─────────────────────────────────────────────────────────────────
  // COPY HANDLER
  // ─────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!selectedItem) return;

    const summary = `[${selectedItem.category}] ${selectedItem.title}\n${selectedItem.summary}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedItem]);

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  // Don't render backdrop or panel if rail is closed
  if (!railOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={railRef}
        className={`
          fixed right-0 top-0 h-full w-full max-w-md z-50
          bg-white border-l border-slate-200 shadow-2xl
          transform transition-transform duration-300 ease-out
          ${railOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-hidden flex flex-col
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rail-title"
      >
        {selectedItem && severityConfig && categoryConfig ? (
          <>
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-100 p-4">
              {/* Close button */}
              <button
                ref={closeButtonRef}
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Category + Severity badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3 pr-10">
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
              <h2
                id="rail-title"
                className="text-lg font-bold text-slate-900 leading-tight"
              >
                {selectedItem.title}
              </h2>

              {/* Summary */}
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {selectedItem.summary}
              </p>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* WHY Section - Explainability Contract */}
              {selectedItem.why && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Neden Çıktı?
                  </h3>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <p className="text-sm text-amber-900 leading-relaxed">
                      {selectedItem.why}
                    </p>
                  </div>
                </section>
              )}

              {/* Impact Section */}
              {selectedItem.impact && formatImpact(selectedItem.impact) && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Etki
                  </h3>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    {formatImpact(selectedItem.impact)}
                  </div>
                </section>
              )}

              {/* Evidence References - Structured */}
              {selectedItem.evidence_refs && selectedItem.evidence_refs.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Kanıtlar ({selectedItem.evidence_refs.length})
                  </h3>
                  <ul className="space-y-2">
                    {selectedItem.evidence_refs.map((ref: EvidenceRef, idx: number) => {
                      const kindConfig = EVIDENCE_KIND_CONFIG[ref.kind];
                      return (
                        <li
                          key={ref.ref || idx}
                          className="text-sm text-slate-600 p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base flex-shrink-0">{kindConfig?.icon || '📎'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-700 truncate">
                                {ref.label}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                                  {kindConfig?.label || ref.kind}
                                </span>
                                {ref.period && (
                                  <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                    {ref.period}
                                  </span>
                                )}
                                {ref.account_code && (
                                  <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-mono">
                                    {ref.account_code}
                                  </span>
                                )}
                                {ref.amount !== undefined && (
                                  <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                                    {new Intl.NumberFormat('tr-TR').format(ref.amount)} TL
                                  </span>
                                )}
                              </div>
                            </div>
                            {ref.href && (
                              <Link
                                href={ref.href}
                                className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                                title="Detay"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Legal Basis (if exists) */}
              {selectedItem.legal_basis_refs && selectedItem.legal_basis_refs.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" />
                    Yasal Dayanak
                  </h3>
                  <ul className="space-y-1.5">
                    {selectedItem.legal_basis_refs.map((ref, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-slate-600 p-2 bg-indigo-50 rounded"
                      >
                        {ref}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Actions - Use id instead of deprecated action field */}
              {selectedItem.actions && selectedItem.actions.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Önerilen Aksiyonlar
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

                      // Use action.id (new contract) or fallback to action.action (legacy)
                      const actionId = action.id || action.action || '';

                      return (
                        <button
                          key={actionId || idx}
                          className={`${baseClasses} ${variantClasses[variant]}`}
                          onClick={() => {
                            onAction?.(selectedItem, actionId);
                          }}
                        >
                          {action.label}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Metadata */}
              <section className="pt-4 border-t border-slate-100">
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
              </section>
            </div>

            {/* Footer - Resolve/Snooze/Copy */}
            <div className="flex-shrink-0 border-t border-slate-100 p-4 space-y-3">
              {/* Resolve Button */}
              <button
                onClick={() => {
                  if (selectedItem) {
                    resolveCard(selectedItem.id);
                    resetFeedSelection();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Çözüldü
              </button>

              {/* Snooze Options - 1g/7g/30g */}
              {selectedItem.snoozeable && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedItem) {
                        const until = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
                        snoozeCard(selectedItem.id, until);
                        resetFeedSelection();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    1 Gün
                  </button>
                  <button
                    onClick={() => {
                      if (selectedItem) {
                        const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                        snoozeCard(selectedItem.id, until);
                        resetFeedSelection();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    7 Gün
                  </button>
                  <button
                    onClick={() => {
                      if (selectedItem) {
                        const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        snoozeCard(selectedItem.id, until);
                        resetFeedSelection();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    30 Gün
                  </button>
                </div>
              )}

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Kopyalandı
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Özeti Kopyala
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Not Found State */
          <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>

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
              onClick={handleClose}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Kapat
            </button>
          </div>
        )}
      </div>
    </>
  );
}
