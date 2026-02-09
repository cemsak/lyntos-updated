'use client';

/**
 * Kural Kütüphanesi Sayfası - Orchestrator
 * VDK, KURGAN ve RAM risk kurallarını yönetim arayüzü
 */

import { useState, useEffect } from 'react';
import {
  Search, RefreshCw, AlertCircle, CheckCircle2,
  AlertTriangle, Zap, Database
} from 'lucide-react';
import { ConnectionError } from '../../_components/shared/ConnectionError';
import { useScopeComplete } from '../../_components/scope/ScopeProvider';

// Types
import type { Rule, RuleStats, Category, Duplicate } from './_types';

// API
import {
  fetchRules,
  fetchStats,
  fetchCategories,
  fetchDuplicates,
  resolveDuplicate,
  fetchRuleDetail
} from './_lib/api';

// Constants
import { categoryLabels } from './_lib/constants';

// Components
import { DuplicatePanel, RuleDetailModal, RuleCard } from './_components';

export default function RiskRulesPage() {
  const isScopeComplete = useScopeComplete();

  // State
  const [rules, setRules] = useState<Rule[]>([]);
  const [stats, setStats] = useState<RuleStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Selection & Modal
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

  // Veri Yükleme
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rulesRes, statsRes, catsRes, dupsRes] = await Promise.all([
        fetchRules({ category: filterCategory, severity: filterSeverity, search: searchTerm, limit: 200 }),
        fetchStats(),
        fetchCategories(),
        fetchDuplicates()
      ]);
      setRules(rulesRes.data);
      setStats(statsRes);
      setCategories(catsRes);
      setDuplicates(dupsRes);
    } catch (err) {
      console.error('Error loading rules:', err);
      setError('Kural verileri yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterCategory, filterSeverity]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2 || searchTerm.length === 0) {
        loadData();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Kural detay açma
  const handleRuleClick = async (rule: Rule) => {
    const detail = await fetchRuleDetail(rule.rule_id);
    setSelectedRule(detail || rule);
  };

  // Duplicate çözümleme
  const handleResolveDuplicate = async (ruleId1: string, ruleId2: string, resolution: string) => {
    const success = await resolveDuplicate(ruleId1, ruleId2, resolution);
    if (success) loadData();
    return success;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Kural Kütüphanesi</h1>
          <p className="text-[#5A5A5A] mt-1">VDK, KURGAN ve RAM risk kurallarını yönetin</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8] rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* İstatistik Kartları */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#969696] text-sm mb-1">
              <Database className="w-4 h-4" />
              Toplam
            </div>
            <div className="text-2xl font-bold text-[#2E2E2E]">{stats.total}</div>
          </div>
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#00804D] text-sm mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Aktif
            </div>
            <div className="text-2xl font-bold text-[#00804D]">{stats.active}</div>
          </div>
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#BF192B] text-sm mb-1">
              <AlertCircle className="w-4 h-4" />
              Kritik
            </div>
            <div className="text-2xl font-bold text-[#BF192B]">{stats.by_severity?.CRITICAL || 0}</div>
          </div>
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#FA841E] text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              Yüksek
            </div>
            <div className="text-2xl font-bold text-[#FA841E]">{stats.by_severity?.HIGH || 0}</div>
          </div>
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#FA841E] text-sm mb-1">
              <Zap className="w-4 h-4" />
              Duplicate
            </div>
            <div className="text-2xl font-bold text-[#FA841E]">{stats.pending_duplicates}</div>
          </div>
        </div>
      )}

      {/* Duplicate Yönetimi — sadece çözülmemiş (pending) duplicate varsa göster */}
      {isScopeComplete && duplicates.filter(d => d.resolution === 'pending').length > 0 && (
        <DuplicatePanel
          duplicates={duplicates}
          showDuplicates={showDuplicates}
          setShowDuplicates={setShowDuplicates}
          onResolve={handleResolveDuplicate}
        />
      )}

      {/* Filtreler */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#969696]" />
          <input
            type="text"
            placeholder="Kural ara (ID, isim, açıklama)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D0] bg-white"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D0] bg-white min-w-[150px]"
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map(cat => (
            <option key={cat.category} value={cat.category}>
              {categoryLabels[cat.category] || cat.category} ({cat.count})
            </option>
          ))}
        </select>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-4 py-2 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D0] bg-white min-w-[120px]"
        >
          <option value="all">Tüm Öncelikler</option>
          <option value="CRITICAL">Kritik</option>
          <option value="HIGH">Yüksek</option>
          <option value="MEDIUM">Orta</option>
          <option value="LOW">Düşük</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <ConnectionError
          variant="banner"
          context="Kural verileri"
          onRetry={loadData}
        />
      )}

      {/* Kural Listesi */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-[#0049AA] border-t-transparent rounded-full"></div>
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 text-[#969696]">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Kural bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <RuleCard
              key={rule.rule_id}
              rule={rule}
              onClick={() => handleRuleClick(rule)}
            />
          ))}
        </div>
      )}

      {/* Sayfa Bilgisi */}
      <div className="text-center text-sm text-[#969696]">
        Toplam {rules.length} kural gösteriliyor
      </div>

      {/* Detay Modal */}
      {selectedRule && (
        <RuleDetailModal
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
        />
      )}
    </div>
  );
}
