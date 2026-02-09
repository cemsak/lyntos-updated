'use client';

import React from 'react';
import {
  Shield, FileSearch, Calculator, TrendingUp,
  FileText, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAccessItem {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  badge?: string | number;
}

interface QuickAccessWidgetProps {
  onNavigate?: (panel: string) => void;
  className?: string;
}

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  { id: 'vdk', label: 'VDK Analiz', icon: Shield, color: 'bg-[#E6F9FF] text-[#0049AA]' },
  { id: 'kurgan', label: 'KURGAN Radar', icon: FileSearch, color: 'bg-[#FFFBEB] text-[#FA841E]', badge: 'Yeni' },
  { id: 'mizan', label: 'Mizan Analizi', icon: Calculator, color: 'bg-[#E6F9FF] text-[#0049AA]' },
  { id: 'oranlar', label: 'Oran Analizi', icon: TrendingUp, color: 'bg-[#ECFDF5] text-[#00804D]' },
  { id: 'rapor', label: 'PDF Rapor', icon: FileText, color: 'bg-[#F5F6F8] text-[#5A5A5A]' },
  { id: 'export', label: 'Disa Aktar', icon: Download, color: 'bg-[#F5F6F8] text-[#5A5A5A]' },
];

export const QuickAccessWidget: React.FC<QuickAccessWidgetProps> = ({
  onNavigate,
  className,
}) => {
  return (
    <div className={cn('bg-white rounded-xl border border-[#E5E5E5] p-6', className)}>
      <h3 className="font-semibold text-[#2E2E2E] mb-4">Hizli Erisim</h3>

      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACCESS_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[#E5E5E5] hover:border-[#B4B4B4] hover:shadow-sm transition-all"
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', item.color)}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-[#5A5A5A]">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 bg-[#FFFBEB] text-[#FA841E] rounded-full text-xs font-medium">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickAccessWidget;
