'use client';

import React, { useState, useEffect } from 'react';
import type { StatCardColor } from '../_types/corporate';

interface AnimatedStatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: StatCardColor;
  suffix?: string;
  subtitle?: string;
  delay?: number;
}

const colorConfig = {
  success: { bg: 'from-[#00A651]/10 to-[#00A651]/5', border: 'border-[#00A651]/20', icon: 'bg-[#00A651]', text: 'text-[#00804D]' },
  warning: { bg: 'from-[#FFB114]/10 to-[#FFB114]/5', border: 'border-[#FFB114]/20', icon: 'bg-[#FFB114]', text: 'text-[#E67324]' },
  primary: { bg: 'from-[#0049AA]/10 to-[#0049AA]/5', border: 'border-[#0049AA]/20', icon: 'bg-[#0049AA]', text: 'text-[#0049AA]' },
  info: { bg: 'from-[#0078D0]/10 to-[#0078D0]/5', border: 'border-[#0078D0]/20', icon: 'bg-[#0078D0]', text: 'text-[#0049AA]' },
  blue: { bg: 'from-[#0078D0]/10 to-[#0078D0]/5', border: 'border-[#0078D0]/20', icon: 'bg-[#0078D0]', text: 'text-[#0049AA]' },
  danger: { bg: 'from-[#F0282D]/10 to-[#F0282D]/5', border: 'border-[#F0282D]/20', icon: 'bg-[#F0282D]', text: 'text-[#BF192B]' },
};

export function AnimatedStatCard({
  label,
  value,
  icon,
  color,
  suffix = '',
  subtitle,
  delay = 0,
}: AnimatedStatCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const progress = Math.min((Date.now() - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedValue(Math.floor(start + (value - start) * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };
      animate();
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const cfg = colorConfig[color];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border backdrop-blur-sm
        bg-gradient-to-br ${cfg.bg} ${cfg.border}
        p-5 transition-all duration-300
        hover:shadow-xl hover:-translate-y-1 animate-slide-up
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#969696] uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-black mt-1 ${cfg.text}`}>
            {animatedValue.toLocaleString('tr-TR')}{suffix}
          </p>
          {subtitle && (
            <p className="text-[10px] text-[#969696] mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${cfg.icon} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
