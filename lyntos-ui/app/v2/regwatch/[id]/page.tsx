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

// Mock data - in production, this would come from API
const MOCK_REGWATCH_DATA: Record<string, RegWatchItem> = {
  'REG-2024-001': {
    id: 'REG-2024-001',
    baslik: 'Enflasyon Düzeltmesi Uygulama Tebliği',
    ozet: 'VUK Mükerrer 298. madde kapsamında enflasyon düzeltmesi uygulamasına ilişkin usul ve esaslar',
    detay: `2024 yılı ve sonraki dönemler için enflasyon düzeltmesi uygulaması zorunlu hale getirilmiştir.

Tebliğ kapsamında:
- Parasal olmayan kalemlerin belirlenmesi
- Düzeltme katsayılarının hesaplanması
- Düzeltme farklarının muhasebeleştirilmesi
- Vergi matrahına etkileri

detaylı olarak açıklanmıştır.`,
    yayinTarihi: '2024-01-15',
    sonTarih: '2025-04-30',
    kaynak: 'Resmi Gazete',
    kaynakUrl: 'https://www.resmigazete.gov.tr',
    kategori: 'teblig',
    oncelik: 'kritik',
    etkilenenAlanlar: ['Muhasebe', 'Vergi', 'Mali Tablolar', 'Beyanname'],
    gerekliAksiyonlar: [
      {
        id: 'A1',
        baslik: 'Parasal/Parasal Olmayan Ayrımı',
        aciklama: 'Bilanço kalemlerinin parasal ve parasal olmayan olarak sınıflandırılması',
        tamamlandi: false,
      },
      {
        id: 'A2',
        baslik: 'Düzeltme Katsayıları Hesaplama',
        aciklama: 'Her kalem için edinme tarihi bazlı düzeltme katsayılarının belirlenmesi',
        tamamlandi: false,
      },
      {
        id: 'A3',
        baslik: 'Muhasebe Kayıtları',
        aciklama: 'Düzeltme farklarının 698 hesapta izlenmesi',
        tamamlandi: false,
      },
      {
        id: 'A4',
        baslik: 'Beyanname Hazırlığı',
        aciklama: 'Düzeltilmiş değerler üzerinden beyanname hazırlanması',
        tamamlandi: false,
      },
    ],
    ilgiliMaddeler: ['VUK Mük. 298', 'GVK 38', 'KVK 6'],
  },
  'REG-2024-002': {
    id: 'REG-2024-002',
    baslik: 'E-Fatura Zorunluluk Sınırı Değişikliği',
    ozet: '2025 yılı için e-fatura zorunluluk haddi güncellendi',
    detay: `1 Ocak 2025 tarihinden itibaren e-fatura uygulamasına dahil olma zorunluluğu için brüt satış hasılatı sınırı değiştirilmiştir.

Yeni sınırlar:
- Mal satışı yapanlar için: 2.000.000 TL
- Hizmet satışı yapanlar için: 1.000.000 TL

Bu sınırların aşılması halinde takip eden yılın başından itibaren e-fatura uygulamasına geçiş zorunludur.`,
    yayinTarihi: '2024-12-01',
    sonTarih: '2025-01-31',
    kaynak: 'GİB',
    kaynakUrl: 'https://www.gib.gov.tr',
    kategori: 'duyuru',
    oncelik: 'yuksek',
    etkilenenAlanlar: ['E-Belge', 'Faturalama', 'IT Sistemleri'],
    gerekliAksiyonlar: [
      {
        id: 'A1',
        baslik: 'Ciro Kontrolü',
        aciklama: '2024 yılı brüt satış hasılatının kontrol edilmesi',
        tamamlandi: false,
      },
      {
        id: 'A2',
        baslik: 'Sistem Entegrasyonu',
        aciklama: 'E-fatura entegratörü ile anlaşma yapılması',
        tamamlandi: false,
      },
    ],
    ilgiliMaddeler: ['VUK 232', 'E-Fatura Genel Tebliği'],
  },
};

