/**
 * LYNTOS Quarterly Analysis Hook
 * ZIP upload -> Parse -> Cross-check -> Results
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

export type AnalysisPhase =
  | 'idle'
  | 'extracting'
  | 'detecting'
  | 'parsing'
  | 'checking'
  | 'complete'
  | 'error';

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
  endTime: null
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
      // Phase 1: Extracting
      updateState({
        phase: 'extracting',
        progress: 5,
        currentFile: file.name,
        startTime,
        error: null
      });

      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const fileEntries = Object.keys(zip.files).filter(name => !zip.files[name].dir);

      // Filter out system files
      const validEntries = fileEntries.filter(name =>
        !name.startsWith('__MACOSX') &&
        !name.startsWith('.') &&
        !name.includes('/.') &&
        !name.endsWith('.DS_Store')
      );

      updateState({
        progress: 15,
        fileStats: { total: validEntries.length, detected: 0, parsed: 0, failed: 0 }
      });

      // Phase 2: Detecting file types
      updateState({ phase: 'detecting', progress: 20 });

      const detectedFiles: DetectedFile[] = [];

      for (let i = 0; i < validEntries.length; i++) {
        const entryName = validEntries[i];
        const zipEntry = zip.files[entryName];

        updateState({
          currentFile: entryName.split('/').pop() || entryName,
          progress: 20 + (i / validEntries.length) * 20
        });

        try {
          const content = await zipEntry.async('arraybuffer');
          const fileName = entryName.split('/').pop() || entryName;

          // detectFileType returns DetectedFile with rawContent included
          const detected = await detectFileType(fileName, content, entryName);
          detectedFiles.push(detected);
        } catch (err) {
          console.warn(`Skip file ${entryName}:`, err);
        }
      }

      const recognizedFiles = detectedFiles.filter(f => f.fileType !== 'UNKNOWN');

      updateState({
        detectedFiles,
        fileStats: {
          total: validEntries.length,
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
            total: validEntries.length,
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

  return {
    ...state,
    analyzeZip,
    reset,
    isIdle: state.phase === 'idle',
    isProcessing: ['extracting', 'detecting', 'parsing', 'checking'].includes(state.phase),
    isComplete: state.phase === 'complete',
    isError: state.phase === 'error',
    duration: state.startTime && state.endTime ? state.endTime - state.startTime : null
  };
}
