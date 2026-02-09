import React from 'react';

const colorClasses: Record<string, string> = {
  blue: 'bg-[#E6F9FF] text-[#0049AA]',
  purple: 'bg-[#E6F9FF] text-[#0049AA]',
  green: 'bg-[#ECFDF5] text-[#00804D]',
  orange: 'bg-[#FFFBEB] text-[#FA841E]'
};

export function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[#E5E5E5]">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color] || colorClasses.blue} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-[#2E2E2E]">{value.toLocaleString('tr-TR')}</div>
      <div className="text-sm text-[#969696]">{label}</div>
    </div>
  );
}
