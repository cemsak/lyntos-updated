import type { KurganAksiyon } from '../../../../lib/types/vdk-types';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import React from 'react';
import {
  Eye,
  FileSearch,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

// SMMM Context Info for KURGAN Panel
export const KURGAN_SMMM_INFO = {
  title: 'KURGAN Sistemi Nedir?',
  description: 'Kurulus Gozetimli Risk Analiz Sistemi',
  context: [
    'KURGAN, VDK tarafindan 1 Ekim 2025 itibariyle aktif edilmistir.',
    'Islemlere risk puani atar (mukellefe degil!). Yuksek riskli islemler tespit edildiginde mukellefe "KURGAN yazisi" gonderilir.',
    'ONEMLI: 1 Ekim 2025 sonrasi "bilmiyordum" savunmasi gecersizdir!',
    'KURGAN 16 farkli senaryo uzerinden risk analizi yapar.',
    'Her senaryo icin farkli aksiyon tipleri vardir: Takip, Bilgi Isteme, Izaha Davet, Inceleme.',
  ],
  aksiyonlar: [
    { tip: 'TAKIP', aciklama: 'Sistem izliyor, henuz aksiyon yok', sure: 'Suresiz', color: 'bg-[#E6F9FF] text-[#0049AA]' },
    { tip: 'BILGI_ISTEME', aciklama: 'VDK bilgi/belge isteyecek', sure: '15 gun', color: 'bg-[#FFFBEB] text-[#FA841E]' },
    { tip: 'IZAHA_DAVET', aciklama: 'VUK 370 kapsaminda izahat', sure: '30 gun', color: 'bg-[#FFFBEB] text-[#FA841E]' },
    { tip: 'INCELEME', aciklama: 'Dogrudan vergi incelemesi', sure: 'Derhal', color: 'bg-[#FEF2F2] text-[#BF192B]' },
  ],
  actions: [
    'Tetiklenen senaryolari inceleyip kok nedenleri belirleyin',
    'Her senaryo icin gerekli belgeleri hazirlayin',
    'Riskli saticilari tespit edip alternatif tedarikci arayin',
    'Odeme belgelerinizi guncel tutun (banka dekontlari)',
    'Stok hareketlerinizi duzenli takip edin',
  ],
};

// Types
export interface KurganTriggeredScenario {
  id: string;
  senaryo_id: string;
  senaryo_ad: string;
  tetiklenen_kosullar: string[];
  risk_puani: number;
  aksiyon: KurganAksiyon;
  sure: string | null;
  aciklama?: string;
  oneriler?: string[];
  ilgili_belgeler?: string[];
}

export interface KurganSummary {
  toplam_senaryo: number;
  tetiklenen_senaryo: number;
  risk_dagilimi: {
    inceleme: number;
    izaha_davet: number;
    bilgi_isteme: number;
    takip: number;
  };
  ortalama_risk: number;
  en_yuksek_risk: number;
}

export interface KurganResult {
  summary: KurganSummary;
  triggered_scenarios: KurganTriggeredScenario[];
  last_check: string;
  system_status: 'active' | 'inactive' | 'maintenance';
}

// Normalizer
export function normalizeKurgan(raw: unknown): PanelEnvelope<KurganResult> {
  return normalizeToEnvelope<KurganResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const scenariosRaw = data?.triggered_scenarios || data?.scenarios || data?.alerts || [];
    const triggeredScenarios: KurganTriggeredScenario[] = Array.isArray(scenariosRaw)
      ? scenariosRaw.map((s: Record<string, unknown>, idx: number) => ({
          id: String(s.id || `krg-triggered-${idx}`),
          senaryo_id: String(s.senaryo_id || s.scenario_id || s.code || `KRG-${idx + 1}`),
          senaryo_ad: String(s.senaryo_ad || s.scenario_name || s.name || s.title || 'Senaryo'),
          tetiklenen_kosullar: Array.isArray(s.tetiklenen_kosullar || s.triggered_conditions)
            ? ((s.tetiklenen_kosullar || s.triggered_conditions) as unknown[]).map((x: unknown) => String(x))
            : [],
          risk_puani: typeof s.risk_puani === 'number' ? s.risk_puani
            : typeof s.risk_score === 'number' ? s.risk_score
            : typeof s.score === 'number' ? s.score : 50,
          aksiyon: mapAksiyon(s.aksiyon || s.action),
          sure: s.sure ? String(s.sure) : s.deadline ? String(s.deadline) : null,
          aciklama: s.aciklama ? String(s.aciklama) : s.description ? String(s.description) : undefined,
          oneriler: Array.isArray(s.oneriler || s.recommendations)
            ? ((s.oneriler || s.recommendations) as unknown[]).map((x: unknown) => String(x))
            : undefined,
          ilgili_belgeler: Array.isArray(s.ilgili_belgeler || s.related_docs)
            ? ((s.ilgili_belgeler || s.related_docs) as unknown[]).map((x: unknown) => String(x))
            : undefined,
        }))
      : [];

    const summaryRaw = data?.summary as Record<string, unknown> | undefined;
    const riskDagilimi = summaryRaw?.risk_dagilimi as Record<string, number> | undefined;

    const summary: KurganSummary = {
      toplam_senaryo: typeof summaryRaw?.toplam_senaryo === 'number' ? summaryRaw.toplam_senaryo : 16,
      tetiklenen_senaryo: typeof summaryRaw?.tetiklenen_senaryo === 'number'
        ? summaryRaw.tetiklenen_senaryo
        : triggeredScenarios.length,
      risk_dagilimi: {
        inceleme: riskDagilimi?.inceleme ?? triggeredScenarios.filter(s => s.aksiyon === 'INCELEME').length,
        izaha_davet: riskDagilimi?.izaha_davet ?? triggeredScenarios.filter(s => s.aksiyon === 'IZAHA_DAVET').length,
        bilgi_isteme: riskDagilimi?.bilgi_isteme ?? triggeredScenarios.filter(s => s.aksiyon === 'BILGI_ISTEME').length,
        takip: riskDagilimi?.takip ?? triggeredScenarios.filter(s => s.aksiyon === 'TAKIP').length,
      },
      ortalama_risk: typeof summaryRaw?.ortalama_risk === 'number'
        ? summaryRaw.ortalama_risk
        : triggeredScenarios.length > 0
          ? Math.round(triggeredScenarios.reduce((sum, s) => sum + s.risk_puani, 0) / triggeredScenarios.length)
          : 0,
      en_yuksek_risk: typeof summaryRaw?.en_yuksek_risk === 'number'
        ? summaryRaw.en_yuksek_risk
        : Math.max(...triggeredScenarios.map(s => s.risk_puani), 0),
    };

    return {
      summary,
      triggered_scenarios: triggeredScenarios,
      last_check: data?.last_check ? String(data.last_check) : new Date().toISOString(),
      system_status: mapSystemStatus(data?.system_status),
    };
  });
}

