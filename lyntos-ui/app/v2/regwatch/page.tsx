'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  FileText,
  BookOpen,
  Sparkles,
  AlertCircle,
  Clock,
  RefreshCw,
  MessageCircle,
  Scale,
  Scroll,
  Gavel,
  ShieldCheck,
  ArrowLeft,
  FolderOpen,
} from 'lucide-react';
import Link from 'next/link';
import type { MevzuatResult, Statistics } from './_components/regwatch-types';
import { searchMevzuat, fetchStatistics, fetchRecent, fetchByType } from './_components/regwatch-api';
import { StatCard } from './_components/StatCard';
import { MevzuatCard } from './_components/MevzuatCard';
import { SearchBox } from './_components/SearchBox';
import { ExternalLinksBar } from './_components/ExternalLinksBar';
import { TYPE_COLORS } from './_components/regwatch-types';

/** Tür ikonları */
const TYPE_ICONS: Record<string, typeof FileText> = {
  kanun: BookOpen,
  teblig: FileText,
  ozelge: Sparkles,
  sirkular: Scroll,
  genelge: ShieldCheck,
  yonetmelik: Scale,
  danistay_karar: Gavel,
  khk: FileText,
};

/** Tür renkleri (StatCard için) */
const TYPE_STAT_COLORS: Record<string, string> = {
  kanun: 'purple',
  teblig: 'green',
  ozelge: 'orange',
  sirkular: 'orange',
  genelge: 'blue',
  yonetmelik: 'blue',
  danistay_karar: 'red',
  khk: 'purple',
};

