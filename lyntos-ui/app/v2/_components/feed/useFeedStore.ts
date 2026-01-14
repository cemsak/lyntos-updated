/**
 * LYNTOS Feed Store
 * Sprint 3.1 - Zustand State Management
 *
 * Anayasa: "selectedCardId tek kaynak; store'da büyük obje taşınmaz"
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { FeedSeverity } from './types';

// ═══════════════════════════════════════════════════════════════════
// STATE TYPES
// ═══════════════════════════════════════════════════════════════════

interface FeedState {
  // Selection state
  selectedCardId: string | null;
  railOpen: boolean;

  // Filter state
  severityFilter: FeedSeverity | 'ALL';
  showDismissed: boolean;

  // Dismissed items (persisted locally)
  dismissedIds: Set<string>;
  snoozedIds: Map<string, Date>; // id -> snooze until

  // Actions
  selectCard: (id: string | null) => void;
  openRail: () => void;
  closeRail: () => void;
  toggleRail: () => void;

  setSeverityFilter: (severity: FeedSeverity | 'ALL') => void;

  dismissCard: (id: string) => void;
  snoozeCard: (id: string, until: Date) => void;
  undismiss: (id: string) => void;
  clearDismissed: () => void;

  // Computed helpers
  isCardDismissed: (id: string) => boolean;
  isCardSnoozed: (id: string) => boolean;
}

// ═══════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════

export const useFeedStore = create<FeedState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    selectedCardId: null,
    railOpen: false,
    severityFilter: 'ALL',
    showDismissed: false,
    dismissedIds: new Set(),
    snoozedIds: new Map(),

    // ─────────────────────────────────────────────────────────────────
    // SELECTION ACTIONS
    // ─────────────────────────────────────────────────────────────────

    selectCard: (id) => {
      set({ selectedCardId: id });
      // Auto-open rail when card selected, close when deselected
      if (id !== null) {
        set({ railOpen: true });
      } else {
        set({ railOpen: false });
      }
    },

    openRail: () => set({ railOpen: true }),

    closeRail: () => set({ railOpen: false, selectedCardId: null }),

    toggleRail: () =>
      set((state) => ({
        railOpen: !state.railOpen,
        // Clear selection when closing
        selectedCardId: state.railOpen ? null : state.selectedCardId,
      })),

    // ─────────────────────────────────────────────────────────────────
    // FILTER ACTIONS
    // ─────────────────────────────────────────────────────────────────

    setSeverityFilter: (severity) => set({ severityFilter: severity }),

    // ─────────────────────────────────────────────────────────────────
    // DISMISS/SNOOZE ACTIONS
    // ─────────────────────────────────────────────────────────────────

    dismissCard: (id) => {
      set((state) => {
        const newDismissed = new Set(state.dismissedIds);
        newDismissed.add(id);
        return {
          dismissedIds: newDismissed,
          // Clear selection if dismissed card was selected
          selectedCardId: state.selectedCardId === id ? null : state.selectedCardId,
        };
      });
    },

    snoozeCard: (id, until) => {
      set((state) => {
        const newSnoozed = new Map(state.snoozedIds);
        newSnoozed.set(id, until);
        return { snoozedIds: newSnoozed };
      });
    },

    undismiss: (id) => {
      set((state) => {
        const newDismissed = new Set(state.dismissedIds);
        newDismissed.delete(id);
        const newSnoozed = new Map(state.snoozedIds);
        newSnoozed.delete(id);
        return { dismissedIds: newDismissed, snoozedIds: newSnoozed };
      });
    },

    clearDismissed: () =>
      set({
        dismissedIds: new Set(),
        snoozedIds: new Map(),
      }),

    // ─────────────────────────────────────────────────────────────────
    // COMPUTED HELPERS
    // ─────────────────────────────────────────────────────────────────

    isCardDismissed: (id) => get().dismissedIds.has(id),

    isCardSnoozed: (id) => {
      const until = get().snoozedIds.get(id);
      if (!until) return false;
      return new Date() < until;
    },
  }))
);

// ═══════════════════════════════════════════════════════════════════
// SELECTORS (for performance - narrow subscriptions)
// ═══════════════════════════════════════════════════════════════════

// Use these instead of accessing full store
export const useSelectedCardId = () => useFeedStore((s) => s.selectedCardId);
export const useRailOpen = () => useFeedStore((s) => s.railOpen);
export const useSeverityFilter = () => useFeedStore((s) => s.severityFilter);

// Actions (stable references)
export const useFeedActions = () =>
  useFeedStore((s) => ({
    selectCard: s.selectCard,
    openRail: s.openRail,
    closeRail: s.closeRail,
    toggleRail: s.toggleRail,
    setSeverityFilter: s.setSeverityFilter,
    dismissCard: s.dismissCard,
    snoozeCard: s.snoozeCard,
  }));

// ═══════════════════════════════════════════════════════════════════
// URL SYNC HELPER (to be used in Sprint 3.2)
// ═══════════════════════════════════════════════════════════════════

/**
 * Sync store with URL query param
 * Call this in a useEffect to sync ?card=xxx with store
 */
export function syncStoreWithUrl(searchParams: URLSearchParams) {
  const cardId = searchParams.get('card');
  const currentId = useFeedStore.getState().selectedCardId;

  if (cardId !== currentId) {
    useFeedStore.getState().selectCard(cardId);
  }
}

/**
 * Get URL search params string for current state
 */
export function getUrlFromStore(): string {
  const { selectedCardId } = useFeedStore.getState();
  if (selectedCardId) {
    return `?card=${selectedCardId}`;
  }
  return '';
}
