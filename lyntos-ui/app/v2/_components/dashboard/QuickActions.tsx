'use client';

/**
 * Quick Actions Panel - Dashboard V3
 * Pencere 13.2 - Hızlı Erişim Butonları
 *
 * En sık kullanılan işlemlere tek tıkla erişim
 */

import Link from 'next/link';
import {
  Upload,
  FileText,
  Shield,
  Calculator,
  MessageSquare,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: 'blue' | 'emerald' | 'purple' | 'amber' | 'indigo' | 'rose';
  badge?: string;
}

const defaultActions: QuickAction[] = [
  {
    id: 'upload',
    label: 'Veri Yükle',
    description: 'Mizan, beyanname, e-defter',
    href: '/v2/upload',
    icon: Upload,
    color: 'blue',
  },
  {
    id: 'beyanname',
    label: 'Beyanname Hazırla',
    description: 'KDV, Muhtasar, Geçici',
    href: '/v2/beyanname/kdv',
    icon: FileText,
    color: 'emerald',
  },
  {
    id: 'vdk-oracle',
    label: 'VDK Risk Analizi',
    description: 'VDK Oracle + KURGAN',
    href: '/v2/vdk',
    icon: Shield,
    color: 'purple',
    badge: 'PRO',
  },
  {
    id: 'vergus',
    label: 'Vergus AI',
    description: 'Vergi stratejisti',
    href: '/v2/vergus',
    icon: Sparkles,
    color: 'amber',
    badge: 'AI',
  },
  {
    id: 'reports',
    label: 'Rapor Oluştur',
    description: 'Kanıt paketi, analiz',
    href: '/v2/reports',
    icon: FileSpreadsheet,
    color: 'indigo',
  },
  {
    id: 'regwatch',
    label: 'Mevzuat Takibi',
    description: 'Son değişiklikler',
    href: '/v2/regwatch',
    icon: MessageSquare,
    color: 'rose',
  },
];

const colorClasses = {
  blue: {
    bg: 'bg-[#E6F9FF] hover:bg-[#E6F9FF]',
    border: 'border-[#ABEBFF] hover:border-[#5ED6FF]',
    icon: 'bg-[#0078D0] text-white',
    text: 'text-[#0049AA]',
    badge: 'bg-[#0078D0] text-white',
  },
  emerald: {
    bg: 'bg-[#ECFDF5] hover:bg-[#ECFDF5]',
    border: 'border-[#AAE8B8] hover:border-[#6BDB83]',
    icon: 'bg-[#00A651] text-white',
    text: 'text-[#00804D]',
    badge: 'bg-[#00A651] text-white',
  },
  purple: {
    bg: 'bg-[#E6F9FF] hover:bg-[#E6F9FF]',
    border: 'border-[#ABEBFF] hover:border-[#5ED6FF]',
    icon: 'bg-[#0078D0] text-white',
    text: 'text-[#0049AA]',
    badge: 'bg-[#0078D0] text-white',
  },
  amber: {
    bg: 'bg-[#FFFBEB] hover:bg-[#FFFBEB]',
    border: 'border-[#FFF08C] hover:border-[#FFE045]',
    icon: 'bg-[#FFB114] text-white',
    text: 'text-[#FA841E]',
    badge: 'bg-[#FFB114] text-white',
  },
  indigo: {
    bg: 'bg-[#E6F9FF] hover:bg-[#E6F9FF]',
    border: 'border-[#ABEBFF] hover:border-[#5ED6FF]',
    icon: 'bg-[#0078D0] text-white',
    text: 'text-[#0049AA]',
    badge: 'bg-[#0078D0] text-white',
  },
  rose: {
    bg: 'bg-[#FEF2F2] hover:bg-[#FEF2F2]',
    border: 'border-[#FFC7C9] hover:border-[#FF9196]',
    icon: 'bg-[#F0282D] text-white',
    text: 'text-[#BF192B]',
    badge: 'bg-[#F0282D] text-white',
  },
};

interface QuickActionsProps {
  actions?: QuickAction[];
  columns?: 2 | 3 | 6;
}

export function QuickActions({ actions = defaultActions, columns = 6 }: QuickActionsProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-3`}>
      {actions.map((action) => {
        const colors = colorClasses[action.color];
        const Icon = action.icon;

        return (
          <Link
            key={action.id}
            href={action.href}
            className={`group relative ${colors.bg} ${colors.border} border rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5`}
          >
            {action.badge && (
              <span className={`absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold rounded-full ${colors.badge}`}>
                {action.badge}
              </span>
            )}
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg ${colors.icon} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${colors.text} text-sm flex items-center gap-1`}>
                  {action.label}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </p>
                <p className="text-xs text-[#969696] mt-0.5 truncate">{action.description}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default QuickActions;
