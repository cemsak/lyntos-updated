/**
 * LYNTOS Dönem Store
 * Merkezi veri yönetimi - Tüm sayfalar bu store'dan okur
 * SIFIR MOCK DATA
 *
 * CRITICAL: localStorage boyut limiti (5-10MB) aşılmamalı!
 * parsedData ve rawContent PERSIST EDİLMEZ - sadece metadata persist edilir
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  DetectedFile,
  ParsedMizan,
  ParsedYevmiye,
  ParsedKebir,
  ParsedEDefter,
  ParsedKDVBeyanname,
  ParsedMuhtasar,
  ParsedGeciciVergi,
  ParsedBankaEkstre
} from '../parsers/types';

// useQuarterlyAnalysis ile AYNI tip - uyumsuzluk YOK
export interface ParsedData {
  mizan: ParsedMizan | null;
  yevmiye: ParsedYevmiye | null;
  kebir: ParsedKebir | null;
  edefter: ParsedEDefter[];
  kdv: ParsedKDVBeyanname[];
  muhtasar: ParsedMuhtasar[];
  geciciVergi: ParsedGeciciVergi[];
  banka: ParsedBankaEkstre[];
}

export interface FileStats {
  total: number;
  detected: number;
  parsed: number;
  failed: number;
}

export interface DonemMeta {
  clientId: string;
  clientName: string;
  period: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  uploadedAt: string;
  sourceFile: string;
}

// Lightweight file summary for persistence (no rawContent or parseResult)
export interface DetectedFileSummary {
  id: string;
  fileName: string;
  fileType: DetectedFile['fileType'];
  fileSize: number;
  confidence: number;
  metadata: DetectedFile['metadata'];
}

interface DonemState {
  // PERSISTED DATA (small) - goes to localStorage
  meta: DonemMeta | null;
  fileSummaries: DetectedFileSummary[];  // Lightweight summaries only
  stats: FileStats;
  isLoaded: boolean;
  lastUpdated: string | null;

  // IN-MEMORY DATA (large) - NOT persisted
  detectedFiles: DetectedFile[];  // Full file data with rawContent
  parsedData: ParsedData;         // Parsed XML/Excel data (can be 50MB+)

  // Actions
  setDonemData: (
    meta: DonemMeta,
    detectedFiles: DetectedFile[],
    parsedData: ParsedData,
    stats: FileStats
  ) => void;
  clearDonemData: () => void;
}

const initialParsedData: ParsedData = {
  mizan: null,
  yevmiye: null,
  kebir: null,
  edefter: [],
  kdv: [],
  muhtasar: [],
  geciciVergi: [],
  banka: []
};

const initialStats: FileStats = {
  total: 0,
  detected: 0,
  parsed: 0,
  failed: 0
};

// Safe localStorage wrapper with SSR safety and quota error handling
const safeStorage = createJSONStorage(() => ({
  getItem: (name: string): string | null => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(name);
    } catch (e) {
      console.warn('[donemStore] Storage read error:', e);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      // QuotaExceededError - gracefully degrade
      console.warn('[donemStore] Storage write error (quota exceeded?):', e);
      // Try to clear old data and retry once
      try {
        localStorage.removeItem(name);
        localStorage.setItem(name, value);
      } catch {
        // Still failed - just skip persistence
        console.error('[donemStore] Cannot persist to localStorage, continuing in memory-only mode');
      }
    }
  },
  removeItem: (name: string): void => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore removal errors
    }
  },
}));

export const useDonemStore = create<DonemState>()(
  persist(
    (set) => ({
      // Persisted state (small - ~1-5KB)
      meta: null,
      fileSummaries: [],
      stats: initialStats,
      isLoaded: false,
      lastUpdated: null,

      // In-memory state (large - can be 50MB+)
      detectedFiles: [],
      parsedData: initialParsedData,

      // Actions
      setDonemData: (meta, detectedFiles, parsedData, stats) => {
        // Create lightweight summaries for persistence (no rawContent/parseResult)
        const fileSummaries: DetectedFileSummary[] = detectedFiles.map(f => ({
          id: f.id,
          fileName: f.fileName,
          fileType: f.fileType,
          fileSize: f.fileSize,
          confidence: f.confidence,
          metadata: f.metadata,
          // DO NOT include: rawContent, parseResult, parseError, originalPath, etc.
        }));

        set({
          meta,
          fileSummaries,
          stats,
          isLoaded: true,
          lastUpdated: new Date().toISOString(),
          // Large data in memory only (NOT persisted via partialize)
          detectedFiles: detectedFiles.map(f => ({
            ...f,
            rawContent: undefined // Don't keep raw ArrayBuffer in memory either
          })),
          parsedData,
        });
      },

      clearDonemData: () => {
        set({
          meta: null,
          fileSummaries: [],
          stats: initialStats,
          isLoaded: false,
          lastUpdated: null,
          detectedFiles: [],
          parsedData: initialParsedData,
        });
      }
    }),
    {
      name: 'lyntos-donem-store',
      version: 3, // Bump version to force re-hydration
      storage: safeStorage,
      // CRITICAL: Only persist small metadata, NOT parsedData or detectedFiles
      partialize: (state) => ({
        meta: state.meta,
        fileSummaries: state.fileSummaries,
        stats: state.stats,
        isLoaded: state.isLoaded,
        lastUpdated: state.lastUpdated,
        // DO NOT persist: parsedData, detectedFiles (too large)
      }),
      // Handle rehydration errors gracefully
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('[donemStore] Failed to rehydrate:', error);
          // Clear corrupted storage
          try {
            localStorage.removeItem('lyntos-donem-store');
          } catch {
            // Ignore
          }
        }
      },
    }
  )
);

// Selector hooks - performans için ayrı
export const useDonemMeta = () => useDonemStore(s => s.meta);
export const useDonemParsedData = () => useDonemStore(s => s.parsedData);
export const useDonemDetectedFiles = () => useDonemStore(s => s.detectedFiles);
export const useDonemFileSummaries = () => useDonemStore(s => s.fileSummaries); // Persisted lightweight summaries
export const useDonemStats = () => useDonemStore(s => s.stats);
export const useDonemIsLoaded = () => useDonemStore(s => s.isLoaded);
