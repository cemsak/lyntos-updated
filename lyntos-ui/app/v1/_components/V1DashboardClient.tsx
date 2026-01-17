'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// Import modular dashboard panels
import { KpiGrid } from './dashboard/KpiGrid';
import { VdkExpertPanel } from './dashboard/VdkExpertPanel';
import { AiSuggestionsPanel } from './dashboard/AiSuggestionsPanel';
import { InflationPanel } from './dashboard/InflationPanel';
import { CrossCheckPanel } from './dashboard/CrossCheckPanel';
import { MizanOmurgaPanel } from './dashboard/MizanOmurgaPanel';
import { ActionQueuePanel } from './dashboard/ActionQueuePanel';
import { RegWatchPanel } from './dashboard/RegWatchPanel';
import { FilterBar } from './dashboard/FilterBar';

// Import existing components
import ExplainModal from './ExplainModal';
import MissingDataPanel from './MissingDataPanel';

// Import types
import type { DashboardData, ExplainData, DashboardContext } from './dashboard/types';

// ════════════════════════════════════════════════════════════════════════════
// EMPTY STATE - Show when no mükellef/dönem selected
// ════════════════════════════════════════════════════════════════════════════

function EmptySelectionState({ smmm }: { smmm: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <FilterBar smmm={smmm} />
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Mukellef ve Donem Secin
          </h2>
          <p className="text-gray-600">
            Dashboard verilerini goruntülemek icin yukaridaki filtreleri kullanin.
          </p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// V1 DASHBOARD CLIENT - Thin Orchestrator
// Does NOT contain business logic or complex rendering
// Only: params reading, data fetching, error handling, panel composition
// ════════════════════════════════════════════════════════════════════════════

interface Props {
  contract?: any;
  ctx: DashboardContext;
}

// Loading skeleton for dashboard
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="grid grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="h-64 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
      <div className="h-48 bg-gray-200 rounded" />
    </div>
  );
}

// Dashboard header component
function DashboardHeader({ ctx, onRefresh, onPdfDownload, pdfLoading }: {
  ctx: DashboardContext;
  onRefresh: () => void;
  onPdfDownload: () => void;
  pdfLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">LYNTOS Operasyon Konsolu</h1>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{ctx.period}</span>
          <span className="mx-2">|</span>
          <span>{ctx.client}</span>
          <span className="mx-2">|</span>
          <span className="text-gray-400">{ctx.smmm}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/v1/quarterly-cockpit"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Donemsel Veri Kokpiti
        </Link>
        <button
          onClick={onPdfDownload}
          disabled={pdfLoading}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {pdfLoading ? 'Yukleniyor...' : 'PDF Indir'}
        </button>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Yenile
        </button>
      </div>
    </div>
  );
}

