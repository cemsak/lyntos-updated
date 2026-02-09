/**
 * Dashboard V3 Layout
 *
 * NOT: DashboardShell KULLANILMAMALI!
 * Çünkü üst layout (/v2/layout.tsx) zaten DashboardShell içeriyor.
 * Next.js'de layout'lar iç içe geçer ve çift sidebar oluşur.
 *
 * Bu layout sadece Dashboard V3'e özel provider'lar ekler.
 */

import { Suspense } from 'react';

function LoadingIndicator() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-8 w-8 border-3 border-[#B4B4B4] border-t-[#0049AA] rounded-full" />
        <p className="text-sm text-[#5A5A5A]">Dashboard V3 Yükleniyor...</p>
      </div>
    </div>
  );
}

export default function DashboardV3Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // DashboardShell üst layout'ta (/v2/layout.tsx) zaten mevcut
  // Burada sadece children'ı geçiriyoruz
  return (
    <Suspense fallback={<LoadingIndicator />}>
      {children}
    </Suspense>
  );
}
