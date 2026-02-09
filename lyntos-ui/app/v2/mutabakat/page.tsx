'use client';

import React, { useState, useCallback } from 'react';
import { XCircle, ShieldAlert } from 'lucide-react';
import { useCariMutabakat } from './_hooks/useCariMutabakat';
import { useRootCauseEngine } from './_hooks/useRootCauseEngine';
import { CariMutabakatHeader } from './_components/CariMutabakatHeader';
import { CariUploadPreview } from './_components/CariUploadPreview';
import { OzetKartlari } from './_components/OzetKartlari';
import { MutabakatTablosu } from './_components/MutabakatTablosu';
import { SatirDetayPanel } from './_components/SatirDetayPanel';
import { FinalizeGate } from './_components/FinalizeGate';
import { RaporOlustur } from './_components/RaporOlustur';
import type { EnrichedMutabakatSatir } from './_types/cariMutabakat';
import { MUTABAKAT_TOLERANS_TL } from './_types/cariMutabakat';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import { ScopeGuide } from '../_components/shared/ScopeGuide';

// ═══════════════════════════════════════════════════════════
// TL FORMATLAMA
// ═══════════════════════════════════════════════════════════

const formatTL = (val: number) =>
  new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val) + ' TL';

// ═══════════════════════════════════════════════════════════
// SAYFA
// ═══════════════════════════════════════════════════════════

