'use client';
import React from 'react';
import { StickyHeader } from './StickyHeader';
import { FooterMeta } from './FooterMeta';
import { ToastProvider } from '../shared/Toast';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-lyntos-bg-primary text-lyntos-text-primary flex flex-col">
        <StickyHeader />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
          {children}
        </main>
        <FooterMeta />
      </div>
    </ToastProvider>
  );
}
