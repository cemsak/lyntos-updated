'use client';

/**
 * Çapraz Kontrol Özet Panel - Premium Kokpit Görünümü
 * SMMM/YMM için kompakt mutabakat özeti
 */

import React from 'react';
import { ArrowLeftRight, CheckCircle2, AlertTriangle, XCircle, FileSearch } from 'lucide-react';
import { PremiumPanel, VariantBadge, MetricCard } from '../shared/PremiumPanel';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import { useScopeComplete } from '../scope/useDashboardScope';

interface CrossCheckItem {
  id: string;
  status: 'match' | 'minor' | 'major' | 'critical';
  source_label: string;
  target_label: string;
}

interface CrossCheckSummaryResult {
  checks: CrossCheckItem[];
  summary: {
    total: number;
    matched: number;
    discrepancies: number;
    critical: number;
  };
}

function normalizeCrossCheckSummary(raw: unknown): PanelEnvelope<CrossCheckSummaryResult> {
  return normalizeToEnvelope<CrossCheckSummaryResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const checksRaw = data?.checks || data?.items || [];
    const checks: CrossCheckItem[] = Array.isArray(checksRaw)
      ? checksRaw.map((c: Record<string, unknown>, idx: number) => ({
          id: String(c.id || `cc-${idx}`),
          status: mapStatus(c.status || c.result),
          source_label: String(c.source_label || c.source || ''),
          target_label: String(c.target_label || c.target || ''),
        }))
      : [];

    const matched = checks.filter(c => c.status === 'match').length;
    const critical = checks.filter(c => c.status === 'critical').length;
    const summaryRaw = data?.summary as Record<string, unknown> | undefined;

    return {
      checks,
      summary: {
        total: checks.length,
        matched: typeof summaryRaw?.matched === 'number' ? summaryRaw.matched : matched,
        discrepancies: typeof summaryRaw?.discrepancies === 'number' ? summaryRaw.discrepancies : checks.length - matched,
        critical: typeof summaryRaw?.critical === 'number' ? summaryRaw.critical : critical,
      },
    };
  });
}

function mapStatus(s: unknown): CrossCheckItem['status'] {
  const str = String(s).toLowerCase();
  if (str === 'match' || str === 'ok' || str === 'esit') return 'match';
  if (str === 'minor' || str === 'warning') return 'minor';
  if (str === 'major') return 'major';
  if (str === 'critical' || str === 'error') return 'critical';
  return 'minor';
}