export default function RegWatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const regId = params.id as string;

  const [item, setItem] = useState<RegWatchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [aksiyonlar, setAksiyonlar] = useState<RegWatchItem['gerekliAksiyonlar']>([]);

  useEffect(() => {
    // Simulate API fetch
    const fetchData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      const data = MOCK_REGWATCH_DATA[regId];
      if (data) {
        setItem(data);
        // Load saved state from localStorage
        const savedState = localStorage.getItem(`regwatch-${regId}`);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          setAksiyonlar(parsed.aksiyonlar || data.gerekliAksiyonlar);
        } else {
          setAksiyonlar(data.gerekliAksiyonlar);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [regId]);

  const toggleAksiyon = (aksiyonId: string) => {
    setAksiyonlar(prev => {
      const updated = prev.map(a =>
        a.id === aksiyonId ? { ...a, tamamlandi: !a.tamamlandi } : a
      );
      // Save to localStorage
      localStorage.setItem(`regwatch-${regId}`, JSON.stringify({ aksiyonlar: updated }));
      return updated;
    });
  };

  const getOncelikColor = (oncelik: string) => {
    switch (oncelik) {
      case 'kritik': return 'bg-red-100 text-red-700 border-red-200';
      case 'yuksek': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'orta': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h1 className="text-xl font-semibold text-slate-800">Düzenleme Bulunamadı</h1>
        <p className="text-slate-600">ID: {regId}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Geri Dön
        </button>
      </div>
    );
  }

  const tamamlananAksiyon = aksiyonlar.filter(a => a.tamamlandi).length;
  const tamamlanmaOrani = Math.round((tamamlananAksiyon / aksiyonlar.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-slate-500">{item.id}</span>
                <span className={`px-2 py-0.5 text-xs rounded border ${getOncelikColor(item.oncelik)}`}>
                  {item.oncelik.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                  {getKategoriLabel(item.kategori)}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-1">
                {item.baslik}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Özet
          </h2>
          <p className="text-slate-600">{item.ozet}</p>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Yayın Tarihi:</span>
              <span className="text-slate-700 font-medium">{item.yayinTarihi}</span>
            </div>
            {item.sonTarih && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Son Tarih:</span>
                <span className="text-red-600 font-medium">{item.sonTarih}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detail Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Detay
          </h2>
          <div className="text-slate-600 whitespace-pre-line">{item.detay}</div>

          <a
            href={item.kaynakUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            {item.kaynak}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Affected Areas */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Etkilenen Alanlar
          </h2>
          <div className="flex flex-wrap gap-2">
            {item.etkilenenAlanlar.map((alan, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
              >
                {alan}
              </span>
            ))}
          </div>
        </div>

        {/* Related Articles */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            İlgili Maddeler
          </h2>
          <div className="flex flex-wrap gap-2">
            {item.ilgiliMaddeler.map((madde, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm font-mono"
              >
                {madde}
              </span>
            ))}
          </div>
        </div>

        {/* Actions Checklist */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Gerekli Aksiyonlar
            </h2>
            <span className="text-sm text-slate-500">
              {tamamlananAksiyon} / {aksiyonlar.length} tamamlandı
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
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
                    ? 'bg-green-50 border-green-200'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => toggleAksiyon(aksiyon.id)}
              >
                <div className="flex items-start gap-3">
                  {aksiyon.tamamlandi ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className={`font-medium ${
                      aksiyon.tamamlandi ? 'text-green-800' : 'text-slate-800'
                    }`}>
                      {aksiyon.baslik}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      aksiyon.tamamlandi ? 'text-green-600' : 'text-slate-500'
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
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            ← Geri Dön
          </button>

          {tamamlanmaOrani === 100 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Tüm aksiyonlar tamamlandı</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
