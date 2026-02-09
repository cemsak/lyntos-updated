'use client';

import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Calculator,
  Download,
  AlertCircle,
  CheckCircle2,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { GeciciVergiPanel } from '../../_components/vergi-analiz';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { useToast } from '../../_components/shared/Toast';
import { formatNumber } from '../../_lib/format';

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

function KpiCard({ label, value, subtext, status = 'neutral' }: KpiCardProps) {
  const statusColors = {
    success: 'text-[#00804D]',
    warning: 'text-[#FA841E]',
    error: 'text-[#BF192B]',
    neutral: 'text-[#969696]',
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
      <p className="text-xs text-[#969696] uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${statusColors[status]}`}>{value}</p>
      {subtext && <p className="text-xs text-[#969696] mt-1">{subtext}</p>}
    </div>
  );
}

interface QuarterCardProps {
  quarter: string;
  period: string;
  dueDate: string;
  status: 'completed' | 'current' | 'upcoming';
  amount?: number;
  onSelect?: () => void;
  isSelected?: boolean;
}

function QuarterCard({ quarter, period, dueDate, status, amount, onSelect, isSelected }: QuarterCardProps) {
  const statusStyles = {
    completed: 'bg-[#ECFDF5] border-[#AAE8B8]',
    current: 'bg-[#E6F9FF] border-[#ABEBFF]',
    upcoming: 'bg-[#F5F6F8] border-[#E5E5E5]',
  };

  const statusBadge = {
    completed: { text: 'Tamamlandı', color: 'bg-[#ECFDF5] text-[#00804D]' },
    current: { text: 'Aktif Dönem', color: 'bg-[#E6F9FF] text-[#0049AA]' },
    upcoming: { text: 'Yaklaşan', color: 'bg-[#F5F6F8] text-[#5A5A5A]' },
  };

  return (
    <div
      onClick={onSelect}
      className={`border rounded-lg p-4 cursor-pointer transition-all ${statusStyles[status]} ${
        isSelected ? 'ring-2 ring-[#0078D0]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#2E2E2E]">{quarter}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${statusBadge[status].color}`}>
          {statusBadge[status].text}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#969696]">Dönem</span>
          <span className="text-[#5A5A5A]">{period}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#969696]">Son Beyan</span>
          <span className="text-[#5A5A5A]">{dueDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#969696]">Hesaplanan</span>
          <span className={amount !== undefined ? 'text-[#2E2E2E] font-medium' : 'text-[#B4B4B4]'}>
            {amount !== undefined ? `₺${formatNumber(amount)}` : '₺---'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function GeciciVergiPage() {
  const { selectedPeriod } = useDashboardScope();
  const { showToast } = useToast();
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [donemKari, setDonemKari] = useState<string>('');
  const [kkeg, setKkeg] = useState<string>('');
  const [istisnalar, setIstisnalar] = useState<string>('');
  const [oncekiDonemler, setOncekiDonemler] = useState<string>('0');
  const [isCalculated, setIsCalculated] = useState(false);

  // Dönem string oluştur
  const donemString = selectedPeriod
    ? `${selectedPeriod.year}-Q${selectedPeriod.periodNumber}`
    : undefined;

  // 12 Kritik Kontrol click handler - basit alert ile bilgilendirme
  const handleKontrolClick = (kontrolId: string) => {
    // Geçici olarak alert ile bilgilendirme
    // Gelecekte: Kurumlar vergisi sayfasındaki gibi modal açılabilir
    showToast('info', `${kontrolId} kontrolü seçildi. Detaylı bilgi için Kurumlar Vergisi sayfasına bakınız.`);
  };

  // Hesaplama
  const hesaplama = useMemo(() => {
    const kar = parseFloat(donemKari.replace(/\./g, '').replace(',', '.')) || 0;
    const kkegVal = parseFloat(kkeg.replace(/\./g, '').replace(',', '.')) || 0;
    const istisnaVal = parseFloat(istisnalar.replace(/\./g, '').replace(',', '.')) || 0;
    const oncekiVal = parseFloat(oncekiDonemler.replace(/\./g, '').replace(',', '.')) || 0;

    const matrah = kar + kkegVal - istisnaVal;
    const geciciVergi = matrah > 0 ? matrah * 0.25 : 0;
    const odenecek = geciciVergi - oncekiVal;

    return {
      matrah,
      geciciVergi,
      odenecek: odenecek > 0 ? odenecek : 0,
    };
  }, [donemKari, kkeg, istisnalar, oncekiDonemler]);

  const handleHesapla = () => {
    if (!donemKari) {
      showToast('warning', 'Lütfen dönem karı girin.');
      return;
    }
    setIsCalculated(true);
  };

  const handleTemizle = () => {
    setDonemKari('');
    setKkeg('');
    setIstisnalar('');
    setOncekiDonemler('0');
    setIsCalculated(false);
  };

  const quarterData = [
    { quarter: '1. Çeyrek', period: 'Ocak - Mart', dueDate: '17 Mayıs 2026', status: 'current' as const },
    { quarter: '2. Çeyrek', period: 'Nisan - Haziran', dueDate: '17 Ağustos 2026', status: 'upcoming' as const },
    { quarter: '3. Çeyrek', period: 'Temmuz - Eylül', dueDate: '17 Kasım 2026', status: 'upcoming' as const },
    { quarter: '4. Çeyrek', period: 'Ekim - Aralık', dueDate: 'Yıllık KV ile', status: 'upcoming' as const },
  ];

  const checklistItems = [
    { text: 'Dönem mizan verisi yüklendi', done: !!donemKari },
    { text: 'Gelir/gider hesapları kontrol edildi', done: !!donemKari },
    { text: 'KKEG kalemleri belirlendi', done: !!kkeg || isCalculated },
    { text: 'İstisna ve indirimler uygulandı', done: !!istisnalar || isCalculated },
    { text: 'Geçici vergi hesaplandı', done: isCalculated },
    { text: 'Beyanname hazırlandı', done: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E] flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-[#0049AA]" />
            Geçici Vergi Hesaplama
          </h1>
          <p className="text-[#5A5A5A] mt-1">
            2026 yılı geçici vergi dönemlerini hesaplayın
          </p>
        </div>
        <button
          disabled={!isCalculated}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isCalculated
              ? 'bg-[#0049AA] text-white hover:bg-[#0049AA]'
              : 'bg-[#F5F6F8] text-[#969696] cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          Rapor İndir
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Vergi Matrahı"
          value={isCalculated ? `₺${formatNumber(hesaplama.matrah)}` : '₺---'}
          status={isCalculated && hesaplama.matrah > 0 ? 'success' : 'neutral'}
        />
        <KpiCard
          label="Geçici Vergi (%25)"
          value={isCalculated ? `₺${formatNumber(hesaplama.geciciVergi)}` : '₺---'}
          status={isCalculated ? 'warning' : 'neutral'}
        />
        <KpiCard
          label="Ödenecek"
          value={isCalculated ? `₺${formatNumber(hesaplama.odenecek)}` : '₺---'}
          status={isCalculated && hesaplama.odenecek > 0 ? 'error' : 'neutral'}
        />
        <KpiCard
          label="Aktif Dönem"
          value={`${selectedQuarter}. Çeyrek`}
          subtext={quarterData[selectedQuarter - 1].period}
          status="warning"
        />
      </div>

      {/* Quarter Cards */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#2E2E2E] mb-4">Dönemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quarterData.map((q, idx) => (
            <QuarterCard
              key={idx}
              {...q}
              amount={isCalculated && selectedQuarter === idx + 1 ? hesaplama.odenecek : undefined}
              isSelected={selectedQuarter === idx + 1}
              onSelect={() => setSelectedQuarter(idx + 1)}
            />
          ))}
        </div>
      </div>

      {/* Calculation Controls */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">
            {selectedQuarter}. Çeyrek Hesaplama
          </h2>
          <button
            onClick={handleTemizle}
            className="flex items-center gap-1 text-sm text-[#5A5A5A] hover:text-[#2E2E2E]"
          >
            <RefreshCw className="w-4 h-4" />
            Temizle
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left - Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                Dönem Karı (TL) *
              </label>
              <input
                type="text"
                value={donemKari}
                onChange={(e) => setDonemKari(e.target.value)}
                placeholder="Örn: 500000"
                className="w-full px-3 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
              />
              <p className="text-xs text-[#969696] mt-1">Ticari bilanço karı/zararı</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                KKEG - Kanunen Kabul Edilmeyen Gider (TL)
              </label>
              <input
                type="text"
                value={kkeg}
                onChange={(e) => setKkeg(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
              />
              <p className="text-xs text-[#969696] mt-1">Matrah artırıcı - vergiye tabi değil</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                İstisnalar (TL)
              </label>
              <input
                type="text"
                value={istisnalar}
                onChange={(e) => setIstisnalar(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
              />
              <p className="text-xs text-[#969696] mt-1">İştirak kazançları, Ar-Ge indirimi vb.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A5A5A] mb-1">
                Önceki Dönem Geçici Vergi (TL)
              </label>
              <input
                type="text"
                value={oncekiDonemler}
                onChange={(e) => setOncekiDonemler(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
              />
              <p className="text-xs text-[#969696] mt-1">Yıl içinde ödenen geçici vergi</p>
            </div>
          </div>

          {/* Right - Result */}
          <div className="bg-[#F5F6F8] rounded-lg p-4">
            <h3 className="font-medium text-[#5A5A5A] mb-3">Hesaplama Sonucu</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
                <span className="text-[#5A5A5A]">Dönem Karı</span>
                <span className={`font-medium ${donemKari ? 'text-[#2E2E2E]' : 'text-[#B4B4B4]'}`}>
                  ₺{donemKari ? formatNumber(parseFloat(donemKari.replace(/\./g, '').replace(',', '.')) || 0) : '---'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
                <span className="text-[#5A5A5A]">(+) KKEG</span>
                <span className={`font-medium ${kkeg ? 'text-[#00804D]' : 'text-[#B4B4B4]'}`}>
                  ₺{kkeg ? formatNumber(parseFloat(kkeg.replace(/\./g, '').replace(',', '.')) || 0) : '---'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
                <span className="text-[#5A5A5A]">(-) İstisnalar</span>
                <span className={`font-medium ${istisnalar ? 'text-[#BF192B]' : 'text-[#B4B4B4]'}`}>
                  ₺{istisnalar ? formatNumber(parseFloat(istisnalar.replace(/\./g, '').replace(',', '.')) || 0) : '---'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#E5E5E5] bg-[#E6F9FF] -mx-2 px-2 rounded">
                <span className="text-[#00287F] font-medium">Vergi Matrahı</span>
                <span className={`font-bold ${isCalculated ? 'text-[#0049AA]' : 'text-[#B4B4B4]'}`}>
                  ₺{isCalculated ? formatNumber(hesaplama.matrah) : '---'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
                <span className="text-[#5A5A5A]">Geçici Vergi (%25)</span>
                <span className={`font-medium ${isCalculated ? 'text-[#2E2E2E]' : 'text-[#B4B4B4]'}`}>
                  ₺{isCalculated ? formatNumber(hesaplama.geciciVergi) : '---'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
                <span className="text-[#5A5A5A]">(-) Önceki Dönemler</span>
                <span className={`font-medium ${oncekiDonemler !== '0' ? 'text-[#BF192B]' : 'text-[#B4B4B4]'}`}>
                  ₺{formatNumber(parseFloat(oncekiDonemler.replace(/\./g, '').replace(',', '.')) || 0)}
                </span>
              </div>
              <div className="flex justify-between py-3 bg-[#ECFDF5] -mx-2 px-2 rounded">
                <span className="text-[#005A46] font-semibold">Ödenecek Geçici Vergi</span>
                <span className={`font-bold text-lg ${isCalculated ? 'text-[#00804D]' : 'text-[#B4B4B4]'}`}>
                  ₺{isCalculated ? formatNumber(hesaplama.odenecek) : '---'}
                </span>
              </div>
            </div>
            <button
              onClick={handleHesapla}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Hesapla
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#FA841E] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-[#E67324]">Önemli Hatırlatma</h4>
            <p className="text-sm text-[#FA841E] mt-1">
              Geçici vergi beyannamesi, her çeyrek dönem sonundan itibaren 14. günü akşamına kadar verilmelidir.
              Hesaplanan vergi, beyanname verme süresinin son günü akşamına kadar ödenmelidir.
            </p>
          </div>
        </div>
      </div>

      {/* 12 Kritik Kontrol Panel */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#E6F9FF] to-white">
          <h2 className="text-lg font-semibold text-[#2E2E2E] flex items-center gap-2">
            <span>📊</span> 12 Kritik Kontrol
          </h2>
          <p className="text-sm text-[#969696] mt-1">Risk, Avantaj ve Zorunlu kontroller</p>
        </div>
        <div className="p-4">
          <GeciciVergiPanel donem={donemString} onKontrolClick={handleKontrolClick} />
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#2E2E2E] mb-4">Kontrol Listesi</h2>
        <div className="space-y-2">
          {checklistItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded hover:bg-[#F5F6F8]">
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
              ) : (
                <Circle className="w-4 h-4 text-[#B4B4B4]" />
              )}
              <span className={`text-sm ${item.done ? 'text-[#00804D]' : 'text-[#5A5A5A]'}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
