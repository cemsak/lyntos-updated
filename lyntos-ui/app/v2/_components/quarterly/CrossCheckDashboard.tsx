/**
 * LYNTOS Cross-Check Dashboard
 * Capraz kontrol sonuclari dashboard'u
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, MinusCircle,
  Filter, RefreshCw, Clock
} from 'lucide-react';
import { CheckResultCard } from './CheckResultCard';
import { ExportButtons } from './ExportButtons';
import type { EngineCheckReport } from '../../_lib/parsers/crosscheck/types';
import type { ParsedData } from '../../_hooks/useQuarterlyAnalysis';

interface CrossCheckDashboardProps {
  report: EngineCheckReport;
  duration: number | null;
  onReset: () => void;
  parsedData: ParsedData;
  startTime: number | null;
  endTime: number | null;
}

type FilterStatus = 'all' | 'pass' | 'fail' | 'partial' | 'skip';
type FilterCategory = 'all' | 'kdv' | 'muhtasar' | 'banka' | 'yevmiye' | 'edefter';

export function CrossCheckDashboard({ report, duration, onReset, parsedData, startTime, endTime }: CrossCheckDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');

  const filteredResults = useMemo(() => {
    return report.results.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      return true;
    });
  }, [report.results, statusFilter, categoryFilter]);

  const summary = report.summary;

  const categoryLabels: Record<string, string> = {
    kdv: 'KDV',
    muhtasar: 'Muhtasar',
    banka: 'Banka',
    yevmiye: 'Yevmiye',
    edefter: 'e-Defter'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#2E2E2E]">Capraz Kontrol Sonuclari</h2>
            {report.unvan && (
              <p className="text-[#969696] mt-1">{report.unvan}</p>
            )}
            {report.vkn && (
              <p className="text-sm text-[#969696]">VKN: {report.vkn}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {duration && (
              <div className="flex items-center gap-1 text-sm text-[#969696]">
                <Clock className="w-4 h-4" />
                <span>{(duration / 1000).toFixed(1)}s</span>
              </div>
            )}
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-[#F5F6F8] text-[#5A5A5A] rounded-lg hover:bg-[#E5E5E5] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Yeni Analiz</span>
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="mt-4 flex justify-end">
          <ExportButtons
            report={report}
            parsedData={parsedData}
            startTime={startTime}
            endTime={endTime}
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-[#2E2E2E]">{summary.totalChecks}</p>
            <p className="text-sm text-[#969696]">Toplam Kontrol</p>
          </div>
          <div className="bg-[#ECFDF5] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#00A651]" />
              <p className="text-3xl font-bold text-[#00804D]">{summary.passed}</p>
            </div>
            <p className="text-sm text-[#00804D]">Basarili</p>
          </div>
          <div className="bg-[#FEF2F2] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <XCircle className="w-6 h-6 text-[#F0282D]" />
              <p className="text-3xl font-bold text-[#BF192B]">{summary.failed}</p>
            </div>
            <p className="text-sm text-[#BF192B]">Basarisiz</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <p className="text-3xl font-bold text-yellow-600">{summary.partial}</p>
            </div>
            <p className="text-sm text-yellow-600">Kismi</p>
          </div>
          <div className="bg-[#F5F6F8] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <MinusCircle className="w-6 h-6 text-[#969696]" />
              <p className="text-3xl font-bold text-[#969696]">{summary.skipped}</p>
            </div>
            <p className="text-sm text-[#969696]">Atlandi</p>
          </div>
        </div>

        {/* Critical issues alert */}
        {summary.criticalIssues > 0 && (
          <div className="mt-4 bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-4 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-[#BF192B]" />
            <div>
              <p className="font-semibold text-[#BF192B]">
                {summary.criticalIssues} Kritik Uyumsuzluk Tespit Edildi
              </p>
              <p className="text-sm text-[#BF192B]">
                Bu uyumsuzluklar VDK denetiminde sorun olusturabilir.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#969696]" />
            <span className="text-sm font-medium text-[#5A5A5A]">Filtrele:</span>
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {(['all', 'pass', 'fail', 'partial', 'skip'] as FilterStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-[#0049AA] text-white'
                    : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
                }`}
              >
                {status === 'all' ? 'Tumu' :
                 status === 'pass' ? 'Basarili' :
                 status === 'fail' ? 'Basarisiz' :
                 status === 'partial' ? 'Kismi' : 'Atlandi'}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[#E5E5E5]" />

          {/* Category filter */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'kdv', 'muhtasar', 'banka', 'yevmiye'] as FilterCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#0049AA] text-white'
                    : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
                }`}
              >
                {cat === 'all' ? 'Tum Kategoriler' : categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <div className="bg-[#F5F6F8] rounded-xl p-8 text-center">
            <p className="text-[#969696]">Bu filtreye uygun sonuc bulunamadi.</p>
          </div>
        ) : (
          filteredResults.map((result, index) => (
            <CheckResultCard key={`${result.ruleId}-${index}`} result={result} />
          ))
        )}
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4">Kategori Bazli Ozet</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(summary.categories).map(([cat, stats]) => {
            if (stats.total === 0) return null;
            const passRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0;

            return (
              <div key={cat} className="border border-[#E5E5E5] rounded-lg p-4">
                <h4 className="font-medium text-[#5A5A5A] mb-2">{categoryLabels[cat] || cat}</h4>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#00804D]">{stats.passed} basarili</span>
                  <span className="text-[#BF192B]">{stats.failed} basarisiz</span>
                </div>
                <div className="h-2 bg-[#F5F6F8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00A651] transition-all"
                    style={{ width: `${passRate}%` }}
                  />
                </div>
                <p className="text-xs text-[#969696] mt-1">{passRate.toFixed(0)}% basarili</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
