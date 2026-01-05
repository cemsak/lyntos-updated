'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QuarterlyCockpit from '../_components/QuarterlyCockpit';

function QuarterlyCockpitContent() {
  const searchParams = useSearchParams();
  const smmm = searchParams.get('smmm') || 'HKOZKAN';
  const client = searchParams.get('client') || 'OZKAN_KIRTASIYE';
  const period = searchParams.get('period') || '2025-Q2';

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
