'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Card } from '../../_components/shared/Card';
import { Badge } from '../../_components/shared/Badge';

const BEYAN_BILGILERI: Record<string, { baslik: string; aciklama: string }> = {
  kdv: { baslik: 'KDV Beyannamesi', aciklama: '1 No.lu KDV Beyannamesi hazirlama' },
  muhtasar: { baslik: 'Muhtasar ve PHB', aciklama: 'Muhtasar ve Prim Hizmet Beyannamesi' },
  kurumlar: { baslik: 'Kurumlar Vergisi', aciklama: 'Yillik Kurumlar Vergisi Beyannamesi' },
  gecici: { baslik: 'Gecici Vergi', aciklama: 'Gecici Vergi Beyannamesi' },
};

export default function BeyanPage() {
  const params = useParams();
  const router = useRouter();
  const tip = params.tip as string;

  const bilgi = BEYAN_BILGILERI[tip] || { baslik: tip.toUpperCase(), aciklama: 'Beyan hazirlama' };

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
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{bilgi.baslik}</h1>
            <p className="text-slate-600">{bilgi.aciklama}</p>
          </div>
        </div>

        {/* Content */}
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              Beyan Hazirlama Modulu
            </h2>
            <p className="text-slate-500 mb-6 max-w-md">
              Bu modul Sprint 6'da aktif olacaktir.
              Su an icin GIB portal uzerinden beyan verebilirsiniz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Dashboard'a Don
              </button>
              <button
                onClick={() => window.open('https://ebeyanname.gib.gov.tr', '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                GIB Portal'a Git
              </button>
            </div>
          </div>
        </Card>

        {/* Sprint Info */}
        <div className="mt-4 text-center">
          <Badge variant="info">Sprint 6'da aktif olacak</Badge>
        </div>
      </div>
    </div>
  );
}