export default function CariMutabakatPage() {
  const { selectedClient, selectedPeriod } = useDashboardScope();

  // Ana data hook
  const {
    ozet,
    satirlar,
    kararlar,
    loading,
    uploading,
    error,
    filtre,
    lastFetchedAt,
    previewData,
    previewFilename,
    isPreviewMode,
    confirming,
    fetchData,
    handleUpload,
    handleTopluOnay,
    setFiltre,
    setKarar,
    confirmUpload,
    cancelPreview,
    clientId,
    periodId,
    hasScope,
    kararIstatistik,
  } = useCariMutabakat();

  // Root cause zenginlestirme
  const enrichedSatirlar = useRootCauseEngine(satirlar, kararlar, {
    periodBitis: selectedPeriod?.id ? getPeriodEndDate(selectedPeriod.id) : null,
  });

  // Panel state
  const [selectedSatir, setSelectedSatir] = useState<EnrichedMutabakatSatir | null>(null);
  const [seciliIds, setSeciliIds] = useState<Set<number>>(new Set());
  const [onayLoading, setOnayLoading] = useState(false);

  // ───── Secim Islemleri ─────
  const toggleSecim = useCallback((id: number) => {
    setSeciliIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const tumunuSec = useCallback(() => {
    if (seciliIds.size === enrichedSatirlar.filter((s) => s.id).length) {
      setSeciliIds(new Set());
    } else {
      setSeciliIds(new Set(enrichedSatirlar.filter((s) => s.id).map((s) => s.id!)));
    }
  }, [enrichedSatirlar, seciliIds.size]);

  const handleTopluOnayClick = useCallback(async () => {
    setOnayLoading(true);
    try {
      await handleTopluOnay(Array.from(seciliIds));
      setSeciliIds(new Set());
    } finally {
      setOnayLoading(false);
    }
  }, [seciliIds, handleTopluOnay]);

  // ───── Finalize ─────
  const handleFinalize = useCallback(async () => {
    // Onay API: resmi olarak siniflandirilmis satirlarin ID'lerini onayla
    const resmiIds = enrichedSatirlar
      .filter((s) => s.smmmKarar.karar === 'RESMI' && s.id)
      .map((s) => s.id!);

    if (resmiIds.length > 0) {
      await handleTopluOnay(resmiIds);
    }
  }, [enrichedSatirlar, handleTopluOnay]);

  // ───── Scope yoksa uyari ─────
  if (!hasScope) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#2E2E2E] mb-4">Cari Mutabakat</h1>
        <ScopeGuide variant="banner" description="Mutabakat kontrolü için üstteki menülerden bir mükellef ve dönem seçin." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header + Upload + Filtre */}
      <CariMutabakatHeader
        loading={loading}
        uploading={uploading}
        filtre={filtre}
        lastFetchedAt={lastFetchedAt}
        onRefresh={fetchData}
        onUpload={handleUpload}
        onFiltreChange={setFiltre}
        hasData={!!ozet?.veri_var}
      />

      {/* Preview Modu */}
      {isPreviewMode && previewData && previewFilename && (
        <CariUploadPreview
          data={previewData}
          filename={previewFilename}
          onConfirm={confirmUpload}
          onCancel={cancelPreview}
          confirming={confirming}
        />
      )}

      {/* Hata Mesaji */}
      {error && (
        <div className="bg-[#FEF2F2] border border-[#FF9196] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-[#BF192B] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-[#BF192B]">Hata</p>
              <p className="text-sm text-[#BF192B] mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ozet Kartlari */}
      {ozet && ozet.veri_var && (
        <OzetKartlari ozet={ozet} formatTL={formatTL} />
      )}

      {/* Supheli Alacak Uyarisi */}
      {ozet && ozet.supheli_alacak_sayisi > 0 && (
        <div className="bg-[#FEF2F2] border border-[#FF9196] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#BF192B] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-[#BF192B]">
                VUK Md. 323 - Supheli Alacak Uyarisi
              </p>
              <p className="text-sm text-[#BF192B] mt-1">
                {ozet.supheli_alacak_sayisi} adet alici hesabinda 365 gunu asan bakiye tespit edildi.
                Bu alacaklar icin supheli ticari alacak karsiligi ayrilmasi gerekebilir
                (TDHP 128/129 hesaplar).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mutabakat Tablosu */}
      <MutabakatTablosu
        satirlar={enrichedSatirlar}
        ozet={ozet}
        loading={loading}
        formatTL={formatTL}
        onSatirClick={setSelectedSatir}
        seciliIds={seciliIds}
        onToggleSecim={toggleSecim}
        onTumunuSec={tumunuSec}
        onTopluOnay={handleTopluOnayClick}
        onayLoading={onayLoading}
        selectedSatirId={selectedSatir?.id || null}
      />

      {/* Finalize Gate + Raporlar */}
      {ozet && ozet.veri_var && (
        <div className="space-y-4">
          <FinalizeGate
            bilinmiyorSayisi={kararIstatistik.bilinmiyor}
            toplamFarkli={kararIstatistik.toplam}
            onFinalize={handleFinalize}
          />

          <RaporOlustur
            satirlar={enrichedSatirlar}
            ozet={ozet}
            clientName={selectedClient?.name || clientId}
            periodName={selectedPeriod?.code || periodId}
            formatTL={formatTL}
          />
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-[#969696] flex items-center justify-between">
        <span>
          Tolerans: {MUTABAKAT_TOLERANS_TL} TL | Mevzuat: VUK Md. 177, TTK Md. 64, VUK Md. 323 |
          TDHP: 120 Alicilar, 320 Saticilar
        </span>
        {ozet?.son_yukleme && (
          <span>Son yukleme: {new Date(ozet.son_yukleme).toLocaleString('tr-TR')}</span>
        )}
      </div>

      {/* Satir Detay Paneli (slide-over) */}
      <SatirDetayPanel
        satir={selectedSatir}
        clientId={clientId}
        periodId={periodId}
        onClose={() => setSelectedSatir(null)}
        onKararChange={(hesapKodu, karar, not) => {
          setKarar(hesapKodu, karar, not);
          // Paneli guncelle
          if (selectedSatir && selectedSatir.hesap_kodu === hesapKodu) {
            setSelectedSatir({
              ...selectedSatir,
              smmmKarar: { karar, not, tarih: new Date().toISOString() },
            });
          }
        }}
        formatTL={formatTL}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// YARDIMCI
// ═══════════════════════════════════════════════════════════

/** Period ID'den donem bitis tarihini cikar (2025-Q1 → 2025-03-31) */
function getPeriodEndDate(periodId: string): string | null {
  // Format: 2025-Q1, 2025-Q2, etc. veya CLIENT_xxx_2025_Q1
  const match = periodId.match(/(\d{4})[-_]Q(\d)/i);
  if (!match) return null;

  const year = parseInt(match[1]);
  const quarter = parseInt(match[2]);

  const endMonth = quarter * 3;
  const endDay = [31, 30, 30, 31][quarter - 1] || 31;

  return `${year}-${String(endMonth).padStart(2, '0')}-${endDay}`;
}
