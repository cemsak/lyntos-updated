'use client';

/**
 * Şirket İşlem Tipleri Listesi
 * Sprint S2 - LYNTOS V2
 *
 * Corporate event types list with filtering and selection
 */

import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Building2, Clock, FileText } from 'lucide-react';
import { useEventTypes } from './useCorporate';
import type { CorporateEventType } from './types';
import { COMPANY_TYPE_LABELS, CATEGORY_GROUPS } from './types';

interface EventTypesListProps {
  onSelectEvent?: (event: CorporateEventType) => void;
  selectedEventCode?: string | null;
}

export function EventTypesList({ onSelectEvent, selectedEventCode }: EventTypesListProps) {
  const [filter, setFilter] = useState<string>('');
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>('');

  const { data: eventTypes, loading, error } = useEventTypes(companyTypeFilter || undefined);

  const filteredEvents = useMemo(() => {
    return eventTypes.filter(
      (event) =>
        event.event_name.toLowerCase().includes(filter.toLowerCase()) ||
        event.event_code.toLowerCase().includes(filter.toLowerCase())
    );
  }, [eventTypes, filter]);

  const groupedEvents = useMemo(() => {
    return Object.entries(CATEGORY_GROUPS)
      .map(([key, group]) => ({
        key,
        ...group,
        events: filteredEvents.filter((e) => group.codes.includes(e.event_code)),
      }))
      .filter((group) => group.events.length > 0);
  }, [filteredEvents]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#e3e8ee] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#e3e8ee] rounded w-1/3"></div>
          <div className="h-12 bg-[#e3e8ee] rounded"></div>
          <div className="h-32 bg-[#e3e8ee] rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#cd3d64] p-6">
        <div className="text-[13px] text-[#cd3d64]">Hata: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#e3e8ee] p-6">
      <h2 className="text-[16px] font-semibold text-[#1a1f36] mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-[#635bff]" />
        Şirket İşlem Tipleri
      </h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#697386]" />
          <input
            type="text"
            placeholder="İşlem ara..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-[13px] border border-[#e3e8ee] rounded-lg bg-white text-[#1a1f36] focus:outline-none focus:ring-2 focus:ring-[#635bff] focus:border-transparent"
          />
        </div>

        <select
          value={companyTypeFilter}
          onChange={(e) => setCompanyTypeFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-[#e3e8ee] rounded-lg bg-white text-[#1a1f36] focus:outline-none focus:ring-2 focus:ring-[#635bff] focus:border-transparent"
        >
          <option value="">Tum Sirket Tipleri</option>
          <option value="as">Anonim Sirket (A.S.)</option>
          <option value="ltd">Limited Sirket (Ltd.S.)</option>
          <option value="koop">Kooperatif</option>
        </select>
      </div>

      {/* Grouped List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {groupedEvents.map((group) => (
          <div
            key={group.key}
            className="border border-[#e3e8ee] rounded-lg overflow-hidden"
          >
            <div className="bg-[#f6f9fc] px-4 py-2 text-[13px] font-medium text-[#697386]">
              {group.label}
            </div>
            <div className="divide-y divide-[#e3e8ee]">
              {group.events.map((event) => (
                <div
                  key={event.event_code}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    selectedEventCode === event.event_code
                      ? 'bg-[#635bff]/10 border-l-2 border-l-[#635bff]'
                      : 'hover:bg-[#f6f9fc]'
                  }`}
                  onClick={() => onSelectEvent?.(event)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-[#1a1f36] flex items-center gap-2">
                        {event.event_name}
                        <ChevronRight className="w-4 h-4 text-[#697386]" />
                      </div>
                      <div className="text-[11px] text-[#697386] mt-1 flex items-center gap-2">
                        <Building2 className="w-3 h-3" />
                        {event.company_types
                          .map((t) => COMPANY_TYPE_LABELS[t] || t)
                          .join(', ')}
                        {event.registration_deadline && (
                          <>
                            <span className="mx-1">•</span>
                            <Clock className="w-3 h-3" />
                            {event.registration_deadline} gun
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-[#697386] bg-[#f6f9fc] px-2 py-1 rounded">
                      {event.legal_basis}
                    </div>
                  </div>

                  {/* Tax implications badges */}
                  {event.tax_implications?.kv_istisna && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <span className="text-[10px] bg-[#0caf60]/10 text-[#0caf60] px-2 py-0.5 rounded">
                        KV Istisna
                      </span>
                      {event.tax_implications?.kdv_istisna && (
                        <span className="text-[10px] bg-[#0caf60]/10 text-[#0caf60] px-2 py-0.5 rounded">
                          KDV Istisna
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[11px] text-[#697386] text-right">
        Toplam: {filteredEvents.length} islem tipi
      </div>
    </div>
  );
}
