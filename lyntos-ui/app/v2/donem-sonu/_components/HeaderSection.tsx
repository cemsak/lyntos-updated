'use client';

/**
 * HeaderSection - Dönem sonu header with progress circle and action buttons
 */

import React from 'react';
import {
  ClipboardCheck,
  Download,
  RotateCcw,
} from 'lucide-react';
import { type HeaderSectionProps } from '../_types';

export function HeaderSection({
  completedCount,
  progressPercent,
  onDownloadReport,
  onResetProgress,
}: HeaderSectionProps) {
  return (
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0049AA] via-[#0049AA] to-[#0049AA] rounded-2xl p-6 text-white shadow-xl animate-slide-up">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <ClipboardCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Dönem Sonu İşlemleri</h1>
                <p className="text-[#E6F9FF] text-sm">2025 Mali Yılı</p>
              </div>
            </div>
            <p className="text-[#E6F9FF] mt-3 max-w-xl">
              Dönem sonu kapanış işlemlerinizi adım adım tamamlayın. Mizan kontrolünden vergi
              hesaplamasına kadar tüm süreç tek platformda.
            </p>
          </div>

          {/* Progress Circle */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-white/20"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={220}
                  strokeDashoffset={220 - (220 * progressPercent) / 100}
                  strokeLinecap="round"
                  className="text-white transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{completedCount}/4</span>
              </div>
            </div>
            <span className="text-xs text-[#E6F9FF]">Tamamlanan</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative flex items-center gap-3 mt-4">
          <button
            disabled={completedCount < 4}
            onClick={onDownloadReport}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all
              ${
                completedCount >= 4
                  ? 'bg-white text-[#0049AA] hover:bg-[#E6F9FF] shadow-lg'
                  : 'bg-white/20 text-white/60 cursor-not-allowed'
              }
            `}
          >
            <Download className="w-4 h-4" />
            Rapor İndir
          </button>

          {completedCount > 0 && (
            <button
              onClick={onResetProgress}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Sıfırla
            </button>
          )}
        </div>
    </div>
  );
}
