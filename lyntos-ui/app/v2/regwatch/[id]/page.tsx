'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Target,
  Users,
  Bell
} from 'lucide-react';
import { getAuthToken } from '../../_lib/auth';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';

interface RegWatchItem {
  id: string;
  baslik: string;
  ozet: string;
  detay: string;
  yayinTarihi: string;
  sonTarih: string | null;
  kaynak: string;
  kaynakUrl: string;
  kategori: 'teblig' | 'kanun' | 'genelge' | 'sirkuler' | 'duyuru';
  oncelik: 'kritik' | 'yuksek' | 'orta' | 'dusuk';
  etkilenenAlanlar: string[];
  gerekliAksiyonlar: {
    id: string;
    baslik: string;
    aciklama: string;
    tamamlandi: boolean;
  }[];
  ilgiliMaddeler: string[];
}

// API response type
interface ApiRegWatchEvent {
  id: number | string;
  title: string;
  summary?: string;
  detail?: string;
  published_date?: string;
  deadline?: string;
  source?: string;
  source_url?: string;
  event_type?: string;
  priority?: string;
  affected_areas?: string[];
  required_actions?: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
  }>;
  related_articles?: string[];
}

// Map API response to internal type
function mapApiEventToItem(event: ApiRegWatchEvent): RegWatchItem {
  return {
    id: String(event.id),
    baslik: event.title,
    ozet: event.summary || 'Detay icin inceleyin',
    detay: event.detail || event.summary || '',
    yayinTarihi: event.published_date || new Date().toISOString().split('T')[0],
    sonTarih: event.deadline || null,
    kaynak: event.source || 'Belirlenmedi',
    kaynakUrl: event.source_url || 'https://www.resmigazete.gov.tr',
    kategori: (event.event_type as RegWatchItem['kategori']) || 'duyuru',
    oncelik: (event.priority as RegWatchItem['oncelik']) || 'orta',
    etkilenenAlanlar: event.affected_areas || ['Genel'],
    gerekliAksiyonlar: event.required_actions?.map(a => ({
      id: a.id,
      baslik: a.title,
      aciklama: a.description,
      tamamlandi: a.completed,
    })) || [],
    ilgiliMaddeler: event.related_articles || [],
  };
}

