'use client';

/**
 * LYNTOS Corporate Law API Hooks
 * Sprint S2 - Sirketler Hukuku
 *
 * Handles API calls for corporate law module
 * API basarisiz olursa varsayilan veriler kullanilir
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../../_lib/auth';
import type {
  CorporateEventType,
  TTK376Request,
  TTK376Analysis,
  MinCapitalRequirements,
  GKQuorumGuide,
} from './types';

// Varsayilan islem tipleri - API basarisiz olursa kullanilir
const DEFAULT_EVENT_TYPES: CorporateEventType[] = [
  {
    id: 'evt-001',
    event_code: 'capital_increase',
    event_name: 'Sermaye Artirimi',
    company_types: ['as', 'ltd'],
    required_documents: ['GK Karari', 'Tadil Metni', 'Banka Dekontu'],
    gk_quorum: null,
    registration_deadline: 30,
    legal_basis: 'TTK Md. 456-472',
    tax_implications: { kv_istisna: true, kdv_istisna: false },
    min_capital: null,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-002',
    event_code: 'capital_decrease',
    event_name: 'Sermaye Azaltimi',
    company_types: ['as', 'ltd'],
    required_documents: ['GK Karari', 'Tadil Metni', 'Alacakli Cagrisi'],
    gk_quorum: null,
    registration_deadline: 30,
    legal_basis: 'TTK Md. 473-475',
    tax_implications: null,
    min_capital: null,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-003',
    event_code: 'merger_acquisition',
    event_name: 'Birlesme (Devralma)',
    company_types: ['as', 'ltd'],
    required_documents: ['Birlesme Sozlesmesi', 'Birlesme Raporu', 'Denetci Raporu'],
    gk_quorum: null,
    registration_deadline: 30,
    legal_basis: 'TTK Md. 136-158',
    tax_implications: { kv_istisna: true, kdv_istisna: true },
    min_capital: null,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-004',
    event_code: 'demerger_full',
    event_name: 'Tam Bolunme',
    company_types: ['as', 'ltd'],
    required_documents: ['Bolunme Plani', 'Bolunme Raporu', 'Denetci Raporu'],
    gk_quorum: null,
    registration_deadline: 30,
    legal_basis: 'TTK Md. 159-179',
    tax_implications: { kv_istisna: true, kdv_istisna: true },
    min_capital: null,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-005',
    event_code: 'demerger_partial',
    event_name: 'Kismi Bolunme',
    company_types: ['as', 'ltd'],
    required_documents: ['Bolunme Plani', 'Bolunme Raporu', 'Denetci Raporu'],
    gk_quorum: null,
    registration_deadline: 30,
    legal_basis: 'TTK Md. 159-179',
    tax_implications: { kv_istisna: true, kdv_istisna: true },
    min_capital: null,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-006',
    event_code: 'type_change_ltd_to_as',
    event_name: 'Tur Degisikligi (Ltd -> A.S.)',
    company_types: ['ltd'],
    required_documents: ['GK Karari', 'Yeni Ana Sozlesme', 'Denetci Raporu'],
    gk_quorum: null,
    registration_deadline: 30,
    legal_basis: 'TTK Md. 180-190',
    tax_implications: { kv_istisna: true, kdv_istisna: true },
    min_capital: 250000,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-007',
    event_code: 'type_change_as_to_ltd',
    event_name: 'Tur Degisikligi (A.S. -> Ltd)',
    company_types: ['as'],
    required_documents: ['GK Karari', 'Yeni Ana Sozlesme', 'Denetci Raporu'],
    gk_quorum: null,
    registration_deadline: 30,
    legal_basis: 'TTK Md. 180-190',
    tax_implications: { kv_istisna: true, kdv_istisna: true },
    min_capital: 50000,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-008',
    event_code: 'liquidation_start',
    event_name: 'Tasfiyeye Giris',
    company_types: ['as', 'ltd'],
    required_documents: ['GK Karari', 'Tasfiye Memuru Atama', 'TTSG Ilani'],
    gk_quorum: null,
    registration_deadline: 15,
    legal_basis: 'TTK Md. 533-548',
    tax_implications: null,
    min_capital: null,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-009',
    event_code: 'liquidation_end',
    event_name: 'Tasfiye Sonu (Terkin)',
    company_types: ['as', 'ltd'],
    required_documents: ['Son Bilanco', 'GK Karari', 'Vergi Borcu Yoktur Yazisi'],
    gk_quorum: null,
    registration_deadline: 15,
    legal_basis: 'TTK Md. 545-548',
    tax_implications: null,
    min_capital: null,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-010',
    event_code: 'share_transfer_ltd',
    event_name: 'Pay Devri (Ltd)',
    company_types: ['ltd'],
    required_documents: ['Devir Sozlesmesi', 'GK Onay Karari', 'Pay Defteri'],
    gk_quorum: null,
    registration_deadline: 15,
    legal_basis: 'TTK Md. 595',
    tax_implications: null,
    min_capital: null,
    notes: null,
    is_active: true
  },
  {
    id: 'evt-011',
    event_code: 'min_capital_compliance',
    event_name: 'Asgari Sermaye Uyumu',
    company_types: ['as', 'ltd'],
    required_documents: ['GK Karari', 'Tadil Metni', 'Banka Dekontu'],
    gk_quorum: null,
    registration_deadline: null,
    legal_basis: 'TTK Gec. Md. 15',
    tax_implications: { kv_istisna: true },
    min_capital: null,
    notes: '31.12.2026 son tarih',
    is_active: true
  }
];

// Hook: Get all event types
export function useEventTypes(companyType?: string) {
  const [data, setData] = useState<CorporateEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (companyType) params.set('company_type', companyType);

        const res = await fetch(`/api/v1/corporate/event-types?${params}`, {
          headers: { Authorization: getAuthToken() || '' },
        });

        if (!res.ok) {
          // API basarisiz - varsayilan kullan
          console.warn('[Corporate] API yanit vermedi, varsayilan islem tipleri kullaniliyor');
          let filtered = DEFAULT_EVENT_TYPES;
          if (companyType) {
            filtered = DEFAULT_EVENT_TYPES.filter(e => e.company_types.includes(companyType));
          }
          setData(filtered);
          setError(null);
          return;
        }

        const json = await res.json();
        setData(json.data?.event_types || DEFAULT_EVENT_TYPES);
        setError(null);
      } catch (err) {
        // Hata - varsayilan kullan
        console.warn('[Corporate] Islem tipleri yuklenemedi:', err);
        let filtered = DEFAULT_EVENT_TYPES;
        if (companyType) {
          filtered = DEFAULT_EVENT_TYPES.filter(e => e.company_types.includes(companyType));
        }
        setData(filtered);
        setError(null); // Hata gosterme, varsayilan kullan
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyType]);

  return { data, loading, error };
}

// Hook: Get single event type
export function useEventType(eventCode: string | null) {
  const [data, setData] = useState<CorporateEventType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventCode) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/corporate/event-types/${eventCode}`, {
          headers: { Authorization: getAuthToken() || '' },
        });

        if (!res.ok) throw new Error('Islem tipi bulunamadi');

        const json = await res.json();
        setData(json.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventCode]);

  return { data, loading, error };
}

// Local TTK 376 hesaplama - API basarisiz oldugunda kullanilir
function calculateTTK376Locally(request: TTK376Request): TTK376Analysis {
  const { capital, legal_reserves, equity } = request;
  const totalCapital = capital + legal_reserves;
  const lossPercentage = totalCapital > 0 ? ((totalCapital - equity) / totalCapital) * 100 : 0;

  let status: TTK376Analysis['status'] = 'healthy';
  let recommendation = 'Sirket mali yapisi saglam. Herhangi bir islem gerekmemektedir.';

  if (lossPercentage > 66.67) {
    status = 'insolvent';
    recommendation = 'Sermaye kaybi 2/3\'u asti. TTK 376/2 kapsaminda sermaye artirim veya tamamlama yapilmali, aksi halde sirket mahkemeye bildirilmelidir.';
  } else if (lossPercentage > 50) {
    status = 'twothirds_loss';
    recommendation = 'Sermaye kaybi %50-66 arasinda. TTK 376/1 kapsaminda genel kurul toplanmali, iyilestirme onlemleri alinmalidir.';
  } else if (lossPercentage > 0) {
    status = 'half_loss';
    recommendation = 'Sermaye kaybi %50\'nin altinda. Yonetim kurulu durumu genel kurula bildirmelidir.';
  }

  return {
    status,
    loss_percentage: parseFloat(lossPercentage.toFixed(1)),
    half_threshold: totalCapital * 0.5,
    twothirds_threshold: totalCapital * 0.333,
    recommendation,
    legal_basis: 'TTK Md. 376'
  };
}

// Hook: TTK 376 Analysis
export function useTTK376Analysis() {
  const [result, setResult] = useState<TTK376Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (request: TTK376Request) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/v1/corporate/ttk376-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: getAuthToken() || '',
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        // API basarisiz - local hesapla
        console.warn('[Corporate] TTK 376 API yanit vermedi, local hesaplama yapiliyor');
        const localAnalysis = calculateTTK376Locally(request);
        setResult(localAnalysis);
        return localAnalysis;
      }

      const json = await res.json();
      const analysis = json.data?.analysis || calculateTTK376Locally(request);
      setResult(analysis);
      return analysis;
    } catch (err) {
      // Hata - local hesapla
      console.warn('[Corporate] TTK 376 analizi basarisiz:', err);
      const localAnalysis = calculateTTK376Locally(request);
      setResult(localAnalysis);
      return localAnalysis;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, analyze, reset };
}

// Varsayilan asgari sermaye gereksinimleri (7511 sayili Kanun)
const DEFAULT_MIN_CAPITAL: MinCapitalRequirements = {
  effective_date: '2024-01-01',
  deadline_for_existing: '2026-12-31',
  requirements: {
    as: { min_capital: 250000, min_paid_at_registration: 62500, currency: 'TRY', legal_basis: 'TTK Md. 332' },
    as_registered: { min_capital: 500000, description: 'Kayitli sermaye sistemi', legal_basis: 'TTK Md. 332' },
    ltd: { min_capital: 50000, min_paid_at_registration: 12500, currency: 'TRY', legal_basis: 'TTK Md. 580' }
  },
  notes: [
    '7511 sayili Kanun ile asgari sermaye tutarlari artirilmistir.',
    'Mevcut sirketler 31.12.2026 tarihine kadar uyum saglamalidir.',
    'Suresinde uyum saglanmazsa sirket infisah etmis sayilir.'
  ]
};

// Hook: Min capital requirements
export function useMinCapitalRequirements() {
  const [data, setData] = useState<MinCapitalRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/corporate/min-capital-requirements', {
          headers: { Authorization: getAuthToken() || '' },
        });

        if (!res.ok) {
          // API basarisiz - varsayilan kullan
          console.warn('[Corporate] Sermaye gereksinimleri API yanit vermedi, varsayilan kullaniliyor');
          setData(DEFAULT_MIN_CAPITAL);
          setError(null);
          return;
        }

        const json = await res.json();
        setData(json.data || DEFAULT_MIN_CAPITAL);
        setError(null);
      } catch (err) {
        // Hata - varsayilan kullan
        console.warn('[Corporate] Sermaye gereksinimleri yuklenemedi:', err);
        setData(DEFAULT_MIN_CAPITAL);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

// Hook: GK Quorum Guide
export function useGKQuorumGuide() {
  const [data, setData] = useState<GKQuorumGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/corporate/gk-quorum-guide', {
          headers: { Authorization: getAuthToken() || '' },
        });

        if (!res.ok) throw new Error('Nisap rehberi yuklenemedi');

        const json = await res.json();
        setData(json.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
