'use client';

import React from 'react';
import {
  Landmark,
  Calculator,
  FileText,
  Download,
  AlertCircle,
  Circle,
  TrendingUp,
  MinusCircle,
  PlusCircle,
  Percent,
} from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  trend?: { value: string; direction: 'up' | 'down' };
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

function KpiCard({ label, value, trend, status = 'neutral' }: KpiCardProps) {
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
      {trend && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${
          trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
        }`}>
          <TrendingUp className={`w-3 h-3 ${trend.direction === 'down' ? 'rotate-180' : ''}`} />
          {trend.value}
        </p>
      )}
    </div>
  );
}

interface CalculationRowProps {
  label: string;
  value: string;
  type?: 'add' | 'subtract' | 'result';
  highlight?: boolean;
}

function CalculationRow({ label, value, type, highlight }: CalculationRowProps) {
  return (
    <div className={`flex items-center justify-between py-2 ${
      highlight ? 'bg-blue-50 -mx-2 px-2 rounded' : 'border-b border-slate-100'
    }`}>
      <div className="flex items-center gap-2">
        {type === 'add' && <PlusCircle className="w-4 h-4 text-emerald-500" />}
        {type === 'subtract' && <MinusCircle className="w-4 h-4 text-red-500" />}
        <span className={`text-sm ${highlight ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
          {label}
        </span>
      </div>
      <span className={`font-medium ${highlight ? 'text-blue-600 text-lg' : 'text-slate-300'}`}>
        {value}
      </span>
    </div>
  );
}

export default function KurumlarVergisiPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-7 h-7 text-blue-600" />
            Kurumlar Vergisi
          </h1>
          <p className="text-slate-600 mt-1">
            2025 mali yili kurumlar vergisi hesaplamasi ve beyannamesi
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
        <KpiCard label="Vergi Matrahı" value="₺---" status="neutral" />
        <KpiCard label="Hesaplanan KV" value="₺---" status="neutral" />
        <KpiCard label="Mahsup Edilecek" value="₺---" status="neutral" />
        <KpiCard label="Ödenecek KV" value="₺---" status="neutral" />
      </div>

      {/* Main Calculation Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Kurumlar Vergisi Hesaplaması
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left - Matrah Calculation */}
          <div>
            <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Matrah Hesabı
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <CalculationRow label="Ticari Bilanço Karı" value="₺---" />
              <CalculationRow label="KKEG" value="₺---" type="add" />
              <CalculationRow label="İştirak Kazançları İstisnası" value="₺---" type="subtract" />
              <CalculationRow label="Ar-Ge İndirimi" value="₺---" type="subtract" />
              <CalculationRow label="Diğer İndirimler" value="₺---" type="subtract" />
              <CalculationRow label="Geçmiş Yıl Zararları" value="₺---" type="subtract" />
              <div className="pt-2 mt-2 border-t border-slate-200">
                <CalculationRow label="Kurumlar Vergisi Matrahı" value="₺---" highlight />
              </div>
            </div>
          </div>

          {/* Right - Tax Calculation */}
          <div>
            <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Vergi Hesabı
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <CalculationRow label="Matrah" value="₺---" />
              <CalculationRow label="Kurumlar Vergisi (%25)" value="₺---" />
              <div className="py-2 border-t border-slate-200 mt-2">
                <CalculationRow label="Hesaplanan Kurumlar Vergisi" value="₺---" />
              </div>
              <CalculationRow label="Geçici Vergi Mahsubu" value="₺---" type="subtract" />
              <CalculationRow label="Tevkifat Mahsubu" value="₺---" type="subtract" />
              <div className="pt-2 mt-2 border-t border-slate-200">
                <CalculationRow label="Ödenecek Kurumlar Vergisi" value="₺---" highlight />
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

      {/* Important Dates */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Önemli Tarihler</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">30 Nisan</p>
            <p className="text-sm text-slate-500 mt-1">Beyanname Son Tarihi</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">30 Nisan</p>
            <p className="text-sm text-slate-500 mt-1">1. Taksit Ödeme</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">31 Temmuz</p>
            <p className="text-sm text-slate-500 mt-1">2. Taksit Ödeme</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Veri Yukleme Gerekli</h4>
            <p className="text-sm text-blue-700 mt-1">
              Kurumlar vergisi hesaplamasi icin donem sonu mizan ve beyanname verilerinizi yukleyin.
              Yukleme sonrasi hesaplama otomatik olarak yapilacaktir.
            </p>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Kontrol Listesi</h2>
        <div className="space-y-2">
          {[
            'Dönem sonu mizan yüklendi',
            'Enflasyon düzeltmesi yapıldı',
            'KKEG kalemleri belirlendi',
            'İstisna ve indirimler kontrol edildi',
            'Geçmiş yıl zararları mahsup edildi',
            'Kurumlar vergisi hesaplandı',
            'Geçici vergi mahsubu yapıldı',
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
