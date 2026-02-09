'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SmmmKarar, SmmmKararData, CrossCheckResultRaw } from '../_types/crossCheck';

function getKararStorageKey(clientId: string, period: string): string {
  return `lyntos_matrisi_kararlar_${clientId}_${period}`;
}

function loadKararlar(clientId: string, period: string): Record<string, SmmmKararData> {
  if (!clientId || !period) return {};
  try {
    const raw = localStorage.getItem(getKararStorageKey(clientId, period));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveKararlar(clientId: string, period: string, kararlar: Record<string, SmmmKararData>): void {
  if (!clientId || !period) return;
  try {
    localStorage.setItem(getKararStorageKey(clientId, period), JSON.stringify(kararlar));
  } catch {
    console.error('[useControlDecisions] localStorage save error');
  }
}

export interface KararIstatistik {
  kabul: number;
  reddedildi: number;
  inceleniyor: number;
  bilinmiyor: number;
  toplam: number;
}

export function useControlDecisions(
  clientId: string,
  periodCode: string,
  checks: CrossCheckResultRaw[],
) {
  const [kararlar, setKararlar] = useState<Record<string, SmmmKararData>>({});

  // Load from localStorage when scope changes
  useEffect(() => {
    if (clientId && periodCode) {
      setKararlar(loadKararlar(clientId, periodCode));
    } else {
      setKararlar({});
    }
  }, [clientId, periodCode]);

  const setKarar = useCallback(
    (checkId: string, karar: SmmmKarar, not = '') => {
      setKararlar(prev => {
        const next = {
          ...prev,
          [checkId]: { karar, not, tarih: new Date().toISOString() },
        };
        saveKararlar(clientId, periodCode, next);
        return next;
      });
    },
    [clientId, periodCode],
  );

  const kararIstatistik = useMemo<KararIstatistik>(() => {
    let kabul = 0, reddedildi = 0, inceleniyor = 0, bilinmiyor = 0;

    for (const check of checks) {
      const k = kararlar[check.check_id];
      if (!k || k.karar === 'BILINMIYOR') bilinmiyor++;
      else if (k.karar === 'KABUL') kabul++;
      else if (k.karar === 'REDDEDILDI') reddedildi++;
      else if (k.karar === 'INCELENIYOR') inceleniyor++;
    }

    return { kabul, reddedildi, inceleniyor, bilinmiyor, toplam: checks.length };
  }, [checks, kararlar]);

  return { kararlar, setKarar, kararIstatistik };
}
