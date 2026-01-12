'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Minus,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calculator,
  Building,
  Sparkles,
  AlertCircle,
  FileText,
  Calendar,
  HelpCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import type { KurumlarVergisiKontrol, KontrolDurumu, RiskSeviyesi, KontrolTipi } from './types';
import { KURUMLAR_VERGISI_KONTROLLER } from './types';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface KurumlarVergisiPanelProps {
  yil?: number;
  kontrolDurumlari?: Record<string, KontrolDurumu>;
  matrahVerileri?: MatrahVerileri;
  onKontrolClick?: (kontrolId: string) => void;
}

interface MatrahVerileri {
  ticariBilancoKari: number;
  kkegToplam: number;
  vergiyeTabiOlmayanGelirler: number;
  istisnalar: number;
  gecmisYilZararlari: number;
  indirimler: number;
  ihracatKazanci?: number;
  geciciVergiMahsup?: number;
  kesilenStopajlar?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const DURUM_ICONS: Record<KontrolDurumu, React.ReactNode> = {
  tamamlandi: <CheckCircle2 className="w-5 h-5 text-green-600" />,
  bekliyor: <Clock className="w-5 h-5 text-slate-400" />,
  uyari: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  hata: <XCircle className="w-5 h-5 text-red-500" />,
  uygulanamaz: <Minus className="w-5 h-5 text-slate-300" />,
};

const RISK_COLORS: Record<RiskSeviyesi, string> = {
  dusuk: 'bg-green-50 text-green-700 border-green-200',
  orta: 'bg-amber-50 text-amber-700 border-amber-200',
  yuksek: 'bg-orange-50 text-orange-700 border-orange-200',
  kritik: 'bg-red-50 text-red-700 border-red-200',
};

const TIP_CONFIG: Record<KontrolTipi, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  risk: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: 'Risk',
    icon: <TrendingDown className="w-3 h-3" />,
  },
  avantaj: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: 'Avantaj',
    icon: <Sparkles className="w-3 h-3" />,
  },
  zorunlu: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    label: 'Zorunlu',
    icon: <FileText className="w-3 h-3" />,
  },
};

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY INFO - SMMM EXPLANATIONS
// ════════════════════════════════════════════════════════════════════════════

interface CategoryInfo {
  title: string;
  icon: LucideIcon;
  description: string;
  details: string[];
  action: string;
  examples: string[];
}

const CATEGORY_INFO: Record<'risk' | 'avantaj' | 'zorunlu', CategoryInfo> = {
  risk: {
    title: 'Risk Kontrolleri',
    icon: TrendingDown,
    description: 'VDK incelemelerinde sıkça tespit edilen riskli durumlar',
    details: [
      'Bu kontroller, vergi incelemelerinde eleştiri konusu olabilecek alanları gösterir.',
      'Her kontrol, potansiyel vergi riski ve ceza ihtimalini azaltmak için önemlidir.',
      'Yüksek riskli kontroller öncelikli olarak ele alınmalıdır.',
    ],
    action: 'Risk kontrollerini gözden geçirin ve gerekli düzeltmeleri yapın.',
    examples: [
      'Örtülü Sermaye Kontrolü - Ortaklara borç/sermaye oranı',
      'Transfer Fiyatlandırması - İlişkili taraf işlemleri',
      'KKEG Analizi - Kanunen kabul edilmeyen giderler',
    ],
  },
  avantaj: {
    title: 'Vergi Avantajları',
    icon: Sparkles,
    description: 'Yasal vergi avantajları ve tasarruf fırsatları',
    details: [
      'Bu kontroller, mükelleflerin yararlanabileceği yasal vergi avantajlarını gösterir.',
      'Her avantaj, vergi yükünü azaltmak için kullanılabilecek bir fırsattır.',
      'Bazı avantajlar belirli koşullara bağlıdır, şartları kontrol edin.',
    ],
    action: 'Vergi avantajlarını değerlendirin ve uygun olanları uygulayın.',
    examples: [
      'Ar-Ge İndirimi - %100 ek indirim hakkı',
      'İhracat İndirimi - %5 kurumlar vergisi indirimi',
      'İstihdam Teşvikleri - SGK prim destekleri',
    ],
  },
  zorunlu: {
    title: 'Zorunlu Kontroller',
    icon: FileText,
    description: 'Yasal olarak yapılması zorunlu kontroller ve beyanlar',
    details: [
      'Bu kontroller, vergi mevzuatı gereği yapılması zorunlu olan işlemlerdir.',
      'Eksik veya hatalı beyan durumunda cezai müeyyide uygulanabilir.',
      'Tüm zorunlu kontrollerin eksiksiz tamamlanması gerekir.',
    ],
    action: 'Tüm zorunlu kontrolleri tamamlayın ve belgelendirin.',
    examples: [
      'Kurumlar Vergisi Beyannamesi - Yıllık beyan',
      'Geçici Vergi Beyannamesi - Üç aylık beyan',
      'E-Defter Berat - Aylık yükleme zorunluluğu',
    ],
  },
};

