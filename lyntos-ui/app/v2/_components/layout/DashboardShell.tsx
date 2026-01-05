'use client';
import React from 'react';
import { StickyHeader } from './StickyHeader';
import { FooterMeta } from './FooterMeta';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <StickyHeader />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>
      <FooterMeta />
    </div>
  );
}