export default function RegwatchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MevzuatResult[]>([]);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [recentMevzuat, setRecentMevzuat] = useState<MevzuatResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedKurumlar, setSelectedKurumlar] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);

  // StatCard tıklamasıyla tür bazlı filtreleme
  const [activeStatType, setActiveStatType] = useState<string | null>(null);
  const [typeResults, setTypeResults] = useState<MevzuatResult[]>([]);
  const [typeTotal, setTypeTotal] = useState(0);
  const [typeLabel, setTypeLabel] = useState('');

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [stats, recent] = await Promise.all([
          fetchStatistics(),
          fetchRecent()
        ]);
        setStatistics(stats);
        setRecentMevzuat(recent);
      } catch (err) {
        console.error('Initial load error:', err);
      }
    };
    loadInitial();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim() && selectedTypes.length === 0 && selectedKurumlar.length === 0) {
      setResults([]);
      setTotal(0);
      return;
    }

    // Arama yapılınca aktif stat tipini temizle
    setActiveStatType(null);
    setTypeResults([]);
    setIsLoading(true);
    setError(null);

    try {
      const { results: searchResults, total: searchTotal } = await searchMevzuat({
        query: query.trim(),
        types: selectedTypes,
        kurumlar: selectedKurumlar,
        limit: 50
      });

      setResults(searchResults);
      setTotal(searchTotal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Arama hatası');
      setResults([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedTypes, selectedKurumlar]);

  useEffect(() => {
    if (query.trim() || selectedTypes.length > 0 || selectedKurumlar.length > 0) {
      const timer = setTimeout(handleSearch, 300);
      return () => clearTimeout(timer);
    }
  }, [query, selectedTypes, selectedKurumlar, handleSearch]);

  // StatCard tıklandığında ilgili türü yükle
  const handleStatClick = async (type: string) => {
    if (activeStatType === type) {
      // Aynı tipe tekrar tıklanırsa kapat
      setActiveStatType(null);
      setTypeResults([]);
      return;
    }

    setActiveStatType(type);
    setQuery('');
    setResults([]);
    setSelectedTypes([]);
    setSelectedKurumlar([]);
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchByType(type);
      setTypeResults(data.results);
      setTypeTotal(data.total);
      setTypeLabel(data.type_label);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tür listesi alınamadı');
      setTypeResults([]);
      setTypeTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Aktif stat tipini temizle
  const clearStatFilter = () => {
    setActiveStatType(null);
    setTypeResults([]);
    setTypeTotal(0);
    setTypeLabel('');
  };

  const toggleType = (type: string) => {
    setActiveStatType(null);
    setTypeResults([]);
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleKurum = (kurum: string) => {
    setActiveStatType(null);
    setTypeResults([]);
    setSelectedKurumlar(prev =>
      prev.includes(kurum)
        ? prev.filter(k => k !== kurum)
        : [...prev, kurum]
    );
  };

  const typeLabels = statistics?.type_labels || {};
  const kurumLabels = statistics?.kurum_labels || {};

  // Hangi tür listesi gösterilecek?
  const hasSearch = query.trim().length > 0 || selectedTypes.length > 0 || selectedKurumlar.length > 0;
  const hasTypeFilter = activeStatType !== null && typeResults.length > 0;

  // Sıralı tür listesi (büyükten küçüğe)
  const sortedTypes = statistics
    ? Object.entries(statistics.by_type)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#2E2E2E] dark:text-white">
              Mevzuat Takibi
            </h1>
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#00804D] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#00A651]/20">
              <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse" />
              Canlı
            </span>
          </div>
          <p className="text-[#969696] dark:text-[#969696] mt-1">
            Kanun, tebliğ, özelge ve diğer mevzuatları arayın
          </p>
        </div>
        <Link
          href="/v2/asistan"
          className="flex items-center gap-2 px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#00287F] transition-colors text-sm font-medium"
        >
          <MessageCircle className="w-4 h-4" />
          LYNTOS Asistanı
        </Link>
      </div>

      {/* İstatistik Kartları - Tıklanabilir */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <StatCard
            label="Toplam Mevzuat"
            value={statistics.total_active}
            icon={FileText}
            color="blue"
            onClick={clearStatFilter}
            active={activeStatType === null && !hasSearch}
          />
          {sortedTypes.slice(0, 4).map(([type, count]) => (
            <StatCard
              key={type}
              label={typeLabels[type] || type}
              value={count}
              icon={TYPE_ICONS[type] || FileText}
              color={TYPE_STAT_COLORS[type] || 'blue'}
              onClick={() => handleStatClick(type)}
              active={activeStatType === type}
            />
          ))}
        </div>
      )}

      {/* Ek tür kartları (5+ tür varsa) */}
      {statistics && sortedTypes.length > 4 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sortedTypes.slice(4).map(([type, count]) => (
            <StatCard
              key={type}
              label={typeLabels[type] || type}
              value={count}
              icon={TYPE_ICONS[type] || FileText}
              color={TYPE_STAT_COLORS[type] || 'blue'}
              onClick={() => handleStatClick(type)}
              active={activeStatType === type}
            />
          ))}
        </div>
      )}

      <SearchBox
        query={query}
        onQueryChange={(q) => {
          setQuery(q);
          if (q.trim()) {
            setActiveStatType(null);
            setTypeResults([]);
          }
        }}
        onSearch={handleSearch}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        selectedTypes={selectedTypes}
        selectedKurumlar={selectedKurumlar}
        onToggleType={toggleType}
        onToggleKurum={toggleKurum}
        onClearFilters={() => {
          setSelectedTypes([]);
          setSelectedKurumlar([]);
        }}
        typeLabels={typeLabels}
        kurumLabels={kurumLabels}
        statistics={statistics}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-[#0049AA] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-[#FEF2F2] dark:bg-[#980F30]/20 text-[#BF192B] dark:text-[#FF9196] rounded-lg">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      ) : hasTypeFilter ? (
        /* StatCard tıklamasıyla tür bazlı sonuçlar */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={clearStatFilter}
              className="p-1.5 rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-[#5A5A5A]/30 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-[#969696]" />
            </button>
            <div className="text-sm text-[#969696] dark:text-[#969696]">
              <span className="font-medium text-[#2E2E2E] dark:text-white">{typeTotal} {typeLabel}</span> bulundu
            </div>
          </div>
          <div className="space-y-3">
            {typeResults.map((mevzuat) => (
              <MevzuatCard
                key={mevzuat.id}
                mevzuat={mevzuat}
                typeLabels={typeLabels}
                kurumLabels={kurumLabels}
                expanded={expandedId === mevzuat.id}
                onToggle={() => setExpandedId(expandedId === mevzuat.id ? null : mevzuat.id)}
              />
            ))}
          </div>
        </div>
      ) : results.length > 0 ? (
        /* Arama sonuçları */
        <div className="space-y-4">
          <div className="text-sm text-[#969696] dark:text-[#969696]">
            <span className="font-medium text-[#2E2E2E] dark:text-white">{total}</span> sonuç bulundu
            {selectedTypes.length === 1 && (
              <span> — {typeLabels[selectedTypes[0]] || selectedTypes[0]}</span>
            )}
          </div>
          <div className="space-y-3">
            {results.map((mevzuat) => (
              <MevzuatCard
                key={mevzuat.id}
                mevzuat={mevzuat}
                typeLabels={typeLabels}
                kurumLabels={kurumLabels}
                expanded={expandedId === mevzuat.id}
                onToggle={() => setExpandedId(expandedId === mevzuat.id ? null : mevzuat.id)}
              />
            ))}
          </div>
        </div>
      ) : hasSearch ? (
        <div className="text-center py-12 text-[#969696] dark:text-[#969696]">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aramanızla eşleşen mevzuat bulunamadı.</p>
          <p className="text-sm mt-2">Farklı anahtar kelimeler veya filtreler deneyin.</p>
        </div>
      ) : (
        /* Varsayılan Görünüm: Kategoriler + Son Eklenenler */
        <div className="space-y-6">
          {/* Kategorilere göre göz at */}
          {statistics && sortedTypes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#5A5A5A] dark:text-[#B4B4B4]">
                <FolderOpen className="h-5 w-5" />
                <span className="font-medium">Kategorilere Göz At</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedTypes.map(([type, count]) => {
                  const Icon = TYPE_ICONS[type] || FileText;
                  return (
                    <button
                      key={type}
                      onClick={() => handleStatClick(type)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E5E5] dark:border-[#5A5A5A] bg-white dark:bg-[#2E2E2E] hover:border-[#5ED6FF] dark:hover:border-[#0049AA] hover:shadow-sm transition-all text-left group"
                    >
                      <div className={`p-2 rounded-lg ${TYPE_COLORS[type] || 'bg-[#F5F6F8] text-[#5A5A5A]'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#2E2E2E] dark:text-white group-hover:text-[#0049AA] dark:group-hover:text-[#5ED6FF] transition-colors">
                          {typeLabels[type] || type}
                        </div>
                        <div className="text-xs text-[#969696]">
                          {count} kayıt
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Son Eklenenler */}
          {recentMevzuat.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#5A5A5A] dark:text-[#B4B4B4]">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Son Eklenen Mevzuatlar</span>
              </div>
              <div className="space-y-3">
                {recentMevzuat.map((mevzuat) => (
                  <MevzuatCard
                    key={mevzuat.id}
                    mevzuat={mevzuat as MevzuatResult}
                    typeLabels={typeLabels}
                    kurumLabels={kurumLabels}
                    expanded={expandedId === mevzuat.id}
                    onToggle={() => setExpandedId(expandedId === mevzuat.id ? null : mevzuat.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ExternalLinksBar />
    </div>
  );
}
