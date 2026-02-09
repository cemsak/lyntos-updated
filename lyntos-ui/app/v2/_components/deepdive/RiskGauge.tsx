'use client';
import React from 'react';
import { getRiskSeviyeConfig } from './crosscheck-helpers';
import type { RiskSeviye } from './crosscheck-types';

export function RiskGauge({ score, level }: { score: number; level: RiskSeviye }) {
  const config = getRiskSeviyeConfig(level);
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-12 overflow-hidden">
        <div className="absolute w-24 h-24 rounded-full border-4 border-[#E5E5E5]" />
        <div
          className={`absolute w-24 h-24 rounded-full border-4 ${
            level === 'KRITIK' ? 'border-[#F0282D]' :
            level === 'YUKSEK' ? 'border-[#FFB114]' :
            level === 'ORTA' ? 'border-yellow-500' : 'border-[#00A651]'
          }`}
          style={{
            clipPath: `polygon(0 100%, 50% 50%, ${50 + 50 * Math.cos(((rotation - 90) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((rotation - 90) * Math.PI) / 180)}%, 0 0)`,
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 w-0.5 h-10 bg-[#5A5A5A] rounded-full origin-bottom"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-[#5A5A5A] rounded-full -translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="mt-1 text-xl font-bold">{score}</div>
      <div className={`text-xs font-medium ${config.text}`}>
        {level === 'KRITIK' ? 'Kritik Risk' : level === 'YUKSEK' ? 'Yüksek Risk' : level === 'ORTA' ? 'Orta Risk' : 'Düşük Risk'}
      </div>
    </div>
  );
}

export const BarChart3 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);
