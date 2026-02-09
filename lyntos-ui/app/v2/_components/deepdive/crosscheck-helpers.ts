import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle, Info, FileText, Building2, FileSearch, Activity, Shield } from 'lucide-react';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import type { SahteFaturaRiskIndicator, TedarikciRiskProfili, SahteFaturaAnaliziResult, RiskSeviye } from './crosscheck-types';

export function normalizeSahteFaturaAnalizi(raw: unknown): PanelEnvelope<SahteFaturaAnaliziResult> {
  return normalizeToEnvelope<SahteFaturaAnaliziResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    if (!data) {
      return {
        toplamRiskPuani: 0,
        riskSeviyesi: 'DUSUK',
        analizTarihi: new Date().toISOString(),
        incelenenTedarikciSayisi: 0,
        riskliTedarikciSayisi: 0,
        bulgular: [],
        riskliTedarikçiler: [],
      };
    }

    const bulgularRaw = data.bulgular || data.findings || [];
    const tedarikcilerRaw = data.riskliTedarikçiler || data.risky_suppliers || [];

    return {
      toplamRiskPuani: typeof data.toplamRiskPuani === 'number' ? data.toplamRiskPuani : (typeof data.total_risk_score === 'number' ? data.total_risk_score : 0),
      riskSeviyesi: mapRiskSeviye(data.riskSeviyesi || data.risk_level),
      analizTarihi: String(data.analizTarihi || data.analysis_date || new Date().toISOString()),
      incelenenTedarikciSayisi: typeof data.incelenenTedarikciSayisi === 'number' ? data.incelenenTedarikciSayisi : (typeof data.total_suppliers === 'number' ? data.total_suppliers : 0),
      riskliTedarikciSayisi: typeof data.riskliTedarikciSayisi === 'number' ? data.riskliTedarikciSayisi : (typeof data.risky_supplier_count === 'number' ? data.risky_supplier_count : 0),
      bulgular: Array.isArray(bulgularRaw) ? bulgularRaw.map(normalizeBulgu) : [],
      riskliTedarikçiler: Array.isArray(tedarikcilerRaw) ? tedarikcilerRaw.map(normalizeTedarikci) : [],
    };
  });
}

export function mapRiskSeviye(s: unknown): RiskSeviye {
  const str = String(s).toUpperCase();
  if (str === 'KRITIK' || str === 'CRITICAL') return 'KRITIK';
  if (str === 'YUKSEK' || str === 'HIGH') return 'YUKSEK';
  if (str === 'ORTA' || str === 'MEDIUM') return 'ORTA';
  return 'DUSUK';
}

export function normalizeBulgu(b: unknown): SahteFaturaRiskIndicator {
  const obj = b as Record<string, unknown>;
  return {
    kod: String(obj.kod || obj.code || ''),
    ad: String(obj.ad || obj.name || ''),
    aciklama: String(obj.aciklama || obj.description || ''),
    seviye: mapRiskSeviye(obj.seviye || obj.level),
    puan: typeof obj.puan === 'number' ? obj.puan : (typeof obj.score === 'number' ? obj.score : 0),
    kaynak: mapKaynak(obj.kaynak || obj.source),
    oneri: String(obj.oneri || obj.recommendation || ''),
    mevzuat: Array.isArray(obj.mevzuat) ? obj.mevzuat.map(String) : (Array.isArray(obj.legal_refs) ? obj.legal_refs.map(String) : []),
  };
}

export function mapKaynak(k: unknown): SahteFaturaRiskIndicator['kaynak'] {
  const str = String(k).toLowerCase();
  if (str.includes('vergi') || str.includes('tax_cert')) return 'vergi_levhasi';
  if (str.includes('ticaret') || str.includes('trade') || str.includes('registry')) return 'ticaret_sicil';
  if (str.includes('sektor') || str.includes('sector')) return 'sektor_analizi';
  if (str.includes('fatura') || str.includes('invoice')) return 'e_fatura';
  if (str.includes('vdk') || str.includes('ram')) return 'vdk_ram';
  return 'e_fatura';
}

