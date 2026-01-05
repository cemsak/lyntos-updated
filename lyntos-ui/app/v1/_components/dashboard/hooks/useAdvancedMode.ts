'use client';

import { useState, useCallback, useEffect } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// useAdvancedMode - Persist "Gelişmiş (Teknik)" toggle state
// ════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'lyntos_advanced_mode';

export function useAdvancedMode(defaultValue = false) {
  const [advancedMode, setAdvancedMode] = useState(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setAdvancedMode(stored === 'true');
      }
    } catch {
      // localStorage not available
    }
    setIsHydrated(true);
  }, []);

  // Toggle handler
  const toggle = useCallback(() => {
    setAdvancedMode(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(newValue));
      } catch {
        // localStorage not available
      }
      return newValue;
    });
  }, []);

  return {
    advancedMode: isHydrated ? advancedMode : defaultValue,
    toggle,
    isHydrated,
  };
}

export default useAdvancedMode;
