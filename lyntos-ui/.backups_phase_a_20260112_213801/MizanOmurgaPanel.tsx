'use client';
import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Scale,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge, TrustBadge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface MizanHesap {
  kod: string;
  ad: string;
  grup: string;
  borc: number;
  alacak: number;
  bakiye: number;
  bakiyeYonu: 'B' | 'A';
  oncekiDonem?: number;
  degisimOrani?: number;
}

interface KritikHesapAnalizi {
  hesapKodu: string;
  hesapAdi: string;
  durum: 'normal' | 'uyari' | 'kritik';
  bakiye: number;
  esikDeger?: number;
  mesaj: string;
  oneri: string;
  vdkRiski: boolean;
}

interface OranAnalizi {
  ad: string;
  formul: string;
  deger: number;
  birim: '%' | 'x' | 'gun';
  normalAralik: { min: number; max: number };
  durum: 'normal' | 'uyari' | 'kritik';
  yorum: string;
}

interface ApiAccount {
  hesap: string;
  ad: string;
  bakiye: number;
  status: 'ok' | 'warning' | 'error';
  reason_tr?: string;
  required_actions?: string[];
  oran_ciro?: number;
  oran_sermaye?: number;
  devir_hizi?: number;
  tahsilat_suresi_gun?: number;
  odeme_suresi_gun?: number;
  stok_gun?: number;
  kar_marji?: number;
  iade_orani?: number;
  esik?: number;
}

interface MizanResult {
  hesaplar: MizanHesap[];
  accounts_raw: Record<string, ApiAccount>;
  summary: {
    total_accounts: number;
    ok: number;
    warning: number;
    error: number;
    overall_status: string;
    total_actions: number;
  };
  totals: {
    toplam_borc: number;
    toplam_alacak: number;
    fark: number;
    denge_ok: boolean;
  };
  critical_count: number;
}

// ════════════════════════════════════════════════════════════════════════════
// SMMM INFO
// ════════════════════════════════════════════════════════════════════════════

