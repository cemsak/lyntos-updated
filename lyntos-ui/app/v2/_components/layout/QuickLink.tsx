'use client';

/**
 * QuickLink
 * Navigation shortcut used in the RightRail panel
 */

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface QuickLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function QuickLink({ href, icon, children }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-2 text-xs text-[#0049AA] hover:text-[#00287F] hover:bg-[#E6F9FF] rounded transition-colors"
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      <ChevronRight className="w-3.5 h-3.5" />
    </Link>
  );
}

export default QuickLink;
