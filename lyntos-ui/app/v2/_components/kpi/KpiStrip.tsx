'use client';
import React, { useState, useCallback } from 'react';
import { KpiCard } from './KpiCard';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { KpiStripModals, type KpiStripModalHandles } from './KpiStripModals';
import {
  normalizeKurganRisk,
  normalizeDataQuality,
  normalizeCrossCheck,
  normalizeQuarterlyTax,
  normalizeCorporateTax,
  normalizeCorporateTaxForecast,
  normalizeInflation,
  normalizeRegwatch,
} from './kpiNormalizers';
import type { KpiData } from './KpiCard';

interface KpiStripProps {
  onRegWatchClick?: () => void;
}

export function KpiStrip({ onRegWatchClick }: KpiStripProps) {
  // Each KPI has its own fail-soft fetch
  const kurgan = useFailSoftFetch<KpiData>(ENDPOINTS.KURGAN_RISK, normalizeKurganRisk);
  const dataQuality = useFailSoftFetch<KpiData>(ENDPOINTS.DATA_QUALITY, normalizeDataQuality);
  const crossCheck = useFailSoftFetch<KpiData>(ENDPOINTS.CROSS_CHECK, normalizeCrossCheck);
  const quarterlyTax = useFailSoftFetch<KpiData>(ENDPOINTS.QUARTERLY_TAX, normalizeQuarterlyTax);
  const corporateTax = useFailSoftFetch<KpiData>(ENDPOINTS.CORPORATE_TAX, normalizeCorporateTax);
  const corporateTaxForecast = useFailSoftFetch<KpiData>(ENDPOINTS.CORPORATE_TAX_FORECAST, normalizeCorporateTaxForecast);
  const inflation = useFailSoftFetch<KpiData>(ENDPOINTS.INFLATION_ADJUSTMENT, normalizeInflation);
  const regwatch = useFailSoftFetch<KpiData>(ENDPOINTS.REGWATCH_STATUS, normalizeRegwatch);

  // Modal handles from child component
  const [modalHandles, setModalHandles] = useState<KpiStripModalHandles | null>(null);
  const handleModalHandles = useCallback((h: KpiStripModalHandles) => setModalHandles(h), []);

  // Scroll to RegWatch section - use prop if provided, else default
  const handleRegWatchClick = onRegWatchClick || (() => {
    const section = document.getElementById('regwatch-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8">
        <KpiCard
          title="Vergi Risk Skoru"
          icon="🎯"
          envelope={kurgan}
          onClick={() => modalHandles?.openRiskDetay()}
        />
        <KpiCard
          title="Veri Kalitesi"
          icon="📊"
          envelope={dataQuality}
          onClick={() => modalHandles?.openVeriKalitesi()}
        />
        <KpiCard title="Mutabakat" icon="✓" envelope={crossCheck} />
        <KpiCard
          title="Geçici Vergi"
          icon="💰"
          envelope={quarterlyTax}
          onClick={() => modalHandles?.openGeciciVergi()}
        />
        <KpiCard
          title="Kurumlar Vergisi"
          icon="🏢"
          envelope={corporateTax}
          onClick={() => modalHandles?.openKurumsalVergi()}
        />
        <KpiCard
          title="Yıl Sonu Proj."
          icon="📈"
          envelope={corporateTaxForecast}
          onClick={() => modalHandles?.openYilSonuProj()}
        />
        <KpiCard
          title="Enflasyon"
          icon="📉"
          envelope={inflation}
          onClick={() => modalHandles?.openEnflasyon()}
        />
        <KpiCard
          title="Beyan Takvimi"
          icon="📅"
          envelope={regwatch}
          onClick={() => modalHandles?.openBeyanTakvimi()}
        />
      </div>

      <KpiStripModals
        kurgan={kurgan}
        dataQuality={dataQuality}
        quarterlyTax={quarterlyTax}
        corporateTax={corporateTax}
        corporateTaxForecast={corporateTaxForecast}
        inflation={inflation}
        onHandles={handleModalHandles}
      />
    </>
  );
}