function mapAksiyon(a: unknown): KurganAksiyon {
  const str = String(a).toUpperCase().replace(/-/g, '_');
  if (str.includes('INCELEME') || str === 'EXAMINATION') return 'INCELEME';
  if (str.includes('IZAHA') || str === 'EXPLANATION') return 'IZAHA_DAVET';
  if (str.includes('BILGI') || str === 'INFO_REQUEST') return 'BILGI_ISTEME';
  return 'TAKIP';
}

function mapSystemStatus(s: unknown): KurganResult['system_status'] {
  const str = String(s).toLowerCase();
  if (str === 'active' || str === 'aktif') return 'active';
  if (str === 'maintenance' || str === 'bakim') return 'maintenance';
  return 'inactive';
}

// Aksiyon Icon Map
export const AKSIYON_ICONS: Record<KurganAksiyon, React.ElementType> = {
  TAKIP: Eye,
  BILGI_ISTEME: FileSearch,
  IZAHA_DAVET: MessageSquare,
  INCELEME: AlertCircle,
};

export const AKSIYON_COLORS: Record<KurganAksiyon, { bg: string; text: string; border: string }> = {
  TAKIP: { bg: 'bg-[#E6F9FF]', text: 'text-[#0049AA]', border: 'border-[#ABEBFF]' },
  BILGI_ISTEME: { bg: 'bg-[#FFFBEB]', text: 'text-[#FA841E]', border: 'border-[#FFF08C]' },
  IZAHA_DAVET: { bg: 'bg-[#FFFBEB]', text: 'text-[#FA841E]', border: 'border-[#FFF08C]' },
  INCELEME: { bg: 'bg-[#FEF2F2]', text: 'text-[#BF192B]', border: 'border-[#FFC7C9]' },
};
