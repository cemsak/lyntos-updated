'use client';

/**
 * V2 Layout Client Wrapper
 * Login sayfasını DashboardShell'den ayırmak için pathname kontrolü yapar
 */

import { usePathname } from 'next/navigation';
import { SourcesProvider } from '../sources/SourcesProvider';
import { DashboardShell } from './DashboardShell';
import type { ReactNode } from 'react';

interface V2LayoutClientProps {
  children: ReactNode;
}

export function V2LayoutClient({ children }: V2LayoutClientProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/v2/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <SourcesProvider>
      <DashboardShell>
        {children}
      </DashboardShell>
    </SourcesProvider>
  );
}
