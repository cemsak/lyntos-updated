'use client';
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Lightbulb } from 'lucide-react';
import { Card } from '../../_components/shared/Card';
import { Badge } from '../../_components/shared/Badge';
import { FiveWhyWizard } from '../../_components/vdk/FiveWhyWizard';

// VDK Kriter bilgileri
const VDK_KRITERLER: Record<string, { baslik: string; aciklama: string; oneri: string; risk: string }> = {
  'K-09': {
    baslik: 'Yuksek Kasa Bakiyesi',
    aciklama: 'Kasa hesabi bakiyesi aktif toplaminin %5\'ini veya 500.000 TL\'yi asiyor.',
    oneri: 'Kasa sayimi yapilmali, fazla bakiye banka hesabina aktarilmali veya ortaklara borc olarak kaydedilmelidir.',
    risk: 'Yuksek',
  },
  'K-05': {
    baslik: 'Supheli Alacak Orani',
    aciklama: 'Supheli alacaklar ticari alacaklarin %20\'sini asiyor.',
    oneri: 'Supheli alacak karsiliklari gozden gecirilmeli, tahsilat takibi yapilmalidir.',
    risk: 'Orta',
  },
  'K-07': {
    baslik: 'E-Fatura Uyumsuzlugu',
    aciklama: 'E-fatura kayitlari ile muhasebe kayitlari arasinda tutarsizlik tespit edildi.',
    oneri: 'Karsi firma ile mutabakat yapilmali, eksik faturalar kaydedilmelidir.',
    risk: 'Orta',
  },
  'K-01': {
    baslik: 'Ortak Cari Hesap Bakiyesi',
    aciklama: 'Ortak cari hesap bakiyesi yuksek, transfer fiyatlandirmasi riski.',
    oneri: 'Ortak ile mutabakat yapilmali, faiz hesaplanmali.',
    risk: 'Yuksek',
  },
};

export default function VdkDetayPage() {
  const params = useParams();
  const router = useRouter();
  const kriterId = params.id as string;

  // 5 Why Wizard State
  const [fiveWhyOpen, setFiveWhyOpen] = useState(false);

  const kriter = VDK_KRITERLER[kriterId] || {
    baslik: `VDK Kriter ${kriterId}`,
    aciklama: 'Kriter detaylari yukleniyor...',
    oneri: 'Uzman gorusu aliniz.',
    risk: 'Bilinmiyor',
  };

  const riskVariant = kriter.risk === 'Yuksek' ? 'error' : kriter.risk === 'Orta' ? 'warning' : 'default';

  const handleFiveWhyComplete = (analysis: { kriterId: string; problem: string; whys: string[]; kokNeden: string; onerilenAksiyonlar: string[] }) => {
    console.log('5 Why Analysis completed:', analysis);
    // TODO: Save to backend/state
    setFiveWhyOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </button>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-mono rounded">
              {kriterId}
            </span>
            <h1 className="text-2xl font-bold text-slate-800">{kriter.baslik}</h1>
            <Badge variant={riskVariant}>{kriter.risk} Risk</Badge>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Risk Aciklamasi */}
          <Card>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Risk Aciklamasi</h3>
                <p className="text-slate-600">{kriter.aciklama}</p>
              </div>
            </div>
          </Card>

          {/* Oneri */}
          <Card>
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Onerilen Aksiyon</h3>
                <p className="text-slate-600">{kriter.oneri}</p>
              </div>
            </div>
          </Card>

          {/* 5 Why Butonu */}
          <Card>
            <h3 className="font-semibold text-slate-800 mb-4">Kok Neden Analizi</h3>
            <p className="text-slate-500 mb-4">
              5 Why metoduyla bu riskin kok nedenini analiz edin.
            </p>
            <button
              onClick={() => setFiveWhyOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              5 Why Analizi Baslat
            </button>
          </Card>

          {/* 5 Why Wizard */}
          <FiveWhyWizard
            isOpen={fiveWhyOpen}
            onClose={() => setFiveWhyOpen(false)}
            kriterId={kriterId}
            kriterBaslik={kriter.baslik}
            problemAciklama={kriter.aciklama}
            onComplete={handleFiveWhyComplete}
          />

          {/* Geri Don */}
          <div className="flex justify-end">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Dashboard'a Don
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