// Category Info Modal Colors
const CATEGORY_COLORS: Record<'risk' | 'avantaj' | 'zorunlu', {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  icon: string;
}> = {
  risk: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconBg: 'bg-red-100',
    icon: 'text-red-600',
  },
  avantaj: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    iconBg: 'bg-green-100',
    icon: 'text-green-600',
  },
  zorunlu: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconBg: 'bg-blue-100',
    icon: 'text-blue-600',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' TL';
}

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY INFO MODAL
// ════════════════════════════════════════════════════════════════════════════

interface CategoryInfoModalProps {
  category: 'risk' | 'avantaj' | 'zorunlu' | null;
  onClose: () => void;
}

function CategoryInfoModal({ category, onClose }: CategoryInfoModalProps) {
  if (!category) return null;

  const info = CATEGORY_INFO[category];
  const colors = CATEGORY_COLORS[category];
  const Icon = info.icon;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className={`p-4 flex items-center justify-between ${colors.bg} ${colors.border} border-b`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
              <Icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${colors.text}`}>{info.title}</h2>
              <p className="text-sm text-slate-600">{info.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Bu Ne Anlama Geliyor?</h3>
            <ul className="space-y-2">
              {info.details.map((detail, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Examples */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Ornek Kontroller</h3>
            <ul className="space-y-1">
              {info.examples.map((example, i) => (
                <li key={i} className="text-sm text-slate-600 pl-4 border-l-2 border-slate-200">
                  {example}
                </li>
              ))}
            </ul>
          </div>

          {/* Action */}
          <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
            <h3 className={`text-sm font-semibold mb-1 ${colors.text}`}>SMMM Olarak Ne Yapmalisiniz?</h3>
            <p className="text-sm text-slate-700">{info.action}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Anladim
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MATRAH HESAPLAMA COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface MatrahHesaplamaProps {
  veriler: MatrahVerileri;
  yil: number;
}

function MatrahHesaplama({ veriler, yil }: MatrahHesaplamaProps) {
  // Hesaplamalar
  const kkegEklenen = veriler.ticariBilancoKari + veriler.kkegToplam;
  const matrah = kkegEklenen
    - veriler.vergiyeTabiOlmayanGelirler
    - veriler.istisnalar
    - veriler.gecmisYilZararlari
    - veriler.indirimler;

  const ihracatKazanci = veriler.ihracatKazanci || 0;
  const normalOranliMatrah = matrah - ihracatKazanci;

  const hesaplananKV = (normalOranliMatrah * 0.25) + (ihracatKazanci * 0.20);

  // AKV Kontrolü (2025'ten itibaren)
  const akvMatrah = veriler.ticariBilancoKari + veriler.kkegToplam;
  const asgariKV = akvMatrah * 0.10;
  const akvUyari = yil >= 2025 && hesaplananKV < asgariKV;
  const nihaiBelgeKV = yil >= 2025 ? Math.max(hesaplananKV, asgariKV) : hesaplananKV;

  // Odenecek
  const geciciMahsup = veriler.geciciVergiMahsup || 0;
  const stopajMahsup = veriler.kesilenStopajlar || 0;
  const odenecekKV = nihaiBelgeKV - geciciMahsup - stopajMahsup;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Calculator className="w-5 h-5" />
          <span className="font-semibold">Matrah Hesaplama Özeti</span>
        </div>
        <div className="text-blue-100 text-xs mt-1">{yil} Hesap Dönemi</div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2 text-sm">
        {/* Ticari Bilanco Kari */}
        <div className="flex justify-between">
          <span className="text-slate-600">Ticari Bilanco Kari</span>
          <span className="font-medium text-slate-800">{formatCurrency(veriler.ticariBilancoKari)}</span>
        </div>

        {/* KKEG */}
        <div className="flex justify-between">
          <span className="text-slate-600">+ KKEG</span>
          <span className="font-medium text-red-600">+{formatCurrency(veriler.kkegToplam)}</span>
        </div>

        <div className="border-t border-slate-100 pt-2">
          <div className="flex justify-between">
            <span className="text-slate-700 font-medium">= KKEG Eklenen</span>
            <span className="font-semibold text-slate-800">{formatCurrency(kkegEklenen)}</span>
          </div>
        </div>

        {/* Cikarimlar */}
        <div className="flex justify-between text-slate-500">
          <span>- Vergiye Tabi Olmayan Gelirler</span>
          <span>({formatCurrency(veriler.vergiyeTabiOlmayanGelirler)})</span>
        </div>

        <div className="flex justify-between text-slate-500">
          <span>- Istisnalar</span>
          <span>({formatCurrency(veriler.istisnalar)})</span>
        </div>

        <div className="flex justify-between text-slate-500">
          <span>- Gecmis Yil Zararlari</span>
          <span>({formatCurrency(veriler.gecmisYilZararlari)})</span>
        </div>

        <div className="flex justify-between text-slate-500">
          <span>- Indirimler</span>
          <span>({formatCurrency(veriler.indirimler)})</span>
        </div>

        {/* Matrah */}
        <div className="border-t border-slate-200 pt-2 mt-2">
          <div className="flex justify-between bg-blue-50 -mx-4 px-4 py-2">
            <span className="text-blue-800 font-semibold">KURUMLAR VERGISI MATRAHI</span>
            <span className="font-bold text-blue-800">{formatCurrency(matrah)}</span>
          </div>
        </div>

        {/* Vergi Hesabi */}
        <div className="pt-2 space-y-1">
          {ihracatKazanci > 0 && (
            <>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Normal Matrah x %25</span>
                <span>{formatCurrency(normalOranliMatrah * 0.25)}</span>
              </div>
              <div className="flex justify-between text-xs text-green-600">
                <span>Ihracat Matrahi x %20 (5 puan indirim)</span>
                <span>{formatCurrency(ihracatKazanci * 0.20)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <span className="text-slate-600">Hesaplanan KV</span>
            <span className="font-medium">{formatCurrency(hesaplananKV)}</span>
          </div>
        </div>

        {/* AKV Kontrolu */}
        {yil >= 2025 && (
          <div className={`border rounded-lg p-3 mt-3 ${akvUyari ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {akvUyari ? (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
                <span className={`text-sm font-medium ${akvUyari ? 'text-amber-700' : 'text-green-700'}`}>
                  Asgari KV Kontrolü
                </span>
              </div>
              <span className={`text-sm ${akvUyari ? 'text-amber-700' : 'text-green-700'}`}>
                AKV: {formatCurrency(asgariKV)}
              </span>
            </div>
            {akvUyari && (
              <p className="text-xs text-amber-600 mt-2">
                Hesaplanan KV asgari KV'nin altında! Asgari KV uygulanacak.
              </p>
            )}
          </div>
        )}

        {/* Mahsuplar */}
        <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>- Gecici Vergi Mahsubu</span>
            <span>({formatCurrency(geciciMahsup)})</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>- Kesilen Stopajlar</span>
            <span>({formatCurrency(stopajMahsup)})</span>
          </div>
        </div>

        {/* Odenecek */}
        <div className="border-t border-slate-200 pt-3 mt-2">
          <div className={`flex justify-between -mx-4 px-4 py-3 ${odenecekKV >= 0 ? 'bg-slate-800' : 'bg-green-600'}`}>
            <span className="text-white font-semibold">ODENECEK KURUMLAR VERGISI</span>
            <span className="font-bold text-white text-lg">
              {formatCurrency(Math.max(0, odenecekKV))}
            </span>
          </div>
          {odenecekKV < 0 && (
            <div className="text-center text-green-600 text-sm mt-2 font-medium">
              {formatCurrency(Math.abs(odenecekKV))} iade hakkiniz var
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function KurumlarVergisiPanel({
  yil = 2025,
  kontrolDurumlari = {},
  matrahVerileri,
  onKontrolClick,
}: KurumlarVergisiPanelProps) {
  const [expandedKontrol, setExpandedKontrol] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tumu' | 'risk' | 'avantaj' | 'zorunlu'>('tumu');
  const [selectedCategory, setSelectedCategory] = useState<'risk' | 'avantaj' | 'zorunlu' | null>(null);

  // Matrah verileri props'tan gelir - mock yok
  const hasMatrahData = matrahVerileri !== undefined;

  const kontrollerWithDurum = useMemo(() => {
    return KURUMLAR_VERGISI_KONTROLLER.map(kontrol => ({
      ...kontrol,
      durum: kontrolDurumlari[kontrol.id] || 'bekliyor' as KontrolDurumu,
    }));
  }, [kontrolDurumlari]);

  const filteredKontroller = useMemo(() => {
    if (activeTab === 'tumu') return kontrollerWithDurum;
    return kontrollerWithDurum.filter(k => k.kontrolTipi === activeTab);
  }, [kontrollerWithDurum, activeTab]);

  const stats = useMemo(() => {
    const tamamlanan = kontrollerWithDurum.filter(k => k.durum === 'tamamlandi').length;
    const uyari = kontrollerWithDurum.filter(k => k.durum === 'uyari').length;
    const hata = kontrollerWithDurum.filter(k => k.durum === 'hata').length;
    const riskKontrol = kontrollerWithDurum.filter(k => k.kontrolTipi === 'risk').length;
    const avantajKontrol = kontrollerWithDurum.filter(k => k.kontrolTipi === 'avantaj').length;
    const zorunluKontrol = kontrollerWithDurum.filter(k => k.kontrolTipi === 'zorunlu').length;
    const oran = Math.round((tamamlanan / kontrollerWithDurum.length) * 100);
    return {
      tamamlanan,
      uyari,
      hata,
      oran,
      toplam: kontrollerWithDurum.length,
      riskKontrol,
      avantajKontrol,
      zorunluKontrol,
    };
  }, [kontrollerWithDurum]);

  const toggleExpand = (kontrolId: string) => {
    setExpandedKontrol(prev => prev === kontrolId ? null : kontrolId);
  };

  // Son odeme tarihi (30 Nisan)
  const sonOdemeTarihi = new Date(yil + 1, 3, 30);
  const bugun = new Date();
  const kalanGun = Math.ceil((sonOdemeTarihi.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Building className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Kurumlar Vergisi Analizi</h2>
              <p className="text-slate-500 text-sm">{yil} Hesap Dönemi</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-800">{stats.tamamlanan}/{stats.toplam}</div>
            <div className="text-slate-500 text-sm">Kontrol Tamamlandi</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${stats.oran}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-slate-500">%{stats.oran} tamamlandi</span>
            <span className={`flex items-center gap-1 ${kalanGun > 30 ? 'text-green-600' : kalanGun > 0 ? 'text-amber-600' : 'text-red-600'}`}>
              <Calendar className="w-4 h-4" />
              Son Beyan: 30 Nisan {yil + 1}
              {kalanGun > 0 ? ` (${kalanGun} gun kaldi)` : ' (Sure doldu!)'}
            </span>
          </div>
        </div>

        {/* Tip Istatistikleri - Clickable Cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedCategory('risk')}
            className="bg-red-50 rounded-lg p-3 border border-red-200 text-left hover:bg-red-100 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <TrendingDown className="w-4 h-4" />
                Risk Kontrolleri
              </div>
              <HelpCircle className="w-4 h-4 text-red-400 hover:text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-700">{stats.riskKontrol}</div>
            <p className="text-xs text-red-500 mt-1">Tikla: Detayli bilgi</p>
          </button>
          <button
            onClick={() => setSelectedCategory('avantaj')}
            className="bg-green-50 rounded-lg p-3 border border-green-200 text-left hover:bg-green-100 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Sparkles className="w-4 h-4" />
                Vergi Avantajlari
              </div>
              <HelpCircle className="w-4 h-4 text-green-400 hover:text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700">{stats.avantajKontrol}</div>
            <p className="text-xs text-green-500 mt-1">Tikla: Detayli bilgi</p>
          </button>
          <button
            onClick={() => setSelectedCategory('zorunlu')}
            className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-left hover:bg-blue-100 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <FileText className="w-4 h-4" />
                Zorunlu Kontroller
              </div>
              <HelpCircle className="w-4 h-4 text-blue-400 hover:text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">{stats.zorunluKontrol}</div>
            <p className="text-xs text-blue-500 mt-1">Tikla: Detayli bilgi</p>
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sol: Kontrol Listesi - flexible */}
        <div className="flex-1 min-w-0">
          <Card title="20 Kritik Kontrol" subtitle="Risk, Avantaj ve Zorunlu Kontroller">
            {/* Tab Buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setActiveTab('tumu')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'tumu'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tumu ({stats.toplam})
              </button>
              <button
                onClick={() => setActiveTab('zorunlu')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'zorunlu'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <FileText className="w-3 h-3" />
                Zorunlu ({stats.zorunluKontrol})
              </button>
              <button
                onClick={() => setActiveTab('risk')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'risk'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <TrendingDown className="w-3 h-3" />
                Risk ({stats.riskKontrol})
              </button>
              <button
                onClick={() => setActiveTab('avantaj')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'avantaj'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Avantaj ({stats.avantajKontrol})
              </button>
            </div>

            {/* Kontrol Listesi */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredKontroller.map((kontrol) => {
                const tipConfig = TIP_CONFIG[kontrol.kontrolTipi];

                return (
                  <div key={kontrol.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div
                      className="px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => toggleExpand(kontrol.id)}
                    >
                      <div className="flex items-center gap-3">
                        {DURUM_ICONS[kontrol.durum]}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-slate-400">{kontrol.id}</span>
                            <span className={`px-1.5 py-0.5 text-xs rounded flex items-center gap-1 ${tipConfig.bg} ${tipConfig.text}`}>
                              {tipConfig.icon}
                              {tipConfig.label}
                            </span>
                            <h4 className="font-medium text-slate-800 text-sm">
                              {kontrol.baslik}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{kontrol.aciklama}</p>
                        </div>

                        {/* Potansiyel Tasarruf Badge (Avantaj icin) */}
                        {kontrol.potansiyelTasarruf && (
                          <span className="hidden sm:inline-block px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                            Tasarruf
                          </span>
                        )}

                        {/* Risk Seviyesi */}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${RISK_COLORS[kontrol.riskSeviyesi]}`}>
                          {kontrol.riskSeviyesi.toUpperCase()}
                        </span>

                        {/* VDK Baglantisi */}
                        {kontrol.vdkBaglantisi && kontrol.vdkBaglantisi.length > 0 && (
                          <span className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded font-mono">
                            VDK
                          </span>
                        )}

                        {expandedKontrol === kontrol.id ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {expandedKontrol === kontrol.id && (
                      <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                        <div className="bg-slate-50 rounded-lg p-4 mt-3 space-y-3">
                          <div>
                            <h5 className="text-xs font-medium text-slate-700 mb-1">Aciklama</h5>
                            <p className="text-sm text-slate-600">{kontrol.detayliAciklama}</p>
                          </div>

                          <div>
                            <h5 className="text-xs font-medium text-slate-700 mb-1">Kontrol Noktalari</h5>
                            <ul className="space-y-1">
                              {kontrol.kontrolNoktasi.map((nokta, idx) => (
                                <li key={idx} className="text-xs text-slate-600 flex items-start gap-1">
                                  <span className="text-slate-400">•</span>
                                  {nokta}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {kontrol.hesaplamaFormulu && (
                            <div>
                              <h5 className="text-xs font-medium text-slate-700 mb-1">Hesaplama</h5>
                              <code className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-700 block">
                                {kontrol.hesaplamaFormulu}
                              </code>
                            </div>
                          )}

                          <div>
                            <h5 className="text-xs font-medium text-slate-700 mb-1">Yasal Dayanak</h5>
                            <div className="flex flex-wrap gap-1">
                              {kontrol.yasalDayanak.map((dayanak, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                                >
                                  {dayanak.kanun} Md.{dayanak.madde}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Oneriler */}
                          {kontrol.oneriler.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-green-700 mb-1">Oneriler</h5>
                              <ul className="space-y-1">
                                {kontrol.oneriler.map((oneri, idx) => (
                                  <li key={idx} className="text-xs text-slate-600">• {oneri}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* VDK Baglantisi */}
                          {kontrol.vdkBaglantisi && kontrol.vdkBaglantisi.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-purple-700 mb-1">VDK Baglantisi</h5>
                              <div className="flex gap-1">
                                {kontrol.vdkBaglantisi.map((vdk, idx) => (
                                  <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono">
                                    {vdk}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {kontrol.potansiyelTasarruf && (
                            <div className="bg-green-50 border border-green-200 rounded p-2">
                              <h5 className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Potansiyel Tasarruf
                              </h5>
                              <p className="text-xs text-green-700">{kontrol.potansiyelTasarruf}</p>
                            </div>
                          )}

                          {kontrol.uyarilar.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded p-2">
                              <h5 className="text-xs font-medium text-amber-700 mb-1">Dikkat</h5>
                              <ul className="space-y-1">
                                {kontrol.uyarilar.map((uyari, idx) => (
                                  <li key={idx} className="text-xs text-amber-700">• {uyari}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onKontrolClick?.(kontrol.id);
                              }}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Kontrolü Başlat
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-sm">
              <div className="flex gap-4">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  {stats.tamamlanan}
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <AlertTriangle className="w-4 h-4" />
                  {stats.uyari}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="w-4 h-4" />
                  {stats.hata}
                </span>
              </div>
              <button className="text-xs text-slate-500 hover:text-slate-700">
                Rapor Indir
              </button>
            </div>
          </Card>
        </div>

        {/* Sag: Matrah Hesaplama - fixed width */}
        <div className="w-full lg:w-[300px] flex-shrink-0 self-start">
          {hasMatrahData && matrahVerileri ? (
            <MatrahHesaplama veriler={matrahVerileri} yil={yil} />
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-5 h-5 text-slate-400" />
                <p className="text-sm font-medium text-slate-600">Kurumlar Vergisi Matrah</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ticari Bilanço Kârı</span>
                  <span className="text-slate-300">₺---</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">+ KKEG Toplamı</span>
                  <span className="text-slate-300">₺---</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">- İstisna Kazançlar</span>
                  <span className="text-slate-300">₺---</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">- Geçmiş Yıl Zararları</span>
                  <span className="text-slate-300">₺---</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-200 font-medium">
                  <span className="text-slate-600">= Vergi Matrahı</span>
                  <span className="text-slate-300">₺---</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Hesaplanan Vergi (%25)</span>
                  <span className="text-slate-300">₺---</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">Mizan yüklendiğinde otomatik hesaplanır</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Info Modal */}
      <CategoryInfoModal
        category={selectedCategory}
        onClose={() => setSelectedCategory(null)}
      />
    </div>
  );
}

export default KurumlarVergisiPanel;
