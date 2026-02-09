'use client';
/**
 * LYNTOS - useEvidenceSearch Hook
 *
 * 4 kanıt bloğunu paralel olarak yükler:
 * 1. Defter (Muavin) — kebir API
 * 2. Banka — banka/islemler API
 * 3. Kasa — kebir/hesap/100 API
 * 4. Mahsup — yevmiye API
 *
 * Her blok bağımsız loading/error/empty state'e sahiptir.
 * Bir blok hata verse diğerleri çalışmaya devam eder.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../../_lib/config/api';
import type {
  EvidenceData,
  EvidenceBlockState,
  DefterKaydi,
  BankaHareketi,
  KasaHareketi,
  MahsupFisi,
} from '../_types/cariMutabakat';

function emptyBlock<T>(): EvidenceBlockState<T> {
  return { loading: false, data: null, error: null, kayitSayisi: 0 };
}

function loadingBlock<T>(): EvidenceBlockState<T> {
  return { loading: true, data: null, error: null, kayitSayisi: 0 };
}

interface UseEvidenceSearchProps {
  /** Hesap kodu (ör: 120.001) */
  hesapKodu: string | null;
  /** Karşı taraf adı (banka/kasa açıklama filtrelemesi için) */
  karsiTaraf: string | null;
  /** Client ID */
  clientId: string;
  /** Period ID */
  periodId: string;
  /** Panel açık mı? (false ise fetch yapma) */
  enabled: boolean;
}

interface UseEvidenceSearchReturn {
  evidence: EvidenceData;
  refetch: () => void;
  isAnyLoading: boolean;
}

export function useEvidenceSearch({
  hesapKodu,
  karsiTaraf,
  clientId,
  periodId,
  enabled,
}: UseEvidenceSearchProps): UseEvidenceSearchReturn {
  const [evidence, setEvidence] = useState<EvidenceData>({
    defter: emptyBlock(),
    banka: emptyBlock(),
    kasa: emptyBlock(),
    mahsup: emptyBlock(),
  });

  const fetchEvidence = useCallback(async () => {
    if (!hesapKodu || !clientId || !periodId) return;

    // Tüm blokları loading'e çek
    setEvidence({
      defter: loadingBlock(),
      banka: loadingBlock(),
      kasa: loadingBlock(),
      mahsup: loadingBlock(),
    });

    // 4 API çağrısı paralel
    const [defterResult, bankaResult, kasaResult, mahsupResult] =
      await Promise.allSettled([
        fetchDefter(clientId, periodId, hesapKodu),
        fetchBanka(clientId, periodId, karsiTaraf),
        fetchKasa(clientId, periodId, karsiTaraf),
        fetchMahsup(clientId, periodId, hesapKodu),
      ]);

    setEvidence({
      defter: resolveBlock(defterResult),
      banka: resolveBlock(bankaResult),
      kasa: resolveBlock(kasaResult),
      mahsup: resolveBlock(mahsupResult),
    });
  }, [hesapKodu, karsiTaraf, clientId, periodId]);

  useEffect(() => {
    if (enabled && hesapKodu) {
      fetchEvidence();
    } else {
      setEvidence({
        defter: emptyBlock(),
        banka: emptyBlock(),
        kasa: emptyBlock(),
        mahsup: emptyBlock(),
      });
    }
  }, [enabled, hesapKodu, fetchEvidence]);

  const isAnyLoading =
    evidence.defter.loading ||
    evidence.banka.loading ||
    evidence.kasa.loading ||
    evidence.mahsup.loading;

  return {
    evidence,
    refetch: fetchEvidence,
    isAnyLoading,
  };
}

// ═══════════════════════════════════════════════════════════
// API FETCH FONKSİYONLARI
// ═══════════════════════════════════════════════════════════

