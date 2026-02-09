'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  BarChart3,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useDashboardScope } from '../scope/useDashboardScope';
import { ENDPOINTS_V2 } from '../contracts/endpoints';
import type {
  YatayData,
  DikeyData,
  ViewMode,
  DikeyFilter,
} from './yatayDikeyTypes';
import { YataySummaryCards } from './YataySummaryCards';
import { YatayTable } from './YatayTable';
import { DikeySummaryCards } from './DikeySummaryCards';
import { DikeyAnomaliler } from './DikeyAnomaliler';
import { DikeyTable } from './DikeyTable';
import { AnalysisSearchBar } from './AnalysisSearchBar';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function YatayDikeyAnaliz() {
  const { scope } = useDashboardScope();
  const [viewMode, setViewMode] = useState<ViewMode>('yatay');
  const [yatayData, setYatayData] = useState<YatayData | null>(null);
  const [dikeyData, setDikeyData] = useState<DikeyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMaterial, setShowOnlyMaterial] = useState(false);
  const [dikeyFilter, setDikeyFilter] = useState<DikeyFilter>('tumu');

  // Fetch data based on view mode
  useEffect(() => {
    if (!scope.client_id || !scope.period) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (viewMode === 'yatay') {
          const url = ENDPOINTS_V2.MIZAN_YATAY(scope.client_id, scope.period);
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          if (!res.ok) {
            if (res.status === 404) {
              setError('Yatay analiz için en az 2 dönem verisi gerekli.');
            } else {
              setError(`Sunucu hatası: HTTP ${res.status}`);
            }
            setLoading(false);
            return;
          }
          const json = await res.json();
          setYatayData(json);
        } else {
          const url = ENDPOINTS_V2.MIZAN_DIKEY(scope.client_id, scope.period);
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          if (!res.ok) {
            if (res.status === 404) {
              setError('Bu dönem için mizan verisi bulunamadı.');
            } else {
              setError(`Sunucu hatası: HTTP ${res.status}`);
            }
            setLoading(false);
            return;
          }
          const json = await res.json();
          setDikeyData(json);
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          setError('Backend bağlantısı kurulamadı.');
        } else {
          setError(`Veri yüklenemedi: ${msg}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [viewMode, scope.client_id, scope.period]);

  // ════════════════════════════════════════════════════════════════════════════
  // FILTERED DATA
  // ════════════════════════════════════════════════════════════════════════════

  const filteredYatay = useMemo(() => {
    if (!yatayData) return [];
    let items = yatayData.sonuclar;
    if (showOnlyMaterial) {
      items = items.filter((s) => s.material);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (s) => s.hesap_kodu.includes(term) || s.hesap_adi.toLowerCase().includes(term)
      );
    }
    return items;
  }, [yatayData, showOnlyMaterial, searchTerm]);

  const filteredDikey = useMemo(() => {
    if (!dikeyData) return [];
    const all = [...dikeyData.bilanco, ...dikeyData.gelir_tablosu];
    let items = all;
    if (dikeyFilter !== 'tumu') {
      items = items.filter((k) => k.taraf === dikeyFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (k) => k.hesap_kodu.includes(term) || k.hesap_adi.toLowerCase().includes(term)
      );
    }
    return items;
  }, [dikeyData, dikeyFilter, searchTerm]);

  return (
    <div className="space-y-3">
      {/* View Toggle */}
      <div className="flex gap-1 p-1 bg-[#F5F6F8] rounded-lg">
        <button
          onClick={() => setViewMode('yatay')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
            viewMode === 'yatay'
              ? 'bg-white text-[#0049AA] shadow-sm'
              : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Yatay Analiz
        </button>
        <button
          onClick={() => setViewMode('dikey')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all ${
            viewMode === 'dikey'
              ? 'bg-white text-[#00804D] shadow-sm'
              : 'text-[#5A5A5A] hover:text-[#2E2E2E]'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Dikey Analiz
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#0049AA] animate-spin" />
          <span className="ml-2 text-sm text-[#969696]">Analiz yükleniyor...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 bg-[#FFFBEB] border border-[#FFF08C] rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#FA841E]" />
            <p className="text-sm text-[#FA841E]">{error}</p>
          </div>
        </div>
      )}

      {/* YATAY ANALİZ */}
      {viewMode === 'yatay' && yatayData && !loading && (
        <div className="space-y-3">
          <YataySummaryCards data={yatayData} />
          <AnalysisSearchBar
            viewMode="yatay"
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showOnlyMaterial={showOnlyMaterial}
            onToggleMaterial={() => setShowOnlyMaterial(!showOnlyMaterial)}
          />
          <YatayTable items={filteredYatay} />
        </div>
      )}

      {/* DİKEY ANALİZ */}
      {viewMode === 'dikey' && dikeyData && !loading && (
        <div className="space-y-3">
          <DikeySummaryCards yapiOzeti={dikeyData.yapi_ozeti} />
          <DikeyAnomaliler anomaliler={dikeyData.anomaliler} />
          <AnalysisSearchBar
            viewMode="dikey"
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            dikeyFilter={dikeyFilter}
            onDikeyFilterChange={setDikeyFilter}
          />
          <DikeyTable items={filteredDikey} />
        </div>
      )}
    </div>
  );
}
