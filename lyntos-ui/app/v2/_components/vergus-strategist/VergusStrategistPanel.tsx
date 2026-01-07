'use client';

/**
 * VERGUS Tax Strategist Panel
 * Sprint 9.0 - LYNTOS V2
 *
 * Main panel for tax optimization analysis and recommendations.
 */

import React, { useState, useCallback } from 'react';
import {
  TrendingUp,
  Sparkles,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Target,
  Zap,
} from 'lucide-react';
import { OpportunityCard } from './OpportunityCard';
import { FinancialDataForm } from './FinancialDataForm';
import { useVergusAnalysis } from './useVergusAnalysis';
import type { FinancialDataInput, Category } from './types';
import { CATEGORY_CONFIG } from './types';

interface VergusStrategistPanelProps {
  clientId: string;
  clientName: string;
  period: string;
}

export function VergusStrategistPanel({
  clientId,
  clientName,
  period,
}: VergusStrategistPanelProps) {
  const [showForm, setShowForm] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { analysis, isLoading, error, runAnalysis } = useVergusAnalysis({
    clientId,
    period,
  });

  const handleAnalysis = useCallback(
    async (financialData?: Partial<FinancialDataInput>) => {
      await runAnalysis(financialData);
      setShowForm(false);
    },
    [runAnalysis]
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const filteredOpportunities = analysis?.opportunities.filter((opp) =>
    selectedCategory ? opp.category === selectedCategory : true
  );

  if (isLoading && !analysis) {
    return (
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-[#635bff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#697386]">
            Vergi optimizasyon analizi yapiliyor...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#cd3d64] p-6">
        <div className="flex items-center gap-3 text-[#cd3d64]">
          <AlertCircle className="w-5 h-5" />
          <p className="text-[14px]">{error}</p>
        </div>
        <button
          onClick={() => runAnalysis()}
          className="mt-4 px-4 py-2 text-[13px] font-medium text-white bg-[#635bff] rounded-lg hover:bg-[#5851ea] transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#635bff] to-[#9061f9] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold">VERGUS Vergi Stratejisti</h2>
              <p className="text-[13px] text-white/80">
                {clientName} &bull; {period}
              </p>
            </div>
          </div>
          {analysis && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Yeni Analiz
            </button>
          )}
        </div>

        {/* Summary Stats */}
        {analysis && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-[24px] font-bold">
                {analysis.opportunities.length}
              </p>
              <p className="text-[11px] text-white/70">Firsat Tespit Edildi</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-[24px] font-bold">
                {formatCurrency(analysis.total_potential_saving)}
              </p>
              <p className="text-[11px] text-white/70">Potansiyel Tasarruf</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-[24px] font-bold">
                {analysis.summary.acil_aksiyonlar}
              </p>
              <p className="text-[11px] text-white/70">Acil Aksiyon</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-[24px] font-bold">
                {formatCurrency(analysis.summary.en_yuksek_tasarruf)}
              </p>
              <p className="text-[11px] text-white/70">En Yuksek Firsat</p>
            </div>
          </div>
        )}
      </div>

      {/* Financial Data Form */}
      {showForm && (
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[#1a1f36] dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#635bff]" />
              Mali Veri Girisi
            </h3>
            {analysis && (
              <button
                onClick={() => setShowForm(false)}
                className="text-[12px] text-[#697386] hover:text-[#1a1f36] dark:hover:text-white"
              >
                Kapat
              </button>
            )}
          </div>
          <FinancialDataForm onSubmit={handleAnalysis} isLoading={isLoading} />
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !showForm && (
        <>
          {/* Recommendation Banner */}
          {analysis.summary.tavsiye && (
            <div className="bg-[#0caf60]/10 border border-[#0caf60]/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-[#0caf60] mt-0.5" />
                <div>
                  <h4 className="text-[13px] font-medium text-[#0caf60]">
                    Oncelikli Tavsiye
                  </h4>
                  <p className="text-[12px] text-[#0caf60]/80 mt-1">
                    {analysis.summary.tavsiye}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-lg whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-[#635bff] text-white'
                  : 'bg-[#f6f9fc] dark:bg-[#0a0d14] text-[#697386] hover:text-[#1a1f36] dark:hover:text-white'
              }`}
            >
              Tumu ({analysis.opportunities.length})
            </button>
            {Object.entries(analysis.summary.kategori_dagilimi).map(
              ([category, count]) => {
                const config =
                  CATEGORY_CONFIG[category as Category] ||
                  CATEGORY_CONFIG.KURUMLAR_VERGISI;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-[#635bff] text-white'
                        : 'bg-[#f6f9fc] dark:bg-[#0a0d14] text-[#697386] hover:text-[#1a1f36] dark:hover:text-white'
                    }`}
                  >
                    <span>{config.icon}</span>
                    {config.label} ({count})
                  </button>
                );
              }
            )}
          </div>

          {/* Opportunities List */}
          <div className="space-y-4">
            {filteredOpportunities?.map((opportunity, index) => (
              <OpportunityCard
                key={opportunity.strategy_id}
                opportunity={opportunity}
                rank={index + 1}
              />
            ))}
          </div>

          {/* Client Profile Summary */}
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-[#e3e8ee] dark:border-[#2d3343] p-4">
            <h3 className="text-[14px] font-semibold text-[#1a1f36] dark:text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#635bff]" />
              Musteri Profili
            </h3>
            <div className="grid grid-cols-3 gap-4 text-[12px]">
              <div>
                <span className="text-[#697386]">Faaliyet Turu:</span>{' '}
                <span className="text-[#1a1f36] dark:text-white font-medium">
                  {analysis.profile.faaliyet_turu}
                </span>
              </div>
              <div>
                <span className="text-[#697386]">Ihracat Orani:</span>{' '}
                <span className="text-[#1a1f36] dark:text-white font-medium">
                  %{analysis.profile.ihracat_orani.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-[#697386]">Personel:</span>{' '}
                <span className="text-[#1a1f36] dark:text-white font-medium">
                  {analysis.profile.personel_sayisi} kisi
                </span>
              </div>
              <div>
                <span className="text-[#697386]">Ar-Ge Uygunluk:</span>{' '}
                <span
                  className={`font-medium ${analysis.profile.arge_var ? 'text-[#0caf60]' : 'text-[#697386]'}`}
                >
                  {analysis.profile.arge_var ? 'Evet' : 'Hayir'}
                </span>
              </div>
              <div>
                <span className="text-[#697386]">Teknokent:</span>{' '}
                <span
                  className={`font-medium ${analysis.profile.teknokent ? 'text-[#0caf60]' : 'text-[#697386]'}`}
                >
                  {analysis.profile.teknokent ? 'Evet' : 'Hayir'}
                </span>
              </div>
              <div>
                <span className="text-[#697386]">Uretim:</span>{' '}
                <span
                  className={`font-medium ${analysis.profile.uretim_var ? 'text-[#0caf60]' : 'text-[#697386]'}`}
                >
                  {analysis.profile.uretim_var ? 'Evet' : 'Hayir'}
                </span>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="text-[11px] text-[#697386] text-center p-4">
            Bu analiz bilgilendirme amaclidir ve profesyonel danismanlik yerine
            gecmez. Mevzuat surekli degismektedir, guncel durumu teyit edin.
            Tum islemler belgelendirilmeli ve tesvik edilmelidir.
          </div>
        </>
      )}
    </div>
  );
}
