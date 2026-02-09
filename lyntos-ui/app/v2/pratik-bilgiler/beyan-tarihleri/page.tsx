'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Info, CheckCircle2, CalendarDays, Loader2, AlertCircle } from 'lucide-react';
import { useDeadlines } from '../_hooks/useTaxParams';
import { formatDate as formatDateCentral } from '../../_lib/format';

// Dinamik yıl hesaplama
const CURRENT_YEAR = new Date().getFullYear();

export default function BeyanTarihleriPage() {
  const { data: upcomingDeadlines, isLoading: upcomingLoading, error: upcomingError } = useDeadlines({ upcoming: true, limit: 5 });
  const { data: allDeadlines, isLoading: allLoading, error: allError } = useDeadlines({ upcoming: false });

  const isLoading = upcomingLoading || allLoading;
  const hasError = upcomingError || allError;

  const formatDate = (dateStr: string) => formatDateCentral(dateStr, { day: 'numeric', month: 'long', year: 'numeric' });

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'bg-[#FEF2F2] text-[#BF192B] border-[#FFC7C9]';
    if (days <= 7) return 'bg-[#FEF2F2] text-[#BF192B] border-[#FFC7C9]';
    if (days <= 14) return 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]';
    return 'bg-[#ECFDF5] text-[#00804D] border-[#AAE8B8]';
  };

  // Aylık beyanları ay bazında grupla
  const monthlyGroups = useMemo(() => {
    const groups = new Map<string, typeof allDeadlines>();
    for (const d of allDeadlines) {
      const date = new Date(d.deadline_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(d);
    }
    // İlk 3 ay göster
    const entries = Array.from(groups.entries()).slice(0, 3);
    return entries.map(([key, items]) => ({
      key,
      label: items[0] ? new Date(items[0].deadline_date).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) : key,
      items,
    }));
  }, [allDeadlines]);

  // Yıllık ve dönemsel beyanlar (ANNUAL frequency)
  const yillikBeyanlar = useMemo(() =>
    allDeadlines.filter(d => d.frequency === 'ANNUAL'),
    [allDeadlines]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/v2/pratik-bilgiler"
          className="flex items-center gap-2 px-3 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Beyan Tarihleri</h1>
          <p className="text-[#5A5A5A]">{CURRENT_YEAR} yılı beyanname ve bildirim takvimi</p>
        </div>
      </div>

      {/* Güncellik Bildirimi */}
      <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#00804D] mt-0.5" />
        <div>
          <p className="font-medium text-[#005A46]">{CURRENT_YEAR} Yılı Beyan Takvimi</p>
          <p className="text-sm text-[#00804D]">Güncel mevzuata göre düzenli güncellenmektedir.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#0049AA] animate-spin" />
        </div>
      ) : hasError ? (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 text-center">
          <AlertCircle className="w-8 h-8 text-[#969696] mx-auto mb-3" />
          <p className="text-[#5A5A5A] font-medium">Beyan tarihleri yüklenemedi</p>
          <p className="text-sm text-[#969696] mt-1">Lütfen backend servisinin çalıştığından emin olun.</p>
        </div>
      ) : (
        <>
          {/* Yaklaşan Beyanlar */}
          <div className="bg-white rounded-xl border border-[#ABEBFF] overflow-hidden">
            <div className="p-4 bg-[#E6F9FF] border-b border-[#ABEBFF]">
              <h2 className="font-semibold text-[#00287F] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#0049AA]" />
                Yaklaşan Beyanlar
              </h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {upcomingDeadlines.map((d) => {
                  const days = d.days_remaining;
                  return (
                    <div
                      key={d.id}
                      className={`p-4 rounded-lg border ${getUrgencyColor(days)} flex items-center justify-between`}
                    >
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-sm opacity-75">{d.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatDate(d.deadline_date)}</p>
                        <p className="text-sm">
                          {days < 0 ? (
                            <span className="text-[#BF192B] font-medium">Süresi geçti!</span>
                          ) : days === 0 ? (
                            <span className="text-[#BF192B] font-medium">Bugün!</span>
                          ) : days === 1 ? (
                            <span className="text-[#BF192B]">Yarın</span>
                          ) : (
                            <span>{days} gün kaldı</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {upcomingDeadlines.length === 0 && (
                  <p className="text-center text-[#969696] py-4">Yaklaşan beyanname bulunmamaktadır.</p>
                )}
              </div>
            </div>
          </div>

          {/* Aylık Beyanlar */}
          {monthlyGroups
            .filter(g => g.items.some(d => d.frequency === 'MONTHLY'))
            .map(group => (
              <div key={group.key} className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
                <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
                  <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#0049AA]" />
                    {group.label} Beyanları
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F5F6F8]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Beyanname</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Açıklama</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">Son Tarih</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">Kalan Gün</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {group.items
                        .filter(d => d.frequency === 'MONTHLY')
                        .map((d) => (
                          <tr key={d.id} className="hover:bg-[#F5F6F8]">
                            <td className="px-4 py-3 text-sm font-medium text-[#2E2E2E]">{d.title}</td>
                            <td className="px-4 py-3 text-sm text-[#5A5A5A]">{d.description}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-1 bg-[#E6F9FF] text-[#0049AA] rounded-lg text-sm font-medium">
                                {formatDate(d.deadline_date)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {d.days_remaining < 0 ? (
                                <span className="text-[#BF192B] font-medium">Geçti</span>
                              ) : (
                                <span className="text-[#5A5A5A]">{d.days_remaining} gün</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

          {/* Yıllık Beyanlar */}
          {yillikBeyanlar.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
              <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
                <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-[#0049AA]" />
                  Yıllık ve Dönemsel Beyanlar ({CURRENT_YEAR})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F5F6F8]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Beyanname</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#969696] uppercase">Açıklama</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">Son Tarih</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-[#969696] uppercase">Kalan Gün</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {yillikBeyanlar.map((d) => (
                      <tr key={d.id} className="hover:bg-[#F5F6F8]">
                        <td className="px-4 py-3 text-sm font-medium text-[#2E2E2E]">{d.title}</td>
                        <td className="px-4 py-3 text-sm text-[#5A5A5A]">{d.description}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-[#E6F9FF] text-[#0049AA] rounded-lg text-sm font-medium">
                            {formatDate(d.deadline_date)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {d.days_remaining < 0 ? (
                            <span className="text-[#BF192B] font-medium">Geçti</span>
                          ) : (
                            <span className="text-[#5A5A5A]">{d.days_remaining} gün</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Önemli Hatırlatma */}
      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#0078D0] mt-0.5" />
        <div>
          <p className="font-medium text-[#00287F]">Önemli Hatırlatma</p>
          <p className="text-sm text-[#0049AA]">
            Son günün hafta sonuna veya resmi tatile denk gelmesi halinde
            beyanname süresi takip eden iş gününe uzar.
            Kesin tarihler için GİB takvimini kontrol ediniz.
          </p>
        </div>
      </div>
    </div>
  );
}
