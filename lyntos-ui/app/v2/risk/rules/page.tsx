'use client';

/**
 * Risk Kuralları Yönetim Sayfası
 * VDK ve özel risk kurallarının yönetimi
 *
 * SAMPLE_RULES mock data kaldırıldı - gerçek veri API'den gelecek
 */

import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Search, Filter, ToggleLeft, CheckCircle, Loader2, FileWarning } from 'lucide-react';

// RiskRule type - gerçek API'den gelecek
interface RiskRule {
  id: string;
  name: string;
  category: 'VDK Kritik' | 'VDK Standart' | 'Özel Kural';
  status: 'active' | 'inactive';
  severity: 'critical' | 'warning' | 'info';
  threshold: string;
}

export default function RiskRulesPage() {
  // State - API'den gelecek veriler için
  const [rules, setRules] = useState<RiskRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // TODO: API'den risk kuralları çek
    // GET /api/v2/rules
    const fetchRules = async () => {
      try {
        // API entegrasyonu yapılınca aktif edilecek
        // const response = await fetch('/api/v2/rules');
        // const data = await response.json();
        // setRules(data);
        setRules([]); // Şimdilik boş başlat
      } catch (error) {
        console.error('Risk kuralları yüklenemedi:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRules();
  }, []);

  // Arama filtresi
  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Risk Kuralları</h1>
          <p className="text-slate-600 mt-1">
            VDK kriterleri ve özel risk kurallarını yönetin
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          Yeni Kural
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Kural ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <Filter className="w-4 h-4" />
          Filtrele
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-600">Risk kuralları yükleniyor...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <FileWarning className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {rules.length === 0 ? 'Henüz kural tanımlanmadı' : 'Sonuç bulunamadı'}
          </h3>
          <p className="text-slate-600 text-center max-w-md mb-6">
            {rules.length === 0
              ? 'VDK kriterleri ve özel risk kuralları backend entegrasyonu ile yüklenecektir.'
              : 'Arama kriterlerinize uygun kural bulunamadı.'
            }
          </p>
          {rules.length === 0 && (
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              İlk Kuralı Ekle
            </button>
          )}
        </div>
      ) : (
        /* Rules Table */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Kural ID</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Kural Adı</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Kategori</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Eşik</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-600">{rule.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-900">{rule.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      rule.category === 'VDK Kritik'
                        ? 'bg-red-100 text-red-700'
                        : rule.category === 'VDK Standart'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {rule.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 font-mono">{rule.threshold}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1 text-sm ${
                      rule.status === 'active' ? 'text-green-600' : 'text-slate-400'
                    }`}>
                      {rule.status === 'active' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      {rule.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <GitBranch className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Kural Kütüphanesi</p>
          <p className="text-sm text-blue-700 mt-1">
            50+ hazır VDK kuralı ve özelleştirilebilir eşikler.
            Her kural legal_basis_refs ve evidence_refs ile desteklenir.
          </p>
        </div>
      </div>
    </div>
  );
}
