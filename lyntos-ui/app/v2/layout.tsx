import { Suspense } from 'react';
import { V2LayoutClient } from './_components/layout/V2LayoutClient';

export const metadata = {
  title: 'LYNTOS Dashboard v2',
  description: 'Mali Analiz ve Risk Degerlendirme Platformu',
};

function LoadingShell() {
  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-8 w-8 border-3 border-[#B4B4B4] border-t-[#0049AA] rounded-full" />
        <p className="text-sm text-[#5A5A5A]">Yukleniyor...</p>
      </div>
    </div>
  );
}

// Login sayfası DashboardShell dışında render edilir
// V2LayoutClient client component olarak pathname kontrolü yapar
export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingShell />}>
      <V2LayoutClient>
        {children}
      </V2LayoutClient>
    </Suspense>
  );
}
