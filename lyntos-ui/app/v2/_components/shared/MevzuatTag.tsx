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
        'bg-[#F5F6F8] hover:bg-[#E5E5E5] text-[#5A5A5A]',
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
