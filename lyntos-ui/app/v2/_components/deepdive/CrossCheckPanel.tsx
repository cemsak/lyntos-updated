'use client';
import React, { useState, useEffect } from 'react';
import { HelpCircle, Check, Info, XCircle, AlertTriangle, CheckCircle2, FileSpreadsheet, Receipt } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { useDashboardScope, useScopeComplete } from '../scope/useDashboardScope';
import { api } from '../../_lib/api/client';
import type { V2CrossCheckResult } from './crosscheck-types';
import { EMPTY_STATE_STRUCTURE } from './crosscheck-constants';
import { getStatusConfig, getSeverityIcon, formatAmount } from './crosscheck-helpers';
import { CrossCheckInfoModal } from './CrossCheckInfoModal';

export { SahteFaturaRiskPanel } from './SahteFaturaRiskPanel';

export function CrossCheckPanel() {
  const scopeComplete = useScopeComplete();
  const { scope } = useDashboardScope();

  const [showSmmmInfo, setShowSmmmInfo] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [v2Data, setV2Data] = useState<V2CrossCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scopeComplete || !scope.period || !scope.smmm_id || !scope.client_id) {
      return;
    }

    const fetchV2Data = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: apiError } = await api.get<V2CrossCheckResult>(
          `/api/v2/cross-check/run/${scope.period}`,
          { params: { tenant_id: scope.smmm_id, client_id: scope.client_id } }
        );
        if (apiError || !data) {
          throw new Error(apiError || 'Kontrol verisi alınamadı');
        }
        setV2Data(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchV2Data();
  }, [scopeComplete, scope.period, scope.smmm_id, scope.client_id]);

  if (!scopeComplete) {
    return (
      <Card title="Mutabakat Matrisi" subtitle="Beyannameler • Teknik Kontroller • Mali Tablolar">
        <div className="py-8 text-center">
          <span className="text-4xl mb-4 block">🔄</span>
          <p className="text-sm text-[#969696]">Dönem seçildikten sonra mutabakat kontrolleri görünecektir.</p>
        </div>
      </Card>
    );
  }

  const hasData = v2Data && v2Data.checks && v2Data.checks.length > 0;
  const displayChecks = hasData ? v2Data.checks : [];
  const displaySummary = hasData ? {
    total: v2Data.total_checks,
    matched: v2Data.passed,
    discrepancies: v2Data.failed + v2Data.warnings,
    critical: v2Data.critical_issues,
  } : { total: 0, matched: 0, discrepancies: 0, critical: 0 };

  const handleRowClick = (checkId: string) => {
    setExpandedRowId(expandedRowId === checkId ? null : checkId);
  };

  return (
    <>
      <Card
        title={
          <span className="flex items-center gap-2">
            Mutabakat Matrisi
            <button
              onClick={() => setShowSmmmInfo(true)}
              className="text-[#969696] hover:text-[#0049AA] transition-colors"
              title="SMMM Rehberi"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </span>
        }
        subtitle="Beyannameler • Teknik Kontroller • Mali Tablolar"
        headerAction={
          hasData ? (
            <div className="flex items-center gap-2">
              <Badge variant="success">{displaySummary.matched} eşleşti</Badge>
              {displaySummary.discrepancies > 0 && (
                <Badge variant="warning">{displaySummary.discrepancies} fark</Badge>
              )}
            </div>
          ) : (
            <Badge variant="default">Veri Bekleniyor</Badge>
          )
        }
      >
        {/* Loading State */}
        {loading && (
          <div className="py-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#0049AA] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-[#969696]">Kontroller yükleniyor...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-8 text-center">
            <XCircle className="w-8 h-8 text-[#BF192B] mx-auto mb-3" />
            <p className="text-sm text-[#BF192B]">Veri yüklenemedi: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !hasData && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-[#969696]" />
              <h3 className="text-sm font-semibold text-[#5A5A5A]">Mutabakat Kontrolleri (Örnek Yapı)</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#969696] border-b border-[#E5E5E5] bg-[#F5F6F8]">
                    <th className="py-2 px-2 font-semibold">Muhasebe (Mizan)</th>
                    <th className="py-2 px-2 font-semibold">Karşı Veri</th>
                    <th className="py-2 px-2 text-right font-semibold">Tutar</th>
                    <th className="py-2 px-2 text-right font-semibold">Fark</th>
                    <th className="py-2 px-2 text-center font-semibold">Eşik</th>
                    <th className="py-2 px-2 text-center font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody className="text-[#969696]">
                  {EMPTY_STATE_STRUCTURE.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#F5F6F8] hover:bg-[#F5F6F8]/50">
                      <td className="py-2 px-2">
                        <span className="mr-1">{item.icon}</span>
                        <span className="text-[#5A5A5A]">{item.source}</span>
                      </td>
                      <td className="py-2 px-2 text-[#969696]">{item.target}</td>
                      <td className="text-right px-2">₺---</td>
                      <td className="text-right px-2">₺---</td>
                      <td className="text-center px-2">
                        <span className="text-[#969696] text-[10px]">{item.threshold}</span>
                      </td>
                      <td className="text-center px-2">
                        <button disabled className="text-[10px] text-[#B4B4B4] px-2 py-0.5 border border-[#E5E5E5] rounded">
                          Detay
                        </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-[#0049AA] mt-4 text-center">
                📤 Mizan ve Beyanname yüklendiğinde mutabakat analizi yapılır
              </p>
            </div>
        )}

        {/* Real Data Table - V2 API */}
        {!loading && !error && hasData && (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F6F8] border-b border-[#E5E5E5]">
                    <th className="text-left py-2 px-2 font-semibold text-[#5A5A5A] whitespace-nowrap">Muhasebe (Mizan)</th>
                    <th className="text-left py-2 px-2 font-semibold text-[#5A5A5A] whitespace-nowrap">Karşı Veri</th>
                    <th className="text-right py-2 px-2 font-semibold text-[#5A5A5A] whitespace-nowrap tabular-nums">Tutar</th>
                    <th className="text-right py-2 px-2 font-semibold text-[#5A5A5A] whitespace-nowrap tabular-nums">Fark</th>
                    <th className="text-right py-2 px-2 font-semibold text-[#5A5A5A] whitespace-nowrap tabular-nums">%</th>
                    <th className="text-center py-2 px-2 font-semibold text-[#5A5A5A] whitespace-nowrap">Durum</th>
                    <th className="text-center py-2 px-2 font-semibold text-[#5A5A5A] whitespace-nowrap">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {displayChecks.map((check) => {
                    const statusConfig = getStatusConfig(check.status, check.severity);
                    const isNoData = check.status === 'no_data';

                    return (
                      <React.Fragment key={check.check_id}>
                        <tr
                          className={`hover:bg-[#F5F6F8] ${!isNoData ? 'cursor-pointer' : ''}`}
                          onClick={() => !isNoData && handleRowClick(check.check_id)}
                        >
                          <td className="py-1.5 px-2">
                            <span className="text-[#2E2E2E] font-medium">{check.source_label}</span>
                          </td>
                          <td className="py-1.5 px-2">
                            <span className="text-[#5A5A5A]">{check.target_label}</span>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[#5A5A5A]">
                            {isNoData ? (
                              <span className="text-[#969696]">—</span>
                            ) : (
                              <>₺{formatAmount(check.source_value)}</>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                            {isNoData ? (
                              <span className="text-[#969696]">—</span>
                            ) : check.difference === 0 ? (
                              <span className="text-[#00A651] flex items-center justify-end gap-1">
                                <Check className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="text-[#BF192B] font-medium">
                                ₺{formatAmount(Math.abs(check.difference))}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                            {isNoData ? (
                              <span className="text-[#969696]">—</span>
                            ) : check.difference_percent !== 0 ? (
                              <span className={check.difference_percent > 5 ? 'text-[#BF192B]' : 'text-[#FA841E]'}>
                                %{check.difference_percent.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-[#00A651]">%0</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {check.status === 'pass' ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ECFDF5]">
                                <Check className="w-3 h-3 text-[#00804D]" />
                              </span>
                            ) : (
                              <Badge variant={statusConfig.badge}>
                                {statusConfig.label}
                              </Badge>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {!isNoData && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRowClick(check.check_id); }}
                                className="text-[10px] text-[#0049AA] hover:text-[#00287F] px-2 py-0.5 border border-[#ABEBFF] rounded hover:bg-[#E6F9FF] transition-colors"
                              >
                                Detay
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Expanded Row - Real Evidence & Details */}
                        {expandedRowId === check.check_id && (
                          <tr className={check.status === 'pass' ? 'bg-[#ECFDF5]' : 'bg-[#FFFBEB]'}>
                            <td colSpan={7} className="py-3 px-4">
                              <div className="space-y-3">
                                <div className="flex items-start gap-2 text-xs">
                                  {getSeverityIcon(check.severity)}
                                  <div>
                                    <p className="font-semibold text-[#2E2E2E]">{check.check_name_tr}</p>
                                    <p className="text-[#5A5A5A]">{check.description}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-3 bg-white/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-[#0049AA]" />
                                    <div>
                                      <p className="text-[10px] text-[#969696] uppercase">Mizan Değeri</p>
                                      <p className="font-semibold text-[#2E2E2E]">{check.source_label}</p>
                                      <p className="font-mono text-sm">₺{check.source_value.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-[#00804D]" />
                                    <div>
                                      <p className="text-[10px] text-[#969696] uppercase">Beyanname/Karşı Değer</p>
                                      <p className="font-semibold text-[#2E2E2E]">{check.target_label}</p>
                                      <p className="font-mono text-sm">₺{check.target_value.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</p>
                                    </div>
                                  </div>
                                </div>

                                {check.message && (
                                  <div className="flex items-start gap-2 text-xs p-2 bg-white/50 rounded">
                                    <AlertTriangle className="w-3.5 h-3.5 text-[#FA841E] flex-shrink-0 mt-0.5" />
                                    <span className="text-[#5A5A5A]">{check.message}</span>
                                  </div>
                                )}

                                {check.recommendation && (
                                  <div className="flex items-start gap-2 text-xs p-2 bg-[#E6F9FF] rounded border border-[#ABEBFF]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0049AA] flex-shrink-0 mt-0.5" />
                                    <span className="text-[#00287F]"><strong>Öneri:</strong> {check.recommendation}</span>
                                  </div>
                                )}

                                {check.evidence && Object.keys(check.evidence).length > 0 && (
                                  <div className="text-xs">
                                    <p className="font-semibold text-[#5A5A5A] mb-1">📋 Kanıt Detayları:</p>
                                    <div className="grid grid-cols-2 gap-2 p-2 bg-white/50 rounded">
                                      {Object.entries(check.evidence).map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                          <span className="text-[#969696]">{key}:</span>
                                          <span className="font-mono text-[#2E2E2E]">
                                            {typeof value === 'number'
                                              ? value.toLocaleString('tr-TR', {minimumFractionDigits: 2})
                                              : String(value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {(check.tolerance_amount || check.tolerance_percent) && (
                                  <div className="text-[10px] text-[#969696] flex items-center gap-2">
                                    <span>Tolerans: ₺{check.tolerance_amount?.toFixed(2) || '0.00'}</span>
                                    {check.tolerance_percent && <span>veya %{check.tolerance_percent}</span>}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] text-xs">
              <div className="flex items-center gap-3 text-[#969696]">
                <span><strong className="text-[#00804D]">{displaySummary.matched}</strong> eşleşen</span>
                <span><strong className="text-[#FA841E]">{displaySummary.discrepancies}</strong> uyumsuz</span>
                {displaySummary.critical > 0 && (
                  <span><strong className="text-[#BF192B]">{displaySummary.critical}</strong> kritik</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <CrossCheckInfoModal isOpen={showSmmmInfo} onClose={() => setShowSmmmInfo(false)} />
    </>
  );
}
