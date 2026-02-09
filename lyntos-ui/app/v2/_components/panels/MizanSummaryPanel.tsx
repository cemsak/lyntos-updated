'use client';

/**
 * Mizan Özet Panel - Premium Kokpit Görünümü
 * SMMM/YMM için kompakt mizan ve VDK risk özeti
 */

import React, { useMemo } from 'react';
import { Scale, AlertTriangle, CheckCircle2, Shield, TrendingUp } from 'lucide-react';
import { PremiumPanel, VariantBadge, MetricCard } from '../shared/PremiumPanel';
import { useV2Fetch } from '../hooks/useV2Fetch';
import { ENDPOINTS_V2 } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import { useScopeComplete } from '../scope/useDashboardScope';

// Types
interface MizanHesap {
  kod: string;
  ad: string;
  bakiye: number;
}

interface MizanSummaryResult {
  hesaplar: MizanHesap[];
  totals: {
    toplam_borc: number;
    toplam_alacak: number;
    fark: number;
    denge_ok: boolean;
  };
  summary: {
    total_accounts: number;
    warning: number;
    error: number;
  };
}

function normalizeMizanSummary(raw: unknown): PanelEnvelope<MizanSummaryResult> {
  return normalizeToEnvelope<MizanSummaryResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const accountsObj = (obj.accounts || {}) as Record<string, unknown>;
    const totalsRaw = (obj.totals || {}) as Record<string, unknown>;
    const summaryRaw = (obj.summary || {}) as Record<string, unknown>;

    const hesaplar: MizanHesap[] = Object.entries(accountsObj).map(([kod, a]) => {
      const acc = a as Record<string, unknown>;
      return {
        kod: String(acc.hesap || kod || ''),
        ad: String(acc.ad || ''),
        bakiye: typeof acc.bakiye === 'number' ? acc.bakiye : 0,
      };
    });

    return {
      hesaplar,
      totals: {
        toplam_borc: typeof totalsRaw.toplam_borc === 'number' ? totalsRaw.toplam_borc : 0,
        toplam_alacak: typeof totalsRaw.toplam_alacak === 'number' ? totalsRaw.toplam_alacak : 0,
        fark: typeof totalsRaw.fark === 'number' ? totalsRaw.fark : 0,
        denge_ok: totalsRaw.denge_ok === true,
      },
      summary: {
        total_accounts: typeof summaryRaw.total_accounts === 'number' ? summaryRaw.total_accounts : hesaplar.length,
        warning: typeof summaryRaw.warning === 'number' ? summaryRaw.warning : 0,
        error: typeof summaryRaw.error === 'number' ? summaryRaw.error : 0,
      },
    };
  });
}

// VDK Risk hesaplama (basitleştirilmiş)
function calculateVdkRiskCount(hesaplar: MizanHesap[]): number {
  let riskCount = 0;
  const getHesap = (kod: string) => hesaplar.find(h => h.kod === kod);

  // Kasa kontrolü
  const kasa = getHesap('100');
  const toplamAktif = hesaplar
    .filter(h => h.kod.startsWith('1') || h.kod.startsWith('2'))
    .reduce((sum, h) => sum + Math.abs(h.bakiye), 0);

  if (kasa && toplamAktif > 0) {
    const kasaOrani = (Math.abs(kasa.bakiye) / toplamAktif) * 100;
    if (kasaOrani > 5) riskCount++;
  }

  // Ortaklardan alacaklar kontrolü
  const ortakAlacak = Math.abs(getHesap('131')?.bakiye || 0);
  const sermaye = Math.abs(getHesap('500')?.bakiye || 0);
  if (ortakAlacak > 0 && sermaye > 0 && (ortakAlacak / sermaye) > 0.1) {
    riskCount++;
  }

  return riskCount;
}

