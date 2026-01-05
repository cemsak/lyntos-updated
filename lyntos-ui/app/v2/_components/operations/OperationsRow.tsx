'use client';
import React from 'react';
import { MissingDataPanel } from './MissingDataPanel';
import { ActionQueuePanel } from './ActionQueuePanel';
import { RegWatchPanel } from './RegWatchPanel';

export function OperationsRow() {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Operasyonlar</h2>
      <div className="grid grid-cols-3 gap-4">
        <MissingDataPanel />
        <ActionQueuePanel />
        <RegWatchPanel />
      </div>
    </section>
  );
}
