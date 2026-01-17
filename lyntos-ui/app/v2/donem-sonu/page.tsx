'use client';

import React from 'react';
import {
  ClipboardCheck,
  FileSpreadsheet,
  Calculator,
  FileText,
  Download,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface WizardStep {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Mizan Kontrolü',
    description: 'Dönem sonu mizan verilerinin doğruluğunu kontrol edin',
    status: 'pending',
    icon: <FileSpreadsheet className="w-5 h-5" />,
  },
  {
    id: 2,
    title: 'Enflasyon Düzeltmesi',
    description: 'Parasal olmayan kalemlerin enflasyon düzeltmesi',
    status: 'pending',
    icon: <Calculator className="w-5 h-5" />,
  },
  {
    id: 3,
    title: 'Vergi Hesaplaması',
    description: 'Kurumlar vergisi ve geçici vergi hesaplaması',
    status: 'pending',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 4,
    title: 'Raporlama',
    description: 'Dönem sonu raporlarını oluşturun ve indirin',
    status: 'pending',
    icon: <Download className="w-5 h-5" />,
  },
];

interface KpiCardProps {
  label: string;
  value: string;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

function KpiCard({ label, value, status = 'neutral' }: KpiCardProps) {
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
    </div>
  );
}

export default function DonemSonuPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-blue-600" />
            Dönem Sonu İşlemleri
          </h1>
          <p className="text-slate-600 mt-1">
            2025 mali yili donem sonu islemlerini adim adim tamamlayin
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
        <KpiCard label="Tamamlanan Adım" value="0/4" status="neutral" />
        <KpiCard label="Mizan Durumu" value="---" status="neutral" />
        <KpiCard label="Enflasyon Farkı" value="₺---" status="neutral" />
        <KpiCard label="Tahmini KV" value="₺---" status="neutral" />
      </div>

      {/* Wizard Steps */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">İşlem Adımları</h2>
        <div className="space-y-4">
          {WIZARD_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`
                flex items-start gap-4 p-4 rounded-lg border transition-colors
                ${step.status === 'current'
                  ? 'bg-blue-50 border-blue-200'
                  : step.status === 'completed'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }
              `}
            >
              {/* Step Number/Status */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${step.status === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : step.status === 'current'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }
              `}>
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-bold">{step.id}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`
                    ${step.status === 'completed' ? 'text-emerald-700' : 'text-slate-700'}
                  `}>
                    {step.icon}
                  </span>
                  <h3 className={`font-semibold ${
                    step.status === 'completed' ? 'text-emerald-800' : 'text-slate-800'
                  }`}>
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-500 mt-1">{step.description}</p>
              </div>

              {/* Action Button */}
              <button
                disabled
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${step.status === 'current'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                {step.status === 'completed' ? 'Görüntüle' : 'Başla'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Veri Yukleme Gerekli</h4>
            <p className="text-sm text-blue-700 mt-1">
              Donem sonu islemlerini baslatmak icin mizan verilerinizi yukleyin.
              Is akisi adimlari veri yukleme sonrasi aktif hale gelecektir.
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
            'Mizan denge kontrolü yapıldı',
            'Enflasyon düzeltmesi hesaplandı',
            'Vergi matrahı belirlendi',
            'Kurumlar vergisi hesaplandı',
            'Raporlar oluşturuldu',
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
