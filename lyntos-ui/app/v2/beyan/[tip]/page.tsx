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
    <div className="min-h-screen bg-[#F5F6F8] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#2E2E2E]">{bilgi.baslik}</h1>
            <p className="text-[#5A5A5A]">{bilgi.aciklama}</p>
          </div>
        </div>

        {/* Content */}
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-16 h-16 text-[#B4B4B4] mb-4" />
            <h2 className="text-xl font-semibold text-[#5A5A5A] mb-2">
              Beyan Hazirlama Modulu
            </h2>
            <p className="text-[#969696] mb-6 max-w-md">
              Bu modul Sprint 6'da aktif olacaktir.
              Su an icin GIB portal uzerinden beyan verebilirsiniz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8] transition-colors"
              >
                Dashboard'a Don
              </button>
              <button
                onClick={() => window.open('https://ebeyanname.gib.gov.tr', '_blank')}
                className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors"
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
