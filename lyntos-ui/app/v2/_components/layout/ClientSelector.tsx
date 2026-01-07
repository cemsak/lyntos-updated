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

export function ClientSelector() {
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
            ? 'border-[#635bff] bg-[#635bff]/5'
            : 'border-[#e3e8ee] dark:border-[#2d3343] hover:border-[#635bff]'
          }
          bg-white dark:bg-[#1a1f2e]
          min-w-[200px] max-w-[280px]
        `}
      >
        {selectedClient ? (
          <>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${RISK_COLORS[selectedClient.riskLevel].dot}`} />
            <span className="flex-1 text-left text-[14px] text-[#1a1f36] dark:text-white truncate">
              {selectedClient.shortName}
            </span>
          </>
        ) : (
          <>
            <Building2 className="w-4 h-4 text-[#697386]" />
            <span className="flex-1 text-left text-[14px] text-[#697386]">
              Mükellef Seçin
            </span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-[#697386] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[320px] bg-white dark:bg-[#1a1f2e] border border-[#e3e8ee] dark:border-[#2d3343] rounded-lg shadow-lg z-50">
          {/* Search */}
          <div className="p-2 border-b border-[#e3e8ee] dark:border-[#2d3343]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#697386]" />
              <input
                type="text"
                placeholder="İsim veya VKN ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[14px] bg-[#f6f9fc] dark:bg-[#0a0d14] border-0 rounded-md text-[#1a1f36] dark:text-white placeholder-[#697386] focus:outline-none focus:ring-2 focus:ring-[#635bff]"
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
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#f6f9fc] dark:hover:bg-[#0a0d14] transition-colors
                    ${selectedClient?.id === client.id ? 'bg-[#635bff]/5' : ''}
                  `}
                >
                  {/* Risk dot */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${RISK_COLORS[client.riskLevel].dot}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {client.isFavorite && <Star className="w-3 h-3 text-[#f5a623] fill-[#f5a623]" />}
                      <span className="text-[14px] font-medium text-[#1a1f36] dark:text-white truncate">
                        {client.shortName}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#697386]">
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
              <div className="px-3 py-4 text-center text-[14px] text-[#697386]">
                Mükellef bulunamadı
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
