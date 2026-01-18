/**
 * LYNTOS Quarterly Analysis Hook
 * ZIP upload -> Parse -> Cross-check -> Results
 *
 * Supports nested ZIP extraction (max depth 2)
 * e-Defter archives inside Q1.zip are automatically extracted
 */

'use client';

import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import {
  detectFileType,
  parseFile,
  runCrossChecks,
  buildCrossCheckInput,
  type DetectedFile,
  type ParsedMizan,
  type ParsedYevmiye,
  type ParsedKebir,
  type ParsedEDefter,
  type ParsedKDVBeyanname,
  type ParsedMuhtasar,
  type ParsedGeciciVergi,
  type ParsedBankaEkstre
} from '../_lib/parsers';

import type { EngineCheckReport } from '../_lib/parsers/crosscheck/types';
import {
  syncDonemToBackend,
  type SyncPayload,
  type SyncResponse
} from '../_lib/api/donemSync';

// ============================================================================
// NESTED ZIP EXTRACTION HELPER
// ============================================================================

interface ExtractedFile {
  fileName: string;
  path: string;
  content: ArrayBuffer;
  fromNestedZip: boolean;
  nestedZipName?: string;
}

const MAX_ZIP_DEPTH = 2;

/**
 * Check if a file should be skipped (system files, etc.)
 */
function shouldSkipFile(name: string): boolean {
  return (
    name.startsWith('__MACOSX') ||
    name.startsWith('.') ||
    name.includes('/.') ||
    name.endsWith('.DS_Store') ||
    name.endsWith('.xslt') // XSLT stylesheets are helper files, skip
  );
}

/**
 * Recursively extract files from a ZIP, including nested ZIPs
 */
async function extractZipRecursive(
  zipData: ArrayBuffer | Blob,
  basePath: string = '',
  depth: number = 0,
  nestedZipName?: string
): Promise<ExtractedFile[]> {
  if (depth > MAX_ZIP_DEPTH) {
    console.warn(`[ZIP] Max depth ${MAX_ZIP_DEPTH} reached at: ${basePath}`);
    return [];
  }

  const zip = await JSZip.loadAsync(zipData);
  const extractedFiles: ExtractedFile[] = [];

  for (const [entryName, zipEntry] of Object.entries(zip.files)) {
    // Skip directories
    if (zipEntry.dir) continue;

    // Skip system files
    if (shouldSkipFile(entryName)) continue;

    const fileName = entryName.split('/').pop() || entryName;
    const fullPath = basePath ? `${basePath}/${entryName}` : entryName;
    const ext = fileName.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'zip') {
        // Nested ZIP — extract recursively
        console.log(`[ZIP] Extracting nested ZIP: ${fileName} (depth ${depth + 1})`);
        const nestedContent = await zipEntry.async('arraybuffer');
        const nestedFiles = await extractZipRecursive(
          nestedContent,
          fullPath,
          depth + 1,
          fileName
        );
        extractedFiles.push(...nestedFiles);
      } else {
        // Regular file — add to results
        const content = await zipEntry.async('arraybuffer');
        extractedFiles.push({
          fileName,
          path: fullPath,
          content,
          fromNestedZip: depth > 0,
          nestedZipName: nestedZipName,
        });
      }
    } catch (err) {
      console.warn(`[ZIP] Failed to extract ${entryName}:`, err);
    }
  }

  return extractedFiles;
}

export type AnalysisPhase =
  | 'idle'
  | 'extracting'
  | 'detecting'
  | 'parsing'
  | 'checking'
  | 'syncing'
  | 'complete'
  | 'error';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface FileStats {
  total: number;
  detected: number;
  parsed: number;
  failed: number;
}

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

export interface AnalysisState {
  phase: AnalysisPhase;
  progress: number;
  currentFile: string;
  fileStats: FileStats;
  detectedFiles: DetectedFile[];
  parsedData: ParsedData;
  checkReport: EngineCheckReport | null;
  error: string | null;
  startTime: number | null;
  endTime: number | null;
  // Sync state
  syncStatus: SyncStatus;
  syncResult: SyncResponse | null;
}

