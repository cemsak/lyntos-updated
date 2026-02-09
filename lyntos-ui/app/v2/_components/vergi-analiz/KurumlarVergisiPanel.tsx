'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingDown,
  Sparkles,
  FileText,
  Calendar,
  HelpCircle,
  Building,
} from 'lucide-react';
import { Card } from '../shared/Card';
import type { KontrolDurumu } from './types';
import { KURUMLAR_VERGISI_KONTROLLER } from './types';
import { CategoryInfoModal, MatrahHesaplama, KontrolItem, MatrahPlaceholder, type MatrahVerileri } from './_components';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface KurumlarVergisiPanelProps {
  yil?: number;
  kontrolDurumlari?: Record<string, KontrolDurumu>;
  matrahVerileri?: MatrahVerileri;
  onKontrolClick?: (kontrolId: string) => void;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function KurumlarVergisiPanel({
  yil = 2025,
  kontrolDurumlari = {},
  matrahVerileri,
  onKontrolClick,
}: KurumlarVergisiPanelProps) {
  const [expandedKontrol, setExpandedKontrol] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tumu' | 'risk' | 'avantaj' | 'zorunlu'>('tumu');
  const [selectedCategory, setSelectedCategory] = useState<'risk' | 'avantaj' | 'zorunlu' | null>(null);

  // Matrah verileri props'tan gelir - mock yok
  const hasMatrahData = matrahVerileri !== undefined;

  const kontrollerWithDurum = useMemo(() => {
    return KURUMLAR_VERGISI_KONTROLLER.map(kontrol => ({
      ...kontrol,
      durum: kontrolDurumlari[kontrol.id] || 'bekliyor' as KontrolDurumu,
    }));
  }, [kontrolDurumlari]);

  const filteredKontroller = useMemo(() => {
    if (activeTab === 'tumu') return kontrollerWithDurum;
    return kontrollerWithDurum.filter(k => k.kontrolTipi === activeTab);
  }, [kontrollerWithDurum, activeTab]);

  const stats = useMemo(() => {
    const tamamlanan = kontrollerWithDurum.filter(k => k.durum === 'tamamlandi').length;
    const uyari = kontrollerWithDurum.filter(k => k.durum === 'uyari').length;
    const hata = kontrollerWithDurum.filter(k => k.durum === 'hata').length;
    const riskKontrol = kontrollerWithDurum.filter(k => k.kontrolTipi === 'risk').length;
    const avantajKontrol = kontrollerWithDurum.filter(k => k.kontrolTipi === 'avantaj').length;
    const zorunluKontrol = kontrollerWithDurum.filter(k => k.kontrolTipi === 'zorunlu').length;
    const oran = Math.round((tamamlanan / kontrollerWithDurum.length) * 100);
    return { tamamlanan, uyari, hata, oran, toplam: kontrollerWithDurum.length, riskKontrol, avantajKontrol, zorunluKontrol };
  }, [kontrollerWithDurum]);

  const toggleExpand = (kontrolId: string) => {
    setExpandedKontrol(prev => prev === kontrolId ? null : kontrolId);
  };

  // Son odeme tarihi (30 Nisan)
  const sonOdemeTarihi = new Date(yil + 1, 3, 30);
  const bugun = new Date();
  const kalanGun = Math.ceil((sonOdemeTarihi.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ECFDF5] rounded-lg">
              <Building className="w-6 h-6 text-[#00804D]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2E2E2E]">Kurumlar Vergisi Analizi</h2>
              <p className="text-[#969696] text-sm">{yil} Hesap Dönemi</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#2E2E2E]">{stats.tamamlanan}/{stats.toplam}</div>
            <div className="text-[#969696] text-sm">Kontrol Tamamlandi</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00A651] to-[#00CB50] rounded-full transition-all duration-500"
              style={{ width: `${stats.oran}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-[#969696]">%{stats.oran} tamamlandi</span>
            <span className={`flex items-center gap-1 ${kalanGun > 30 ? 'text-[#00804D]' : kalanGun > 0 ? 'text-[#FA841E]' : 'text-[#BF192B]'}`}>
              <Calendar className="w-4 h-4" />
              Son Beyan: 30 Nisan {yil + 1}
              {kalanGun > 0 ? ` (${kalanGun} gun kaldi)` : ' (Sure doldu!)'}
            </span>
          </div>
        </div>

        {/* Tip Istatistikleri - Clickable Cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedCategory('risk')}
            className="bg-[#FEF2F2] rounded-lg p-3 border border-[#FFC7C9] text-left hover:bg-[#FEF2F2] hover:scale-[1.02] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-[#BF192B] text-sm">
                <TrendingDown className="w-4 h-4" />
                Risk Kontrolleri
              </div>
              <HelpCircle className="w-4 h-4 text-[#FF555F] hover:text-[#BF192B]" />
            </div>
            <div className="text-2xl font-bold text-[#BF192B]">{stats.riskKontrol}</div>
            <p className="text-xs text-[#F0282D] mt-1">Tikla: Detayli bilgi</p>
          </button>
          <button
            onClick={() => setSelectedCategory('avantaj')}
            className="bg-[#ECFDF5] rounded-lg p-3 border border-[#AAE8B8] text-left hover:bg-[#ECFDF5] hover:scale-[1.02] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-[#00804D] text-sm">
                <Sparkles className="w-4 h-4" />
                Vergi Avantajlari
              </div>
              <HelpCircle className="w-4 h-4 text-[#00CB50] hover:text-[#00804D]" />
            </div>
            <div className="text-2xl font-bold text-[#00804D]">{stats.avantajKontrol}</div>
            <p className="text-xs text-[#00A651] mt-1">Tikla: Detayli bilgi</p>
          </button>
          <button
            onClick={() => setSelectedCategory('zorunlu')}
            className="bg-[#E6F9FF] rounded-lg p-3 border border-[#ABEBFF] text-left hover:bg-[#E6F9FF] hover:scale-[1.02] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-[#0049AA] text-sm">
                <FileText className="w-4 h-4" />
                Zorunlu Kontroller
              </div>
              <HelpCircle className="w-4 h-4 text-[#00B4EB] hover:text-[#0049AA]" />
            </div>
            <div className="text-2xl font-bold text-[#0049AA]">{stats.zorunluKontrol}</div>
            <p className="text-xs text-[#0078D0] mt-1">Tikla: Detayli bilgi</p>
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-col gap-6">
        {/* Sol: Kontrol Listesi - flexible */}
        <div className="flex-1 min-w-0">
          <Card title="20 Kritik Kontrol" subtitle="Risk, Avantaj ve Zorunlu Kontroller">
            {/* Tab Buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setActiveTab('tumu')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === 'tumu'
                    ? 'bg-[#2E2E2E] text-white'
                    : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
                }`}
              >
                Tumu ({stats.toplam})
              </button>
              <button
                onClick={() => setActiveTab('zorunlu')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'zorunlu'
                    ? 'bg-[#0049AA] text-white'
                    : 'bg-[#E6F9FF] text-[#0049AA] hover:bg-[#E6F9FF]'
                }`}
              >
                <FileText className="w-3 h-3" />
                Zorunlu ({stats.zorunluKontrol})
              </button>
              <button
                onClick={() => setActiveTab('risk')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'risk'
                    ? 'bg-[#BF192B] text-white'
                    : 'bg-[#FEF2F2] text-[#BF192B] hover:bg-[#FEF2F2]'
                }`}
              >
                <TrendingDown className="w-3 h-3" />
                Risk ({stats.riskKontrol})
              </button>
              <button
                onClick={() => setActiveTab('avantaj')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'avantaj'
                    ? 'bg-[#00804D] text-white'
                    : 'bg-[#ECFDF5] text-[#00804D] hover:bg-[#ECFDF5]'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Avantaj ({stats.avantajKontrol})
              </button>
            </div>

            {/* Kontrol Listesi */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredKontroller.map((kontrol) => (
                <KontrolItem
                  key={kontrol.id}
                  kontrol={kontrol}
                  isExpanded={expandedKontrol === kontrol.id}
                  onToggle={() => toggleExpand(kontrol.id)}
                  onKontrolClick={onKontrolClick}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="pt-4 mt-4 border-t border-[#E5E5E5] flex items-center justify-between text-sm">
              <div className="flex gap-4">
                <span className="flex items-center gap-1 text-[#00804D]">
                  <CheckCircle2 className="w-4 h-4" />
                  {stats.tamamlanan}
                </span>
                <span className="flex items-center gap-1 text-[#FFB114]">
                  <AlertTriangle className="w-4 h-4" />
                  {stats.uyari}
                </span>
                <span className="flex items-center gap-1 text-[#F0282D]">
                  <XCircle className="w-4 h-4" />
                  {stats.hata}
                </span>
              </div>
              <button className="text-xs text-[#969696] hover:text-[#5A5A5A]">
                Rapor Indir
              </button>
            </div>
          </Card>
        </div>

        {/* Sag: Matrah Hesaplama - full width */}
        <div className="w-full">
          {hasMatrahData && matrahVerileri ? (
            <MatrahHesaplama veriler={matrahVerileri} yil={yil} />
          ) : (
            <MatrahPlaceholder />
          )}
        </div>
      </div>

      {/* Category Info Modal */}
      <CategoryInfoModal
        category={selectedCategory}
        onClose={() => setSelectedCategory(null)}
      />
    </div>
  );
}

export default KurumlarVergisiPanel;
