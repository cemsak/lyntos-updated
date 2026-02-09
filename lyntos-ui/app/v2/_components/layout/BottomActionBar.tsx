'use client';

/**
 * LYNTOS BottomActionBar Component
 * Sprint 2.5 - Layout Optimization
 *
 * Altta sabit yatay kompakt bar:
 * - Dönem durumu özeti
 * - Eksik belgeler
 * - Kanıt Paketi oluşturma
 * - Hızlı aksiyonlar
 *
 * RightRail'in yerini alır, ana içerik alanını genişletir
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  FileX,
  FileCheck,
  FolderArchive,
  ChevronUp,
  ChevronDown,
  Upload,
  BarChart3,
  ShieldAlert,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Package,
} from 'lucide-react';
import { useDashboardScope, useScopeComplete } from '../scope/useDashboardScope';
import { useRightRailData } from '../../_hooks/useRightRailData';

// ============================================================================
// TYPES
// ============================================================================

interface BottomActionBarProps {
  onGenerateBundle?: () => void;
  isGeneratingBundle?: boolean;
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'danger' | 'neutral' | 'loading';
  children: React.ReactNode;
  count?: number;
}

function StatusBadge({ status, children, count }: StatusBadgeProps) {
  const colors = {
    success: 'bg-[#ECFDF5] text-[#00804D] border-[#AAE8B8]',
    warning: 'bg-[#FFFBEB] text-[#FA841E] border-[#FFF08C]',
    danger: 'bg-[#FEF2F2] text-[#BF192B] border-[#FFC7C9]',
    neutral: 'bg-[#F5F6F8] text-[#5A5A5A] border-[#E5E5E5]',
    loading: 'bg-[#E6F9FF] text-[#0049AA] border-[#ABEBFF]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      {children}
      {count !== undefined && (
        <span className="bg-white/50 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
          {count}
        </span>
      )}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BottomActionBar({ onGenerateBundle, isGeneratingBundle = false }: BottomActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get scope from context
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  // Fetch real data from backend APIs
  const { data: apiData, isLoading } = useRightRailData(
    scopeComplete ? scope.period : null,
    scope.smmm_id || 'default',
    scope.client_id || 'default'
  );

  // Derived values
  const tamamlananBelge = apiData.presentDocCount;
  const toplamBelge = apiData.totalDocCategories;
  const eksikBelge = apiData.missingDocCount;
  const tamamlanmaYuzde = apiData.completionPercent;
  const kritikSayisi = apiData.criticalCount;
  const yuksekSayisi = apiData.highCount;
  const completedDocs = apiData.completedDocuments;

  // Kanıt paketi durumu
  const kanitPaketiHazir = tamamlananBelge === toplamBelge;
  const kanitPaketiDurumu = kanitPaketiHazir ? 'hazir' : eksikBelge > 0 ? 'eksik' : 'bekliyor';

  // Status for main bar
  const getOverallStatus = () => {
    if (kritikSayisi > 0) return 'danger';
    if (eksikBelge > 0 || yuksekSayisi > 0) return 'warning';
    if (kanitPaketiHazir) return 'success';
    return 'neutral';
  };

  const overallStatus = getOverallStatus();

  // Status colors for the bar
  const barColors = {
    danger: 'from-[#BF192B] to-[#BF192B]',
    warning: 'from-[#FFB114] to-[#FA841E]',
    success: 'from-[#00804D] to-[#00804D]',
    neutral: 'from-[#5A5A5A] to-[#5A5A5A]',
  };

  // Eksik belge listesi (6 Big-6 kategorisi)
  const BIG_6_LABELS: Record<string, string> = {
    MIZAN: 'Mizan',
    BEYANNAME: 'Beyanname',
    TAHAKKUK: 'Tahakkuk',
    BANKA: 'Banka',
    EDEFTER_BERAT: 'e-Defter',
    EFATURA_ARSIV: 'e-Fatura',
  };

  const eksikBelgeler = Object.keys(BIG_6_LABELS).filter(
    key => !completedDocs.includes(BIG_6_LABELS[key])
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="bg-white border-t border-[#E5E5E5] shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-3 gap-6">
              {/* Sol: Dönem Durumu */}
              <div>
                <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-3">
                  Dönem Durumu
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5A5A5A]">Tamamlanan Belgeler</span>
                    <span className="font-semibold text-[#2E2E2E]">
                      {tamamlananBelge}/{toplamBelge}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        tamamlanmaYuzde === 100 ? 'bg-[#00A651]' :
                        tamamlanmaYuzde >= 50 ? 'bg-[#FFB114]' : 'bg-[#F0282D]'
                      }`}
                      style={{ width: `${tamamlanmaYuzde}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {completedDocs.map((doc) => (
                      <span
                        key={doc}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#00804D]"
                      >
                        ✓ {doc}
                      </span>
                    ))}
                    {eksikBelgeler.map((key) => (
                      <span
                        key={key}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F6F8] text-[#969696]"
                      >
                        ○ {BIG_6_LABELS[key]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Orta: Risk Özeti */}
              <div>
                <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-3">
                  Risk Özeti
                </h4>
                <div className="flex items-center gap-3">
                  {kritikSayisi > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FEF2F2] border border-[#FFC7C9]">
                      <XCircle className="w-4 h-4 text-[#F0282D]" />
                      <div>
                        <div className="text-lg font-bold text-[#BF192B]">{kritikSayisi}</div>
                        <div className="text-[10px] text-[#F0282D] uppercase">Kritik</div>
                      </div>
                    </div>
                  )}
                  {yuksekSayisi > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFFBEB] border border-[#FFF08C]">
                      <AlertTriangle className="w-4 h-4 text-[#FFB114]" />
                      <div>
                        <div className="text-lg font-bold text-[#FA841E]">{yuksekSayisi}</div>
                        <div className="text-[10px] text-[#FFB114] uppercase">Yüksek</div>
                      </div>
                    </div>
                  )}
                  {kritikSayisi === 0 && yuksekSayisi === 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ECFDF5] border border-[#AAE8B8]">
                      <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
                      <div>
                        <div className="text-sm font-medium text-[#00804D]">Risk Yok</div>
                        <div className="text-[10px] text-[#00A651]">Tüm kontroller geçti</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/v2/vdk"
                    className="text-xs text-[#0049AA] hover:text-[#00287F] hover:underline flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    VDK Risk Detayı
                  </Link>
                  <Link
                    href="/v2/reports"
                    className="text-xs text-[#0049AA] hover:text-[#00287F] hover:underline flex items-center gap-1"
                  >
                    <BarChart3 className="w-3 h-3" />
                    Dönem Raporu
                  </Link>
                </div>
              </div>

              {/* Sağ: Kanıt Paketi */}
              <div>
                <h4 className="text-xs font-semibold text-[#969696] uppercase tracking-wide mb-3">
                  Dönem Sonu Kanıt Paketi
                </h4>
                <div className={`p-3 rounded-lg border ${
                  kanitPaketiHazir
                    ? 'bg-[#ECFDF5] border-[#AAE8B8]'
                    : 'bg-[#F5F6F8] border-[#E5E5E5]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className={`w-5 h-5 ${kanitPaketiHazir ? 'text-[#00804D]' : 'text-[#969696]'}`} />
                      <span className={`font-medium ${kanitPaketiHazir ? 'text-[#00804D]' : 'text-[#5A5A5A]'}`}>
                        {kanitPaketiHazir ? 'Paket Hazır' : `%${tamamlanmaYuzde} Tamamlandı`}
                      </span>
                    </div>
                    {kanitPaketiHazir ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00A651]" />
                    ) : (
                      <Clock className="w-5 h-5 text-[#969696]" />
                    )}
                  </div>

                  {!kanitPaketiHazir && eksikBelge > 0 && (
                    <p className="text-xs text-[#969696] mb-3">
                      Kanıt paketi oluşturmak için {eksikBelge} eksik belgeyi yükleyin
                    </p>
                  )}

                  <div className="flex gap-2">
                    {kanitPaketiHazir ? (
                      <button
                        onClick={onGenerateBundle}
                        disabled={isGeneratingBundle}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#00804D] hover:bg-[#00804D] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isGeneratingBundle ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Oluşturuluyor...
                          </>
                        ) : (
                          <>
                            <FolderArchive className="w-4 h-4" />
                            Paketi Oluştur
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        href="/v2/upload"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0049AA] hover:bg-[#0049AA] text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Belge Yükle
                      </Link>
                    )}
                    <Link
                      href="/v2/reports/evidence"
                      className="flex items-center justify-center px-3 py-2 border border-[#B4B4B4] hover:border-[#969696] text-[#5A5A5A] text-sm rounded-lg transition-colors"
                    >
                      Detay
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Bar (Always Visible) */}
      <div className={`bg-gradient-to-r ${barColors[overallStatus]} text-white shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Sol: Dönem Özeti */}
            <div className="flex items-center gap-6">
              {/* Tamamlanma */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm font-bold">%{tamamlanmaYuzde}</span>
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs opacity-80">Dönem Durumu</div>
                  <div className="text-sm font-medium">{tamamlananBelge}/{toplamBelge} Belge</div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-white/20" />

              {/* Risk Badges */}
              <div className="flex items-center gap-2">
                {kritikSayisi > 0 && (
                  <StatusBadge status="danger" count={kritikSayisi}>
                    <XCircle className="w-3 h-3" />
                    Kritik
                  </StatusBadge>
                )}
                {yuksekSayisi > 0 && (
                  <StatusBadge status="warning" count={yuksekSayisi}>
                    <AlertTriangle className="w-3 h-3" />
                    Yüksek
                  </StatusBadge>
                )}
                {eksikBelge > 0 && (
                  <StatusBadge status="neutral" count={eksikBelge}>
                    <FileX className="w-3 h-3" />
                    Eksik
                  </StatusBadge>
                )}
                {kritikSayisi === 0 && yuksekSayisi === 0 && eksikBelge === 0 && (
                  <StatusBadge status="success">
                    <CheckCircle2 className="w-3 h-3" />
                    Tamamlandı
                  </StatusBadge>
                )}
              </div>
            </div>

            {/* Sağ: Kanıt Paketi & Expand */}
            <div className="flex items-center gap-4">
              {/* Kanıt Paketi Quick Action */}
              {kanitPaketiHazir ? (
                <button
                  onClick={onGenerateBundle}
                  disabled={isGeneratingBundle}
                  className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isGeneratingBundle ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderArchive className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Kanıt Paketi Oluştur</span>
                  <span className="sm:hidden">Paket</span>
                </button>
              ) : (
                <Link
                  href="/v2/upload"
                  className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Eksik Belgeleri Yükle</span>
                  <span className="sm:hidden">Yükle</span>
                </Link>
              )}

              {/* Expand/Collapse Button */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Kapat</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Detay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BottomActionBar;
