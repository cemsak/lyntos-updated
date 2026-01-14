'use client';

/**
 * LYNTOS Feed URL Sync Hook
 * Sprint 3.2.1 Hotfix - Deterministic URL ↔ Store Sync
 *
 * Fixes:
 * - Infinite loop prevention with useRef guard
 * - Proper rail close when URL card param removed
 * - Preserves other query params when updating URL
 * - Scope change reset support
 */

import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useFeedStore } from './useFeedStore';

const CARD_PARAM = 'card';

/**
 * Hook to sync feed store with URL
 * Uses guard mechanism to prevent infinite loops
 */
export function useUrlSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedCardId = useFeedStore((s) => s.selectedCardId);
  const selectCard = useFeedStore((s) => s.selectCard);

  // Guard: track if we're currently syncing to prevent ping-pong
  const isSyncingRef = useRef(false);
  // Track last synced value to detect real changes
  const lastSyncedCardIdRef = useRef<string | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // URL → STORE: Read URL param on mount/change
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Skip if we're currently syncing from store → URL
    if (isSyncingRef.current) return;

    const urlCardId = searchParams.get(CARD_PARAM);

    // Normalize: empty string or whitespace-only = null
    const normalizedUrlCardId = urlCardId?.trim() || null;

    // Only update if actually different from store
    if (normalizedUrlCardId !== selectedCardId) {
      lastSyncedCardIdRef.current = normalizedUrlCardId;
      selectCard(normalizedUrlCardId);
    }
  }, [searchParams, selectedCardId, selectCard]);

  // ─────────────────────────────────────────────────────────────────
  // STORE → URL: Update URL when store changes
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const currentUrlCardId = searchParams.get(CARD_PARAM);

    // Normalize URL value
    const normalizedUrlCardId = currentUrlCardId?.trim() || null;

    // Skip if already in sync
    if (selectedCardId === normalizedUrlCardId) return;

    // Skip if this was just synced from URL
    if (selectedCardId === lastSyncedCardIdRef.current) {
      lastSyncedCardIdRef.current = null;
      return;
    }

    // Set guard before URL update
    isSyncingRef.current = true;

    // Build new URL preserving existing params
    const params = new URLSearchParams(searchParams.toString());

    if (selectedCardId) {
      params.set(CARD_PARAM, selectedCardId);
    } else {
      params.delete(CARD_PARAM);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Use replace to avoid polluting history
    router.replace(newUrl, { scroll: false });

    // Release guard after a tick (allows router to settle)
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
  }, [selectedCardId, searchParams, pathname, router]);

  // ─────────────────────────────────────────────────────────────────
  // HELPER: Get shareable URL for current selection
  // ─────────────────────────────────────────────────────────────────
  const getShareableUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';

    const url = new URL(window.location.href);
    if (selectedCardId) {
      url.searchParams.set(CARD_PARAM, selectedCardId);
    } else {
      url.searchParams.delete(CARD_PARAM);
    }
    return url.toString();
  }, [selectedCardId]);

  return { getShareableUrl };
}

/**
 * Hook to get current card ID from URL (read-only)
 * Useful for components that just need to read URL state
 */
export function useCardIdFromUrl(): string | null {
  const searchParams = useSearchParams();
  const cardId = searchParams.get(CARD_PARAM);
  return cardId?.trim() || null;
}

/**
 * Navigate to a specific card (sets URL and store)
 * Use this for programmatic navigation
 */
export function useNavigateToCard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectCard = useFeedStore((s) => s.selectCard);

  return useCallback(
    (cardId: string | null) => {
      // Update store first
      selectCard(cardId);

      // Build URL preserving other params
      const params = new URLSearchParams(searchParams.toString());
      if (cardId) {
        params.set(CARD_PARAM, cardId);
      } else {
        params.delete(CARD_PARAM);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      router.push(newUrl, { scroll: false });
    },
    [router, pathname, searchParams, selectCard]
  );
}

/**
 * Hook to reset feed selection (clear card + close rail + update URL)
 * Use this when scope changes or for explicit reset
 */
export function useResetFeedSelection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const closeRail = useFeedStore((s) => s.closeRail);

  return useCallback(() => {
    // Close rail and clear selection in store
    closeRail();

    // Remove card param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete(CARD_PARAM);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(newUrl, { scroll: false });
  }, [router, pathname, searchParams, closeRail]);
}
