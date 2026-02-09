'use client';
/**
 * LYNTOS - useCariMutabakat Hook (v2 - Backend Kararlar)
 *
 * Ana data management hook:
 * - Backend'den mutabakat verisi çekme (ozet + liste)
 * - SMMM kararlarını Backend API ile yönetme (optimistic update)
 * - Dosya upload: Upload → Preview → Onay → Mutabakat akışı
 * - Toplu onay
 * - Filtre state
 * - localStorage → Backend migration (ilk yükleme)
 *
 * Pencere 7: localStorage kaldırıldı, tüm kararlar backend'de.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { API_ENDPOINTS } from '../../_lib/config/api';
import type {
  MutabakatSatir,
  MutabakatOzet,
  MutabakatFiltre,
  SmmmKarar,
  SmmmKararData,
} from '../_types/cariMutabakat';
import type { PreviewData, ColumnMappingItem } from '../_components/CariUploadPreview';

// ═══════════════════════════════════════════════════════════
// LOCALSTORAGE MIGRATION HELPER (one-time)
// ═══════════════════════════════════════════════════════════

const MIGRATION_DONE_KEY = 'lyntos_cari_kararlar_migrated';

function getKararStorageKey(clientId: string, period: string): string {
  return `lyntos_cari_kararlar_${clientId}_${period}`;
}

/**
 * Eski localStorage kararlarını backend'e migrate et.
 * İlk yüklenmede çağrılır, başarılı olursa localStorage'ı temizler.
 */
async function migrateLocalStorageKararlar(
  clientId: string,
  periodId: string,
): Promise<Record<string, SmmmKararData> | null> {
  const storageKey = getKararStorageKey(clientId, periodId);
  const migrationKey = `${MIGRATION_DONE_KEY}_${clientId}_${periodId}`;

  // Zaten migrate edilmiş mi?
  try {
    if (localStorage.getItem(migrationKey)) return null;
  } catch {
    return null;
  }

  // localStorage'da veri var mı?
  let stored: Record<string, SmmmKararData>;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    stored = JSON.parse(raw);
    if (!stored || Object.keys(stored).length === 0) return null;
  } catch {
    return null;
  }

  // Backend'e toplu kaydet
  try {
    const kararlar = Object.entries(stored).map(([hesapKodu, data]) => ({
      hesap_kodu: hesapKodu,
      karar: data.karar,
      not_metni: data.not || '',
    }));

    const res = await fetch(API_ENDPOINTS.cariMutabakat.kararlarToplu, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        period_id: periodId,
        kararlar,
      }),
    });

    if (res.ok) {
      // Migration başarılı - localStorage temizle
      localStorage.removeItem(storageKey);
      localStorage.setItem(migrationKey, new Date().toISOString());
      // Migration completed
      return stored;
    }

    console.warn('[useCariMutabakat] Migration API hatası:', res.status);
    return stored; // Hata olsa bile eski verileri döndür
  } catch (err) {
    console.warn('[useCariMutabakat] Migration hatası:', err);
    return stored; // Offline ise eski verileri kullan
  }
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

interface UseCariMutabakatReturn {
  // Data
  ozet: MutabakatOzet | null;
  satirlar: MutabakatSatir[];
  kararlar: Record<string, SmmmKararData>;

  // State
  loading: boolean;
  uploading: boolean;
  error: string | null;
  filtre: MutabakatFiltre;
  lastFetchedAt: string | null;

  // Preview state
  previewData: PreviewData | null;
  previewFilename: string | null;
  isPreviewMode: boolean;
  confirming: boolean;

  // Actions
  fetchData: () => Promise<void>;
  handleUpload: (file: File) => Promise<void>;
  handleTopluOnay: (ids: number[]) => Promise<void>;
  setFiltre: (filtre: MutabakatFiltre) => void;
  setKarar: (hesapKodu: string, karar: SmmmKarar, not?: string) => void;

  // Preview actions
  confirmUpload: (mapping: Record<string, ColumnMappingItem>) => Promise<void>;
  cancelPreview: () => void;

