/**
 * LYNTOS Analysis Progress Component
 * Analiz ilerleme gostergesi
 */

'use client';

import React from 'react';
import { Upload, FileText, CheckSquare, Loader2 } from 'lucide-react';
import type { AnalysisPhase, FileStats } from '../../_hooks/useQuarterlyAnalysis';

interface AnalysisProgressProps {
  phase: AnalysisPhase;
  progress: number;
  currentFile: string;
  fileStats: FileStats;
}

const PHASES = [
  { key: 'uploading', label: 'Backend Yukleniyor', icon: Upload },
  { key: 'parsing', label: 'Veriler Ayristiriliyor', icon: FileText },
  { key: 'checking', label: 'Capraz Kontroller', icon: CheckSquare },
];

export function AnalysisProgress({ phase, progress, currentFile, fileStats }: AnalysisProgressProps) {
  const currentPhaseIndex = PHASES.findIndex(p => p.key === phase);

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-[#5A5A5A]">Ilerleme</span>
          <span className="text-[#969696]">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-[#F5F6F8] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0078D0] to-[#0049AA] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phase indicators */}
      <div className="grid grid-cols-3 gap-2 mb-6">
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
                ${isActive ? 'bg-[#E6F9FF] ring-2 ring-[#0078D0]' : ''}
                ${isComplete ? 'bg-[#ECFDF5]' : ''}
                ${isPending ? 'bg-[#F5F6F8] opacity-50' : ''}
              `}
            >
              {isActive ? (
                <Loader2 className="w-6 h-6 text-[#0049AA] animate-spin mb-1" />
              ) : isComplete ? (
                <Icon className="w-6 h-6 text-[#00804D] mb-1" />
              ) : (
                <Icon className="w-6 h-6 text-[#969696] mb-1" />
              )}
              <span className={`
                text-xs font-medium text-center
                ${isActive ? 'text-[#0049AA]' : ''}
                ${isComplete ? 'text-[#00804D]' : ''}
                ${isPending ? 'text-[#969696]' : ''}
              `}>
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current file */}
      {currentFile && (
        <div className="bg-[#F5F6F8] rounded-lg p-3 mb-4">
          <p className="text-sm text-[#5A5A5A] truncate">
            <span className="font-medium">Islenen:</span> {currentFile}
          </p>
        </div>
      )}

      {/* File stats */}
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-[#2E2E2E]">{fileStats.total}</p>
          <p className="text-xs text-[#969696]">Toplam</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#0049AA]">{fileStats.detected}</p>
          <p className="text-xs text-[#969696]">Taninan</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#00804D]">{fileStats.parsed}</p>
          <p className="text-xs text-[#969696]">Islenen</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#BF192B]">{fileStats.failed}</p>
          <p className="text-xs text-[#969696]">Hatali</p>
        </div>
      </div>
    </div>
  );
}
