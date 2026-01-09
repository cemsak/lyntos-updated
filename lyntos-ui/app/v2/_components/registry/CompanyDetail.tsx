/**
 * VERGUS Company Detail Component
 * Sprint T2
 */
'use client';

import React from 'react';
import { useCompany, useTrackCompany } from './useRegistry';
import {
  COMPANY_TYPE_LABELS,
  COMPANY_STATUS_LABELS,
  CHANGE_TYPE_LABELS
} from './types';

interface CompanyDetailProps {
  taxNumber: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

export default function CompanyDetail({ taxNumber, onClose, onRefresh }: CompanyDetailProps) {
  const { data: company, loading, error, refetch } = useCompany(taxNumber);
  const { track, untrack, loading: trackLoading } = useTrackCompany();

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
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

  const handleToggleTrack = async () => {
    if (!company) return;

    try {
      if (company.is_tracked) {
        await untrack(company.tax_number);
      } else {
        await track(company.tax_number);
      }
      refetch();
      onRefresh?.();
    } catch (err) {
      console.error('Track toggle failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-2/3"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          <div className="h-32 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="text-red-400">Sirket bulunamadi: {error}</div>
      </div>
    );
  }

  const statusInfo = COMPANY_STATUS_LABELS[company.status] || COMPANY_STATUS_LABELS.active;

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">
              {company.company_name}
            </h2>
            <p className="text-slate-400 mt-1">
              VKN: {company.tax_number}
              {company.trade_registry_number && ` | Sicil No: ${company.trade_registry_number}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTrack}
              disabled={trackLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
                company.is_tracked
                  ? 'bg-blue-900/50 text-blue-300 border-blue-700 hover:bg-blue-900/70'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
            >
              {trackLoading ? '...' : company.is_tracked ? '[*] Takipte' : '[+] Takibe Al'}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200"
              >
                [X]
              </button>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`px-3 py-1 rounded text-sm border ${getStatusStyle(company.status)}`}>
            {statusInfo.icon} {statusInfo.label}
          </span>
          <span className="px-3 py-1 rounded text-sm bg-slate-700/50 text-slate-300 border border-slate-600">
            {COMPANY_TYPE_LABELS[company.company_type] || company.company_type}
          </span>
          {company.trade_registry_office && (
            <span className="px-3 py-1 rounded text-sm bg-slate-700/50 text-slate-300 border border-slate-600">
              {company.trade_registry_office}
            </span>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Sirket Bilgileri</h3>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-3 border border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Kurulus Tarihi</span>
                <span className="text-slate-200">{formatDate(company.establishment_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sermaye</span>
                <span className="text-slate-200">{formatCurrency(company.current_capital)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Odenmis Sermaye</span>
                <span className="text-slate-200">{formatCurrency(company.paid_capital)}</span>
              </div>
              {company.nace_code && (
                <div className="flex justify-between">
                  <span className="text-slate-400">NACE Kodu</span>
                  <span className="text-slate-200">{company.nace_code}</span>
                </div>
              )}
            </div>
          </div>

          {company.address && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Adres</h3>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-300">{company.address}</p>
                {company.city && (
                  <p className="text-slate-400 mt-1">
                    {company.district && `${company.district} / `}{company.city}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">TTSG Bilgileri</h3>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-3 border border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Son TTSG Tarihi</span>
                <span className="text-slate-200">{formatDate(company.last_ttsg_date)}</span>
              </div>
              {company.last_ttsg_issue && (
                <div className="flex justify-between">
                  <span className="text-slate-400">TTSG Sayisi</span>
                  <span className="text-slate-200">{company.last_ttsg_issue}</span>
                </div>
              )}
              {company.ttsg_pdf_url && (
                <a
                  href={company.ttsg_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-400 hover:underline"
                >
                  [PDF] TTSG Indir
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-2">Kaynak Bilgisi</h3>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2 text-sm border border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Kaynak</span>
                <span className="text-slate-300">{company.source}</span>
              </div>
              {company.last_verified_at && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Son Dogrulama</span>
                  <span className="text-slate-300">{formatDate(company.last_verified_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Changes */}
      {company.recent_changes && company.recent_changes.length > 0 && (
        <div className="p-6 border-t border-slate-700">
          <h3 className="text-lg font-medium text-slate-200 mb-4">Son Degisiklikler</h3>
          <div className="space-y-3">
            {company.recent_changes.map((change) => {
              const changeInfo = CHANGE_TYPE_LABELS[change.change_type] || { label: change.change_type, icon: '[?]' };

              return (
                <div
                  key={change.id}
                  className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                >
                  <span className="text-lg text-slate-400">{changeInfo.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-200">{changeInfo.label}</div>
                    {change.change_description && (
                      <p className="text-sm text-slate-400 mt-1">{change.change_description}</p>
                    )}
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                      {change.ttsg_date && <span>TTSG: {change.ttsg_date}</span>}
                      <span>Tespit: {formatDate(change.detected_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
