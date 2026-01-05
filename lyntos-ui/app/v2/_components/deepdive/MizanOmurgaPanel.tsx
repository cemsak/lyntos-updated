'use client';
import React, { useState } from 'react';
import { Card } from '../shared/Card';
import { Badge, TrustBadge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { ExplainModal } from '../kpi/ExplainModal';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

interface MizanAccount {
  hesap_kodu: string;
  hesap_adi: string;
  borc: number;
  alacak: number;
  bakiye: number;
  kritik: boolean;
  anomali_tr?: string;
}

interface MizanResult {
  accounts: MizanAccount[];
  totals: {
    toplam_borc: number;
    toplam_alacak: number;
    fark: number;
    denge_ok: boolean;
  };
  critical_count: number;
}

function normalizeMizan(raw: unknown): PanelEnvelope<MizanResult> {
  return normalizeToEnvelope<MizanResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const accountsRaw = data?.accounts || data?.hesaplar || data?.items || [];
    const accounts: MizanAccount[] = Array.isArray(accountsRaw)
      ? accountsRaw.map((a: Record<string, unknown>) => ({
          hesap_kodu: String(a.hesap_kodu || a.code || a.account_code || ''),
          hesap_adi: String(a.hesap_adi || a.name || a.account_name || ''),
          borc: typeof a.borc === 'number' ? a.borc : typeof a.debit === 'number' ? a.debit : 0,
          alacak: typeof a.alacak === 'number' ? a.alacak : typeof a.credit === 'number' ? a.credit : 0,
          bakiye: typeof a.bakiye === 'number' ? a.bakiye : typeof a.balance === 'number' ? a.balance : 0,
          kritik: Boolean(a.kritik || a.critical || a.is_critical),
          anomali_tr: a.anomali_tr ? String(a.anomali_tr) : a.anomaly ? String(a.anomaly) : undefined,
        }))
      : [];

    const totalsRaw = (data?.totals || data?.toplam) as Record<string, unknown> | undefined;
    const toplamBorc = accounts.reduce((sum, a) => sum + a.borc, 0);
    const toplamAlacak = accounts.reduce((sum, a) => sum + a.alacak, 0);

    return {
      accounts: accounts.slice(0, 20), // Top 20 critical accounts
      totals: {
        toplam_borc: typeof totalsRaw?.toplam_borc === 'number' ? totalsRaw.toplam_borc : toplamBorc,
        toplam_alacak: typeof totalsRaw?.toplam_alacak === 'number' ? totalsRaw.toplam_alacak : toplamAlacak,
        fark: typeof totalsRaw?.fark === 'number' ? totalsRaw.fark : Math.abs(toplamBorc - toplamAlacak),
        denge_ok: typeof totalsRaw?.denge_ok === 'boolean' ? totalsRaw.denge_ok : Math.abs(toplamBorc - toplamAlacak) < 1,
      },
      critical_count: accounts.filter(a => a.kritik).length,
    };
  });
}

export function MizanOmurgaPanel() {
  const [showExplain, setShowExplain] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<MizanAccount | null>(null);
  const envelope = useFailSoftFetch<MizanResult>(ENDPOINTS.MIZAN_ANALYSIS, normalizeMizan);
  const { status, reason_tr, data, analysis, trust, legal_basis_refs, evidence_refs, meta } = envelope;

  const formatCurrency = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });

  return (
    <>
      <Card
        title="Mizan Omurga"
        subtitle="Kritik Hesap Analizi"
        headerAction={
          data && (
            <div className="flex items-center gap-2">
              {data.totals.denge_ok ? (
                <Badge variant="success">Denge OK</Badge>
              ) : (
                <Badge variant="error">Denge Bozuk</Badge>
              )}
              {data.critical_count > 0 && (
                <Badge variant="warning">{data.critical_count} kritik</Badge>
              )}
            </div>
          )
        }
      >
        <PanelState status={status} reason_tr={reason_tr}>
          {data && (
            <div className="space-y-3">
              {/* Totals Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg text-center">
                <div>
                  <p className="text-xs text-slate-500">Toplam Borc</p>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(data.totals.toplam_borc)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Toplam Alacak</p>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(data.totals.toplam_alacak)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fark</p>
                  <p className={`text-sm font-bold ${data.totals.fark === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.totals.fark)}
                  </p>
                </div>
              </div>

              {/* Accounts Table */}
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-slate-600">Hesap</th>
                      <th className="text-right p-2 font-medium text-slate-600">Borc</th>
                      <th className="text-right p-2 font-medium text-slate-600">Alacak</th>
                      <th className="text-right p-2 font-medium text-slate-600">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.accounts.map((acc) => (
                      <tr
                        key={acc.hesap_kodu}
                        className={`hover:bg-slate-50 cursor-pointer ${acc.kritik ? 'bg-amber-50' : ''}`}
                        onClick={() => setSelectedAccount(acc)}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {acc.kritik && <span className="text-amber-500">!</span>}
                            <div>
                              <p className="font-mono text-xs text-slate-400">{acc.hesap_kodu}</p>
                              <p className="text-slate-900 truncate max-w-[150px]">{acc.hesap_adi}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono text-slate-700">{formatCurrency(acc.borc)}</td>
                        <td className="p-2 text-right font-mono text-slate-700">{formatCurrency(acc.alacak)}</td>
                        <td className="p-2 text-right">
                          <span className={`font-mono font-medium ${acc.bakiye >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                            {formatCurrency(acc.bakiye)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <TrustBadge trust={trust} />
                {(analysis.expert || analysis.ai || legal_basis_refs.length > 0) && (
                  <button
                    onClick={() => setShowExplain(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Neden? →
                  </button>
                )}
              </div>
            </div>
          )}
        </PanelState>
      </Card>

      <ExplainModal
        isOpen={showExplain || !!selectedAccount}
        onClose={() => { setShowExplain(false); setSelectedAccount(null); }}
        title={selectedAccount ? `${selectedAccount.hesap_kodu}: ${selectedAccount.hesap_adi}` : 'Mizan Analizi'}
        analysis={analysis}
        trust={trust}
        legalBasisRefs={legal_basis_refs}
        evidenceRefs={evidence_refs}
        meta={meta}
      />
    </>
  );
}
