/**
 * VERGUS Company List Component
 * Sprint T2
 */
'use client';

import React, { useState } from 'react';
import { useCompanies, useOffices } from './useRegistry';
import { Company, COMPANY_TYPE_LABELS, COMPANY_STATUS_LABELS } from './types';

interface CompanyListProps {
  onSelectCompany?: (company: Company) => void;
  showFilters?: boolean;
}

export default function CompanyList({ onSelectCompany, showFilters = true }: CompanyListProps) {
  const [cityFilter, setCityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [trackedOnly, setTrackedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: companies, loading, error, refetch } = useCompanies({
    city: cityFilter || undefined,
    status: statusFilter || undefined,
    company_type: typeFilter || undefined,
    is_tracked: trackedOnly || undefined,
    limit: 100
  });

  const { data: offices } = useOffices();

  // Client-side search filter
  const filteredCompanies = companies.filter(c =>
    !searchQuery ||
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tax_number.includes(searchQuery)
  );

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900/30 text-green-300 border-green-700';
      case 'liquidation': return 'bg-orange-900/30 text-orange-300 border-orange-700';
      case 'closed': return 'bg-slate-700/50 text-slate-400 border-slate-600';
      case 'merged': return 'bg-blue-900/30 text-blue-300 border-blue-700';
      default: return 'bg-slate-700/50 text-slate-400 border-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="h-12 bg-slate-700 rounded"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="text-red-400">Hata: {error}</div>
        <button onClick={refetch} className="mt-2 text-blue-400 hover:underline">
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-100">Sirket Listesi</h2>
          <span className="text-sm text-slate-400">
            {filteredCompanies.length} sirket
          </span>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Sirket adi veya vergi no ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200"
            >
              <option value="">Tum Iller</option>
              {[...new Set(offices.map(o => o.city))].map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200"
            >
              <option value="">Tum Durumlar</option>
              <option value="active">Aktif</option>
              <option value="liquidation">Tasfiye</option>
              <option value="closed">Kapali</option>
              <option value="merged">Birlesmis</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200"
            >
              <option value="">Tum Tipler</option>
              <option value="as">A.S.</option>
              <option value="ltd">Ltd. Sti.</option>
              <option value="sahis">Sahis</option>
              <option value="koop">Kooperatif</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={trackedOnly}
                onChange={(e) => setTrackedOnly(e.target.checked)}
                className="rounded bg-slate-700 border-slate-600"
              />
              Sadece Takip Edilenler
            </label>
          </div>
        )}
      </div>

      {/* Company List */}
      <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
        {filteredCompanies.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <div className="text-4xl mb-2">[?]</div>
            <p>Sirket bulunamadi</p>
          </div>
        ) : (
          filteredCompanies.map((company) => {
            const statusInfo = COMPANY_STATUS_LABELS[company.status] || COMPANY_STATUS_LABELS.active;

            return (
              <div
                key={company.id}
                onClick={() => onSelectCompany?.(company)}
                className="p-4 hover:bg-slate-700/50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-100">
                        {company.company_name}
                      </h3>
                      {company.is_tracked && (
                        <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-0.5 rounded border border-blue-700">
                          Takipte
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-400">
                      <span>VKN: {company.tax_number}</span>
                      <span>|</span>
                      <span>{COMPANY_TYPE_LABELS[company.company_type] || company.company_type}</span>
                      {company.city && (
                        <>
                          <span>|</span>
                          <span>{company.district || company.city}</span>
                        </>
                      )}
                    </div>

                    {company.current_capital && (
                      <div className="mt-1 text-sm text-slate-500">
                        Sermaye: {formatCurrency(company.current_capital)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-1 rounded border ${getStatusStyle(company.status)}`}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>

                    {company.last_ttsg_date && (
                      <span className="text-xs text-slate-500">
                        Son TTSG: {company.last_ttsg_date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
