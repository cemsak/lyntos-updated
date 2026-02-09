import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../shared/Badge';
import type { DikeyAnomali } from './yatayDikeyTypes';

interface DikeyAnomalilerProps {
  anomaliler: DikeyAnomali[];
}

export function DikeyAnomaliler({ anomaliler }: DikeyAnomalilerProps) {
  if (anomaliler.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-[#5A5A5A] flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[#F0282D]" />
        Yapısal Anomaliler ({anomaliler.length})
      </h4>
      {anomaliler.map((a, i) => (
        <div
          key={i}
          className={`p-2 rounded-lg border text-xs ${
            a.durum === 'kritik'
              ? 'bg-[#FEF2F2] border-[#FFC7C9]'
              : 'bg-[#FFFBEB] border-[#FFF08C]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] bg-white px-1 py-0.5 rounded">{a.kod}</span>
            <Badge variant={a.durum === 'kritik' ? 'error' : 'warning'}>
              {a.durum === 'kritik' ? 'Kritik' : 'Uyarı'}
            </Badge>
          </div>
          <p className="text-[#2E2E2E] mt-1">{a.aciklama}</p>
          <p className="text-[#969696] mt-0.5">Mevzuat: {a.mevzuat}</p>
        </div>
      ))}
    </div>
  );
}
