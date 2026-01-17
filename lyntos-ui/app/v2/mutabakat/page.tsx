'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, ArrowLeftRight, FileCheck, Upload, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MutabakatTipi {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  sources: string[];
}

const MUTABAKAT_TIPLERI: MutabakatTipi[] = [
  {
    id: 'mizan-kdv',
    name: 'Mizan - KDV Beyanname',
    description: 'Mizan KDV hesapları ile KDV beyannamesi tutarlarını karşılaştırır',
    icon: FileCheck,
    sources: ['Mizan', 'KDV Beyanname XML']
  },
  {
    id: 'mizan-muhtasar',
    name: 'Mizan - Muhtasar',
    description: 'Stopaj hesapları ile muhtasar beyanname tutarlarını karşılaştırır',
    icon: FileCheck,
    sources: ['Mizan', 'Muhtasar Beyanname']
  },
  {
    id: 'mizan-banka',
    name: 'Mizan - Banka Ekstresi',
    description: 'Banka hesapları ile ekstre bakiyelerini karşılaştırır',
    icon: ArrowLeftRight,
    sources: ['Mizan', 'Banka Ekstresi']
  },
  {
    id: 'cari-mutabakat',
    name: 'Cari Hesap Mutabakatı',
    description: 'Alıcı ve satıcı hesapları için cari mutabakat kontrolü',
    icon: RefreshCw,
    sources: ['Mizan', 'Cari Hesap Ekstreleri']
  }
];

export default function MutabakatPage() {
  const router = useRouter();
  const [hasData, setHasData] = useState(false);

  // Veri kontrolü
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const uploaded = localStorage.getItem('lyntos_uploaded_data');
      setHasData(!!uploaded);
    }
  }, []);

  const handleMutabakatBaslat = (tip: MutabakatTipi) => {
    if (!hasData) {
      alert('Mutabakat kontrolü için önce veri yüklemeniz gerekiyor.');
      router.push('/v2/upload');
      return;
    }

    // İlgili mutabakat sayfasına yönlendir
    router.push(`/v2/mutabakat/${tip.id}`);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mutabakat Kontrolü</h1>
        <p className="text-gray-500">Kaynak ve beyanname mutabakat işlemleri</p>
      </div>

      {/* Bilgi Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Otomatik Mutabakat</p>
            <p className="text-sm text-blue-700">
              Mizan, beyanname ve banka ekstreleri arasında otomatik mutabakat kontrolü yapın.
              Tutarsızlıklar anında tespit edilir.
            </p>
          </div>
        </div>
      </div>

      {/* Mutabakat Tipleri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {MUTABAKAT_TIPLERI.map(tip => {
          const Icon = tip.icon;

          return (
            <button
              key={tip.id}
              onClick={() => handleMutabakatBaslat(tip)}
              className="bg-white border border-gray-200 rounded-lg p-5 text-left hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{tip.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{tip.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {tip.sources.map((source, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Veri Yükleme Çağrısı */}
      {!hasData && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Veri Yükleme Gerekli</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            Mutabakat kontrolü yapabilmek için önce mizan ve ilgili belgeleri yüklemeniz gerekiyor.
          </p>
          <button
            onClick={() => router.push('/v2/upload')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Veri Yükle
          </button>
        </div>
      )}
    </div>
  );
}
