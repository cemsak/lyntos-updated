import React from 'react';
import { ExternalLink, Radar } from 'lucide-react';

export function ExternalLinksBar() {
  return (
    <div className="bg-[#F5F6F8] dark:bg-[#2E2E2E]/50 rounded-xl border border-[#E5E5E5] dark:border-[#5A5A5A] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Radar className="w-5 h-5 text-[#969696]" />
        <span className="text-sm text-[#5A5A5A] dark:text-[#B4B4B4]">
          Resmi kaynaklar ve güncel duyurular
        </span>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://www.resmigazete.gov.tr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-[#0049AA] hover:text-[#00287F] dark:text-[#00B4EB]"
        >
          Resmi Gazete
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href="https://www.gib.gov.tr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-[#0049AA] hover:text-[#00287F] dark:text-[#00B4EB]"
        >
          GİB
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href="https://www.mevzuat.gov.tr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-[#0049AA] hover:text-[#00287F] dark:text-[#00B4EB]"
        >
          Mevzuat.gov.tr
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
