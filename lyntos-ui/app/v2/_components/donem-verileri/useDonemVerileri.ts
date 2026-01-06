'use client';
import { useState, useMemo, useCallback } from 'react';
import type { BelgeTipi, BelgeDurumData, DonemVerileriResult } from './types';
import { BELGE_TANIMLARI } from './types';

// Mock uploaded files for demo - replace with real API later
const INITIAL_YUKLENEN: BelgeTipi[] = ['MIZAN', 'E_DEFTER'];

interface UseDonemVerileriReturn {
  data: DonemVerileriResult;
  isLoading: boolean;
  markAsUploaded: (tip: BelgeTipi) => void;
}

export function useDonemVerileri(): UseDonemVerileriReturn {
  const [yukluTipler, setYukluTipler] = useState<BelgeTipi[]>(INITIAL_YUKLENEN);
  const [isLoading] = useState(false);

  // Build belgeler list from BELGE_TANIMLARI and yukluTipler
  const data = useMemo<DonemVerileriResult>(() => {
    const belgeler: BelgeDurumData[] = Object.values(BELGE_TANIMLARI).map(tanim => {
      const yuklendi = yukluTipler.includes(tanim.tip);
      return {
        tip: tanim.tip,
        durum: yuklendi ? 'VAR' as const : 'EKSIK' as const,
        yuklemeTarihi: yuklendi ? new Date().toISOString() : undefined,
        dosyaAdi: yuklendi ? `${tanim.tip.toLowerCase()}_2025_q4.pdf` : undefined,
      };
    });

    const varSayisi = belgeler.filter(b => b.durum === 'VAR').length;
    const eksikSayisi = belgeler.filter(b => b.durum === 'EKSIK').length;
    const bekleyenSayisi = belgeler.filter(b => b.durum === 'BEKLIYOR').length;

    // Calculate completion percentage based on required docs
    const gerekliTipler = Object.values(BELGE_TANIMLARI).filter(t => t.gerekliMi).map(t => t.tip);
    const gerekliVar = belgeler.filter(b => gerekliTipler.includes(b.tip) && b.durum === 'VAR').length;
    const tamamlanmaYuzdesi = gerekliTipler.length > 0
      ? Math.round((gerekliVar / gerekliTipler.length) * 100)
      : 0;

    return {
      belgeler,
      tamamlanmaYuzdesi,
      eksikSayisi,
      varSayisi,
      bekleyenSayisi,
    };
  }, [yukluTipler]);

  const markAsUploaded = useCallback((tip: BelgeTipi) => {
    setYukluTipler(prev => {
      if (prev.includes(tip)) return prev;
      return [...prev, tip];
    });
  }, []);

  return { data, isLoading, markAsUploaded };
}
