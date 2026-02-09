'use client';

/**
 * LYNTOS Context Rail (Detail Panel)
 * Sprint 3.3 - Feed card detail drawer
 *
 * Orchestrator: composes RailHeader, RailBody, RailFooter, RailNotFound.
 * Uses store for selectedCardId + railOpen state.
 * Click-outside closes rail (except clicks on feed cards).
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useSelectedCardId, useRailOpen, useFeedActions } from './useFeedStore';
import { useResetFeedSelection } from './useUrlSync';
import { type FeedItem } from './types';
import { RailHeader } from './RailHeader';
import { RailBody } from './RailBody';
import { RailFooter } from './RailFooter';
import { RailNotFound } from './RailNotFound';

interface ContextRailProps {
  items: FeedItem[];
  onAction?: (item: FeedItem, actionId: string) => void;
}

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


  // Find selected item
  const selectedItem = React.useMemo(() => {
    if (!selectedCardId) return null;
    return items.find((item) => item.id === selectedCardId) || null;
  }, [items, selectedCardId]);


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
          bg-white border-l border-[#E5E5E5] shadow-2xl
          transform transition-transform duration-300 ease-out
          ${railOpen ? "translate-x-0" : "translate-x-full"}
          overflow-hidden flex flex-col
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rail-title"
      >
        {selectedItem ? (
          <>
            <RailHeader
              item={selectedItem}
              closeButtonRef={closeButtonRef}
              onClose={handleClose}
            />
            <RailBody item={selectedItem} onAction={onAction} />
            <RailFooter
              item={selectedItem}
              onResolve={resolveCard}
              onSnooze={snoozeCard}
              onClose={resetFeedSelection}
            />
          </>
        ) : (
          <RailNotFound
            closeButtonRef={closeButtonRef}
            onClose={handleClose}
          />
        )}
      </div>
    </>
  );
}
