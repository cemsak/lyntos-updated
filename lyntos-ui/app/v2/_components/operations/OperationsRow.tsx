'use client';
import React from 'react';
import { AksiyonKuyruguPanel } from './AksiyonKuyruguPanel';
import { RegWatchPanel } from './RegWatchPanel';
import { MOCK_AKSIYONLAR } from './mockData';
import type { AksiyonItem } from './types';

export function OperationsRow() {
  const handleProblemCozmeClick = (aksiyon: AksiyonItem) => {
    // Open 5 Why wizard
    console.log('Problem cozme:', aksiyon.id);
    // TODO: Implement 5 Why modal
  };

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Operasyonlar</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Aksiyon Kuyrugu - 2/3 genislik */}
        <div className="lg:col-span-2">
          <AksiyonKuyruguPanel
            aksiyonlar={MOCK_AKSIYONLAR}
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