export function CrossCheckSummaryPanel() {
  const scopeComplete = useScopeComplete();

  const envelope = useFailSoftFetch<CrossCheckSummaryResult>(
    ENDPOINTS.CROSS_CHECK,
    normalizeCrossCheckSummary
  );

  const { status, data } = envelope;
  const isLoading = status === 'loading';
  const hasData = (data?.checks?.length ?? 0) > 0;

  const matchedCount = data?.summary?.matched ?? 0;
  const discrepancyCount = data?.summary?.discrepancies ?? 0;
  const criticalCount = data?.summary?.critical ?? 0;
  const totalCount = data?.summary?.total ?? 0;

  // Loading/No scope state
  if (!scopeComplete || isLoading) {
    return (
      <PremiumPanel
        title="Çapraz Kontrol"
        subtitle="Mizan - Beyanname Mutabakatı"
        icon={<ArrowLeftRight className="w-5 h-5 text-white" />}
        iconGradient="from-[#0078D0] to-[#0078D0]"
        detailHref="/v2/cross-check"
        summaryContent={
          <div className="flex items-center gap-6 text-sm text-white/60">
            <span>Yükleniyor...</span>
          </div>
        }
      >
        <div className="py-8 text-center text-[#969696]">
          <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Dönem seçildikten sonra çapraz kontroller görünecek</p>
        </div>
      </PremiumPanel>
    );
  }

  // No data state
  if (!hasData) {
    return (
      <PremiumPanel
        title="Çapraz Kontrol"
        subtitle="Mizan - Beyanname Mutabakatı"
        icon={<ArrowLeftRight className="w-5 h-5 text-white" />}
        iconGradient="from-[#0078D0] to-[#0078D0]"
        detailHref="/v2/cross-check"
        statusBadge={<VariantBadge variant="neutral">Veri Bekleniyor</VariantBadge>}
        summaryContent={
          <div className="flex items-center gap-6 text-sm">
            <span className="text-white/60">Kontrol verisi yok</span>
          </div>
        }
      >
        <div className="py-6 text-center">
          <FileSearch className="w-8 h-8 mx-auto mb-2 text-[#969696]" />
          <p className="text-sm text-[#5A5A5A] mb-2">Çapraz kontrol verisi bulunamadı</p>
          <p className="text-xs text-[#969696]">Mizan ve beyanname verilerini yükledikten sonra kontroller otomatik çalışacak</p>
        </div>
      </PremiumPanel>
    );
  }

  // Determine overall status
  const overallVariant = criticalCount > 0 ? 'danger' : discrepancyCount > 0 ? 'warning' : 'success';
  const overallLabel = criticalCount > 0 ? 'Kritik Fark' : discrepancyCount > 0 ? 'Fark Var' : 'Tamamı Eşleşti';

  return (
    <PremiumPanel
      title="Çapraz Kontrol"
      subtitle="Mizan - Beyanname Mutabakatı"
      icon={<ArrowLeftRight className="w-5 h-5 text-white" />}
      iconGradient="from-[#0078D0] to-[#0078D0]"
      detailHref="/v2/cross-check"
      statusBadge={<VariantBadge variant={overallVariant}>{overallLabel}</VariantBadge>}
      summaryContent={
        <div className="flex items-center gap-6 text-sm">
          <span className="text-[#6BDB83]">✓ Eşleşti: {matchedCount}</span>
          <span className={discrepancyCount > 0 ? 'text-[#FFE045]' : 'text-white/60'}>
            ⚠ Fark: {discrepancyCount}
          </span>
          <span className={criticalCount > 0 ? 'text-[#FF9196]' : 'text-white/60'}>
            ✗ Kritik: {criticalCount}
          </span>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Toplam Kontrol"
          value={totalCount.toString()}
          icon={<FileSearch className="w-4 h-4" />}
          color="slate"
        />
        <MetricCard
          label="Eşleşen"
          value={matchedCount.toString()}
          icon={<CheckCircle2 className="w-4 h-4" />}
          trend="up"
          color="emerald"
        />
        <MetricCard
          label="Farklı"
          value={discrepancyCount.toString()}
          icon={<AlertTriangle className="w-4 h-4" />}
          color={discrepancyCount > 0 ? 'amber' : 'slate'}
        />
        <MetricCard
          label="Kritik"
          value={criticalCount.toString()}
          icon={<XCircle className="w-4 h-4" />}
          color={criticalCount > 0 ? 'red' : 'slate'}
        />
      </div>

      {/* Critical alerts */}
      {criticalCount > 0 && (
        <div className="mt-4 p-3 bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg">
          <div className="flex items-center gap-2 text-[#980F30] text-sm font-medium mb-2">
            <XCircle className="w-4 h-4" />
            Kritik Farklar Tespit Edildi
          </div>
          <p className="text-xs text-[#BF192B]">
            {criticalCount} adet çapraz kontrolde kritik tutarsızlık var.
            Beyanname ve mizan kayıtlarını kontrol edin.
          </p>
        </div>
      )}

      {/* All matched celebration */}
      {matchedCount === totalCount && totalCount > 0 && (
        <div className="mt-4 p-3 bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg">
          <div className="flex items-center gap-2 text-[#005A46] text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Tüm Kontroller Başarılı
          </div>
          <p className="text-xs text-[#00804D] mt-1">
            Mizan ve beyanname kayıtları tutarlı. VDK incelemesinde risk düşük.
          </p>
        </div>
      )}
    </PremiumPanel>
  );
}
