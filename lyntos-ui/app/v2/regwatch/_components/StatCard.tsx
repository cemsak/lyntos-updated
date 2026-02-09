import React from 'react';
import type { FileText } from 'lucide-react';

const colorClasses: Record<string, string> = {
  blue: 'bg-[#E6F9FF] text-[#0049AA] dark:bg-[#0049AA]/30 dark:text-[#5ED6FF]',
  green: 'bg-[#ECFDF5] text-[#00804D] dark:bg-[#00A651]/30 dark:text-[#AAE8B8]',
  purple: 'bg-[#E6F9FF] text-[#0049AA] dark:bg-[#0049AA]/30 dark:text-[#ABEBFF]',
  orange: 'bg-[#FFFBEB] text-[#E67324] dark:bg-[#FFB114]/30 dark:text-[#FFE045]',
  red: 'bg-[#FEF2F2] text-[#BF192B] dark:bg-[#F0282D]/30 dark:text-[#FFC7C9]'
};

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
  onClick,
  active = false
}: {
  label: string;
  value: number | string;
  icon: typeof FileText;
  color?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''
      } ${
        active
          ? 'bg-[#0049AA] border-[#0049AA] ring-2 ring-[#0049AA]/30'
          : 'bg-white dark:bg-[#2E2E2E] border-[#E5E5E5] dark:border-[#5A5A5A]'
      }`}
    >
      <div className={`p-2.5 rounded-lg ${active ? 'bg-white/20 text-white' : colorClasses[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className={`text-2xl font-bold ${active ? 'text-white' : 'text-[#2E2E2E] dark:text-white'}`}>
          {value}
        </div>
        <div className={`text-sm ${active ? 'text-white/80' : 'text-[#969696] dark:text-[#969696]'}`}>
          {label}
        </div>
      </div>
    </div>
  );
}
