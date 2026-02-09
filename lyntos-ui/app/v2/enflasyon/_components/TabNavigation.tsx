'use client';

import React from 'react';
import { Layers, Building2, BarChart3, BookOpen } from 'lucide-react';
import type { EnflasyonTab } from '../_types';

interface TabNavigationProps {
  activeTab: EnflasyonTab;
  onTabChange: (tab: EnflasyonTab) => void;
}

const TABS: { id: EnflasyonTab; label: string; icon: React.ReactNode }[] = [
  { id: 'genel', label: 'Genel Bakış', icon: <Layers className="w-4 h-4" /> },
  { id: 'siniflandirma', label: 'Hesap Sınıflandırma', icon: <Building2 className="w-4 h-4" /> },
  { id: 'endeksler', label: 'Yİ-ÜFE Endeksleri', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'bilgi', label: 'Mevzuat Bilgisi', icon: <BookOpen className="w-4 h-4" /> },
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex gap-2 p-1 bg-[#F5F6F8] rounded-2xl">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold
            transition-all duration-300
            ${activeTab === tab.id
              ? 'bg-white text-[#2E2E2E] shadow-lg'
              : 'text-[#969696] hover:text-[#5A5A5A] hover:bg-white/50'}
          `}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
