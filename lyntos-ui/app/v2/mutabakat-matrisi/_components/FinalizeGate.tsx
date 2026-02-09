'use client';

import React from 'react';
import { Lock, Unlock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../_components/shared/Badge';
import type { KararIstatistik } from '../_hooks/useControlDecisions';

interface FinalizeGateProps {
  kararIstatistik: KararIstatistik;
  onFinalize?: () => void;
}

export function FinalizeGate({ kararIstatistik, onFinalize }: FinalizeGateProps) {
  const { kabul, reddedildi, inceleniyor, bilinmiyor, toplam } = kararIstatistik;

  if (toplam === 0) return null;

  const canFinalize = bilinmiyor === 0 && inceleniyor === 0;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[#2E2E2E]">Donem Sonuclandirma</h3>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="success" size="sm" style="soft">{kabul} kabul</Badge>
        <Badge variant="error" size="sm" style="soft">{reddedildi} red</Badge>
        <Badge variant="info" size="sm" style="soft">{inceleniyor} inceleniyor</Badge>
        <Badge variant="warning" size="sm" style="soft">{bilinmiyor} beklemede</Badge>
      </div>

      {/* Warning */}
      {!canFinalize && (
        <div className="bg-[#FFFBEB] border border-[#FFE045] rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E67324] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#E67324]">
            {bilinmiyor > 0 && `${bilinmiyor} kontrolde karar bekleniyor. `}
            {inceleniyor > 0 && `${inceleniyor} kontrol hala inceleniyor. `}
            Tum kontrollerin sonuclandirilmasi gereklidir.
          </p>
        </div>
      )}

      {/* Finalize button */}
      <button
        onClick={canFinalize ? onFinalize : undefined}
        disabled={!canFinalize}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          canFinalize
            ? 'bg-[#0078D0] text-white hover:bg-[#0049AA]'
            : 'bg-[#F5F6F8] text-[#969696] cursor-not-allowed'
        }`}
      >
        {canFinalize ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        Sonuclandir
      </button>
    </div>
  );
}