const initialState: AnalysisState = {
  phase: 'idle',
  progress: 0,
  currentFile: '',
  fileStats: { total: 0, detected: 0, parsed: 0, failed: 0 },
  detectedFiles: [],
  parsedData: {
    mizan: null,
    yevmiye: null,
    kebir: null,
    edefter: [],
    kdv: [],
    muhtasar: [],
    geciciVergi: [],
    banka: []
  },
  checkReport: null,
  error: null,
  startTime: null,
  endTime: null,
  // Sync state
  syncStatus: 'idle',
  syncResult: null
};

export function useQuarterlyAnalysis() {
  const [state, setState] = useState<AnalysisState>(initialState);

  const updateState = useCallback((updates: Partial<AnalysisState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const analyzeZip = useCallback(async (file: File) => {
    const startTime = Date.now();

    try {
      // Phase 1: Extracting (with nested ZIP support)
      updateState({
        phase: 'extracting',
        progress: 5,
        currentFile: file.name,
        startTime,
        error: null
      });

      const arrayBuffer = await file.arrayBuffer();

      // Extract all files recursively (including nested ZIPs)
      console.log(`[ZIP] Starting recursive extraction of: ${file.name}`);
      const extractedFiles = await extractZipRecursive(arrayBuffer, '', 0);
      console.log(`[ZIP] Extracted ${extractedFiles.length} files (including from nested ZIPs)`);

      // Count files from nested ZIPs for logging
      const nestedCount = extractedFiles.filter(f => f.fromNestedZip).length;
      if (nestedCount > 0) {
        console.log(`[ZIP] ${nestedCount} files extracted from nested ZIPs`);
      }

      updateState({
        progress: 15,
        fileStats: { total: extractedFiles.length, detected: 0, parsed: 0, failed: 0 }
      });

      // Phase 2: Detecting file types
      updateState({ phase: 'detecting', progress: 20 });

      const detectedFiles: DetectedFile[] = [];

      for (let i = 0; i < extractedFiles.length; i++) {
        const extractedFile = extractedFiles[i];

        updateState({
          currentFile: extractedFile.fileName,
          progress: 20 + (i / extractedFiles.length) * 20
        });

        try {
          // detectFileType returns DetectedFile with rawContent included
          const detected = await detectFileType(
            extractedFile.fileName,
            extractedFile.content,
            extractedFile.path
          );
          detectedFiles.push(detected);
        } catch (err) {
          console.warn(`Skip file ${extractedFile.path}:`, err);
        }
      }

      const recognizedFiles = detectedFiles.filter(f => f.fileType !== 'UNKNOWN');

      updateState({
        detectedFiles,
        fileStats: {
          total: extractedFiles.length,
          detected: recognizedFiles.length,
          parsed: 0,
          failed: 0
        },
        progress: 40
      });

      // Phase 3: Parsing files
      updateState({ phase: 'parsing', progress: 45 });

      const parsedData: ParsedData = {
        mizan: null,
        yevmiye: null,
        kebir: null,
        edefter: [],
        kdv: [],
        muhtasar: [],
        geciciVergi: [],
        banka: []
      };

      let parsedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < recognizedFiles.length; i++) {
        const detectedFile = recognizedFiles[i];

        updateState({
          currentFile: detectedFile.fileName,
          progress: 45 + (i / recognizedFiles.length) * 35
        });

        try {
          const result = await parseFile(detectedFile);

          // Route to correct array/field
          switch (result.type) {
            case 'mizan':
              parsedData.mizan = result.data;
              break;
            case 'yevmiye':
              parsedData.yevmiye = result.data;
              break;
            case 'kebir':
              parsedData.kebir = result.data;
              break;
            case 'edefter':
              parsedData.edefter.push(result.data);
              break;
            case 'kdv':
              parsedData.kdv.push(result.data);
              break;
            case 'muhtasar':
              parsedData.muhtasar.push(result.data);
              break;
            case 'gecici_vergi':
              parsedData.geciciVergi.push(result.data);
              break;
            case 'banka':
              parsedData.banka.push(result.data);
              break;
          }

          parsedCount++;
        } catch (err) {
          console.error(`Parse error for ${detectedFile.fileName}:`, err);
          failedCount++;
        }

        updateState({
          fileStats: {
            total: extractedFiles.length,
            detected: recognizedFiles.length,
            parsed: parsedCount,
            failed: failedCount
          }
        });
      }

      updateState({ parsedData, progress: 80 });

      // Phase 4: Cross-checks
      updateState({ phase: 'checking', progress: 85, currentFile: 'Capraz kontroller...' });

      const checkInput = buildCrossCheckInput({
        mizan: parsedData.mizan || undefined,
        yevmiye: parsedData.yevmiye || undefined,
        kebir: parsedData.kebir || undefined,
        edefter: parsedData.edefter,
        kdv: parsedData.kdv,
        muhtasar: parsedData.muhtasar,
        geciciVergi: parsedData.geciciVergi,
        banka: parsedData.banka
      });
      const checkReport = await runCrossChecks(checkInput);

      // Complete
      const endTime = Date.now();

      updateState({
        phase: 'complete',
        progress: 100,
        currentFile: '',
        checkReport,
        endTime
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      updateState({
        phase: 'error',
        error: errorMessage,
        endTime: Date.now()
      });
    }
  }, [updateState]);

  /**
   * Sync parsed data to backend
   * Call this after analysis is complete to persist data
   */
  const syncToBackend = useCallback(async (
    meta: {
      clientId: string;
      clientName: string;
      period: string;
      quarter: string;
      year: number;
      sourceFile: string;
    },
    tenantId: string = 'default'
  ) => {
    if (state.phase !== 'complete') {
      console.warn('[Sync] Cannot sync - analysis not complete');
      return null;
    }

    updateState({ syncStatus: 'syncing' });

    try {
      // Build file summaries from detected files
      const fileSummaries: SyncPayload['fileSummaries'] = state.detectedFiles
        .filter(f => f.fileType !== 'UNKNOWN')
        .map(f => ({
          id: f.id || crypto.randomUUID(),
          fileName: f.fileName,
          fileType: f.fileType,
          fileSize: f.rawContent?.byteLength || 0,
          confidence: f.confidence,
          metadata: {
            originalPath: f.originalPath,
            fileExtension: f.fileExtension,
          }
        }));

      const payload: SyncPayload = {
        tenantId,
        meta: {
          ...meta,
          uploadedAt: new Date().toISOString(),
        },
        fileSummaries,
        stats: state.fileStats,
      };

      console.log('[Sync] Sending to backend:', {
        clientId: meta.clientId,
        period: meta.period,
        fileCount: fileSummaries.length
      });

      const result = await syncDonemToBackend(payload);

      updateState({
        syncStatus: result.success ? 'success' : 'error',
        syncResult: result
      });

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      console.error('[Sync] Error:', errorMessage);
      updateState({
        syncStatus: 'error',
        syncResult: {
          success: false,
          syncedCount: 0,
          errorCount: 1,
          skippedCount: 0,
          results: [],
          errors: [errorMessage]
        }
      });
      return null;
    }
  }, [state.phase, state.detectedFiles, state.fileStats, updateState]);

  return {
    ...state,
    analyzeZip,
    reset,
    syncToBackend,
    isIdle: state.phase === 'idle',
    isProcessing: ['extracting', 'detecting', 'parsing', 'checking', 'syncing'].includes(state.phase),
    isComplete: state.phase === 'complete',
    isError: state.phase === 'error',
    isSyncing: state.syncStatus === 'syncing',
    isSynced: state.syncStatus === 'success',
    duration: state.startTime && state.endTime ? state.endTime - state.startTime : null
  };
}
