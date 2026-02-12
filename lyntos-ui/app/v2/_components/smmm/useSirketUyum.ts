'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Şirket Uyum Durumu Hook
 * Sprint 7.4 - LYNTOS V2
 *
 * Ana veri kaynağı: useDashboardScope() -> selectedClient
 * Ek veri kaynağı: tax_certificates API (varsa)
 *
 * KÖK NEDEN FIX: tax_certificates tablosu boş olabilir,
 * bu durumda clients tablosundan gelen veriyi kullan
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo } from 'react';
import { useDashboardScope, useScopeComplete } from '../scope/ScopeProvider';
import { api } from '../../_lib/api/client';

// Şirket türü
export type SirketTuru = 'A.Ş.' | 'Ltd.Şti.' | 'Bilinmiyor';

// TTK 376 durum
export type TTK376Durum = 'saglikli' | 'yari_kayip' | 'ucte_iki_kayip' | 'borca_batik';

// Sermaye uyum durumu
export type SermayeUyumDurum = 'uyumlu' | 'uyumsuz' | 'bilinmiyor';

export interface SirketUyumData {
  // Temel bilgiler
  sirketTuru: SirketTuru;
  unvan: string | null;
  vkn: string | null;
  naceKodu: string | null;
  naceAciklama: string | null;
  vergiDairesi: string | null;
  sonLevhaYili: number | null;

  // Finansal bilgiler
  sermaye: number | null;
  kvMatrah: number | null;

  // TTK 376 durumu
  ttk376Durum: TTK376Durum | null;
  ttk376KayipOrani: number | null;

  // Asgari sermaye uyumu
  asgariSermaye: number;
  sermayeUyumDurum: SermayeUyumDurum;
  sermayeUyumSonTarih: string;

  // Veri durumu
  hasClientData: boolean;
  hasTaxCertificate: boolean;
}

interface TaxCertificateResponse {
  data: {
    client_id: string;
    certificates: Array<{
      id: string;
      year: number;
      nace_code: string | null;
      nace_description: string | null;
      kv_matrah: string | null;
      kv_paid: string | null;
      company_name: string;
      tax_office: string | null;
      uploaded_at: string;
    }>;
  };
}

/**
 * Şirket adından şirket türünü çıkar
 */
function extractSirketTuru(companyName: string | null | undefined): SirketTuru {
  if (!companyName) return 'Bilinmiyor';

  const upperName = companyName.toUpperCase();

  // A.Ş. tespiti
  if (
    upperName.includes('ANONİM ŞİRKETİ') ||
    upperName.includes('ANONIM SIRKETI') ||
    upperName.includes('A.Ş.') ||
    upperName.includes('A.S.') ||
    upperName.endsWith(' AŞ') ||
    upperName.endsWith(' AS')
  ) {
    return 'A.Ş.';
  }

  // Ltd. tespiti
  if (
    upperName.includes('LİMİTED ŞİRKETİ') ||
    upperName.includes('LIMITED SIRKETI') ||
    upperName.includes('LTD.ŞTİ.') ||
    upperName.includes('LTD. ŞTİ.') ||
    upperName.includes('LTD.STI.') ||
    upperName.includes('LTD ŞTİ') ||
    upperName.includes('LTD STI') ||
    upperName.includes('LTD.') ||
    upperName.includes(' LTD')
  ) {
    return 'Ltd.Şti.';
  }

  return 'Bilinmiyor';
}

export function useSirketUyum() {
  // ANA VERİ KAYNAĞI: Dashboard Scope (clients tablosu)
  const { selectedClient } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxCertificates, setTaxCertificates] = useState<TaxCertificateResponse['data']['certificates']>([]);

  // Opsiyonel: Tax certificate API'den ek veri çek
  useEffect(() => {
    if (!scopeComplete || !selectedClient?.id) {
      setLoading(false);
      return;
    }

    const fetchTaxCertificates = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get<TaxCertificateResponse['data']>(
          `/api/v1/tax-certificate/${encodeURIComponent(selectedClient.id)}`
        );

        if (!res.ok || !res.data) {
          console.warn('[SirketUyum] Tax certificate API failed:', res.status, '- using client data only');
          setTaxCertificates([]);
          return;
        }

        setTaxCertificates(res.data?.certificates || []);
      } catch (err) {
        console.warn('[SirketUyum] Tax certificate fetch error - using client data only:', err);
        setTaxCertificates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTaxCertificates();
  }, [selectedClient?.id, scopeComplete]);

  // En son vergi levhasını al (varsa)
  const sonLevha = useMemo(() => {
    if (!taxCertificates.length) return null;
    return taxCertificates[0];
  }, [taxCertificates]);

  // Şirket uyum verisini hesapla - ÖNCE client, sonra tax_certificate
  const data = useMemo<SirketUyumData>(() => {
    const hasClientData = !!selectedClient;
    const hasTaxCertificate = !!sonLevha;

    // Şirket adı: önce client, yoksa levha
    const companyName = selectedClient?.name || sonLevha?.company_name || null;
    const sirketTuru = extractSirketTuru(companyName);

    // NACE: önce client, yoksa levha
    const naceKodu = selectedClient?.naceCode || sonLevha?.nace_code || null;
    const naceAciklama = sonLevha?.nace_description || null;

    // VKN: client'tan
    const vkn = selectedClient?.vkn || null;

    // Vergi dairesi: sadece levhadan
    const vergiDairesi = sonLevha?.tax_office || null;

    // KV Matrah: sadece levhadan
    const kvMatrah = sonLevha?.kv_matrah ? parseFloat(sonLevha.kv_matrah) : null;

    // Asgari sermaye (2025 değerleri)
    const asgariSermaye = sirketTuru === 'A.Ş.' ? 250_000 : sirketTuru === 'Ltd.Şti.' ? 50_000 : 0;

    return {
      sirketTuru,
      unvan: companyName,
      vkn,
      naceKodu,
      naceAciklama,
      vergiDairesi,
      sonLevhaYili: sonLevha?.year || null,

      sermaye: null, // Mizan'dan gelir - corporate sayfasında
      kvMatrah,

      ttk376Durum: null, // Corporate sayfasında hesaplanır
      ttk376KayipOrani: null,

      asgariSermaye,
      sermayeUyumDurum: 'bilinmiyor' as SermayeUyumDurum,
      sermayeUyumSonTarih: '31.12.2026',

      hasClientData,
      hasTaxCertificate,
    };
  }, [selectedClient, sonLevha]);

  return {
    data,
    loading,
    error,
    // Şirket verisi varsa göster (tax_certificate olmasa bile)
    hasData: !!selectedClient,
    hasTaxCertificate: !!sonLevha,
    taxCertificates,
  };
}
