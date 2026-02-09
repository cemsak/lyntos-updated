import React from 'react';
import { Lightbulb } from 'lucide-react';

interface WhatIfHeaderProps {
  totalPotentialSaving: number;
  formatCurrency: (value: number) => string;
}

export function WhatIfHeader({ totalPotentialSaving, formatCurrency }: WhatIfHeaderProps) {
  return (
      <div className="bg-gradient-to-r from-[#2E2E2E] to-[#2E2E2E] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-[#FFCE19]" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white">
                What-If Vergi Analizi
              </h2>
              <p className="text-[12px] text-white/70">
                Senaryo simülasyonu ile vergi optimizasyonu
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/50">Toplam Potansiyel Tasarruf</p>
            <p className="text-[20px] font-bold text-[#00CB50]">
              {formatCurrency(totalPotentialSaving)}
            </p>
          </div>
        </div>
      </div>
  );
}
