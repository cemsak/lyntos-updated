'use client';

import { useState, useEffect, useCallback } from 'react';

export type RegWatchStatus = 'unread' | 'in_progress' | 'completed' | 'dismissed';

export interface RegWatchItemState {
  id: string;
  status: RegWatchStatus;
  aksiyonlarTamamlanan: string[];
  notlar: string;
  sonGuncelleme: string;
}

export interface UseRegWatchStateReturn {
  states: Record<string, RegWatchItemState>;
  getItemState: (id: string) => RegWatchItemState | undefined;
  updateStatus: (id: string, status: RegWatchStatus) => void;
  toggleAksiyon: (itemId: string, aksiyonId: string) => void;
  updateNotlar: (id: string, notlar: string) => void;
  markAsRead: (id: string) => void;
  dismissItem: (id: string) => void;
  resetItem: (id: string) => void;
  getCompletionRate: (id: string, totalAksiyonlar: number) => number;
  getUnreadCount: (allIds: string[]) => number;
  getInProgressCount: (allIds: string[]) => number;
}

const STORAGE_KEY = 'lyntos-regwatch-states';

function getInitialState(): Record<string, RegWatchItemState> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse RegWatch state from localStorage:', e);
  }
  return {};
}

export function useRegWatchState(): UseRegWatchStateReturn {
  const [states, setStates] = useState<Record<string, RegWatchItemState>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setStates(getInitialState());
    setIsHydrated(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
    }
  }, [states, isHydrated]);

  const getItemState = useCallback((id: string): RegWatchItemState | undefined => {
    return states[id];
  }, [states]);

  const updateStatus = useCallback((id: string, status: RegWatchStatus) => {
    setStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        id,
        status,
        aksiyonlarTamamlanan: prev[id]?.aksiyonlarTamamlanan || [],
        notlar: prev[id]?.notlar || '',
        sonGuncelleme: new Date().toISOString(),
      },
    }));
  }, []);

  const toggleAksiyon = useCallback((itemId: string, aksiyonId: string) => {
    setStates(prev => {
      const current = prev[itemId];
      const aksiyonlar = current?.aksiyonlarTamamlanan || [];
      const isCompleted = aksiyonlar.includes(aksiyonId);

      const newAksiyonlar = isCompleted
        ? aksiyonlar.filter(a => a !== aksiyonId)
        : [...aksiyonlar, aksiyonId];

      // Auto-update status based on progress
      let newStatus: RegWatchStatus = current?.status || 'unread';
      if (newAksiyonlar.length > 0 && newStatus === 'unread') {
        newStatus = 'in_progress';
      }

      return {
        ...prev,
        [itemId]: {
          ...current,
          id: itemId,
          status: newStatus,
          aksiyonlarTamamlanan: newAksiyonlar,
          notlar: current?.notlar || '',
          sonGuncelleme: new Date().toISOString(),
        },
      };
    });
  }, []);

  const updateNotlar = useCallback((id: string, notlar: string) => {
    setStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        id,
        status: prev[id]?.status || 'unread',
        aksiyonlarTamamlanan: prev[id]?.aksiyonlarTamamlanan || [],
        notlar,
        sonGuncelleme: new Date().toISOString(),
      },
    }));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setStates(prev => {
      const current = prev[id];
      if (current?.status !== 'unread') return prev;

      return {
        ...prev,
        [id]: {
          ...current,
          id,
          status: 'in_progress',
          aksiyonlarTamamlanan: current?.aksiyonlarTamamlanan || [],
          notlar: current?.notlar || '',
          sonGuncelleme: new Date().toISOString(),
        },
      };
    });
  }, []);

  const dismissItem = useCallback((id: string) => {
    updateStatus(id, 'dismissed');
  }, [updateStatus]);

  const resetItem = useCallback((id: string) => {
    setStates(prev => {
      const newStates = { ...prev };
      delete newStates[id];
      return newStates;
    });
  }, []);

  const getCompletionRate = useCallback((id: string, totalAksiyonlar: number): number => {
    if (totalAksiyonlar === 0) return 0;
    const completed = states[id]?.aksiyonlarTamamlanan?.length || 0;
    return Math.round((completed / totalAksiyonlar) * 100);
  }, [states]);

  const getUnreadCount = useCallback((allIds: string[]): number => {
    return allIds.filter(id => {
      const state = states[id];
      return !state || state.status === 'unread';
    }).length;
  }, [states]);

  const getInProgressCount = useCallback((allIds: string[]): number => {
    return allIds.filter(id => states[id]?.status === 'in_progress').length;
  }, [states]);

  return {
    states,
    getItemState,
    updateStatus,
    toggleAksiyon,
    updateNotlar,
    markAsRead,
    dismissItem,
    resetItem,
    getCompletionRate,
    getUnreadCount,
    getInProgressCount,
  };
}

export default useRegWatchState;