  // Computed
  clientId: string;
  periodId: string;
  hasScope: boolean;

  // Karar statistics
  kararIstatistik: {
    resmi: number;
    defterDisi: number;
    bilinmiyor: number;
    toplam: number;
  };
}

export function useCariMutabakat(): UseCariMutabakatReturn {
  const { scope, selectedClient, selectedPeriod } = useDashboardScope();
  const clientId = selectedClient?.id || '';
  const periodId = selectedPeriod?.id || '';
  const hasScope = Boolean(clientId && periodId);

  const [ozet, setOzet] = useState<MutabakatOzet | null>(null);
  const [satirlar, setSatirlar] = useState<MutabakatSatir[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<MutabakatFiltre>('tumu');
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [kararlar, setKararlar] = useState<Record<string, SmmmKararData>>({});

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const previewFileRef = useRef<File | null>(null);

  const isPreviewMode = previewData !== null;

  // ───── Kararları Backend'den yükle + localStorage migration ─────
  const fetchKararlar = useCallback(async () => {
    if (!clientId || !periodId) {
      setKararlar({});
      return;
    }

    try {
      // 1. Önce localStorage migration dene
      await migrateLocalStorageKararlar(clientId, periodId);

      // 2. Backend'den kararları çek
      const res = await fetch(
        `${API_ENDPOINTS.cariMutabakat.kararlar}?client_id=${encodeURIComponent(clientId)}&period_id=${encodeURIComponent(periodId)}`,
      );

      if (res.ok) {
        const data = await res.json();
        setKararlar(data.kararlar || {});
      } else {
        console.warn('[useCariMutabakat] Kararlar API hatası:', res.status);
        setKararlar({});
      }
    } catch (err) {
      console.error('[useCariMutabakat] Kararlar fetch hatası:', err);
      setKararlar({});
    }
  }, [clientId, periodId]);

  useEffect(() => {
    if (clientId && periodId) {
      fetchKararlar();
    } else {
      setKararlar({});
    }
  }, [clientId, periodId, fetchKararlar]);

  // ───── Veri Çekme ─────
  const fetchData = useCallback(async () => {
    if (!clientId || !periodId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [ozetRes, listeRes] = await Promise.all([
        fetch(
          `${API_ENDPOINTS.cariMutabakat.ozet}?client_id=${encodeURIComponent(clientId)}&period_id=${encodeURIComponent(periodId)}`,
        ),
        fetch(
          `${API_ENDPOINTS.cariMutabakat.list}?client_id=${encodeURIComponent(clientId)}&period_id=${encodeURIComponent(periodId)}${filtre !== 'tumu' ? `&filtre=${filtre}` : ''}`,
        ),
      ]);

      if (ozetRes.ok) {
        const ozetData = await ozetRes.json();
        setOzet(ozetData);
      }

      if (listeRes.ok) {
        const listeData = await listeRes.json();
        setSatirlar(listeData.sonuclar || []);
      }

      setLastFetchedAt(new Date().toISOString());
    } catch (err) {
      console.error('[useCariMutabakat] Fetch hatası:', err);
      setError('Cari mutabakat verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [clientId, periodId, filtre]);

  useEffect(() => {
    if (hasScope) {
      fetchData();
    }
  }, [hasScope, fetchData]);

  // ───── Dosya Yükleme (Preview akışı) ─────
  const handleUpload = useCallback(
    async (file: File) => {
      if (!clientId || !periodId) {
        setError('Mükellef ve dönem seçimi yapınız');
        return;
      }

      setUploading(true);
      setError(null);
      setPreviewData(null);
      setPreviewFilename(null);
      previewFileRef.current = null;

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(API_ENDPOINTS.cariMutabakat.preview, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: 'Bilinmeyen hata' }));
          throw new Error(errData.detail || `HTTP ${res.status}`);
        }

        const result = await res.json();

        // Preview moduna geç
        setPreviewData({
          column_mapping: result.column_mapping,
          preview_rows: result.preview_rows,
          total_rows: result.total_rows,
          detected_delimiter: result.detected_delimiter,
          detected_encoding: result.detected_encoding,
          detected_program: result.detected_program,
          raw_headers: result.raw_headers,
          warnings: result.warnings || [],
        });
        setPreviewFilename(file.name);
        previewFileRef.current = file;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Dosya yükleme hatası';
        setError(msg);
        console.error('[useCariMutabakat] Preview hatası:', err);
      } finally {
        setUploading(false);
      }
    },
    [clientId, periodId],
  );

  // ───── Preview Onayla → Mutabakat Çalıştır ─────
  const confirmUpload = useCallback(
    async (mapping: Record<string, ColumnMappingItem>) => {
      if (!previewFileRef.current || !clientId || !periodId) {
        setError('Dosya veya kapsam bilgisi eksik');
        return;
      }

      setConfirming(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', previewFileRef.current);

        const mappingJson = JSON.stringify(mapping);
        const url = `${API_ENDPOINTS.cariMutabakat.confirm}?client_id=${encodeURIComponent(clientId)}&period_id=${encodeURIComponent(periodId)}&column_mapping=${encodeURIComponent(mappingJson)}`;

        const res = await fetch(url, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: 'Bilinmeyen hata' }));
          throw new Error(errData.detail || `HTTP ${res.status}`);
        }

        // Başarılı: preview'ı kapat ve verileri yenile
        setPreviewData(null);
        setPreviewFilename(null);
        previewFileRef.current = null;
        await fetchData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Mutabakat işlemi başarısız';
        setError(msg);
        console.error('[useCariMutabakat] Confirm hatası:', err);
      } finally {
        setConfirming(false);
      }
    },
    [clientId, periodId, fetchData],
  );

  // ───── Preview İptal ─────
  const cancelPreview = useCallback(() => {
    setPreviewData(null);
    setPreviewFilename(null);
    previewFileRef.current = null;
    setError(null);
  }, []);

  // ───── Toplu Onay ─────
  const handleTopluOnay = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;

      try {
        const res = await fetch(API_ENDPOINTS.cariMutabakat.onayla, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, onaylayan: 'SMMM' }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: 'Onay hatası' }));
          throw new Error(errData.detail);
        }

        await fetchData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Onay işlemi başarısız';
        setError(msg);
      }
    },
    [fetchData],
  );

  // ───── SMMM Karar Güncelleme (Optimistic Update + API) ─────
  const setKarar = useCallback(
    (hesapKodu: string, karar: SmmmKarar, not = '') => {
      // 1. Optimistic update: UI'ı hemen güncelle
      const newKararData: SmmmKararData = {
        karar,
        not,
        tarih: new Date().toISOString(),
      };

      setKararlar((prev) => ({
        ...prev,
        [hesapKodu]: newKararData,
      }));

      // 2. Backend'e kaydet (arka planda)
      fetch(API_ENDPOINTS.cariMutabakat.karar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          period_id: periodId,
          hesap_kodu: hesapKodu,
          karar,
          not_metni: not,
        }),
      })
        .then((res) => {
          if (!res.ok) {
            console.error('[useCariMutabakat] Karar kayıt API hatası:', res.status);
            // Rollback: backend hata verirse eski state'e dön
            fetchKararlar();
          }
        })
        .catch((err) => {
          console.error('[useCariMutabakat] Karar kayıt hatası:', err);
          // Rollback
          fetchKararlar();
        });
    },
    [clientId, periodId, fetchKararlar],
  );

  // ───── Karar İstatistikleri ─────
  const kararIstatistik = (() => {
    const farkliSatirlar = satirlar.filter((s) => s.durum === 'farkli');
    let resmi = 0;
    let defterDisi = 0;
    let bilinmiyor = 0;

    for (const satir of farkliSatirlar) {
      const k = kararlar[satir.hesap_kodu];
      if (!k || k.karar === 'BILINMIYOR') bilinmiyor++;
      else if (k.karar === 'RESMI') resmi++;
      else if (k.karar === 'DEFTER_DISI') defterDisi++;
    }

    return { resmi, defterDisi, bilinmiyor, toplam: farkliSatirlar.length };
  })();

  return {
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
  };
}
