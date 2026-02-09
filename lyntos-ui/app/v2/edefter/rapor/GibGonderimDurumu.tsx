'use client';

import { CheckCircle2, AlertCircle, Send } from 'lucide-react';
import type { EDefterRapor } from './types';

interface GibGonderimDurumuProps {
  raporlar: EDefterRapor[];
}

export function GibGonderimDurumu({ raporlar }: GibGonderimDurumuProps) {
  const hasYevmiyeBerat = raporlar.some(r => r.defter_tipi === 'YB');
  const hasKebirBerat = raporlar.some(r => r.defter_tipi === 'KB');
  const hasDefterRaporu = raporlar.some(r => r.defter_tipi === 'DR');

  const items = [
    { label: 'Yevmiye Beratı', exists: hasYevmiyeBerat },
    { label: 'Kebir Beratı', exists: hasKebirBerat },
    { label: 'Defter Raporu (DR)', exists: hasDefterRaporu },
  ];

  return (
    <div className="px-6 pt-4">
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-4">
        <h2 className="text-sm font-semibold text-[#5A5A5A] mb-3 flex items-center gap-2">
          <Send className="w-4 h-4" />
          GİB Gönderim Durumu
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg p-3 border ${
                item.exists
                  ? 'bg-[#ECFDF5] border-[#AAE8B8]'
                  : 'bg-[#F5F6F8] border-[#E5E5E5]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {item.exists ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00804D]" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#969696]" />
                )}
                <span
                  className={`text-sm font-medium ${
                    item.exists ? 'text-[#00804D]' : 'text-[#969696]'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              <p
                className={`text-xs ${
                  item.exists ? 'text-[#00804D]' : 'text-[#969696]'
                }`}
              >
                {item.exists ? 'Yüklendi ✓' : 'Henüz yüklenmedi'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
