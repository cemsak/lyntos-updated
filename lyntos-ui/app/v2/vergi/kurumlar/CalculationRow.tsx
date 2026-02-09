'use client';

/**
 * CalculationRow
 * A row in the tax calculation table showing label, value, and operation type
 */

import React from 'react';
import { PlusCircle, MinusCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../_lib/format';

export interface CalculationRowProps {
  label: string;
  value: number | null;
  type?: 'add' | 'subtract' | 'result';
  highlight?: boolean;
  loading?: boolean;
}

export function CalculationRow({ label, value, type, highlight, loading }: CalculationRowProps) {
  const formatVal = (val: number | null) => {
    if (val === null || val === undefined) return '\u20BA---';
    return formatCurrency(val, { decimals: 0 });
  };

  return (
    <div className={`flex items-center justify-between py-2 ${
      highlight ? 'bg-[#E6F9FF] -mx-2 px-2 rounded' : 'border-b border-[#E5E5E5]'
    }`}>
      <div className="flex items-center gap-2">
        {type === 'add' && <PlusCircle className="w-4 h-4 text-[#00A651]" />}
        {type === 'subtract' && <MinusCircle className="w-4 h-4 text-[#F0282D]" />}
        <span className={`text-sm ${highlight ? 'font-semibold text-[#2E2E2E]' : 'text-[#5A5A5A]'}`}>
          {label}
        </span>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 text-[#969696] animate-spin" />
      ) : (
        <span className={`font-medium ${highlight ? 'text-[#0049AA] text-lg' : value !== null ? 'text-[#2E2E2E]' : 'text-[#B4B4B4]'}`}>
          {formatVal(value)}
        </span>
      )}
    </div>
  );
}

export default CalculationRow;