const MIZAN_SMMM_INFO = {
  title: 'Mizan Analizi Nedir?',
  description: 'YMM seviyesinde mizan kontrolü ve oran analizleri',
  context: [
    'Mizan, işletmenin tüm hesaplarının dönem sonu bakiyelerini gösterir.',
    'Denge Kontrolü: Toplam Borç = Toplam Alacak (temel muhasebe kuralı)',
    'Kritik Hesap Bakiyeleri: Anormal bakiyeler VDK incelemesinde sorun oluşturabilir.',
    'Oran Analizleri: Likidite, finansal yapıyı ve operasyonel verimliliği ölçer.',
  ],
  kontrolNoktlari: [
    '100 Kasa: Negatif olamaz, aktifin %5\'ini geçmemeli (VDK K-09)',
    '102 Bankalar: Negatif bakiye = Kredili mevduat hesabı',
    '120 Alıcılar: 90 günün üzeri = Şüpheli alacak riski',
    '320 Satıcılar: Borç bakiye = Fazla ödeme veya avans',
    '131 Ortaklardan Alacaklar: Örtülü kazanç riski kontrolü',
  ],
  actions: [
    'Kritik hesap uyarılarını öncelikli inceleyin',
    'Oran analizlerinde kırmızı olanlara odaklanın',
    'VDK riski olan hesapları düzeltme planı oluşturun',
    'Dönem kapanışı öncesi tüm anomalileri giderin',
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function analyzeKritikHesaplar(mizan: MizanHesap[]): KritikHesapAnalizi[] {
  const analizler: KritikHesapAnalizi[] = [];
  const toplamAktif = mizan
    .filter(h => h.kod.startsWith('1') || h.kod.startsWith('2'))
    .reduce((sum, h) => sum + Math.abs(h.bakiye), 0);

  // 100 KASA ANALIZI
  const kasa = mizan.find(h => h.kod === '100');
  if (kasa) {
    const kasaOrani = (kasa.bakiye / toplamAktif) * 100;
    if (kasa.bakiye < 0) {
      analizler.push({
        hesapKodu: '100', hesapAdi: 'Kasa', durum: 'kritik', bakiye: kasa.bakiye,
        mesaj: 'KASA NEGATIF BAKIYE VERIYOR! Muhasebe hatasi veya kayit eksikligi.',
        oneri: 'Kasa hareketlerini kontrol edin, eksik tahsilat kaydi olabilir.',
        vdkRiski: true,
      });
    } else if (kasaOrani > 15) {
      analizler.push({
        hesapKodu: '100', hesapAdi: 'Kasa', durum: 'kritik', bakiye: kasa.bakiye, esikDeger: toplamAktif * 0.15,
        mesaj: `Kasa bakiyesi aktifin %${kasaOrani.toFixed(1)}'i. Normal: <%5. VDK K-09 kriteri!`,
        oneri: 'Yuksek kasa bakiyesi vergi incelemelerinde risk olusturur. Bankaya yatirin.',
        vdkRiski: true,
      });
    } else if (kasaOrani > 5) {
      analizler.push({
        hesapKodu: '100', hesapAdi: 'Kasa', durum: 'uyari', bakiye: kasa.bakiye, esikDeger: toplamAktif * 0.05,
        mesaj: `Kasa bakiyesi aktifin %${kasaOrani.toFixed(1)}'i. Takip edilmeli.`,
        oneri: 'Kasa bakiyesini makul seviyede tutun.',
        vdkRiski: false,
      });
    }
  }

  // 120 ALICILAR ANALIZI
  const alicilar = mizan.find(h => h.kod === '120');
  const satislar = mizan.find(h => h.kod === '600');
  if (alicilar && satislar && Math.abs(satislar.bakiye) > 0) {
    const tahsilatSuresi = (alicilar.bakiye / Math.abs(satislar.bakiye)) * 365;
    if (tahsilatSuresi > 90) {
      analizler.push({
        hesapKodu: '120', hesapAdi: 'Alicilar', durum: 'uyari', bakiye: alicilar.bakiye,
        mesaj: `Ortalama tahsilat suresi ${tahsilatSuresi.toFixed(0)} gun. Supheli alacak riski!`,
        oneri: 'Yaslandirma analizi yapin, 1 yili gecen alacaklar icin karsilik ayirin.',
        vdkRiski: false,
      });
    }
  }

  // 320 SATICILAR ANALIZI
  const saticilar = mizan.find(h => h.kod === '320');
  if (saticilar && saticilar.bakiye > 0) {
    analizler.push({
      hesapKodu: '320', hesapAdi: 'Saticilar', durum: 'kritik', bakiye: saticilar.bakiye,
      mesaj: 'Saticilar hesabi BORC bakiye veriyor! Normalde ALACAK bakiye olmali.',
      oneri: 'Muhtemelen fazla odeme veya avans kaydi yapilmis. Kontrol edin.',
      vdkRiski: false,
    });
  }

  // 131 ORTAKLARDAN ALACAKLAR
  const ortakAlacak = mizan.find(h => h.kod === '131');
  const sermaye = mizan.find(h => h.kod === '500');
  if (ortakAlacak && ortakAlacak.bakiye > 0 && sermaye) {
    if (ortakAlacak.bakiye > Math.abs(sermaye.bakiye) * 0.1) {
      analizler.push({
        hesapKodu: '131', hesapAdi: 'Ortaklardan Alacaklar', durum: 'uyari', bakiye: ortakAlacak.bakiye,
        mesaj: 'Ortaklardan alacaklar sermayenin %10\'unu asiyor. Ortulu kazanc riski!',
        oneri: 'Transfer fiyatlandirmasi kurallarina dikkat edin, faiz hesaplayin.',
        vdkRiski: true,
      });
    }
  }

  return analizler;
}

function calculateOranlar(mizan: MizanHesap[]): OranAnalizi[] {
  const getHesap = (kod: string) => mizan.find(h => h.kod === kod);

  const donenVarliklar = mizan.filter(h => h.kod.startsWith('1')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
  const duranVarliklar = mizan.filter(h => h.kod.startsWith('2')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
  const toplamAktif = donenVarliklar + duranVarliklar;
  const kisaVadeliBorc = mizan.filter(h => h.kod.startsWith('3')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
  const uzunVadeliBorc = mizan.filter(h => h.kod.startsWith('4')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
  const ozkaynaklar = mizan.filter(h => h.kod.startsWith('5')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
  const satislar = Math.abs(getHesap('600')?.bakiye || 0);
  const stoklar = Math.abs(getHesap('153')?.bakiye || 0);
  const alicilar = Math.abs(getHesap('120')?.bakiye || 0);
  const kasa = Math.abs(getHesap('100')?.bakiye || 0);
  const bankalar = Math.abs(getHesap('102')?.bakiye || 0);
  const smm = Math.abs(getHesap('621')?.bakiye || 0);

  const cariOran = kisaVadeliBorc > 0 ? donenVarliklar / kisaVadeliBorc : 0;
  const likiditeOrani = kisaVadeliBorc > 0 ? (donenVarliklar - stoklar) / kisaVadeliBorc : 0;
  const nakitOrani = kisaVadeliBorc > 0 ? (kasa + bankalar) / kisaVadeliBorc : 0;
  const borcOzkaynak = ozkaynaklar > 0 ? (kisaVadeliBorc + uzunVadeliBorc) / ozkaynaklar : 0;
  const alacakDevir = alicilar > 0 ? satislar / alicilar : 0;
  const tahsilatSuresi = satislar > 0 ? (alicilar / satislar) * 365 : 0;
  const stokDevir = stoklar > 0 ? smm / stoklar : 0;
  const kasaAktifOrani = toplamAktif > 0 ? (kasa / toplamAktif) * 100 : 0;

  return [
    {
      ad: 'Cari Oran', formul: 'Donen Varliklar / Kisa Vadeli Borclar', deger: cariOran, birim: 'x',
      normalAralik: { min: 1.5, max: 3 }, durum: cariOran >= 1.5 ? 'normal' : cariOran >= 1 ? 'uyari' : 'kritik',
      yorum: 'Kisa vadeli borclari odeme kapasitesi',
    },
    {
      ad: 'Likidite Orani', formul: '(Donen Varliklar - Stoklar) / Kisa Vadeli Borclar', deger: likiditeOrani, birim: 'x',
      normalAralik: { min: 1, max: 2 }, durum: likiditeOrani >= 1 ? 'normal' : likiditeOrani >= 0.8 ? 'uyari' : 'kritik',
      yorum: 'Stoklar haric odeme gucu',
    },
    {
      ad: 'Nakit Orani', formul: 'Hazir Degerler / Kisa Vadeli Borclar', deger: nakitOrani, birim: 'x',
      normalAralik: { min: 0.2, max: 0.5 }, durum: nakitOrani >= 0.2 ? 'normal' : 'uyari',
      yorum: 'Anlik odeme kapasitesi',
    },
    {
      ad: 'Borc/Ozkaynak', formul: 'Toplam Borc / Ozkaynaklar', deger: borcOzkaynak, birim: 'x',
      normalAralik: { min: 0, max: 2 }, durum: borcOzkaynak <= 2 ? 'normal' : borcOzkaynak <= 3 ? 'uyari' : 'kritik',
      yorum: 'Finansal kaldirac duzeyi',
    },
    {
      ad: 'Alacak Devir Hizi', formul: 'Net Satislar / Ticari Alacaklar', deger: alacakDevir, birim: 'x',
      normalAralik: { min: 4, max: 12 }, durum: alacakDevir >= 4 ? 'normal' : 'uyari',
      yorum: 'Alacak tahsilat etkinligi',
    },
    {
      ad: 'Ort. Tahsilat Suresi', formul: '365 / Alacak Devir Hizi', deger: tahsilatSuresi, birim: 'gun',
      normalAralik: { min: 30, max: 90 }, durum: tahsilatSuresi <= 90 ? 'normal' : tahsilatSuresi <= 120 ? 'uyari' : 'kritik',
      yorum: 'Ortalama tahsilat suresi',
    },
    {
      ad: 'Stok Devir Hizi', formul: 'SMM / Ortalama Stok', deger: stokDevir, birim: 'x',
      normalAralik: { min: 4, max: 12 }, durum: stokDevir >= 4 ? 'normal' : 'uyari',
      yorum: 'Stok yonetim etkinligi',
    },
    {
      ad: 'Kasa/Aktif Orani', formul: 'Kasa / Toplam Aktif', deger: kasaAktifOrani, birim: '%',
      normalAralik: { min: 0, max: 5 }, durum: kasaAktifOrani <= 5 ? 'normal' : kasaAktifOrani <= 15 ? 'uyari' : 'kritik',
      yorum: 'VDK K-09 kriteri: >%15 kritik risk',
    },
  ];
}

// ════════════════════════════════════════════════════════════════════════════
// ACCOUNT GROUP MAPPING
// ════════════════════════════════════════════════════════════════════════════

function getAccountGroup(kod: string): string {
  const prefix = kod.charAt(0);
  switch (prefix) {
    case '1': return 'Donen Varliklar';
    case '2': return 'Duran Varliklar';
    case '3': return 'Kisa Vadeli Yabanci Kaynaklar';
    case '4': return 'Uzun Vadeli Yabanci Kaynaklar';
    case '5': return 'Ozkaynaklar';
    case '6': return 'Gelirler';
    case '7': return 'Giderler';
    case '8': return 'Maliyet Hesaplari';
    case '9': return 'Nazim Hesaplar';
    default: return 'Diger';
  }
}

function getBakiyeYonu(kod: string, bakiye: number): 'B' | 'A' {
  // Aktif hesaplar (1xx, 2xx) normalde borc bakiye verir
  // Pasif hesaplar (3xx, 4xx, 5xx) normalde alacak bakiye verir
  // Gelir hesaplari (6xx) normalde alacak bakiye verir
  // Gider hesaplari (7xx) normalde borc bakiye verir
  const prefix = kod.charAt(0);

  if (['1', '2', '7', '8'].includes(prefix)) {
    // Aktif ve gider hesaplari - normalde borc
    return bakiye >= 0 ? 'B' : 'A';
  } else {
    // Pasif, ozkaynak ve gelir hesaplari - normalde alacak
    return bakiye <= 0 ? 'A' : 'B';
  }
}

function mapApiAccountToMizanHesap(account: ApiAccount): MizanHesap {
  const bakiye = account.bakiye;
  const bakiyeYonu = getBakiyeYonu(account.hesap, bakiye);

  // Approximate borc/alacak from bakiye (API doesn't provide separate values)
  const borc = bakiyeYonu === 'B' ? Math.abs(bakiye) : 0;
  const alacak = bakiyeYonu === 'A' ? Math.abs(bakiye) : 0;

  return {
    kod: account.hesap,
    ad: account.ad,
    grup: getAccountGroup(account.hesap),
    borc,
    alacak,
    bakiye: bakiyeYonu === 'B' ? Math.abs(bakiye) : -Math.abs(bakiye),
    bakiyeYonu,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// NORMALIZE API RESPONSE
// ════════════════════════════════════════════════════════════════════════════

function normalizeMizan(raw: unknown): PanelEnvelope<MizanResult> {
  return normalizeToEnvelope<MizanResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    // Handle object-based accounts (keyed by account code)
    const accountsObj = (data?.accounts || {}) as Record<string, unknown>;
    const summaryRaw = (data?.summary || {}) as Record<string, unknown>;

    // Convert object to array and map to MizanHesap
    const accountsRaw: ApiAccount[] = Object.values(accountsObj).map((a) => {
      const acc = a as Record<string, unknown>;
      return {
        hesap: String(acc.hesap || ''),
        ad: String(acc.ad || ''),
        bakiye: typeof acc.bakiye === 'number' ? acc.bakiye : 0,
        status: (acc.status as 'ok' | 'warning' | 'error') || 'ok',
        reason_tr: acc.reason_tr ? String(acc.reason_tr) : undefined,
        required_actions: Array.isArray(acc.required_actions) ? acc.required_actions as string[] : [],
        oran_ciro: typeof acc.oran_ciro === 'number' ? acc.oran_ciro : undefined,
        oran_sermaye: typeof acc.oran_sermaye === 'number' ? acc.oran_sermaye : undefined,
        devir_hizi: typeof acc.devir_hizi === 'number' ? acc.devir_hizi : undefined,
        tahsilat_suresi_gun: typeof acc.tahsilat_suresi_gun === 'number' ? acc.tahsilat_suresi_gun : undefined,
        odeme_suresi_gun: typeof acc.odeme_suresi_gun === 'number' ? acc.odeme_suresi_gun : undefined,
        stok_gun: typeof acc.stok_gun === 'number' ? acc.stok_gun : undefined,
        kar_marji: typeof acc.kar_marji === 'number' ? acc.kar_marji : undefined,
        iade_orani: typeof acc.iade_orani === 'number' ? acc.iade_orani : undefined,
        esik: typeof acc.esik === 'number' ? acc.esik : undefined,
      };
    });

    // Sort by account code
    accountsRaw.sort((a, b) => a.hesap.localeCompare(b.hesap));

    // Map to MizanHesap[]
    const hesaplar = accountsRaw.map(mapApiAccountToMizanHesap);

    // Calculate totals
    const toplamBorc = hesaplar.reduce((sum, h) => sum + h.borc, 0);
    const toplamAlacak = hesaplar.reduce((sum, h) => sum + h.alacak, 0);
    const criticalCount = accountsRaw.filter(a => a.status === 'error').length;

    return {
      hesaplar,
      accounts_raw: accountsObj as Record<string, ApiAccount>,
      summary: {
        total_accounts: typeof summaryRaw.total_accounts === 'number' ? summaryRaw.total_accounts : hesaplar.length,
        ok: typeof summaryRaw.ok === 'number' ? summaryRaw.ok : 0,
        warning: typeof summaryRaw.warning === 'number' ? summaryRaw.warning : 0,
        error: typeof summaryRaw.error === 'number' ? summaryRaw.error : 0,
        overall_status: String(summaryRaw.overall_status || 'ok'),
        total_actions: typeof summaryRaw.total_actions === 'number' ? summaryRaw.total_actions : 0,
      },
      totals: {
        toplam_borc: toplamBorc,
        toplam_alacak: toplamAlacak,
        fark: Math.abs(toplamBorc - toplamAlacak),
        denge_ok: Math.abs(toplamBorc - toplamAlacak) < 1,
      },
      critical_count: criticalCount,
    };
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SMMM INFO MODAL
// ════════════════════════════════════════════════════════════════════════════

function MizanInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="p-4 flex items-center justify-between bg-teal-50 border-b border-teal-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-100">
              <BookOpen className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-teal-800">{MIZAN_SMMM_INFO.title}</h2>
              <p className="text-sm text-slate-600">{MIZAN_SMMM_INFO.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Mizan Analizi Nedir?</h3>
            <ul className="space-y-2">
              {MIZAN_SMMM_INFO.context.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Kritik Hesap Kontrolleri</h3>
            <div className="space-y-2">
              {MIZAN_SMMM_INFO.kontrolNoktlari.map((item, i) => (
                <div key={i} className="text-sm text-slate-600 pl-4 border-l-2 border-teal-300">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-teal-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              SMMM Olarak Ne Yapmalisiniz?
            </h3>
            <ul className="space-y-1">
              {MIZAN_SMMM_INFO.actions.map((action, i) => (
                <li key={i} className="text-sm text-slate-700 pl-4 border-l-2 border-teal-300">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            Anladim
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function MizanOmurgaPanel() {
  const [showExplain, setShowExplain] = useState(false);
  const [showSmmmInfo, setShowSmmmInfo] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<MizanHesap | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOranlar, setShowOranlar] = useState(true);
  const [showKritik, setShowKritik] = useState(true);
  const [activeTab, setActiveTab] = useState<'ozet' | 'detay'>('ozet');

  const envelope = useFailSoftFetch<MizanResult>(ENDPOINTS.MIZAN_ANALYSIS, normalizeMizan);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  // Use API data only - no mock fallback
  const mizanData = data?.hesaplar || [];
  const hasData = mizanData.length > 0;
  const kritikAnalizler = useMemo(() => hasData ? analyzeKritikHesaplar(mizanData) : [], [mizanData, hasData]);
  const oranAnalizleri = useMemo(() => hasData ? calculateOranlar(mizanData) : [], [mizanData, hasData]);

  // Calculate totals from data
  const toplamBorc = mizanData.reduce((sum, h) => sum + h.borc, 0);
  const toplamAlacak = mizanData.reduce((sum, h) => sum + h.alacak, 0);
  const fark = Math.abs(toplamBorc - toplamAlacak);
  const dengeliMi = fark < 1;

  // Filter mizan data
  const filteredMizan = useMemo(() => {
    if (!searchTerm) return mizanData;
    const term = searchTerm.toLowerCase();
    return mizanData.filter(h => h.kod.includes(term) || h.ad.toLowerCase().includes(term));
  }, [searchTerm, mizanData]);

  const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(n);

  const kritikCount = kritikAnalizler.filter(k => k.durum === 'kritik').length;
  const uyariCount = kritikAnalizler.filter(k => k.durum === 'uyari').length;
  const vdkRiskCount = kritikAnalizler.filter(k => k.vdkRiski).length;

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            Mizan Analizi
            <button onClick={() => setShowSmmmInfo(true)} className="text-slate-400 hover:text-teal-600 transition-colors" title="SMMM Rehberi">
              <HelpCircle className="w-4 h-4" />
            </button>
          </span>
        }
        subtitle="YMM Seviyesi Analiz"
        headerAction={
          <div className="flex items-center gap-2">
            {dengeliMi ? (
              <Badge variant="success">Denge OK</Badge>
            ) : (
              <Badge variant="error">Denge Bozuk</Badge>
            )}
            {kritikCount > 0 && <Badge variant="error">{kritikCount} Kritik</Badge>}
            {vdkRiskCount > 0 && <Badge variant="warning">{vdkRiskCount} VDK Risk</Badge>}
          </div>
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {!hasData && status === 'ok' ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-600">VDK Kritik Hesaplar (Örnek Yapı)</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="pb-2 font-medium">Hesap</th>
                      <th className="pb-2 font-medium">Açıklama</th>
                      <th className="pb-2 text-right font-medium">Borç</th>
                      <th className="pb-2 text-right font-medium">Alacak</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-400">
                    <tr className="border-b border-slate-50">
                      <td className="py-2 font-mono">100</td>
                      <td>Kasa</td>
                      <td className="text-right">---</td>
                      <td className="text-right">---</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-2 font-mono">120</td>
                      <td>Alıcılar</td>
                      <td className="text-right">---</td>
                      <td className="text-right">---</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-2 font-mono">131</td>
                      <td>Ortaklardan Alacaklar</td>
                      <td className="text-right">---</td>
                      <td className="text-right">---</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-2 font-mono">320</td>
                      <td>Satıcılar</td>
                      <td className="text-right">---</td>
                      <td className="text-right">---</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-2 font-mono">600</td>
                      <td>Yurtiçi Satışlar</td>
                      <td className="text-right">---</td>
                      <td className="text-right">---</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-400 mt-4 text-center">
                Mizan yüklendiğinde VDK kritik hesap analizi yapılır
              </p>
            </div>
          ) : (
          <div className="space-y-4">
            {/* Tab Buttons */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('ozet')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'ozet' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Analiz Özeti
              </button>
              <button
                onClick={() => setActiveTab('detay')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'detay' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Detayli Mizan
              </button>
            </div>

            {activeTab === 'ozet' ? (
              <>
                {/* Denge Kontrolu */}
                <div className={`p-4 rounded-lg border ${dengeliMi ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Scale className={`w-6 h-6 ${dengeliMi ? 'text-green-600' : 'text-red-600'}`} />
                      <div>
                        <h4 className={`font-semibold ${dengeliMi ? 'text-green-800' : 'text-red-800'}`}>Denge Kontrolu</h4>
                        <p className="text-sm text-slate-600">Toplam Borc = Toplam Alacak</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Fark: <span className={`font-bold ${dengeliMi ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(fark)} TL</span></p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-slate-500">Toplam Borc</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(toplamBorc)} TL</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <p className="text-xs text-slate-500">Toplam Alacak</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(toplamAlacak)} TL</p>
                    </div>
                  </div>
                </div>

                {/* Kritik Hesap Analizleri */}
                <div>
                  <button
                    onClick={() => setShowKritik(!showKritik)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Kritik Hesap Analizleri ({kritikAnalizler.length})
                    </h4>
                    {showKritik ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {showKritik && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {kritikAnalizler.length === 0 ? (
                        <p className="text-sm text-green-600 p-2 bg-green-50 rounded">Kritik hesap sorunu bulunamadı.</p>
                      ) : (
                        kritikAnalizler.map((analiz, i) => (
                          <div key={i} className={`p-3 rounded-lg border ${
                            analiz.durum === 'kritik' ? 'bg-red-50 border-red-200' :
                            analiz.durum === 'uyari' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono bg-slate-200 px-1.5 py-0.5 rounded">{analiz.hesapKodu}</span>
                                  <span className="text-sm font-medium text-slate-800">{analiz.hesapAdi}</span>
                                  {analiz.vdkRiski && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">VDK</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600">{analiz.mesaj}</p>
                                <p className="text-xs text-slate-500 mt-1 italic">Oneri: {analiz.oneri}</p>
                              </div>
                              <Badge variant={analiz.durum === 'kritik' ? 'error' : analiz.durum === 'uyari' ? 'warning' : 'success'}>
                                {analiz.durum === 'kritik' ? 'Kritik' : analiz.durum === 'uyari' ? 'Uyari' : 'Normal'}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Oran Analizleri */}
                <div>
                  <button
                    onClick={() => setShowOranlar(!showOranlar)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      Oran Analizleri ({oranAnalizleri.length})
                    </h4>
                    {showOranlar ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {showOranlar && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left p-2 font-medium text-slate-600">Oran</th>
                            <th className="text-right p-2 font-medium text-slate-600">Deger</th>
                            <th className="text-center p-2 font-medium text-slate-600">Normal</th>
                            <th className="text-center p-2 font-medium text-slate-600">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {oranAnalizleri.map((oran, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2">
                                <p className="font-medium text-slate-800">{oran.ad}</p>
                                <p className="text-xs text-slate-500">{oran.yorum}</p>
                              </td>
                              <td className="p-2 text-right">
                                <span className={`font-mono font-medium ${
                                  oran.durum === 'kritik' ? 'text-red-600' :
                                  oran.durum === 'uyari' ? 'text-amber-600' : 'text-slate-900'
                                }`}>
                                  {oran.birim === '%' ? oran.deger.toFixed(1) : oran.birim === 'gun' ? oran.deger.toFixed(0) : oran.deger.toFixed(2)}
                                  {oran.birim === '%' ? '%' : oran.birim === 'gun' ? ' gun' : 'x'}
                                </span>
                              </td>
                              <td className="p-2 text-center text-xs text-slate-500">
                                {oran.normalAralik.min}-{oran.normalAralik.max}{oran.birim === '%' ? '%' : oran.birim === 'gun' ? ' gun' : 'x'}
                              </td>
                              <td className="p-2 text-center">
                                {oran.durum === 'normal' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                                ) : oran.durum === 'uyari' ? (
                                  <AlertCircle className="w-4 h-4 text-amber-500 inline" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-red-500 inline" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Hesap kodu veya adi ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Full Mizan Table */}
                <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium text-slate-600">Hesap</th>
                        <th className="text-left p-2 font-medium text-slate-600">Grup</th>
                        <th className="text-right p-2 font-medium text-slate-600">Borc</th>
                        <th className="text-right p-2 font-medium text-slate-600">Alacak</th>
                        <th className="text-right p-2 font-medium text-slate-600">Bakiye</th>
                        <th className="text-right p-2 font-medium text-slate-600">Degisim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMizan.map((hesap) => {
                        const kritikMi = kritikAnalizler.some(k => k.hesapKodu === hesap.kod && k.durum !== 'normal');
                        return (
                          <tr key={hesap.kod} className={`hover:bg-slate-50 ${kritikMi ? 'bg-amber-50' : ''}`}>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                {kritikMi && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                <div>
                                  <p className="font-mono text-xs text-slate-400">{hesap.kod}</p>
                                  <p className="text-slate-900">{hesap.ad}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-xs text-slate-500">{hesap.grup}</td>
                            <td className="p-2 text-right font-mono text-slate-700">{formatCurrency(hesap.borc)}</td>
                            <td className="p-2 text-right font-mono text-slate-700">{formatCurrency(hesap.alacak)}</td>
                            <td className="p-2 text-right">
                              <span className={`font-mono font-medium ${hesap.bakiye >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                                {formatCurrency(hesap.bakiye)} {hesap.bakiyeYonu}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              {hesap.degisimOrani !== undefined && (
                                <span className={`text-xs ${hesap.degisimOrani >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {hesap.degisimOrani >= 0 ? '+' : ''}{hesap.degisimOrani.toFixed(1)}%
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-medium">
                      <tr>
                        <td className="p-2" colSpan={2}>TOPLAM</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(toplamBorc)}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(toplamAlacak)}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(fark)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <TrustBadge trust={trust} />
              <div className="flex gap-2">
                {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) && (
                  <button onClick={() => setShowExplain(true)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    Neden? →
                  </button>
                )}
              </div>
            </div>
          </div>
          )}
        </PanelState>
      </Card>

      <ExplainModal
        isOpen={showExplain}
        onClose={() => setShowExplain(false)}
        title="Mizan Analizi"
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={meta}
      />

      <MizanInfoModal isOpen={showSmmmInfo} onClose={() => setShowSmmmInfo(false)} />
    </>
  );
}
