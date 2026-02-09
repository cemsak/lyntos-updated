'use client';
import React from 'react';
import {
  BookOpen,
  Landmark,
  Wallet,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  FileX,
} from 'lucide-react';
import type {
  EvidenceData,
  EvidenceBlockState,
  DefterKaydi,
  BankaHareketi,
  KasaHareketi,
  MahsupFisi,
} from '../_types/cariMutabakat';

interface EvidenceBlocksProps {
  evidence: EvidenceData;
  formatTL: (val: number) => string;
}

/**
 * 4 kanit blogu: Defter, Banka, Kasa, Mahsup
 * Her blok bagimsiz loading/error/empty state'e sahiptir.
 */
export function EvidenceBlocks({ evidence, formatTL }: EvidenceBlocksProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-[#5A5A5A] flex items-center gap-2">
        KANITLAR
      </h4>

      {/* Blok 1: Defter (Muavin) */}
      <EvidenceBlockWrapper
        title="Defter (Muavin)"
        icon={<BookOpen className="w-4 h-4" />}
        state={evidence.defter}
      >
        {evidence.defter.data && evidence.defter.data.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                <th className="text-left py-1.5 px-2 text-[#969696]">Tarih</th>
                <th className="text-left py-1.5 px-2 text-[#969696]">Fis No</th>
                <th className="text-left py-1.5 px-2 text-[#969696]">Aciklama</th>
                <th className="text-right py-1.5 px-2 text-[#969696]">Borc</th>
                <th className="text-right py-1.5 px-2 text-[#969696]">Alacak</th>
                <th className="text-right py-1.5 px-2 text-[#969696]">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {evidence.defter.data.map((e) => (
                <tr key={e.id} className="border-b border-[#F5F6F8]">
                  <td className="py-1.5 px-2 text-[#5A5A5A]">{e.tarih}</td>
                  <td className="py-1.5 px-2 text-[#5A5A5A] font-mono">{e.fis_no || '-'}</td>
                  <td className="py-1.5 px-2 text-[#5A5A5A] max-w-[200px] truncate">
                    {e.aciklama || '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[#2E2E2E]">
                    {e.borc > 0 ? formatTL(e.borc) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[#2E2E2E]">
                    {e.alacak > 0 ? formatTL(e.alacak) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono font-medium text-[#2E2E2E]">
                    {formatTL(e.bakiye)} {e.bakiye_turu}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </EvidenceBlockWrapper>

      {/* Blok 2: Banka */}
      <EvidenceBlockWrapper
        title="Banka"
        icon={<Landmark className="w-4 h-4" />}
        state={evidence.banka}
      >
        {evidence.banka.data && evidence.banka.data.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                <th className="text-left py-1.5 px-2 text-[#969696]">Tarih</th>
                <th className="text-left py-1.5 px-2 text-[#969696]">Aciklama</th>
                <th className="text-right py-1.5 px-2 text-[#969696]">Tutar</th>
                <th className="text-right py-1.5 px-2 text-[#969696]">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {evidence.banka.data.map((e) => (
                <tr key={e.id} className="border-b border-[#F5F6F8]">
                  <td className="py-1.5 px-2 text-[#5A5A5A]">{e.tarih}</td>
                  <td className="py-1.5 px-2 text-[#5A5A5A] max-w-[200px] truncate">
                    {e.aciklama || '-'}
                  </td>
                  <td
                    className={`py-1.5 px-2 text-right font-mono ${
                      e.tutar >= 0 ? 'text-[#00804D]' : 'text-[#BF192B]'
                    }`}
                  >
                    {formatTL(e.tutar)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[#2E2E2E]">
                    {formatTL(e.bakiye)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </EvidenceBlockWrapper>

      {/* Blok 3: Kasa */}
      <EvidenceBlockWrapper
        title="Kasa (100.xxx)"
        icon={<Wallet className="w-4 h-4" />}
        state={evidence.kasa}
      >
        {evidence.kasa.data && evidence.kasa.data.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                <th className="text-left py-1.5 px-2 text-[#969696]">Tarih</th>
                <th className="text-left py-1.5 px-2 text-[#969696]">Fis No</th>
                <th className="text-left py-1.5 px-2 text-[#969696]">Aciklama</th>
                <th className="text-right py-1.5 px-2 text-[#969696]">Borc</th>
                <th className="text-right py-1.5 px-2 text-[#969696]">Alacak</th>
              </tr>
            </thead>
            <tbody>
              {evidence.kasa.data.map((e) => (
                <tr key={e.id} className="border-b border-[#F5F6F8]">
                  <td className="py-1.5 px-2 text-[#5A5A5A]">{e.tarih}</td>
                  <td className="py-1.5 px-2 text-[#5A5A5A] font-mono">{e.fis_no || '-'}</td>
                  <td className="py-1.5 px-2 text-[#5A5A5A] max-w-[200px] truncate">
                    {e.aciklama || '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[#2E2E2E]">
                    {e.borc > 0 ? formatTL(e.borc) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[#2E2E2E]">
                    {e.alacak > 0 ? formatTL(e.alacak) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </EvidenceBlockWrapper>

      {/* Blok 4: Mahsup (Yevmiye) */}
      <EvidenceBlockWrapper
        title="Mahsup (Yevmiye)"
        icon={<FileSpreadsheet className="w-4 h-4" />}
        state={evidence.mahsup}
      >
        {evidence.mahsup.data && evidence.mahsup.data.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5]">
                <th className="text-left py-1.5 px-2 text-[#969696]">Tarih</th>
                <th className="text-left py-1.5 px-2 text-[#969696]">Fis No</th>
                <th className="text-left py-1.5 px-2 text-[#969696]">Aciklama</th>
                <th className="text-right py-1.5 px-2 text-[#969696]">Tutar</th>
                <th className="text-center py-1.5 px-2 text-[#969696]">B/A</th>
              </tr>
            </thead>
            <tbody>
              {evidence.mahsup.data.map((e) => (
                <tr key={e.id} className="border-b border-[#F5F6F8]">
                  <td className="py-1.5 px-2 text-[#5A5A5A]">{e.tarih}</td>
                  <td className="py-1.5 px-2 text-[#5A5A5A] font-mono">{e.fis_no}</td>
                  <td className="py-1.5 px-2 text-[#5A5A5A] max-w-[200px] truncate">
                    {e.fis_aciklama || '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[#2E2E2E]">
                    {formatTL(e.tutar)}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span
                      className={`text-xs font-medium ${
                        e.borc_alacak === 'B' || e.borc_alacak === 'D'
                          ? 'text-[#0049AA]'
                          : 'text-[#00804D]'
                      }`}
                    >
                      {e.borc_alacak === 'B' || e.borc_alacak === 'D' ? 'Borc' : 'Alacak'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </EvidenceBlockWrapper>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GENERIC EVIDENCE BLOCK WRAPPER
// ═══════════════════════════════════════════════════════════

interface EvidenceBlockWrapperProps {
  title: string;
  icon: React.ReactNode;
  state: EvidenceBlockState<unknown[]>;
  children: React.ReactNode;
}

function EvidenceBlockWrapper({
  title,
  icon,
  state,
  children,
}: EvidenceBlockWrapperProps) {
  return (
    <div className="bg-[#F5F6F8] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#EAEBEE]">
        <div className="flex items-center gap-2 text-sm font-medium text-[#5A5A5A]">
          {icon}
          {title}
        </div>
        {!state.loading && (
          <span className="text-xs text-[#969696]">
            {state.kayitSayisi} kayit
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        {state.loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-[#0049AA] animate-spin" />
            <span className="ml-2 text-sm text-[#969696]">Yukleniyor...</span>
          </div>
        ) : state.error ? (
          <div className="flex items-center gap-2 py-3 px-2">
            <AlertCircle className="w-4 h-4 text-[#BF192B] flex-shrink-0" />
            <span className="text-sm text-[#BF192B]">{state.error}</span>
          </div>
        ) : state.kayitSayisi === 0 ? (
          <div className="flex items-center gap-2 py-3 px-2">
            <FileX className="w-4 h-4 text-[#B4B4B4] flex-shrink-0" />
            <span className="text-sm text-[#969696]">Kayit bulunamadi.</span>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
