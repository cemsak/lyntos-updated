'use client';

/**
 * MatrahPlaceholder
 * Empty state for Kurumlar Vergisi matrah calculation when no data is available
 */

import React from 'react';
import { Calculator } from 'lucide-react';

export function MatrahPlaceholder() {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
        <div className="w-10 h-10 bg-[#ECFDF5] rounded-lg flex items-center justify-center">
          <Calculator className="w-5 h-5 text-[#00804D]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#2E2E2E]">Kurumlar Vergisi Matrah Hesabi</h3>
          <p className="text-xs text-[#969696]">VUK ve KVK&apos;ya gore vergi matrahi hesaplamasi</p>
        </div>
      </div>
      <div className="p-4">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-[#E5E5E5]">
              <td className="py-3 text-[#5A5A5A]">Ticari Bilanco Kari</td>
              <td className="py-3 text-right font-mono text-[#B4B4B4] tabular-nums">&#8378;---</td>
            </tr>
            <tr className="border-b border-[#E5E5E5]">
              <td className="py-3 text-[#5A5A5A]">+ KKEG Toplami</td>
              <td className="py-3 text-right font-mono text-[#B4B4B4] tabular-nums">&#8378;---</td>
            </tr>
            <tr className="border-b border-[#E5E5E5]">
              <td className="py-3 text-[#5A5A5A]">- Istisna Kazanclar</td>
              <td className="py-3 text-right font-mono text-[#B4B4B4] tabular-nums">&#8378;---</td>
            </tr>
            <tr className="border-b border-[#E5E5E5]">
              <td className="py-3 text-[#5A5A5A]">- Gecmis Yil Zararlari</td>
              <td className="py-3 text-right font-mono text-[#B4B4B4] tabular-nums">&#8378;---</td>
            </tr>
            <tr className="border-t-2 border-[#E5E5E5] bg-[#F5F6F8]">
              <td className="py-3 font-semibold text-[#2E2E2E]">= Vergi Matrahi</td>
              <td className="py-3 text-right font-mono font-semibold text-[#B4B4B4] tabular-nums">&#8378;---</td>
            </tr>
            <tr className="bg-[#ECFDF5]">
              <td className="py-3 font-medium text-[#00804D]">Hesaplanan Vergi (%25)</td>
              <td className="py-3 text-right font-mono font-semibold text-[#00804D] tabular-nums">&#8378;---</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-[#969696] mt-4 text-center flex items-center justify-center gap-1">
          <span>📊</span> Mizan yuklendiginde otomatik hesaplanir
        </p>
      </div>
    </div>
  );
}

export default MatrahPlaceholder;