/** Blok 1: Defter (Muavin Hareketleri) — kebir API */
async function fetchDefter(
  clientId: string,
  periodId: string,
  hesapKodu: string,
): Promise<DefterKaydi[]> {
  const url = `${API_ENDPOINTS.kebir.hesap(hesapKodu)}?client_id=${encodeURIComponent(clientId)}&period_id=${encodeURIComponent(periodId)}&page_size=20`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kebir API hatası: ${res.status}`);

  const data = await res.json();
  const entries = data.entries || [];

  return entries.map((e: Record<string, unknown>) => ({
    id: e.id as number,
    tarih: (e.tarih as string) || '',
    fis_no: e.fis_no as string | null,
    aciklama: e.aciklama as string | null,
    borc: (e.borc as number) || 0,
    alacak: (e.alacak as number) || 0,
    bakiye: (e.bakiye as number) || 0,
    bakiye_turu: (e.bakiye_turu as string) || '',
  }));
}

/** Blok 2: Banka Hareketleri — banka API + client-side filtreleme */
async function fetchBanka(
  clientId: string,
  periodId: string,
  karsiTaraf: string | null,
): Promise<BankaHareketi[]> {
  const url = `${API_ENDPOINTS.banka.islemler}?client_id=${encodeURIComponent(clientId)}&period_id=${encodeURIComponent(periodId)}&page_size=100`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Banka API hatası: ${res.status}`);

  const data = await res.json();
  let islemler = data.islemler || [];

  // Client-side filtreleme: açıklama'da karşı taraf adını ara
  if (karsiTaraf && karsiTaraf.trim()) {
    const searchTerm = karsiTaraf.toLowerCase().trim();
    islemler = islemler.filter(
      (i: Record<string, unknown>) =>
        ((i.aciklama as string) || '').toLowerCase().includes(searchTerm),
    );
  }

  return islemler.slice(0, 20).map((e: Record<string, unknown>) => ({
    id: e.id as number,
    tarih: (e.tarih as string) || '',
    aciklama: e.aciklama as string | null,
    tutar: (e.tutar as number) || 0,
    bakiye: (e.bakiye as number) || 0,
    banka_adi: e.banka_adi as string | null,
    hesap_kodu: (e.hesap_kodu as string) || '',
  }));
}

/** Blok 3: Kasa Hareketleri — kebir API (100.xxx) + client-side filtreleme */
async function fetchKasa(
  clientId: string,
  periodId: string,
  karsiTaraf: string | null,
): Promise<KasaHareketi[]> {
  const url = `${API_ENDPOINTS.kebir.hesap('100')}?client_id=${encodeURIComponent(clientId)}&period_id=${encodeURIComponent(periodId)}&page_size=100`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kasa API hatası: ${res.status}`);

  const data = await res.json();
  let entries = data.entries || [];

  // Client-side filtreleme: açıklama'da karşı taraf adını ara
  if (karsiTaraf && karsiTaraf.trim()) {
    const searchTerm = karsiTaraf.toLowerCase().trim();
    entries = entries.filter(
      (e: Record<string, unknown>) =>
        ((e.aciklama as string) || '').toLowerCase().includes(searchTerm),
    );
  }

  return entries.slice(0, 20).map((e: Record<string, unknown>) => ({
    id: e.id as number,
    tarih: (e.tarih as string) || '',
    fis_no: e.fis_no as string | null,
    aciklama: e.aciklama as string | null,
    borc: (e.borc as number) || 0,
    alacak: (e.alacak as number) || 0,
    bakiye: (e.bakiye as number) || 0,
  }));
}

/** Blok 4: Mahsup Fişleri — yevmiye API */
async function fetchMahsup(
  clientId: string,
  periodId: string,
  hesapKodu: string,
): Promise<MahsupFisi[]> {
  const url = `${API_ENDPOINTS.yevmiye.list}?client_id=${encodeURIComponent(clientId)}&period_id=${encodeURIComponent(periodId)}&search=${encodeURIComponent(hesapKodu)}&page_size=20`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yevmiye API hatası: ${res.status}`);

  const data = await res.json();
  const entries = data.entries || [];

  return entries.map((e: Record<string, unknown>) => ({
    id: e.id as number,
    fis_no: (e.fis_no as string) || '',
    tarih: (e.tarih as string) || '',
    fis_aciklama: e.fis_aciklama as string | null,
    hesap_kodu: (e.hesap_kodu as string) || '',
    hesap_adi: e.hesap_adi as string | null,
    tutar: (e.tutar as number) || 0,
    borc_alacak: (e.borc_alacak as string) || '',
  }));
}

// ═══════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════

function resolveBlock<T>(
  result: PromiseSettledResult<T[]>,
): EvidenceBlockState<T[]> {
  if (result.status === 'fulfilled') {
    return {
      loading: false,
      data: result.value,
      error: null,
      kayitSayisi: result.value.length,
    };
  }
  return {
    loading: false,
    data: null,
    error: result.reason?.message || 'Bilinmeyen hata',
    kayitSayisi: 0,
  };
}
