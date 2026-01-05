import { Suspense } from 'react';
import { ScopeProvider } from './_components/scope/ScopeProvider';
import { SourcesProvider } from './_components/sources/SourcesProvider';
import { DashboardShell } from './_components/layout/DashboardShell';

export const metadata = {
  title: 'LYNTOS Dashboard v2',
  description: 'Mali Analiz ve Risk Degerlendirme Platformu',
};

function LoadingShell() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin h-8 w-8 border-3 border-slate-300 border-t-blue-600 rounded-full" />
        <p className="text-sm text-slate-600">Yukleniyor...</p>
      </div>
    </div>
  );
}

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingShell />}>
      <ScopeProvider>
        <SourcesProvider>
          <DashboardShell>
            {children}
          </DashboardShell>
        </SourcesProvider>
      </ScopeProvider>
    </Suspense>
  );
}
