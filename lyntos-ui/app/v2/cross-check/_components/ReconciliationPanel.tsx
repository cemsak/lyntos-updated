/**
 * C2 & C3: Mutabakat Kontrolleri Paneli
 */

import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { CheckResult, AccountComparison, FilterType, TabType } from '../_types';
import { getSeverityBadge, getDurumBadge } from './StatusBadges';
import { formatCurrency } from '../../_lib/format';

interface ReconciliationPanelProps {
  reconciliationChecks: CheckResult[];
  yevmiyeKebirDetails: AccountComparison[];
  kebirMizanDetails: AccountComparison[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  loading: boolean;
}

export function ReconciliationPanel({
  reconciliationChecks,
  yevmiyeKebirDetails,
  kebirMizanDetails,
  activeTab,
  setActiveTab,
  filter,
  setFilter,
  loading,
}: ReconciliationPanelProps) {
  const router = useRouter();

  // Aktif tab'a göre doğru detayları al
  const getActiveDetails = () => {
    const details = activeTab === 'c2' ? yevmiyeKebirDetails : kebirMizanDetails;
    return details.filter((r) => {
      if (filter === 'ok') return r.durum === 'OK';
      if (filter === 'fark') return r.durum === 'FARK_VAR';
      if (filter === 'sadece') return r.durum.startsWith('SADECE_');
      return true;
    });
  };

  const getActiveCheck = () => {
    return reconciliationChecks.find(c => c.check_type === (activeTab === 'c2' ? 'C2' : 'C3'));
  };

  const activeCheck = getActiveCheck();
  const filteredResults = getActiveDetails();

  // Özet hesaplama
  const getTabSummary = () => {
    if (!activeCheck) return { toplam: 0, esit: 0, farkli: 0, sadece: 0 };
    const d = activeCheck.details;
    return {
      toplam: d.toplam_hesap || 0,
      esit: d.esit_hesap || 0,
      farkli: d.farkli_hesap || 0,
      sadece: (d.sadece_yevmiye || 0) + (d.sadece_kebir || 0) + (d.sadece_mizan || 0),
    };
  };

  const tabSummary = getTabSummary();

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-[#E5E5E5]">
        {reconciliationChecks.map((check) => {
          const isActive = (check.check_type === 'C2' && activeTab === 'c2') ||
                           (check.check_type === 'C3' && activeTab === 'c3');
          return (
            <button
              key={check.check_type}
              onClick={() => setActiveTab(check.check_type === 'C2' ? 'c2' : 'c3')}
              className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 ${
                isActive
                  ? 'bg-white border-b-2 border-[#0078D0] text-[#0049AA]'
                  : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#F5F6F8]'
              }`}
            >
              {getSeverityBadge(check.severity, check.passed)}
              <span className="font-medium">{check.check_type}: {check.check_name}</span>
            </button>
          );
        })}
      </div>

      {/* C3: Dönem Uyuşmazlığı Uyarısı */}
      {activeTab === 'c3' && activeCheck?.details.donem_uyumsuzluk && (
        <div className="px-4 py-4 bg-[#FFFBEB] border-b border-[#FFF08C]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[#FA841E] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-[#E67324] mb-1">Dönem Uyuşmazlığı Tespit Edildi</h4>
              <p className="text-sm text-[#FA841E] mb-3">
                {activeCheck.details.donem_uyumsuzluk.aciklama}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/70 rounded-lg p-3">
                  <p className="text-[#FA841E] font-medium mb-2">Kebir (Dönem: {activeCheck.details.kebir_aylar?.join(', ')})</p>
                  <div className="flex justify-between">
                    <span>Toplam Borç:</span>
                    <span className="font-mono font-semibold">{formatCurrency(activeCheck.details.kebir_toplam_borc || 0)}</span>
                  </div>
                </div>
                <div className="bg-white/70 rounded-lg p-3">
                  <p className="text-[#FA841E] font-medium mb-2">Mizan (Eksik Ay: {activeCheck.details.donem_uyumsuzluk.muhtemel_eksik_ay})</p>
                  <div className="flex justify-between">
                    <span>Toplam Borç:</span>
                    <span className="font-mono font-semibold">{formatCurrency(activeCheck.details.mizan_toplam_borc || 0)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-[#FFFBEB]/50 rounded text-xs text-[#E67324]">
                <strong>Çözüm önerisi:</strong> Mizan dosyasının tüm çeyreği (Q1) kapsadığından emin olun. Mevcut Mizan dosyası muhtemelen sadece Şubat-Mart verisi içeriyor.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Özet Kartları */}
      <div className="p-4 bg-[#F5F6F8] border-b border-[#E5E5E5]">
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-3 border border-[#E5E5E5]">
            <p className="text-xs text-[#969696] mb-1">Toplam Hesap</p>
            <p className="text-xl font-bold text-[#2E2E2E]">{tabSummary.toplam}</p>
          </div>
          <div className="bg-[#ECFDF5] rounded-lg p-3 border border-[#AAE8B8]">
            <p className="text-xs text-[#00804D] mb-1">Eşleşen</p>
            <p className="text-xl font-bold text-[#00804D]">{tabSummary.esit}</p>
          </div>
          <div className="bg-[#FEF2F2] rounded-lg p-3 border border-[#FFC7C9]">
            <p className="text-xs text-[#BF192B] mb-1">Farklı</p>
            <p className="text-xl font-bold text-[#BF192B]">{tabSummary.farkli}</p>
          </div>
          <div className="bg-[#FFFBEB] rounded-lg p-3 border border-[#FFF08C]">
            <p className="text-xs text-[#FA841E] mb-1">Eksik</p>
            <p className="text-xl font-bold text-[#FA841E]">{tabSummary.sadece}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-[#E5E5E5]">
            <p className="text-xs text-[#969696] mb-1">Toplam Fark</p>
            <p className={`text-lg font-bold ${(activeCheck?.details.toplam_fark || 0) > 0 ? 'text-[#BF192B]' : 'text-[#00804D]'}`}>
              {formatCurrency(activeCheck?.details.toplam_fark || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-3 border-b border-[#E5E5E5]">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              filter === 'all' ? 'bg-[#0049AA] text-white' : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
            }`}
          >
            Tümü ({tabSummary.toplam})
          </button>
          <button
            onClick={() => setFilter('ok')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1 ${
              filter === 'ok' ? 'bg-[#00804D] text-white' : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Eşleşen ({tabSummary.esit})
          </button>
          <button
            onClick={() => setFilter('fark')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1 ${
              filter === 'fark' ? 'bg-[#BF192B] text-white' : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
            }`}
          >
            <XCircle className="w-3 h-3" />
            Farklı ({tabSummary.farkli})
          </button>
          <button
            onClick={() => setFilter('sadece')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1 ${
              filter === 'sadece' ? 'bg-[#FA841E] text-white' : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Eksik ({tabSummary.sadece})
          </button>
        </div>
      </div>

      {/* Detay Tablosu */}
      {loading ? (
        <div className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-[#0078D0] animate-spin mx-auto mb-4" />
          <p className="text-[#969696]">Hesaplanıyor...</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#00A651] mx-auto mb-4" />
          <p className="text-[#969696]">
            {filter === 'all' ? 'Karşılaştırılacak hesap bulunamadı' : 'Filtreye uygun sonuç yok'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-[#F5F6F8] border-b border-[#E5E5E5] sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Hesap</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">
                  {activeTab === 'c2' ? 'Yevmiye' : 'Kebir'} Borç
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">
                  {activeTab === 'c2' ? 'Yevmiye' : 'Kebir'} Alacak
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#5A5A5A] uppercase">
                  <ArrowRight className="w-4 h-4 inline" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">
                  {activeTab === 'c2' ? 'Kebir' : 'Mizan'} Borç
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">
                  {activeTab === 'c2' ? 'Kebir' : 'Mizan'} Alacak
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Borç Fark</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase">Alacak Fark</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#5A5A5A] uppercase">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {filteredResults.map((row, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-[#F5F6F8] ${
                    row.durum !== 'OK'
                      ? row.durum === 'FARK_VAR'
                        ? 'bg-[#FEF2F2]'
                        : 'bg-[#FFFBEB]'
                      : ''
                  }`}
                >
                  <td className="px-4 py-2">
                    <button
                      onClick={() => {
                        const target = activeTab === 'c2' ? '/v2/yevmiye' : '/v2/kebir';
                        router.push(`${target}?hesap=${encodeURIComponent(row.hesap_kodu)}`);
                      }}
                      className="text-left group"
                      title={`${activeTab === 'c2' ? 'Yevmiye' : 'Kebir'} defterinde görüntüle`}
                    >
                      <div className="text-sm font-medium text-[#0049AA] group-hover:underline flex items-center gap-1">
                        {row.hesap_kodu}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs text-[#969696] truncate max-w-[200px]">{row.hesap_adi}</div>
                    </button>
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono text-[#2E2E2E]">
                    {formatCurrency(row.source_borc)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono text-[#2E2E2E]">
                    {formatCurrency(row.source_alacak)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <ArrowRight className="w-4 h-4 text-[#969696] inline" />
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono text-[#2E2E2E]">
                    {formatCurrency(row.target_borc)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-mono text-[#2E2E2E]">
                    {formatCurrency(row.target_alacak)}
                  </td>
                  <td
                    className={`px-4 py-2 text-sm text-right font-mono font-semibold ${
                      Math.abs(row.borc_fark) > 0.01 ? 'text-[#BF192B]' : 'text-[#00804D]'
                    }`}
                  >
                    {formatCurrency(row.borc_fark)}
                  </td>
                  <td
                    className={`px-4 py-2 text-sm text-right font-mono font-semibold ${
                      Math.abs(row.alacak_fark) > 0.01 ? 'text-[#BF192B]' : 'text-[#00804D]'
                    }`}
                  >
                    {formatCurrency(row.alacak_fark)}
                  </td>
                  <td className="px-4 py-2 text-center">{getDurumBadge(row.durum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
