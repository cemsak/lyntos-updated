'use client';

import { useState } from 'react';
import {
  FileText, Download, Eye, BarChart3, Shield,
  TrendingUp, AlertCircle, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RaporTipi {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  available: boolean;
  requiresData: boolean;
}

const RAPOR_TIPLERI: RaporTipi[] = [
  {
    id: 'mizan-analiz',
    name: 'Mizan Analiz Raporu',
    description: 'Dönem sonu mizan özeti ve anomali tespitleri',
    icon: BarChart3,
    color: 'blue',
    available: true,
    requiresData: true
  },
  {
    id: 'vdk-risk',
    name: 'VDK Risk Raporu',
    description: '13 kriter bazında risk değerlendirmesi',
    icon: Shield,
    color: 'purple',
    available: true,
    requiresData: true
  },
  {
    id: 'finansal-oran',
    name: 'Finansal Oran Analizi',
    description: 'Likidite, karlılık ve verimlilik oranları',
    icon: TrendingUp,
    color: 'green',
    available: true,
    requiresData: true
  },
  {
    id: 'enflasyon-duzeltme',
    name: 'Enflasyon Düzeltme Raporu',
    description: 'TMS 29 enflasyon muhasebesi hesaplamaları',
    icon: AlertCircle,
    color: 'orange',
    available: true,
    requiresData: true
  }
];

interface OlusturulanRapor {
  id: string;
  raporTipiId: string;
  name: string;
  createdAt: string;
  donem: string;
  mukellef: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [olusturulanRaporlar, setOlusturulanRaporlar] = useState<OlusturulanRapor[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Veri yüklenmiş mi kontrolü (localStorage'dan)
  const hasData = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('lyntos_uploaded_data') !== null ||
           (localStorage.getItem('lyntos_clients')?.length ?? 0) > 2;
  };

  const handleGoruntuile = (rapor: RaporTipi) => {
    if (rapor.requiresData && !hasData()) {
      alert('Bu raporu görüntülemek için önce veri yüklemeniz gerekiyor.\n\nVeri Yükleme sayfasına yönlendiriliyorsunuz.');
      router.push('/v2/upload');
      return;
    }

    // Rapor tipine göre ilgili sayfaya yönlendir
    switch (rapor.id) {
      case 'mizan-analiz':
        router.push('/v2/quarterly');
        break;
      case 'vdk-risk':
        router.push('/v2/vdk');
        break;
      case 'finansal-oran':
        router.push('/v2/quarterly?tab=oranlar');
        break;
      case 'enflasyon-duzeltme':
        router.push('/v2/enflasyon');
        break;
      default:
        alert('Rapor sayfası hazırlanıyor...');
    }
  };

  const handlePdfIndir = async (rapor: RaporTipi) => {
    if (rapor.requiresData && !hasData()) {
      alert('PDF oluşturmak için önce veri yüklemeniz gerekiyor.\n\nVeri Yükleme sayfasına yönlendiriliyorsunuz.');
      router.push('/v2/upload');
      return;
    }

    setIsGenerating(rapor.id);

    // Simüle edilmiş PDF oluşturma (gerçekte API çağrısı yapılacak)
    setTimeout(() => {
      // Yeni rapor oluştur
      const yeniRapor: OlusturulanRapor = {
        id: `rapor-${Date.now()}`,
        raporTipiId: rapor.id,
        name: rapor.name,
        createdAt: new Date().toISOString(),
        donem: '2025-Q1',
        mukellef: 'Seçili Mükellef'
      };

      setOlusturulanRaporlar(prev => [yeniRapor, ...prev]);
      setIsGenerating(null);

      alert(`${rapor.name} başarıyla oluşturuldu!\n\nNot: Gerçek PDF oluşturma için veri yüklemeniz gerekiyor.`);
    }, 1500);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string }> = {
      blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
      purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
      green: { bg: 'bg-green-100', icon: 'text-green-600' },
      orange: { bg: 'bg-orange-100', icon: 'text-orange-600' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <p className="text-gray-500">Analiz raporlarınızı görüntüleyin ve indirin</p>
      </div>

      {/* Rapor Tipleri Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {RAPOR_TIPLERI.map(rapor => {
          const Icon = rapor.icon;
          const colorClasses = getColorClasses(rapor.color);
          const isLoading = isGenerating === rapor.id;

          return (
            <div
              key={rapor.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${colorClasses.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{rapor.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{rapor.description}</p>

                  {/* Butonlar */}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => handleGoruntuile(rapor)}
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Görüntüle
                    </button>
                    <button
                      onClick={() => handlePdfIndir(rapor)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-700 font-medium disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      PDF İndir
                    </button>
                  </div>

                  {/* Veri gereksinimi uyarısı */}
                  {rapor.requiresData && (
                    <p className="text-xs text-gray-400 mt-2">
                      Veri yüklendikten sonra kullanılabilir
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Son Oluşturulan Raporlar */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Son Oluşturulan Raporlar</h2>
        </div>

        {olusturulanRaporlar.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Henüz oluşturulmuş rapor bulunmuyor.</p>
            <p className="text-sm text-gray-400 mt-1">Veri yükleyerek rapor oluşturma sürecini başlatın.</p>
            <button
              onClick={() => router.push('/v2/upload')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Veri Yükle
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {olusturulanRaporlar.map(rapor => (
              <div key={rapor.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{rapor.name}</p>
                    <p className="text-sm text-gray-500">
                      {rapor.mukellef} - {rapor.donem} - {new Date(rapor.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
