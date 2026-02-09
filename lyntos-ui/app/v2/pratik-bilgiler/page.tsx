'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calculator,
  Percent,
  Scale,
  Shield,
  Clock,
  AlertCircle,
  Calendar,
  ClipboardCheck,
  ArrowRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useDeadlines } from './_hooks/useTaxParams';

const CATEGORIES = [
  {
    id: 'hesaplamalar',
    label: 'Hesaplamalar',
    description: 'GV, bordro, kıdem/ihbar, gecikme faizi, damga vergisi, amortisman',
    icon: Calculator,
    color: 'bg-[#0049AA]',
    href: '/v2/pratik-bilgiler/hesaplamalar',
    badge: '6 araç',
  },
  {
    id: 'oranlar',
    label: 'Vergi Oranları',
    description: 'GV dilimleri, KV, KDV, stopaj, damga vergisi oranları',
    icon: Percent,
    color: 'bg-[#00A651]',
    href: '/v2/pratik-bilgiler/oranlar',
  },
  {
    id: 'hadler',
    label: 'Hadler ve Tutarlar',
    description: 'Asgari ücret detayı, yasal hadler, gündelikler',
    icon: Scale,
    color: 'bg-[#0078D0]',
    href: '/v2/pratik-bilgiler/hadler',
  },
  {
    id: 'sgk',
    label: 'SGK Bilgileri',
    description: 'Prim oranları, taban/tavan, ihbar ve izin süreleri',
    icon: Shield,
    color: 'bg-[#0078D0]',
    href: '/v2/pratik-bilgiler/sgk',
  },
  {
    id: 'gecikme',
    label: 'Gecikme Faizi',
    description: 'Güncel oranlar, basit hesaplama, tarihçe',
    icon: Clock,
    color: 'bg-[#FFB114]',
    href: '/v2/pratik-bilgiler/gecikme',
  },
  {
    id: 'cezalar',
    label: 'VUK Cezaları',
    description: 'Vergi ziyaı, usulsüzlük ve özel usulsüzlük cezaları',
    icon: AlertCircle,
    color: 'bg-[#F0282D]',
    href: '/v2/pratik-bilgiler/cezalar',
  },
  {
    id: 'beyan-tarihleri',
    label: 'Beyan Tarihleri',
    description: 'Aylık ve yıllık beyanname takvimi',
    icon: Calendar,
    color: 'bg-[#0078D0]',
    href: '/v2/pratik-bilgiler/beyan-tarihleri',
  },
  {
    id: 'kontrol-listeleri',
    label: 'Kontrol Listeleri',
    description: 'Dönem sonu, KDV, muhtasar ve bordro kontrol listeleri',
    icon: ClipboardCheck,
    color: 'bg-[#5A5A5A]',
    href: '/v2/pratik-bilgiler/kontrol-listeleri',
  },
];

function getUrgencyColor(daysRemaining: number) {
  if (daysRemaining <= 7) return { bg: 'bg-[#FEF2F2]', border: 'border-[#FFC7C9]', text: 'text-[#BF192B]', label: 'text-[#980F30]' };
  if (daysRemaining <= 14) return { bg: 'bg-[#FFFBEB]', border: 'border-[#FFF08C]', text: 'text-[#FA841E]', label: 'text-[#E67324]' };
  return { bg: 'bg-[#ECFDF5]', border: 'border-[#AAE8B8]', text: 'text-[#00804D]', label: 'text-[#005A46]' };
}

export default function PratikBilgilerPage() {
  const { data: upcomingDeadlines, isLoading: deadlinesLoading, error: deadlinesError } = useDeadlines({ upcoming: true, limit: 5 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0049AA] to-[#0078D0] rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Pratik Bilgiler</h1>
        <p className="text-[#ABEBFF] mt-1">
          2026 yılı güncel vergi, SGK ve mali mevzuat verileri
        </p>
      </div>

      {/* Yaklaşan Beyan Tarihleri Strip */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#FA841E]" />
            Yaklaşan Beyan Tarihleri
          </h2>
          <Link
            href="/v2/pratik-bilgiler/beyan-tarihleri"
            className="text-sm text-[#0049AA] hover:underline flex items-center gap-1"
          >
            Tüm takvim <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {deadlinesLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-[#0049AA] animate-spin" />
          </div>
        ) : deadlinesError ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#969696]">
            <AlertCircle className="w-4 h-4" />
            <span>Beyan tarihleri yüklenemedi</span>
          </div>
        ) : upcomingDeadlines.length === 0 ? (
          <p className="text-sm text-[#969696] text-center py-4">Yaklaşan beyan tarihi bulunamadı</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {upcomingDeadlines.map((d) => {
              const urgency = getUrgencyColor(d.days_remaining);
              const deadlineDate = new Date(d.deadline_date);
              return (
                <div
                  key={d.id}
                  className={`${urgency.bg} ${urgency.border} border rounded-lg p-3 min-w-[180px] flex-shrink-0`}
                >
                  <p className={`text-xs font-medium ${urgency.label} mb-1`}>
                    {d.days_remaining <= 0 ? 'BUGÜN' : `${d.days_remaining} gün kaldı`}
                  </p>
                  <p className="text-sm font-semibold text-[#2E2E2E] leading-tight">
                    {d.title}
                  </p>
                  <p className={`text-xs ${urgency.text} mt-1`}>
                    {deadlineDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.id}
              href={category.href}
              className="group bg-white rounded-xl border border-[#E5E5E5] p-5 hover:shadow-lg hover:border-[#B4B4B4] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#2E2E2E] group-hover:text-[#0049AA] transition-colors text-sm">
                    {category.label}
                  </h3>
                  {category.badge && (
                    <span className="text-[10px] font-medium bg-[#ECFDF5] text-[#00804D] px-1.5 py-0.5 rounded">
                      {category.badge}
                    </span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-[#969696] group-hover:text-[#0049AA] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
              <p className="text-xs text-[#969696] leading-relaxed">
                {category.description}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-[#969696] text-center p-4">
        Veriler güncel mevzuata göre düzenli güncellenir. İlerlemeniz otomatik saklanır.
        Bu bilgiler genel bilgilendirme amaçlıdır. Mevzuat değişiklikleri takip edilmeli,
        güncel mevzuat kaynakları kontrol edilmelidir.
      </div>
    </div>
  );
}
