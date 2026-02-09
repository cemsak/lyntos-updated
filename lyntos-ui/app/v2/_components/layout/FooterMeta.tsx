'use client';
import React from 'react';

export function FooterMeta() {
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || 'dev';
  const version = process.env.NEXT_PUBLIC_VERSION || '2.0.0-alpha';

  return (
    <footer className="border-t border-[#E5E5E5] bg-white py-3">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between text-xs text-[#969696]">
          <div className="flex items-center gap-4">
            <span>LYNTOS Dashboard v{version}</span>
            <span className="text-[#B4B4B4]">|</span>
            <span>Build: {buildTime}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Veri güncelliği: Güncel</span>
            <span className="text-[#B4B4B4]">|</span>
            <a href="/v2/help" className="hover:text-[#5A5A5A] underline">Yardım</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
