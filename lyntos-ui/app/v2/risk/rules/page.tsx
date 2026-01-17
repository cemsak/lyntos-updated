'use client';

import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Shield, ToggleLeft, ToggleRight, AlertTriangle, X } from 'lucide-react';

// VDK Standart 13 Kriter
const VDK_KURALLARI = [
  {
    id: 'VDK-01',
    name: 'Kasa Hesabi Negatif Bakiye',
    category: 'mizan',
    severity: 'critical',
    description: 'Kasa hesabi (100) negatif bakiye gosteremez.',
    legalBasis: 'VUK Md. 183',
    threshold: '< 0 TL'
  },
  {
    id: 'VDK-02',
    name: 'Ortaklara Borc Yuksek Bakiye',
    category: 'mizan',
    severity: 'critical',
    description: 'Ortaklardan alacaklar (131) hesabi yuksek bakiye - transfer fiyatlandirmasi riski.',
    legalBasis: 'KVK Md. 13',
    threshold: '> Ozsermaye %10'
  },
  {
    id: 'VDK-03',
    name: 'Stok Negatif Bakiye',
    category: 'mizan',
    severity: 'critical',
    description: 'Stok hesaplari (150-157) negatif bakiye gosteremez.',
    legalBasis: 'VUK Md. 186',
    threshold: '< 0 TL'
  },
  {
    id: 'VDK-04',
    name: 'KDV Beyanname Uyumsuzlugu',
    category: 'kdv',
    severity: 'critical',
    description: 'Mizan KDV hesaplari ile KDV beyannamesi tutarlari uyusmali.',
    legalBasis: 'KDV Kanunu Md. 29',
    threshold: 'Fark > %1'
  },
  {
    id: 'VDK-05',
    name: 'Muhtasar Tutarsizligi',
    category: 'muhtasar',
    severity: 'high',
    description: 'Stopaj hesabi (360) ile muhtasar beyanname tutari uyusmali.',
    legalBasis: 'GVK Md. 94',
    threshold: 'Fark > %1'
  },
  {
    id: 'VDK-06',
    name: 'Banka Hesap Mutabakati',
    category: 'banka',
    severity: 'high',
    description: 'Mizan banka hesabi (102) ile banka ekstresi bakiyesi uyusmali.',
    legalBasis: 'VUK Md. 177',
    threshold: 'Fark > 100 TL'
  },
  {
    id: 'VDK-07',
    name: 'Amortisman Hesaplama Kontrolu',
    category: 'mizan',
    severity: 'medium',
    description: 'Amortisman giderleri yasal oranlara uygun hesaplanmali.',
    legalBasis: 'VUK Md. 315-318',
    threshold: 'Oran sapmasi > %5'
  },
  {
    id: 'VDK-08',
    name: 'Supheli Alacak Karsiligi',
    category: 'mizan',
    severity: 'medium',
    description: 'Supheli alacaklar icin karsilik ayrilma sartlari kontrolu.',
    legalBasis: 'VUK Md. 323',
    threshold: 'Dava/Icra sarti'
  },
  {
    id: 'VDK-09',
    name: 'Kidem Tazminati Karsiligi',
    category: 'mizan',
    severity: 'medium',
    description: 'Personel kidem tazminati karsiligi yeterliligi.',
    legalBasis: 'TMS 19',
    threshold: 'Eksik karsilik'
  },
  {
    id: 'VDK-10',
    name: 'KKEG Kontrolu',
    category: 'kurumlar',
    severity: 'high',
    description: 'Kanunen kabul edilmeyen giderler dogru siniflandirilmali.',
    legalBasis: 'KVK Md. 11',
    threshold: 'KKEG eksik'
  },
  {
    id: 'VDK-11',
    name: 'Transfer Fiyatlandirmasi',
    category: 'kurumlar',
    severity: 'critical',
    description: 'Iliskili kisi islemleri emsallere uygun olmali.',
    legalBasis: 'KVK Md. 13',
    threshold: 'Emsal sapma > %10'
  },
  {
    id: 'VDK-12',
    name: 'Ortulu Sermaye',
    category: 'kurumlar',
    severity: 'critical',
    description: 'Ortaklardan borclanma ozsermayenin 3 katini asmamali.',
    legalBasis: 'KVK Md. 12',
    threshold: 'Borc > Ozsermaye x3'
  },
  {
    id: 'VDK-13',
    name: 'Enflasyon Duzeltmesi',
    category: 'enflasyon',
    severity: 'high',
    description: 'Enflasyon duzeltmesi sartlari ve hesaplama kontrolu.',
    legalBasis: 'VUK Gec. Md. 33',
    threshold: 'Yi-UFE > %100 (3 yil)'
  }
];