export function MizanSummaryPanel() {
  const scopeComplete = useScopeComplete();

  const envelope = useV2Fetch<MizanSummaryResult>(
    ENDPOINTS_V2.MIZAN_ANALYZE,
    normalizeMizanSummary
  );

  const { status, data } = envelope;
  const isLoading = status === 'loading';
  const hasData = (data?.hesaplar?.length ?? 0) > 0;

  const vdkRiskCount = useMemo(() => {
    return hasData ? calculateVdkRiskCount(data?.hesaplar || []) : 0;
  }, [data?.hesaplar, hasData]);

  const kritikCount = data?.summary?.error ?? 0;
  const hesapSayisi = data?.summary?.total_accounts ?? 0;
  const dengeOk = data?.totals?.denge_ok ?? false;

  // Loading/No scope state
  if (!scopeComplete || isLoading) {
    return (
      <PremiumPanel
        title="Mizan Omurga"
        subtitle="VDK Kritik Hesap Analizi"
        icon={<Scale className="w-5 h-5 text-white" />}
        iconGradient="from-[#00A651] to-[#00A651]"
        detailHref="/v2/mizan"
        summaryContent={
          <div className="flex items-center gap-6 text-sm text-white/60">
            <span>Yükleniyor...</span>
          </div>
        }
      >
        <div className="py-8 text-center text-[#969696]">
          <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Dönem seçildikten sonra mizan analizi görünecek</p>
        </div>
      </PremiumPanel>
    );
  }

  // No data state
  if (!hasData) {
    return (
      <PremiumPanel
        title="Mizan Omurga"
        subtitle="VDK Kritik Hesap Analizi"
        icon={<Scale className="w-5 h-5 text-white" />}
        iconGradient="from-[#00A651] to-[#00A651]"
        detailHref="/v2/upload"
        statusBadge={<VariantBadge variant="warning">Veri Yok</VariantBadge>}
        summaryContent={
          <div className="flex items-center gap-6 text-sm">
            <span className="text-[#FFE045]">⚠️ Mizan yüklenmemiş</span>
          </div>
        }
      >
        <div className="py-6 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-[#FFB114]" />
          <p className="text-sm text-[#5A5A5A] mb-2">Bu dönem için mizan verisi bulunamadı</p>
          <p className="text-xs text-[#969696]">Veri Yükleme sayfasından mizan dosyasını yükleyin</p>
        </div>
      </PremiumPanel>
    );
  }

  return (
    <PremiumPanel
      title="Mizan Omurga"
      subtitle="VDK Kritik Hesap Analizi"
      icon={<Scale className="w-5 h-5 text-white" />}
      iconGradient="from-[#00A651] to-[#00A651]"
      detailHref="/v2/mizan"
      statusBadge={
        dengeOk ? (
          <VariantBadge variant="success">Denge OK</VariantBadge>
        ) : (
          <VariantBadge variant="danger">Denge Bozuk</VariantBadge>
        )
      }
      summaryContent={
        <div className="flex items-center gap-6 text-sm">
          <span className={dengeOk ? 'text-[#6BDB83]' : 'text-[#FF9196]'}>
            {dengeOk ? '✓ Denge' : '✗ Denge'}
          </span>
          <span className={vdkRiskCount > 0 ? 'text-[#FFE045]' : 'text-white/60'}>
            VDK: {vdkRiskCount} Risk
          </span>
          <span className={kritikCount > 0 ? 'text-[#FF9196]' : 'text-white/60'}>
            Kritik: {kritikCount}
          </span>
          <span className="text-white/60">Hesap: {hesapSayisi}</span>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Denge Durumu"
          value={dengeOk ? 'OK' : 'BOZUK'}
          icon={dengeOk ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          trend={dengeOk ? 'up' : 'down'}
          color={dengeOk ? 'emerald' : 'red'}
        />
        <MetricCard
          label="VDK Risk"
          value={vdkRiskCount.toString()}
          icon={<Shield className="w-4 h-4" />}
          color={vdkRiskCount > 0 ? 'amber' : 'slate'}
        />
        <MetricCard
          label="Kritik Hesap"
          value={kritikCount.toString()}
          icon={<AlertTriangle className="w-4 h-4" />}
          color={kritikCount > 0 ? 'red' : 'slate'}
        />
        <MetricCard
          label="Toplam Hesap"
          value={hesapSayisi.toString()}
          icon={<TrendingUp className="w-4 h-4" />}
          color="slate"
        />
      </div>

      {/* VDK Risk Indicators */}
      {vdkRiskCount > 0 && (
        <div className="mt-4 p-3 bg-[#FFFBEB] border border-[#FFF08C] rounded-lg">
          <div className="flex items-center gap-2 text-[#E67324] text-sm font-medium mb-2">
            <Shield className="w-4 h-4" />
            VDK İnceleme Riski Tespit Edildi
          </div>
          <p className="text-xs text-[#FA841E]">
            K-09 (Kasa/Aktif), TF-01 (Ortaklardan Alacak) kriterlerinde dikkat edilmesi gereken durumlar var.
            Detaylı analiz için Mizan Analizi sayfasına gidin.
          </p>
        </div>
      )}
    </PremiumPanel>
  );
}