export function normalizeTedarikci(t: unknown): TedarikciRiskProfili {
  const obj = t as Record<string, unknown>;
  return {
    vkn: String(obj.vkn || obj.tax_id || ''),
    unvan: String(obj.unvan || obj.company_name || ''),
    riskPuani: typeof obj.riskPuani === 'number' ? obj.riskPuani : (typeof obj.risk_score === 'number' ? obj.risk_score : 0),
    riskSeviyesi: mapRiskSeviye(obj.riskSeviyesi || obj.risk_level),
    riskFaktorleri: Array.isArray(obj.riskFaktorleri) ? obj.riskFaktorleri.map(String) : (Array.isArray(obj.risk_factors) ? obj.risk_factors.map(String) : []),
    sonIslemTarihi: String(obj.sonIslemTarihi || obj.last_transaction_date || ''),
    toplamAlimTutari: typeof obj.toplamAlimTutari === 'number' ? obj.toplamAlimTutari : (typeof obj.total_purchase === 'number' ? obj.total_purchase : 0),
    uyarilar: Array.isArray(obj.uyarilar) ? obj.uyarilar.map(String) : (Array.isArray(obj.warnings) ? obj.warnings.map(String) : []),
  };
}

export function getRiskSeviyeConfig(seviye: RiskSeviye) {
  const config = {
    DUSUK: { bg: 'bg-[#ECFDF5]', border: 'border-[#AAE8B8]', text: 'text-[#00804D]', badge: 'bg-[#ECFDF5] text-[#005A46]', icon: CheckCircle2 },
    ORTA: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    YUKSEK: { bg: 'bg-[#FFFBEB]', border: 'border-[#FFF08C]', text: 'text-[#FA841E]', badge: 'bg-[#FFFBEB] text-[#E67324]', icon: AlertTriangle },
    KRITIK: { bg: 'bg-[#FEF2F2]', border: 'border-[#FFC7C9]', text: 'text-[#BF192B]', badge: 'bg-[#FEF2F2] text-[#980F30]', icon: XCircle },
  };
  return config[seviye];
}

export function getKaynakConfig(kaynak: string) {
  const config: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    vergi_levhasi: { label: 'Vergi Levhası', icon: React.createElement(FileText, { className: 'w-3 h-3' }), color: 'text-[#0049AA] bg-[#E6F9FF]' },
    ticaret_sicil: { label: 'Ticaret Sicili', icon: React.createElement(Building2, { className: 'w-3 h-3' }), color: 'text-[#0049AA] bg-[#E6F9FF]' },
    sektor_analizi: { label: 'Sektör Analizi', icon: React.createElement(Activity, { className: 'w-3 h-3' }), color: 'text-[#0049AA] bg-[#E6F9FF]' },
    e_fatura: { label: 'e-Fatura', icon: React.createElement(FileSearch, { className: 'w-3 h-3' }), color: 'text-[#00804D] bg-[#ECFDF5]' },
    vdk_ram: { label: 'VDK RAM', icon: React.createElement(Shield, { className: 'w-3 h-3' }), color: 'text-[#BF192B] bg-[#FEF2F2]' },
  };
  return config[kaynak] || { label: kaynak, icon: React.createElement(Info, { className: 'w-3 h-3' }), color: 'text-[#5A5A5A] bg-[#F5F6F8]' };
}

export function getStatusConfig(status: string, severity: string) {
  if (status === 'pass') return { badge: 'success' as const, label: 'Eşleşme' };
  if (status === 'no_data') return { badge: 'default' as const, label: 'Veri Yok' };
  if (severity === 'critical') return { badge: 'error' as const, label: 'Kritik' };
  if (severity === 'high') return { badge: 'error' as const, label: 'Yüksek Fark' };
  if (status === 'warning') return { badge: 'warning' as const, label: 'Uyarı' };
  return { badge: 'warning' as const, label: 'Fark Var' };
}

export function getSeverityIcon(severity: string) {
  if (severity === 'critical') return React.createElement(XCircle, { className: 'w-4 h-4 text-[#BF192B]' });
  if (severity === 'high') return React.createElement(AlertTriangle, { className: 'w-4 h-4 text-[#FA841E]' });
  if (severity === 'medium') return React.createElement(AlertCircle, { className: 'w-4 h-4 text-[#FA841E]' });
  return React.createElement(Info, { className: 'w-4 h-4 text-[#969696]' });
}

export function formatAmount(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
