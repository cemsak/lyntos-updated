'use client';
import React from 'react';
import { AksiyonKuyruguPanel } from './AksiyonKuyruguPanel';
import { RegWatchPanel } from './RegWatchPanel';
import { useAksiyonlar } from './useAksiyonlar';
import type { AksiyonItem } from './types';

export function OperationsRow() {
  // Fetch aksiyonlar from API with fail-soft fallback
  const { aksiyonlar } = useAksiyonlar();

  const handleProblemCozmeClick = (_aksiyon: AksiyonItem) => {
    // TODO: Implement 5 Why modal
  };

  return (
    <section>
      <h2 className="text-sm font-semibold text-[#5A5A5A] mb-3">Operasyonlar</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Aksiyon Kuyrugu - 2/3 genislik */}
        <div className="lg:col-span-2">
          <AksiyonKuyruguPanel
            aksiyonlar={aksiyonlar}
            onProblemCozmeClick={handleProblemCozmeClick}
          />
        </div>

        {/* RegWatch Radar - 1/3 genislik */}
        <div id="regwatch-radar-section">
          <RegWatchPanel />
        </div>
      </div>
    </section>
  );
}
