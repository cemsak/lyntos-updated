/**
 * LYNTOS Analysis Progress Component
 * Analiz ilerleme gostergesi
 */

'use client';

import React from 'react';
import { FileArchive, Search, FileText, CheckSquare, Loader2 } from 'lucide-react';
import type { AnalysisPhase, FileStats } from '../../_hooks/useQuarterlyAnalysis';

interface AnalysisProgressProps {
  phase: AnalysisPhase;
  progress: number;
  currentFile: string;
  fileStats: FileStats;
}

const PHASES = [
  { key: 'extracting', label: 'ZIP Aciliyor', icon: FileArchive },
  { key: 'detecting', label: 'Dosyalar Taniniyor', icon: Search },
  { key: 'parsing', label: 'Veriler Ayristiriliyor', icon: FileText },
  { key: 'checking', label: 'Capraz Kontroller', icon: CheckSquare },
];

export function AnalysisProgress({ phase, progress, currentFile, fileStats }: AnalysisProgressProps) {
  const currentPhaseIndex = PHASES.findIndex(p => p.key === phase);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Ilerleme</span>
          <span className="text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phase indicators */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {PHASES.map((p, index) => {
          const Icon = p.icon;
          const isActive = p.key === phase;
          const isComplete = index < currentPhaseIndex;
          const isPending = index > currentPhaseIndex;

          return (
            <div
              key={p.key}
              className={`
                flex flex-col items-center p-3 rounded-lg transition-all
                ${isActive ? 'bg-blue-50 ring-2 ring-blue-500' : ''}
                ${isComplete ? 'bg-green-50' : ''}
                ${isPending ? 'bg-gray-50 opacity-50' : ''}
              `}
            >
              {isActive ? (
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-1" />
              ) : isComplete ? (
                <Icon className="w-6 h-6 text-green-600 mb-1" />
              ) : (
                <Icon className="w-6 h-6 text-gray-400 mb-1" />
              )}
              <span className={`
                text-xs font-medium text-center
                ${isActive ? 'text-blue-700' : ''}
                ${isComplete ? 'text-green-700' : ''}
                ${isPending ? 'text-gray-400' : ''}
              `}>
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current file */}
      {currentFile && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-600 truncate">
            <span className="font-medium">Islenen:</span> {currentFile}
          </p>
        </div>
      )}

      {/* File stats */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-800">{fileStats.total}</p>
          <p className="text-xs text-gray-500">Toplam</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600">{fileStats.detected}</p>
          <p className="text-xs text-gray-500">Taninan</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">{fileStats.parsed}</p>
          <p className="text-xs text-gray-500">Islenen</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-600">{fileStats.failed}</p>
          <p className="text-xs text-gray-500">Hatali</p>
        </div>
      </div>
    </div>
  );
}
