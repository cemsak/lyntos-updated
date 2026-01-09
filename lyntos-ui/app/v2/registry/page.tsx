/**
 * VERGUS Registry Page
 * Sprint T2
 */
'use client';

import React, { useState } from 'react';
import CompanyList from '../_components/registry/CompanyList';
import CompanyDetail from '../_components/registry/CompanyDetail';
import PortfolioManager from '../_components/registry/PortfolioManager';
import { Company } from '../_components/registry/types';

export default function RegistryPage() {
  const [selectedTaxNumber, setSelectedTaxNumber] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'portfolio'>('list');
  const [listKey, setListKey] = useState(0);

  const handleSelectCompany = (company: Company) => {
    setSelectedTaxNumber(company.tax_number);
  };

  const handleSelectFromPortfolio = (taxNumber: string) => {
    setSelectedTaxNumber(taxNumber);
  };

  const handleRefresh = () => {
    setListKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-100">Ticaret Sicili</h1>
          <p className="text-slate-400 mt-1">
            Sirket kayitlari, degisiklik takibi ve musteri portfolyo yonetimi
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Tum Sirketler
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'portfolio'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Musteri Portfolyom
            </button>
          </nav>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - List or Portfolio */}
          <div>
            {activeTab === 'list' ? (
              <CompanyList key={listKey} onSelectCompany={handleSelectCompany} />
            ) : (
              <PortfolioManager onSelectCompany={handleSelectFromPortfolio} />
            )}
          </div>

          {/* Right Column - Detail */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            {selectedTaxNumber ? (
              <CompanyDetail
                taxNumber={selectedTaxNumber}
                onClose={() => setSelectedTaxNumber(null)}
                onRefresh={handleRefresh}
              />
            ) : (
              <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8 text-center text-slate-500">
                <div className="text-5xl mb-4">[?]</div>
                <p className="text-lg text-slate-400">Sol taraftan bir sirket secin</p>
                <p className="text-sm mt-2">
                  Sirket detaylari ve degisiklik gecmisi burada gorunecek
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
