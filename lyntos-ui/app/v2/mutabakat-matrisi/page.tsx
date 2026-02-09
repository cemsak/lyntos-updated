'use client';

import React, { useState } from 'react';
import { useScopeComplete } from '../_components/scope/ScopeProvider';
import { PanelState } from '../_components/shared/PanelState';
import { Badge } from '../_components/shared/Badge';
import { RefreshCw, Filter, CheckSquare } from 'lucide-react';
import { useCrossCheckData } from './_hooks/useCrossCheckData';
import { useControlDecisions } from './_hooks/useControlDecisions';
import { useRootCauseEngine } from './_hooks/useRootCauseEngine';
import { OzetKartlari } from './_components/OzetKartlari';
import { ControlCardGrid } from './_components/ControlCardGrid';
import { ControlDetailModal } from './_components/ControlDetailModal';
import { FinalizeGate } from './_components/FinalizeGate';
import { DossierExportButton } from './_components/DossierExportButton';
import type { EnrichedCrossCheck, CheckFilter, GroupFilter } from './_types/crossCheck';

const FILTER_OPTIONS: { value: CheckFilter; label: string }[] = [
  { value: 'all', label: 'Tumu' },
  { value: 'kritik', label: 'Kritik/Yuksek' },
  { value: 'failed', label: 'Basarisiz' },
  { value: 'warning', label: 'Uyari' },
  { value: 'passed', label: 'Basarili' },
  { value: 'no_data', label: 'Veri Yok' },
];

const GROUP_OPTIONS: { value: GroupFilter; label: string }[] = [
  { value: 'all', label: 'Tum Gruplar' },
  { value: 'beyan', label: 'Beyanname' },
  { value: 'teknik', label: 'Teknik' },
  { value: 'mali', label: 'Mali Tablolar' },
  { value: 'efatura', label: 'e-Fatura' },
];

export default function MutabakatMatrisiPage() {
  const scopeComplete = useScopeComplete();
  const { summary, checks, previousChecks, loading, error, fetchData, clientId, periodCode } = useCrossCheckData();
  const { kararlar, setKarar, kararIstatistik } = useControlDecisions(clientId, periodCode, checks);

  // Enrich checks with root cause, confidence, trend, and SMMM decisions
  const enrichedChecks = useRootCauseEngine(checks, kararlar, previousChecks);

  const [selectedCheck, setSelectedCheck] = useState<EnrichedCrossCheck | null>(null);
  const [filter, setFilter] = useState<CheckFilter>('all');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  // Scope guard
  if (!scopeComplete) {
    return (
      <div className="p-6">
        <div className="bg-[#FFFBEB] border border-[#FFE045] rounded-xl p-6 text-center">
          <CheckSquare className="w-8 h-8 text-[#E67324] mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-[#2E2E2E] mb-1">Mutabakat Matrisi</h2>
          <p className="text-sm text-[#5A5A5A]">
            Capraz kontrolleri goruntulemek icin lutfen bir mukellef ve donem secin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#2E2E2E] flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#0078D0]" />
            Mutabakat Matrisi
          </h1>
          <p className="text-sm text-[#969696] mt-0.5">
            Beyanname, Teknik ve Mali Tablo capraz kontrolleri
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <DossierExportButton
              summary={summary}
              enrichedChecks={enrichedChecks}
              clientId={clientId}
              periodCode={periodCode}
            />
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0078D0] hover:bg-[#E6F9FF] rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && !summary && (
        <PanelState status="loading" reason_tr="Capraz kontroller calistiriliyor...">
          <div />
        </PanelState>
      )}

      {error && (
        <PanelState status="error" reason_tr={error} onRetry={fetchData}>
          <div />
        </PanelState>
      )}

      {/* Content */}
      {!loading && !error && summary && (
        <>
          {/* Summary KPIs */}
          <OzetKartlari summary={summary} />

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#969696]" />
              <span className="text-xs text-[#969696] font-medium">Durum:</span>
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === opt.value
                      ? 'bg-[#0078D0] text-white'
                      : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-[#E5E5E5]" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#969696] font-medium">Grup:</span>
              {GROUP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGroupFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    groupFilter === opt.value
                      ? 'bg-[#0049AA] text-white'
                      : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="ml-auto">
              <Badge variant="default" size="sm" style="soft">
                {enrichedChecks.length} kontrol
              </Badge>
            </div>
          </div>

          {/* Control Cards Grid */}
          <ControlCardGrid
            checks={enrichedChecks}
            filter={filter}
            groupFilter={groupFilter}
            onCheckClick={setSelectedCheck}
          />

          {/* Recommended Actions - deduplicated and grouped */}
          {summary.recommended_actions.length > 0 && (() => {
            // Group similar recommendations
            const actionGroups = new Map<string, string[]>();
            summary.recommended_actions.forEach(action => {
              // Extract the core recommendation (after the colon)
              const parts = action.split(':');
              const core = parts.length > 1 ? parts[1].trim() : action;
              const prefix = parts.length > 1 ? parts[0].trim() : '';

              if (!actionGroups.has(core)) {
                actionGroups.set(core, []);
              }
              if (prefix) {
                actionGroups.get(core)!.push(prefix);
              }
            });

            // Convert to display format
            const uniqueActions = Array.from(actionGroups.entries()).map(([core, prefixes]) => ({
              core,
              prefixes,
              display: prefixes.length > 1
                ? `${core} (${prefixes.length} kontrol icin)`
                : prefixes.length === 1
                  ? `${prefixes[0]}: ${core}`
                  : core
            }));

            return (
              <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#0049AA] mb-2">
                  Onerilen Aksiyonlar ({uniqueActions.length})
                </h3>
                <ul className="space-y-1">
                  {uniqueActions.map((action, i) => (
                    <li key={i} className="text-sm text-[#0049AA] flex items-start gap-2">
                      <span className="text-[#0078D0] mt-0.5">•</span>
                      {action.display}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Finalize Gate */}
          <FinalizeGate kararIstatistik={kararIstatistik} />
        </>
      )}

      {/* Detail Modal */}
      <ControlDetailModal
        check={selectedCheck}
        onClose={() => setSelectedCheck(null)}
        onKararChange={setKarar}
      />
    </div>
  );
}
