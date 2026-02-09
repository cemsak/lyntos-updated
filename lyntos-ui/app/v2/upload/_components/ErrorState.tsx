'use client';

import React from 'react';
import { XCircle } from 'lucide-react';

interface ErrorStateProps {
  error: string | null;
  onReset: () => void;
}

export function ErrorState({ error, onReset }: ErrorStateProps) {
  return (
    <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-xl p-6">
      <div className="flex items-start gap-4">
        <XCircle className="w-6 h-6 text-[#F0282D] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-[#BF192B] mb-1">Y&#252;kleme Hatas&#305;</h3>
          <p className="text-sm text-[#BF192B] mb-4">{error}</p>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-[#BF192B] text-white text-sm rounded-lg hover:bg-[#BF192B] transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    </div>
  );
}