export default function RegWatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const regId = params.id as string;
  const { scope } = useDashboardScope();

  // Scope-aware localStorage key
  const storageKey = scope.client_id
    ? `regwatch_${scope.client_id}_${regId}`
    : `regwatch-${regId}`;

  const [item, setItem] = useState<RegWatchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [aksiyonlar, setAksiyonlar] = useState<RegWatchItem['gerekliAksiyonlar']>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          console.error('[RegWatch] No auth token found');
          setItem(null);
          setLoading(false);
          return;
        }

        // Try to fetch from API
        const response = await fetch(`${API_ENDPOINTS.regwatch.changes}?id=${regId}`, {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const apiData = await response.json();
          // Handle both single item and array response
          const eventData = Array.isArray(apiData.data)
            ? apiData.data.find((e: ApiRegWatchEvent) => String(e.id) === regId)
            : apiData.data;

          if (eventData) {
            const data = mapApiEventToItem(eventData);
            setItem(data);

            // Load saved state from localStorage (scope-aware)
            const savedState = localStorage.getItem(storageKey);
            if (savedState) {
              try {
                const parsed = JSON.parse(savedState);
                setAksiyonlar(parsed.aksiyonlar || data.gerekliAksiyonlar);
              } catch {
                setAksiyonlar(data.gerekliAksiyonlar);
              }
            } else {
              setAksiyonlar(data.gerekliAksiyonlar);
            }
          } else {
            // Event not found in API
            setItem(null);
          }
        } else {
          // API failed - show not found
          console.error('[RegWatch] API fetch failed:', response.status);
          setItem(null);
        }
      } catch (err) {
        console.error('[RegWatch] Fetch error:', err);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [regId]);

  const toggleAksiyon = (aksiyonId: string) => {
    setAksiyonlar(prev => {
      const updated = prev.map(a =>
        a.id === aksiyonId ? { ...a, tamamlandi: !a.tamamlandi } : a
      );
      // Save to localStorage (scope-aware)
      localStorage.setItem(storageKey, JSON.stringify({ aksiyonlar: updated }));
      return updated;
    });
  };

  const getOncelikColor = (oncelik: string) => {
    switch (oncelik) {
      case 'kritik': return 'bg-[#FEF2F2] text-[#BF192B] border-[#FFC7C9]';
      case 'yuksek': return 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]';
      case 'orta': return 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]';
      default: return 'bg-[#ECFDF5] text-[#00804D] border-[#AAE8B8]';
    }
  };

  const getKategoriLabel = (kategori: string) => {
    const labels: Record<string, string> = {
      teblig: 'Tebliğ',
      kanun: 'Kanun',
      genelge: 'Genelge',
      sirkuler: 'Sirküler',
      duyuru: 'Duyuru',
    };
    return labels[kategori] || kategori;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0049AA]" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-[#FFB114]" />
        <h1 className="text-xl font-semibold text-[#2E2E2E]">Düzenleme Bulunamadı</h1>
        <p className="text-[#5A5A5A]">ID: {regId}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA]"
        >
          Geri Dön
        </button>
      </div>
    );
  }

  const tamamlananAksiyon = aksiyonlar.filter(a => a.tamamlandi).length;
  const tamamlanmaOrani = Math.round((tamamlananAksiyon / aksiyonlar.length) * 100);

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[#F5F6F8] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#5A5A5A]" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-[#969696]">{item.id}</span>
                <span className={`px-2 py-0.5 text-xs rounded border ${getOncelikColor(item.oncelik)}`}>
                  {item.oncelik.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 text-xs bg-[#F5F6F8] text-[#5A5A5A] rounded">
                  {getKategoriLabel(item.kategori)}
                </span>
              </div>
              <h1 className="text-lg font-bold text-[#2E2E2E] mt-1">
                {item.baslik}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Card */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
          <h2 className="font-semibold text-[#2E2E2E] mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0049AA]" />
            Özet
          </h2>
          <p className="text-[#5A5A5A]">{item.ozet}</p>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#E5E5E5]">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-[#969696]" />
              <span className="text-[#969696]">Yayın Tarihi:</span>
              <span className="text-[#5A5A5A] font-medium">{item.yayinTarihi}</span>
            </div>
            {item.sonTarih && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-[#969696]" />
                <span className="text-[#969696]">Son Tarih:</span>
                <span className="text-[#BF192B] font-medium">{item.sonTarih}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detail Card */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
          <h2 className="font-semibold text-[#2E2E2E] mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0049AA]" />
            Detay
          </h2>
          <div className="text-[#5A5A5A] whitespace-pre-line">{item.detay}</div>

          <a
            href={item.kaynakUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-4 text-sm text-[#0049AA] hover:text-[#0049AA]"
          >
            {item.kaynak}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Affected Areas */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
          <h2 className="font-semibold text-[#2E2E2E] mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#0049AA]" />
            Etkilenen Alanlar
          </h2>
          <div className="flex flex-wrap gap-2">
            {item.etkilenenAlanlar.map((alan, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-[#F5F6F8] text-[#5A5A5A] rounded-full text-sm"
              >
                {alan}
              </span>
            ))}
          </div>
        </div>

        {/* Related Articles */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
          <h2 className="font-semibold text-[#2E2E2E] mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0049AA]" />
            İlgili Maddeler
          </h2>
          <div className="flex flex-wrap gap-2">
            {item.ilgiliMaddeler.map((madde, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-[#E6F9FF] text-[#0049AA] rounded text-sm font-mono"
              >
                {madde}
              </span>
            ))}
          </div>
        </div>

        {/* Actions Checklist */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#0049AA]" />
              Gerekli Aksiyonlar
            </h2>
            <span className="text-sm text-[#969696]">
              {tamamlananAksiyon} / {aksiyonlar.length} tamamlandı
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-2 bg-[#F5F6F8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00A651] rounded-full transition-all duration-300"
                style={{ width: `${tamamlanmaOrani}%` }}
              />
            </div>
          </div>

          {/* Actions List */}
          <div className="space-y-3">
            {aksiyonlar.map((aksiyon) => (
              <div
                key={aksiyon.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  aksiyon.tamamlandi
                    ? 'bg-[#ECFDF5] border-[#AAE8B8]'
                    : 'bg-[#F5F6F8] border-[#E5E5E5] hover:border-[#B4B4B4]'
                }`}
                onClick={() => toggleAksiyon(aksiyon.id)}
              >
                <div className="flex items-start gap-3">
                  {aksiyon.tamamlandi ? (
                    <CheckCircle2 className="w-5 h-5 text-[#00804D] flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#969696] flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className={`font-medium ${
                      aksiyon.tamamlandi ? 'text-[#005A46]' : 'text-[#2E2E2E]'
                    }`}>
                      {aksiyon.baslik}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      aksiyon.tamamlandi ? 'text-[#00804D]' : 'text-[#969696]'
                    }`}>
                      {aksiyon.aciklama}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E]"
          >
            ← Geri Dön
          </button>

          {tamamlanmaOrani === 100 && (
            <div className="flex items-center gap-2 text-[#00804D]">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Tüm aksiyonlar tamamlandı</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