interface Rule {
  id: string;
  name: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  legalBasis: string;
  threshold: string;
  isActive: boolean;
}

export default function RiskRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

  useEffect(() => {
    // localStorage'dan aktif/pasif durumlarini oku
    const storedStatus = localStorage.getItem('lyntos_rule_status');
    const statusMap = storedStatus ? JSON.parse(storedStatus) : {};

    const loadedRules: Rule[] = VDK_KURALLARI.map(r => ({
      ...r,
      severity: r.severity as Rule['severity'],
      isActive: statusMap[r.id] !== false // varsayilan aktif
    }));

    setRules(loadedRules);
    setIsLoading(false);
  }, []);

  const toggleRule = (id: string) => {
    setRules(prev => {
      const updated = prev.map(r =>
        r.id === id ? { ...r, isActive: !r.isActive } : r
      );

      // localStorage'a kaydet
      const statusMap: Record<string, boolean> = {};
      updated.forEach(r => { statusMap[r.id] = r.isActive; });
      localStorage.setItem('lyntos_rule_status', JSON.stringify(statusMap));

      return updated;
    });
  };

  const filteredRules = rules.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const severityConfig = {
    critical: { label: 'Kritik', color: 'bg-red-100 text-red-700' },
    high: { label: 'Yuksek', color: 'bg-orange-100 text-orange-700' },
    medium: { label: 'Orta', color: 'bg-yellow-100 text-yellow-700' },
    low: { label: 'Dusuk', color: 'bg-green-100 text-green-700' }
  };

  const categoryLabels: Record<string, string> = {
    mizan: 'Mizan',
    kdv: 'KDV',
    muhtasar: 'Muhtasar',
    banka: 'Banka',
    kurumlar: 'Kurumlar',
    enflasyon: 'Enflasyon'
  };

  const activeCount = rules.filter(r => r.isActive).length;
  const criticalCount = rules.filter(r => r.severity === 'critical' && r.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Risk Kurallari</h1>
          <p className="text-slate-600 mt-1">VDK kriterleri ve ozel risk kurallarini yonetin</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="bg-blue-50 px-3 py-1 rounded-lg">
            <span className="text-blue-700 font-medium">{activeCount}</span>
            <span className="text-blue-600"> aktif kural</span>
          </div>
          <div className="bg-red-50 px-3 py-1 rounded-lg">
            <span className="text-red-700 font-medium">{criticalCount}</span>
            <span className="text-red-600"> kritik</span>
          </div>
        </div>
      </div>

      {/* Kural Kutuphanesi Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-900">VDK Kural Kutuphanesi</p>
            <p className="text-sm text-blue-700">
              {VDK_KURALLARI.length} hazir VDK kriteri. Her kural yasal dayanak ve esik degeri ile desteklenir.
            </p>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Kural ara (ID, isim, aciklama)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tum Kategoriler</option>
          <option value="mizan">Mizan</option>
          <option value="kdv">KDV</option>
          <option value="muhtasar">Muhtasar</option>
          <option value="banka">Banka</option>
          <option value="kurumlar">Kurumlar</option>
          <option value="enflasyon">Enflasyon</option>
        </select>
      </div>

      {/* Kural Listesi */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map(rule => (
            <div
              key={rule.id}
              className={`border rounded-lg p-4 transition-all ${
                rule.isActive ? 'bg-white border-slate-200 hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedRule(rule)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {rule.id}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${severityConfig[rule.severity].color}`}>
                      {severityConfig[rule.severity].label}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {categoryLabels[rule.category]}
                    </span>
                  </div>
                  <h3 className="font-medium text-slate-900">{rule.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{rule.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>Yasal: {rule.legalBasis}</span>
                    <span>Esik: {rule.threshold}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className="ml-4 p-1"
                >
                  {rule.isActive ? (
                    <ToggleRight className="w-8 h-8 text-blue-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detay Modal */}
      {selectedRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {selectedRule.id}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${severityConfig[selectedRule.severity].color}`}>
                    {severityConfig[selectedRule.severity].label}
                  </span>
                </div>
                <button onClick={() => setSelectedRule(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedRule.name}</h2>
              <p className="text-slate-600 mb-6">{selectedRule.description}</p>

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-slate-700">Yasal Dayanak</span>
                  </div>
                  <p className="text-slate-600">{selectedRule.legalBasis}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-slate-700">Esik Degeri</span>
                  </div>
                  <p className="text-slate-600">{selectedRule.threshold}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setSelectedRule(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  toggleRule(selectedRule.id);
                  setSelectedRule(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  selectedRule.isActive
                    ? 'bg-slate-600 text-white hover:bg-slate-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {selectedRule.isActive ? 'Kurali Devre Disi Birak' : 'Kurali Aktiflestir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
