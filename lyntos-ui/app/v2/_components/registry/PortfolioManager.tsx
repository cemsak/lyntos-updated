/**
 * VERGUS Portfolio Manager Component
 * Sprint T2
 */
'use client';

import React, { useState } from 'react';
import { usePortfolio } from './useRegistry';
import { COMPANY_TYPE_LABELS, COMPANY_STATUS_LABELS } from './types';

interface PortfolioManagerProps {
  smmmId?: string;
  onSelectCompany?: (taxNumber: string) => void;
}

export default function PortfolioManager({
  smmmId = 'default',
  onSelectCompany
}: PortfolioManagerProps) {
  const { data: portfolio, loading, error, addToPortfolio, removeFromPortfolio } = usePortfolio(smmmId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaxNumber, setNewTaxNumber] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxNumber) return;

    try {
      setAdding(true);
      await addToPortfolio(newTaxNumber, newCompanyName || undefined);
      setNewTaxNumber('');
      setNewCompanyName('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (portfolioId: string) => {
    if (!confirm('Bu musteriyi portfolyonuzden cikarmak istediginize emin misiniz?')) return;

    try {
      await removeFromPortfolio(portfolioId);
    } catch (err) {
      console.error('Failed to remove:', err);
    }
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
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-100">Musteri Portfolyom</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            [+] Musteri Ekle
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Vergi Numarasi *"
                value={newTaxNumber}
                onChange={(e) => setNewTaxNumber(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200 placeholder-slate-400"
                required
              />
              <input
                type="text"
                placeholder="Sirket Adi (opsiyonel)"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200 placeholder-slate-400"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {adding ? 'Ekleniyor...' : 'Ekle'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-md hover:bg-slate-600"
              >
                Iptal
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Portfolio List */}
      <div className="divide-y divide-slate-700">
        {portfolio.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <div className="text-4xl mb-2">[0]</div>
            <p>Portfolyonuzde henuz musteri yok</p>
            <p className="text-sm mt-1">Yukaridaki butona tiklayarak musteri ekleyebilirsiniz</p>
          </div>
        ) : (
          portfolio.map((item) => {
            const company = item.company_details;
            const statusInfo = company
              ? COMPANY_STATUS_LABELS[company.status]
              : COMPANY_STATUS_LABELS.active;

            return (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onSelectCompany?.(item.tax_number)}
                  >
                    <h3 className="font-medium text-slate-100">
                      {item.company_name || company?.company_name || 'Isimsiz Sirket'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span>VKN: {item.tax_number}</span>
                      {company && (
                        <>
                          <span>|</span>
                          <span>{COMPANY_TYPE_LABELS[company.company_type]}</span>
                        </>
                      )}
                    </div>

                    {company && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded border ${getStatusStyle(company.status)}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {item.relationship_type === 'accounting' ? 'Muhasebe' : item.relationship_type}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-2 text-slate-500 hover:text-red-400"
                    title="Portfolyden Cikar"
                  >
                    [X]
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {portfolio.length > 0 && (
        <div className="p-4 border-t border-slate-700 bg-slate-900/30">
          <div className="text-sm text-slate-400">
            Toplam: <span className="font-medium text-slate-300">{portfolio.length}</span> musteri
          </div>
        </div>
      )}
    </div>
  );
}
