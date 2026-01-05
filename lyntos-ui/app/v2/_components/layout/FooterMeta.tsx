'use client';
import React from 'react';

export function FooterMeta() {
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || 'dev';
  const version = process.env.NEXT_PUBLIC_VERSION || '2.0.0-alpha';

  return (
    <footer className="border-t border-slate-200 bg-white py-3">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>LYNTOS Dashboard v{version}</span>
            <span className="text-slate-300">|</span>
            <span>Build: {buildTime}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Veri guncelligi: Canli</span>
            <span className="text-slate-300">|</span>
            <a href="/v2/help" className="hover:text-slate-700 underline">Yardim</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
