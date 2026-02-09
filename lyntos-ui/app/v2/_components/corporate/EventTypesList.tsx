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
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#E5E5E5] rounded w-1/3"></div>
          <div className="h-12 bg-[#E5E5E5] rounded"></div>
          <div className="h-32 bg-[#E5E5E5] rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-[#F0282D] p-6">
        <div className="text-[13px] text-[#F0282D]">Hata: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
      <h2 className="text-[16px] font-semibold text-[#2E2E2E] mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-[#0049AA]" />
        Şirket İşlem Tipleri
      </h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />
          <input
            type="text"
            placeholder="İşlem ara..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-[13px] border border-[#E5E5E5] rounded-lg bg-white text-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-[#0049AA] focus:border-transparent"
          />
        </div>

        <select
          value={companyTypeFilter}
          onChange={(e) => setCompanyTypeFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-[#E5E5E5] rounded-lg bg-white text-[#2E2E2E] focus:outline-none focus:ring-2 focus:ring-[#0049AA] focus:border-transparent"
        >
          <option value="">Tüm Şirket Tipleri</option>
          <option value="as">Anonim Şirket (A.Ş.)</option>
          <option value="ltd">Limited Şirket (Ltd.Ş.)</option>
          <option value="koop">Kooperatif</option>
        </select>
      </div>

      {/* Grouped List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {groupedEvents.map((group) => (
          <div
            key={group.key}
            className="border border-[#E5E5E5] rounded-lg overflow-hidden"
          >
            <div className="bg-[#F5F6F8] px-4 py-2 text-[13px] font-medium text-[#5A5A5A]">
              {group.label}
            </div>
            <div className="divide-y divide-[#E5E5E5]">
              {group.events.map((event) => (
                <div
                  key={event.event_code}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    selectedEventCode === event.event_code
                      ? 'bg-[#0049AA]/10 border-l-2 border-l-[#0049AA]'
                      : 'hover:bg-[#F5F6F8]'
                  }`}
                  onClick={() => onSelectEvent?.(event)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-[#2E2E2E] flex items-center gap-2">
                        {event.event_name}
                        <ChevronRight className="w-4 h-4 text-[#5A5A5A]" />
                      </div>
                      <div className="text-[11px] text-[#5A5A5A] mt-1 flex items-center gap-2">
                        <Building2 className="w-3 h-3" />
                        {event.company_types
                          .map((t) => COMPANY_TYPE_LABELS[t] || t)
                          .join(', ')}
                        {event.registration_deadline && (
                          <>
                            <span className="mx-1">•</span>
                            <Clock className="w-3 h-3" />
                            {event.registration_deadline} gün
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-[#5A5A5A] bg-[#F5F6F8] px-2 py-1 rounded">
                      {event.legal_basis}
                    </div>
                  </div>

                  {/* Tax implications badges */}
                  {event.tax_implications?.kv_istisna && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <span className="text-[10px] bg-[#00A651]/10 text-[#00A651] px-2 py-0.5 rounded">
                        KV İstisna
                      </span>
                      {event.tax_implications?.kdv_istisna && (
                        <span className="text-[10px] bg-[#00A651]/10 text-[#00A651] px-2 py-0.5 rounded">
                          KDV İstisna
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

      <div className="mt-4 text-[11px] text-[#5A5A5A] text-right">
        Toplam: {filteredEvents.length} işlem tipi
      </div>
    </div>
  );
}
