'use client';

import React from 'react';
import {
  CalendarClock,
  Calculator,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Circle,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

function KpiCard({ label, value, subtext, status = 'neutral' }: KpiCardProps) {
  const statusColors = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
    neutral: 'text-slate-400',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${statusColors[status]}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
}

interface QuarterCardProps {
  quarter: string;
  period: string;
  dueDate: string;
  status: 'completed' | 'current' | 'upcoming';
  amount?: string;
}

function QuarterCard({ quarter, period, dueDate, status, amount }: QuarterCardProps) {
  const statusStyles = {
    completed: 'bg-emerald-50 border-emerald-200',
    current: 'bg-blue-50 border-blue-200',
    upcoming: 'bg-slate-50 border-slate-200',
  };

  const statusBadge = {
    completed: { text: 'Tamamlandı', color: 'bg-emerald-100 text-emerald-700' },
    current: { text: 'Aktif Dönem', color: 'bg-blue-100 text-blue-700' },
    upcoming: { text: 'Yaklaşan', color: 'bg-slate-100 text-slate-600' },
  };

  return (
    <div className={`border rounded-lg p-4 ${statusStyles[status]}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">{quarter}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${statusBadge[status].color}`}>
          {statusBadge[status].text}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Dönem</span>
          <span className="text-slate-700">{period}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Son Beyan</span>
          <span className="text-slate-700">{dueDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Hesaplanan</span>
          <span className={amount ? 'text-slate-900 font-medium' : 'text-slate-300'}>
            {amount || '₺---'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function GeciciVergiPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-blue-600" />
            Geçici Vergi
          </h1>
          <p className="text-slate-600 mt-1">
            2024 yılı geçici vergi dönemlerini takip edin ve hesaplayın
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Rapor İndir
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Toplam Geçici Vergi" value="₺---" status="neutral" />
        <KpiCard label="Ödenen" value="₺---" status="neutral" />
        <KpiCard label="Kalan" value="₺---" status="neutral" />
        <KpiCard label="Aktif Dönem" value="4. Çeyrek" subtext="Ekim-Aralık 2024" status="warning" />
      </div>

      {/* Quarter Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Dönemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuarterCard
            quarter="1. Çeyrek"
            period="Ocak - Mart"
            dueDate="17 Mayıs 2024"
            status="completed"
          />
          <QuarterCard
            quarter="2. Çeyrek"
            period="Nisan - Haziran"
            dueDate="17 Ağustos 2024"
            status="completed"
          />
          <QuarterCard
            quarter="3. Çeyrek"
            period="Temmuz - Eylül"
            dueDate="17 Kasım 2024"
            status="completed"
          />
          <QuarterCard
            quarter="4. Çeyrek"
            period="Ekim - Aralık"
            dueDate="17 Şubat 2025"
            status="current"
          />
        </div>
      </div>

      {/* Calculation Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Hesaplama</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left - Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Dönem Karı
              </label>
              <input
                type="text"
                disabled
                placeholder="₺---"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                KKEG (Kanunen Kabul Edilmeyen Gider)
              </label>
              <input
                type="text"
                disabled
                placeholder="₺---"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                İstisnalar
              </label>
              <input
                type="text"
                disabled
                placeholder="₺---"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-400"
              />
            </div>
          </div>

          {/* Right - Result */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-medium text-slate-700 mb-3">Hesaplama Sonucu</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Vergi Matrahı</span>
                <span className="text-slate-300 font-medium">₺---</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Geçici Vergi (%25)</span>
                <span className="text-slate-300 font-medium">₺---</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Önceki Dönemler</span>
                <span className="text-slate-300 font-medium">₺---</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-800 font-semibold">Ödenecek Geçici Vergi</span>
                <span className="text-slate-300 font-bold text-lg">₺---</span>
              </div>
            </div>
            <button
              disabled
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 text-slate-400 rounded-lg cursor-not-allowed"
            >
              <Calculator className="w-4 h-4" />
              Hesapla
            </button>
          </div>
        </div>
      </div>

      {/* Backend Contract Placeholder */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Backend Entegrasyonu Bekleniyor</h4>
            <p className="text-sm text-amber-700 mt-1">
              Geçici vergi hesaplaması backend contract&apos;ı tamamlandığında aktif olacaktır.
              Mizan verileri yüklendiğinde otomatik hesaplama yapılabilecektir.
            </p>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Kontrol Listesi</h2>
        <div className="space-y-2">
          {[
            'Dönem mizan verisi yüklendi',
            'Gelir/gider hesapları kontrol edildi',
            'KKEG kalemleri belirlendi',
            'İstisna ve indirimler uygulandı',
            'Geçici vergi hesaplandı',
            'Beyanname hazırlandı',
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
              <Circle className="w-4 h-4 text-slate-300" />
              <span className="text-sm text-slate-600">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
