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
  { id: 'vdk', label: 'VDK Analiz', icon: Shield, color: 'bg-violet-100 text-violet-600' },
  { id: 'kurgan', label: 'KURGAN Radar', icon: FileSearch, color: 'bg-orange-100 text-orange-600', badge: 'Yeni' },
  { id: 'mizan', label: 'Mizan Analizi', icon: Calculator, color: 'bg-blue-100 text-blue-600' },
  { id: 'oranlar', label: 'Oran Analizi', icon: TrendingUp, color: 'bg-green-100 text-green-600' },
  { id: 'rapor', label: 'PDF Rapor', icon: FileText, color: 'bg-slate-100 text-slate-600' },
  { id: 'export', label: 'Disa Aktar', icon: Download, color: 'bg-slate-100 text-slate-600' },
];

export const QuickAccessWidget: React.FC<QuickAccessWidgetProps> = ({
  onNavigate,
  className,
}) => {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 p-6', className)}>
      <h3 className="font-semibold text-slate-800 mb-4">Hizli Erisim</h3>

      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACCESS_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', item.color)}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-700">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-medium">
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
