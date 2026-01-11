'use client';

/**
 * Sirketler Hukuku Sayfasi
 * Sprint S2 - LYNTOS V2
 *
 * Corporate law page with TTK 376 analysis, event types, and document checklist
 */

import React, { useState } from 'react';
import { Building2, FileText } from 'lucide-react';
import {
  TTK376Widget,
  EventTypesList,
  DocumentChecklist,
  MinCapitalBanner,
} from '../_components/corporate';
import type { CorporateEventType } from '../_components/corporate';

export default function CorporatePage() {
  const [selectedEvent, setSelectedEvent] = useState<CorporateEventType | null>(null);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-[#1a1f36] flex items-center gap-2">
          <Building2 className="w-7 h-7 text-[#635bff]" />
          Sirketler Hukuku
        </h1>
        <p className="text-[14px] text-[#697386] mt-1">
          TTK kapsaminda sirket islemleri, sermaye analizi ve belge yonetimi
        </p>
      </div>

      {/* Min Capital Warning */}
      <MinCapitalBanner />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <TTK376Widget />
          <EventTypesList
            onSelectEvent={setSelectedEvent}
            selectedEventCode={selectedEvent?.event_code}
          />
        </div>

        {/* Right Column - Document Checklist */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          {selectedEvent ? (
            <DocumentChecklist event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          ) : (
            <div className="bg-white rounded-xl border border-[#e3e8ee] p-6 text-center">
              <FileText className="w-12 h-12 text-[#697386] mx-auto mb-3" />
              <p className="text-[14px] text-[#1a1f36]">Sol taraftan bir islem secin</p>
              <p className="text-[12px] text-[#697386] mt-1">
                Gerekli belgeler ve detaylar burada gorunecek
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
