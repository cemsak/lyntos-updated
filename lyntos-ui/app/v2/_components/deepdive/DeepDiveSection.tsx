'use client';
import React from 'react';
import { VdkExpertPanel } from './VdkExpertPanel';
import { CrossCheckPanel } from './CrossCheckPanel';
import { MizanOmurgaPanel } from './MizanOmurgaPanel';
import { InflationPanel } from './InflationPanel';

export function DeepDiveSection() {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-700 mb-3">Deep Dive Analizler</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Row 1: VDK Expert + Cross-Check */}
        <VdkExpertPanel />
        <CrossCheckPanel />

        {/* Row 2: Mizan Omurga + Inflation */}
        <MizanOmurgaPanel />
        <InflationPanel />
      </div>
    </section>
  );
}
