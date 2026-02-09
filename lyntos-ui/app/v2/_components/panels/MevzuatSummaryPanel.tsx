'use client';

/**
 * Mevzuat Özet Panel - Premium Kokpit Görünümü
 * SMMM/YMM için kompakt mevzuat takip özeti
 */

import React, { useState, useEffect } from 'react';
import { Radar, Bell, Clock, ExternalLink, CheckCircle2, Radio } from 'lucide-react';
import { PremiumPanel, VariantBadge, MetricCard } from '../shared/PremiumPanel';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

const REGWATCH_ACTIVE_KEY = 'lyntos-regwatch-active';

interface RegWatchSummaryResult {
  is_active: boolean;
  pending_count: number;
  last_scan?: string;
  stats?: {
    last_7_days: number;
    last_30_days: number;
  };
}

function normalizeRegWatchSummary(raw: unknown): PanelEnvelope<RegWatchSummaryResult> {
  return normalizeToEnvelope<RegWatchSummaryResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const isActive = data?.is_active === true || data?.status === 'ACTIVE';
    const pendingCount = typeof data?.pending_count === 'number' ? data.pending_count : 0;
    const stats = data?.statistics || data?.stats;

    return {
      is_active: isActive,
      pending_count: pendingCount,
      last_scan: data?.last_scan ? String(data.last_scan) : undefined,
      stats: stats ? {
        last_7_days: typeof (stats as Record<string, unknown>).last_7_days === 'number'
          ? (stats as Record<string, unknown>).last_7_days as number : 0,
        last_30_days: typeof (stats as Record<string, unknown>).last_30_days === 'number'
          ? (stats as Record<string, unknown>).last_30_days as number : 0,
      } : undefined,
    };
  });
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Hiç';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'Az önce';
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Dün';
  return `${diffDays} gün önce`;
}

export function MevzuatSummaryPanel() {
  const envelope = useFailSoftFetch<RegWatchSummaryResult>(
    ENDPOINTS.REGWATCH_STATUS,
    normalizeRegWatchSummary
  );

  const { status, data } = envelope;
  const isLoading = status === 'loading';

  // Local state for activation (persisted to localStorage)
  const [localActive, setLocalActive] = useState<boolean | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(REGWATCH_ACTIVE_KEY);
      if (stored === 'true') {
        setLocalActive(true);
      }
    }
  }, []);

  const isActive = localActive === true || data?.is_active === true;
  const pendingCount = data?.pending_count ?? 0;
  const last7Days = data?.stats?.last_7_days ?? 0;
  const lastScan = data?.last_scan;

  const handleStartTracking = async () => {
    setIsStarting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLocalActive(true);
    localStorage.setItem(REGWATCH_ACTIVE_KEY, 'true');
    setIsStarting(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <PremiumPanel
        title="Mevzuat Radarı"
        subtitle="Vergi Mevzuatı Takibi"
        icon={<Radar className="w-5 h-5 text-white" />}
        iconGradient="from-[#0078D0] to-[#0078D0]"
        detailHref="/v2/regwatch"
        summaryContent={
          <div className="flex items-center gap-6 text-sm text-white/60">
            <span>Yükleniyor...</span>
          </div>
        }
      >
        <div className="py-8 text-center text-[#969696]">
          <Radar className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
          <p className="text-sm">Mevzuat durumu kontrol ediliyor</p>
        </div>
      </PremiumPanel>
    );
  }

  // Not active state
  if (!isActive) {
    return (
      <PremiumPanel
        title="Mevzuat Radarı"
        subtitle="Vergi Mevzuatı Takibi"
        icon={<Radar className="w-5 h-5 text-white" />}
        iconGradient="from-[#0078D0] to-[#0078D0]"
        detailHref="/v2/regwatch"
        statusBadge={<VariantBadge variant="warning">Pasif</VariantBadge>}
        summaryContent={
          <div className="flex items-center gap-6 text-sm">
            <span className="text-white/60">Takip başlatılmadı</span>
          </div>
        }
      >
        <div className="py-6 text-center">
          <Radio className="w-8 h-8 mx-auto mb-3 text-[#969696]" />
          <p className="text-sm text-[#5A5A5A] mb-3">Mevzuat değişikliklerini otomatik takip edin</p>
          <div className="text-xs text-[#969696] mb-4 space-y-1">
            <p>📋 GİB - Vergi Mevzuatı</p>
            <p>📰 Resmi Gazete - Tebliğler</p>
            <p>🏛️ SGK - Genelgeler</p>
            <p>📊 TÜRMOB - Duyurular</p>
          </div>
          <button
            onClick={handleStartTracking}
            disabled={isStarting}
            className="px-4 py-2 bg-gradient-to-r from-[#0078D0] to-[#0078D0] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isStarting ? 'Başlatılıyor...' : 'Takibi Başlat'}
          </button>
        </div>
      </PremiumPanel>
    );
  }

  // Active state
  return (
    <PremiumPanel
      title="Mevzuat Radarı"
      subtitle="Vergi Mevzuatı Takibi"
      icon={<Radar className="w-5 h-5 text-white" />}
      iconGradient="from-[#0078D0] to-[#0078D0]"
      detailHref="/v2/regwatch"
      statusBadge={<VariantBadge variant="success">Aktif</VariantBadge>}
      summaryContent={
        <div className="flex items-center gap-6 text-sm">
          <span className="text-[#6BDB83]">● Aktif</span>
          <span className="text-white/60">Son: {formatTimeAgo(lastScan)}</span>
          {pendingCount > 0 && (
            <span className="text-[#FFE045]">🔔 {pendingCount} yeni değişiklik</span>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Durum"
          value="Aktif"
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="emerald"
        />
        <MetricCard
          label="Son Tarama"
          value={formatTimeAgo(lastScan)}
          icon={<Clock className="w-4 h-4" />}
          color="slate"
        />
        <MetricCard
          label="Yeni Değişiklik"
          value={pendingCount.toString()}
          icon={<Bell className="w-4 h-4" />}
          color={pendingCount > 0 ? 'amber' : 'slate'}
        />
        <MetricCard
          label="Son 7 Gün"
          value={last7Days.toString()}
          icon={<ExternalLink className="w-4 h-4" />}
          color="slate"
        />
      </div>

      {/* New changes alert */}
      {pendingCount > 0 && (
        <div className="mt-4 p-3 bg-[#FFFBEB] border border-[#FFF08C] rounded-lg">
          <div className="flex items-center gap-2 text-[#E67324] text-sm font-medium mb-2">
            <Bell className="w-4 h-4" />
            {pendingCount} Yeni Mevzuat Değişikliği
          </div>
          <p className="text-xs text-[#FA841E]">
            İncelemeniz gereken mevzuat güncellemeleri var.
            Detaylar için Mevzuat Radarı sayfasına gidin.
          </p>
        </div>
      )}

      {/* All good state */}
      {pendingCount === 0 && (
        <div className="mt-4 p-3 bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg">
          <div className="flex items-center gap-2 text-[#005A46] text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Güncel
          </div>
          <p className="text-xs text-[#00804D] mt-1">
            Tüm mevzuat değişiklikleri incelenmiş. Yeni güncelleme bekleniyor.
          </p>
        </div>
      )}
    </PremiumPanel>
  );
}
