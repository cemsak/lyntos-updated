'use client';

/**
 * LYNTOS Feed URL Sync Hook
 * Sprint 3.2 + Hotfix 4.3.2 - URL State Synchronization
 *
 * HOTFIX: Prevent URL ↔ Store infinite loop
 */

import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useFeedStore } from './useFeedStore';

const CARD_PARAM = 'card';

/**
 * Hook to sync feed store with URL
 * Uses refs to prevent infinite loops
 */
export function useUrlSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get store directly (not via selector to avoid re-render)
  const store = useFeedStore;

  // Track if we're currently syncing to prevent loops
  const isSyncingRef = useRef(false);
  const lastUrlCardIdRef = useRef<string | null>(null);
  const lastStoreCardIdRef = useRef<string | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // URL → STORE: Read URL param on mount/change
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSyncingRef.current) return;

    const urlCardId = searchParams.get(CARD_PARAM);
    const storeCardId = store.getState().selectedCardId;

    // Only update if URL changed AND differs from store
    if (urlCardId !== lastUrlCardIdRef.current && urlCardId !== storeCardId) {
      lastUrlCardIdRef.current = urlCardId;
      isSyncingRef.current = true;
      store.getState().selectCard(urlCardId);
      isSyncingRef.current = false;
    }
  }, [searchParams, store]);

  // ─────────────────────────────────────────────────────────────────
  // STORE → URL: Update URL when store changes
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = store.subscribe(
      (state) => state.selectedCardId,
      (selectedCardId) => {
        if (isSyncingRef.current) return;
        if (selectedCardId === lastStoreCardIdRef.current) return;

        lastStoreCardIdRef.current = selectedCardId;
        const currentUrlCardId = new URLSearchParams(window.location.search).get(CARD_PARAM);

        // Only update URL if store value differs from current URL
        if (selectedCardId !== currentUrlCardId) {
          isSyncingRef.current = true;

          const params = new URLSearchParams(window.location.search);
          if (selectedCardId) {
            params.set(CARD_PARAM, selectedCardId);
          } else {
            params.delete(CARD_PARAM);
          }

          const newUrl = params.toString()
            ? `${pathname}?${params.toString()}`
            : pathname;

          // Use replace to avoid polluting history
          router.replace(newUrl, { scroll: false });

          // Reset sync flag after a tick
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 0);
        }
      }
    );

    return () => unsubscribe();
  }, [pathname, router, store]);

  // ─────────────────────────────────────────────────────────────────
  // HELPER: Get shareable URL for current selection
  // ─────────────────────────────────────────────────────────────────
  const getShareableUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';

    const selectedCardId = store.getState().selectedCardId;
    const url = new URL(window.location.href);
    if (selectedCardId) {
      url.searchParams.set(CARD_PARAM, selectedCardId);
    } else {
      url.searchParams.delete(CARD_PARAM);
    }
    return url.toString();
  }, [store]);

  return { getShareableUrl };
}

/**
 * Hook to get current card ID from URL (read-only)
 */
export function useCardIdFromUrl(): string | null {
  const searchParams = useSearchParams();
  return searchParams.get(CARD_PARAM);
}

/**
 * Navigate to a specific card (sets URL and store)
 */
export function useNavigateToCard() {
  const router = useRouter();
  const pathname = usePathname();
  const store = useFeedStore;

  return useCallback((cardId: string | null) => {
    // Update store
    store.getState().selectCard(cardId);

    // Update URL
    const params = new URLSearchParams(window.location.search);
    if (cardId) {
      params.set(CARD_PARAM, cardId);
    } else {
      params.delete(CARD_PARAM);
    }

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    router.push(newUrl, { scroll: false });
  }, [router, pathname, store]);
}

/**
 * Hook to reset feed selection (clear card + close rail + update URL)
 * Use this when scope changes or for explicit reset
 */
export function useResetFeedSelection() {
  const router = useRouter();
  const pathname = usePathname();
  const store = useFeedStore;

  return useCallback(() => {
    // Close rail and clear selection in store
    store.getState().closeRail();

    // Remove card param from URL
    const params = new URLSearchParams(window.location.search);
    params.delete(CARD_PARAM);

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    router.replace(newUrl, { scroll: false });
  }, [router, pathname, store]);
}