export default function V1DashboardClient({ contract, ctx }: Props) {
  // State
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState<ExplainData | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Check if selection is complete
  const hasSelection = ctx.client && ctx.period;

  // API base URL (uses Next.js API routes as proxy)
  const baseUrl = '/api/v1';

  // Fetch dashboard data - each endpoint isolated
  const fetchDashboardData = useCallback(async () => {
    // Don't fetch if no selection
    if (!ctx.client || !ctx.period) {
      setLoading(false);
      return;
    }
    const params = `smmm_id=${ctx.smmm}&client_id=${ctx.client}&period=${ctx.period}`;
    const docParams = `tenant_id=${ctx.smmm}&client_id=${ctx.client}&period_id=${ctx.period}`;
    const authHeaders = { 'Authorization': `DEV_${ctx.smmm}` };

    const newErrors: Record<string, string> = {};
    const newData: Partial<DashboardData> = {};

    // Define endpoints - fetched independently (error isolation)
    const endpoints: Array<{ key: keyof DashboardData; url: string }> = [
      { key: 'kurgan', url: `${baseUrl}/contracts/kurgan-risk?${params}` },
      { key: 'quarterlyTax', url: `${baseUrl}/contracts/quarterly-tax?${params}` },
      { key: 'corporateTax', url: `${baseUrl}/contracts/corporate-tax?${params}` },
      { key: 'dataQuality', url: `${baseUrl}/contracts/data-quality?${params}` },
      { key: 'crossCheck', url: `${baseUrl}/contracts/cross-check?${params}` },
      { key: 'actionableTasks', url: `${baseUrl}/contracts/actionable-tasks?${params}` },
      { key: 'regwatch', url: `${baseUrl}/contracts/regwatch-status` },
      { key: 'mizanAnalysis', url: `${baseUrl}/contracts/mizan-analysis?${params}` },
      { key: 'inflation', url: `${baseUrl}/contracts/inflation-adjustment?${params}` },
      { key: 'completeness', url: `${baseUrl}/documents/period-completeness?${docParams}` },
    ];

    // Fetch all endpoints in parallel, but isolate errors
    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const response = await fetch(endpoint.url, { headers: authHeaders });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return { key: endpoint.key, data: await response.json() };
      })
    );

    // Process results
    results.forEach((result, i) => {
      const key = endpoints[i].key;
      if (result.status === 'fulfilled') {
        newData[key] = result.value.data;
      } else {
        newErrors[key] = result.reason?.message || 'Bilinmeyen hata';
      }
    });

    setData(newData as DashboardData);
    setErrors(newErrors);
    setLoading(false);
  }, [ctx.smmm, ctx.client, ctx.period, baseUrl]);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // PDF download handler
  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const params = `smmm_id=${ctx.smmm}&client_id=${ctx.client}&period=${ctx.period}`;
      const authHeaders = { 'Authorization': `DEV_${ctx.smmm}` };
      const res = await fetch(`${baseUrl}/contracts/export-pdf?${params}`, { headers: authHeaders });

      if (!res.ok) throw new Error('PDF indirilemedi');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LYNTOS_${ctx.client}_${ctx.period}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('PDF indirme hatasi: ' + (e?.message || e));
    } finally {
      setPdfLoading(false);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  // Explain modal handler
  const handleExplain = (explainData: ExplainData) => {
    setShowModal(explainData);
  };

  // Source click handler
  const handleSourceClick = (sourceId: string) => {
    window.open(`${baseUrl}/contracts/sources/${sourceId}`, '_blank');
  };

  // Loading state
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Empty selection state - show when no client/period selected
  if (!hasSelection) {
    return <EmptySelectionState smmm={ctx.smmm} />;
  }

  // Extract analysis for Expert/AI panels
  const kurganExpert = data?.kurgan?.data?.kurgan_risk?.analysis?.expert;
  const kurganAi = data?.kurgan?.data?.kurgan_risk?.analysis?.ai;
  const criteriaScores = data?.kurgan?.data?.kurgan_risk?.criteria_scores;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filter Bar */}
      <FilterBar smmm={ctx.smmm} />
      <div className="p-6">
        {/* Header */}
        <DashboardHeader
          ctx={ctx}
          onRefresh={handleRefresh}
          onPdfDownload={handlePdfDownload}
          pdfLoading={pdfLoading}
        />

        {/* KPI Grid */}
        <div className="mb-6">
          <KpiGrid data={data} errors={errors} onExplain={handleExplain} />
        </div>

      {/* Missing Data Panel (if incomplete) */}
      {data?.completeness?.data && !data.completeness.data.is_complete && (
        <div className="mb-6">
          <MissingDataPanel
            quarterlyTax={data.quarterlyTax?.data}
            crossCheck={data.crossCheck?.data}
            corporateTax={data.corporateTax?.data}
          />
        </div>
      )}

      {/* Action Queue */}
      <div className="mb-6">
        <ActionQueuePanel data={data?.actionableTasks?.data} error={errors.actionableTasks} />
      </div>

      {/* Two Column Layout: Expert vs AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: VDK Expert Analysis (AUTHORITATIVE) */}
        <VdkExpertPanel
          analysis={kurganExpert}
          criteriaScores={criteriaScores}
          error={errors.kurgan}
          onSourceClick={handleSourceClick}
        />

        {/* Right: AI Suggestions (SECONDARY with disclaimer) */}
        <AiSuggestionsPanel
          analysis={kurganAi}
          error={errors.kurgan}
        />
      </div>

      {/* Cross-Check Summary */}
      <div className="mb-6">
        <CrossCheckPanel
          data={data?.crossCheck?.data}
          error={errors.crossCheck}
          onExplain={handleExplain}
        />
      </div>

      {/* Mizan Omurga */}
      <div className="mb-6">
        <MizanOmurgaPanel
          data={data?.mizanAnalysis?.data}
          error={errors.mizanAnalysis}
          onExplain={handleExplain}
        />
      </div>

      {/* Inflation Panel (TMS 29) */}
      <div className="mb-6">
        <InflationPanel
          data={data?.inflation?.data}
          error={errors.inflation}
          onExplain={handleExplain}
        />
      </div>

      {/* RegWatch Panel */}
      <div className="mb-6">
        <RegWatchPanel
          data={data?.regwatch?.data}
          error={errors.regwatch}
        />
      </div>

      {/* Explain Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(null)} />
          <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <ExplainModal
              onClose={() => setShowModal(null)}
              title={showModal.title}
              score={showModal.score}
              reason={showModal.reason}
              legal_basis={showModal.legal_basis}
              legal_basis_refs={showModal.legal_basis ? [showModal.legal_basis] : []}
              evidence_refs={showModal.evidence_refs}
              trust_score={showModal.trust_score}
              smmm={ctx.smmm}
              client={ctx.client}
              period={ctx.period}
            />
          </div>
        </div>
      )}
      </div>{/* Close p-6 wrapper */}
    </div>
  );
}
