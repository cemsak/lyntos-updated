'use client';

import React from 'react';
import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MevzuatTagProps {
  kod: string;
  onClick?: () => void;
  className?: string;
}

export const MevzuatTag: React.FC<MevzuatTagProps> = ({
  kod,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded',
        'bg-slate-100 hover:bg-slate-200 text-slate-700',
        'text-xs font-medium transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <Scale className="w-3 h-3" />
      {kod}
    </button>
  );
};

export default MevzuatTag;
