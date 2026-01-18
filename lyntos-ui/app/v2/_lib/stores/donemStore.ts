/**
 * LYNTOS Dönem Store
 * Merkezi veri yönetimi - Tüm sayfalar bu store'dan okur
 * SIFIR MOCK DATA
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

interface DonemState {
  // Data
  meta: DonemMeta | null;
  detectedFiles: DetectedFile[];
  parsedData: ParsedData;
  stats: FileStats;
  
  // Status
  isLoaded: boolean;
  lastUpdated: string | null;
  
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

export const useDonemStore = create<DonemState>()(
  persist(
    (set) => ({
      // Initial state
      meta: null,
      detectedFiles: [],
      parsedData: initialParsedData,
      stats: initialStats,
      isLoaded: false,
      lastUpdated: null,
      
      // Actions
      setDonemData: (meta, detectedFiles, parsedData, stats) => {
        set({
          meta,
          // rawContent SAKLANMIYOR - localStorage boyut limiti aşılmaz
          detectedFiles: detectedFiles.map(f => ({
            ...f,
            rawContent: undefined // Büyük veriyi localStorage'a yazma
          })),
          parsedData,
          stats,
          isLoaded: true,
          lastUpdated: new Date().toISOString()
        });
      },
      
      clearDonemData: () => {
        set({
          meta: null,
          detectedFiles: [],
          parsedData: initialParsedData,
          stats: initialStats,
          isLoaded: false,
          lastUpdated: null
        });
      }
    }),
    { 
      name: 'lyntos-donem-store',
      version: 2
    }
  )
);

// Selector hooks - performans için ayrı
export const useDonemMeta = () => useDonemStore(s => s.meta);
export const useDonemParsedData = () => useDonemStore(s => s.parsedData);
export const useDonemDetectedFiles = () => useDonemStore(s => s.detectedFiles);
export const useDonemStats = () => useDonemStore(s => s.stats);
export const useDonemIsLoaded = () => useDonemStore(s => s.isLoaded);
