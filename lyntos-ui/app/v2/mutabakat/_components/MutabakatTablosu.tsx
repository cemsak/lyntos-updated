'use client';
import React, { useState } from 'react';
import {
  Loader2,
  FileX,
  CheckCircle2,
  Clock,
  ShieldAlert,
  CheckSquare,
} from 'lucide-react';
import { Card } from '../../_components/shared/Card';
import { Badge } from '../../_components/shared/Badge';
import { RootCauseTag } from './RootCauseTag';
import type { EnrichedMutabakatSatir, MutabakatOzet } from '../_types/cariMutabakat';
import { MUTABAKAT_TOLERANS_TL, SMMM_KARAR_CONFIG } from '../_types/cariMutabakat';

interface MutabakatTablosuProps {
  satirlar: EnrichedMutabakatSatir[];
  ozet: MutabakatOzet | null;
  loading: boolean;
  formatTL: (val: number) => string;
  onSatirClick: (satir: EnrichedMutabakatSatir) => void;
  seciliIds: Set<number>;
  onToggleSecim: (id: number) => void;
  onTumunuSec: () => void;
  onTopluOnay: () => void;
  onayLoading: boolean;
  selectedSatirId: number | null;
}

/**
 * Ana mutabakat tablosu.
 * RootCause etiketi ve SMMM karar kolonu ekli.
 */
export function MutabakatTablosu({
  satirlar,
  ozet,
  loading,
  formatTL,
  onSatirClick,
  seciliIds,
  onToggleSecim,
  onTumunuSec,
  onTopluOnay,
  onayLoading,
  selectedSatirId,
}: MutabakatTablosuProps) {
  // ───── Loading State ─────
  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#0049AA] animate-spin mx-auto mb-4" />
          <p className="text-[#5A5A5A]">Cari mutabakat verileri yukleniyor...</p>
        </div>
      </Card>
    );
  }

  // ───── Empty State ─────
  if (!ozet || !ozet.veri_var) {
    return (
      <Card>
        <div className="p-8 text-center">
          <FileX className="w-12 h-12 text-[#B4B4B4] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#5A5A5A] mb-2">
            Henuz Cari Ekstre Yuklenmemis
          </h3>
          <p className="text-[#969696] text-sm max-w-md mx-auto">
            Cari mutabakat kontrolu icin musteri/tedarikci cari hesap ekstrelerini
            CSV veya Excel formatinda yukleyiniz.
          </p>
        </div>
      </Card>
    );
  }

  // ───── No Results (with filter) ─────
  if (satirlar.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#00804D] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#5A5A5A] mb-2">
            Secili filtrede kayit yok
          </h3>
          <p className="text-[#969696] text-sm">Filtre secimini degistiriniz.</p>
        </div>
      </Card>
    );
  }

  // ───── Toplu Onay Bar ─────
  const topluOnayBar = seciliIds.size > 0 && (
    <div className="flex items-center justify-end mb-3">
      <button
        onClick={onTopluOnay}
        disabled={onayLoading}
        className="flex items-center gap-2 px-4 py-2 bg-[#00A651] text-white rounded-lg hover:bg-[#00804D] transition-colors disabled:opacity-50"
      >
        {onayLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CheckSquare className="w-4 h-4" />
        )}
        {seciliIds.size} Kaydi Onayla
      </button>
    </div>
  );

  return (
    <>
      {topluOnayBar}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Tümünü seç"
                    checked={
                      seciliIds.size > 0 &&
                      seciliIds.size === satirlar.filter((s) => s.id).length
                    }
                    onChange={onTumunuSec}
                    className="rounded border-[#B4B4B4]"
                  />
                </th>
                <th className="text-left py-3 px-3 font-medium text-[#5A5A5A] text-sm">
                  Hesap Kodu
                </th>
                <th className="text-left py-3 px-3 font-medium text-[#5A5A5A] text-sm">
                  Karsi Taraf
                </th>
                <th className="text-right py-3 px-3 font-medium text-[#5A5A5A] text-sm">
                  Mizan
                </th>
                <th className="text-right py-3 px-3 font-medium text-[#5A5A5A] text-sm">
                  Ekstre
                </th>
                <th className="text-right py-3 px-3 font-medium text-[#5A5A5A] text-sm">
                  Fark
                </th>
                <th className="text-center py-3 px-3 font-medium text-[#5A5A5A] text-sm">
                  Neden
                </th>
                <th className="text-center py-3 px-3 font-medium text-[#5A5A5A] text-sm">
                  Karar
                </th>
                <th className="text-center py-3 px-3 font-medium text-[#5A5A5A] text-sm">
                  Aging
                </th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((satir, idx) => {
                const rowId = satir.id || idx;
                const isSelected = selectedSatirId === rowId;
                const kararConfig = SMMM_KARAR_CONFIG[satir.smmmKarar.karar];

                return (
                  <tr
                    key={rowId}
                    onClick={() => onSatirClick(satir)}
                    className={`border-b border-[#E5E5E5] hover:bg-[#F5F6F8] transition-colors cursor-pointer ${
                      satir.supheli_alacak_riski ? 'bg-[#FEF2F2]/30' : ''
                    } ${isSelected ? 'bg-[#E6F9FF]/30 border-l-2 border-l-[#0049AA]' : ''}`}
                  >
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      {satir.id && (
                        <input
                          type="checkbox"
                          aria-label={`${satir.hesap_kodu} satırını seç`}
                          checked={seciliIds.has(satir.id)}
                          onChange={() => onToggleSecim(satir.id!)}
                          className="rounded border-[#B4B4B4]"
                        />
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-sm text-[#2E2E2E]">
                      {satir.hesap_kodu}
                    </td>
                    <td className="py-3 px-3 text-sm text-[#2E2E2E]">
                      {satir.karsi_taraf || satir.hesap_adi || '-'}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-[#2E2E2E] font-mono">
                      {formatTL(satir.mizan_bakiye)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-[#2E2E2E] font-mono">
                      {formatTL(satir.ekstre_bakiye)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right text-sm font-mono font-medium ${
                        satir.fark > MUTABAKAT_TOLERANS_TL
                          ? 'text-[#BF192B]'
                          : 'text-[#00804D]'
                      }`}
                    >
                      {formatTL(satir.fark)}
                      {satir.fark_yuzde > 0 && (
                        <span className="text-xs text-[#969696] ml-1">
                          (%{satir.fark_yuzde.toFixed(1)})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <RootCauseTag neden={satir.rootCause.neden} showTooltip />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant={kararConfig.badgeVariant}
                        size="sm"
                        style="soft"
                      >
                        {kararConfig.label}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {satir.aging_gun > 0 ? (
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${
                            satir.aging_gun > 365
                              ? 'text-[#BF192B] font-medium'
                              : satir.aging_gun > 180
                                ? 'text-[#FA841E]'
                                : 'text-[#969696]'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {satir.aging_gun}g
                          {satir.supheli_alacak_riski && (
                            <ShieldAlert className="w-3 h-3 text-[#BF192B]" />
                          )}
                        </span>
                      ) : (
                        <span className="text-[#B4B4B4] text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
