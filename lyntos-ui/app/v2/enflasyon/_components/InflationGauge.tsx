'use client';

import { useState, useEffect } from 'react';

interface InflationGaugeProps {
  katsayi: number;
  size?: number;
}

export function InflationGauge({ katsayi, size = 200 }: InflationGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    setTimeout(() => setAnimatedValue(katsayi), 300);
  }, [katsayi]);

  const maxKatsayi = 10;
  const percentage = Math.min((animatedValue / maxKatsayi) * 100, 100);
  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  const getColor = () => {
    if (animatedValue < 2) return '#00CB50';
    if (animatedValue < 4) return '#FFB114';
    if (animatedValue < 6) return '#FA841E';
    return '#F0282D';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" viewBox="0 0 100 100" style={{ width: size, height: size }}>
        {/* Background arc */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#E5E5E5"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Animated arc */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-[#2E2E2E]">
          {animatedValue.toFixed(4)}
        </span>
        <span className="text-sm text-[#969696] font-medium">Katsayı</span>
      </div>
    </div>
  );
}
