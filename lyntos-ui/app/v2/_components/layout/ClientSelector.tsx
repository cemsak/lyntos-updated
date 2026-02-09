'use client';

/**
 * LYNTOS Client Selector Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Searchable dropdown with risk badges
 */
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Star, Building2 } from 'lucide-react';
import { useLayoutContext } from './useLayoutContext';
import { RISK_COLORS } from './types';

interface ClientSelectorProps {
  onSelect?: () => void;
}

export function ClientSelector({ onSelect }: ClientSelectorProps = {}) {
  const { clients, selectedClient, setSelectedClient } = useLayoutContext();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter clients
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.vkn.includes(search) ||
    client.shortName.toLowerCase().includes(search.toLowerCase())
  );

  // Sort: favorites first, then by name
  const sortedClients = [...filteredClients].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.shortName.localeCompare(b.shortName, 'tr');
  });

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
          ${isOpen
            ? 'border-[#0049AA] bg-[#0049AA]/5'
            : 'border-[#E5E5E5] hover:border-[#0049AA]'
          }
          bg-white
          min-w-[200px] max-w-[280px]
        `}
      >
        {selectedClient ? (
          <>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${RISK_COLORS[selectedClient.riskLevel].dot}`} />
            <span className="flex-1 text-left text-[14px] text-[#2E2E2E] truncate">
              {selectedClient.shortName}
            </span>
          </>
        ) : (
          <>
            <Building2 className="w-4 h-4 text-[#5A5A5A]" />
            <span className="flex-1 text-left text-[14px] text-[#5A5A5A]">
              Mükellef Seçin
            </span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-[#5A5A5A] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[320px] bg-white border border-[#E5E5E5] rounded-xl shadow-2xl z-[9999] ring-1 ring-black/5">
          {/* Search */}
          <div className="p-2 border-b border-[#E5E5E5]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />
              <input
                type="text"
                placeholder="İsim veya VKN ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[14px] bg-[#F5F6F8] border-0 rounded-md text-[#2E2E2E] placeholder-[#5A5A5A] focus:outline-none focus:ring-2 focus:ring-[#0049AA]"
                autoFocus
              />
            </div>
          </div>

          {/* Client List */}
          <div className="max-h-[300px] overflow-y-auto py-1">
            {sortedClients.length > 0 ? (
              sortedClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client);
                    setIsOpen(false);
                    setSearch('');
                    onSelect?.();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#F5F6F8] transition-colors
                    ${selectedClient?.id === client.id ? 'bg-[#0049AA]/5' : ''}
                  `}
                >
                  {/* Risk dot */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${RISK_COLORS[client.riskLevel].dot}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {client.isFavorite && <Star className="w-3 h-3 text-[#FFB114] fill-[#FFB114]" />}
                      <span className="text-[14px] font-medium text-[#2E2E2E] truncate">
                        {client.shortName}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#5A5A5A]">
                      VKN: {client.vkn} {client.sector && `• ${client.sector}`}
                    </div>
                  </div>

                  {/* Risk score */}
                  {client.riskScore !== undefined && (
                    <span className={`text-[12px] font-semibold ${RISK_COLORS[client.riskLevel].text}`}>
                      {client.riskScore}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-[14px] text-[#5A5A5A]">
                Mükellef bulunamadı
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
