'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QuarterlyCockpit from '../_components/QuarterlyCockpit';

function QuarterlyCockpitContent() {
  const searchParams = useSearchParams();
  const smmm = searchParams.get('smmm') || '';
  const client = searchParams.get('client') || '';
  const period = searchParams.get('period') || '';

  // Parametreler zorunlu
  if (!smmm || !client || !period) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200 text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Parametre Eksik</h2>
        <p className="text-slate-600 mb-4">
          Lutfen URL parametrelerini belirtin: ?smmm=XXX&amp;client=YYY&amp;period=2025-Q1
        </p>
        <a href="/v2" className="text-blue-600 hover:underline">V2 Dashboard&apos;a Git</a>
      </div>
    );
  }

  return (
    <QuarterlyCockpit
      smmmId={smmm}
      clientId={client}
      periodId={period}
    />
  );
}

export default function QuarterlyCockpitPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Yükleniyor...</div>}>
      <QuarterlyCockpitContent />
    </Suspense>
  );
}
