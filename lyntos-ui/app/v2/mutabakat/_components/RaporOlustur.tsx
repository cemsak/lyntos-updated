'use client';
import React, { useState } from 'react';
import {
  FileText,
  FolderOpen,
  AlertCircle,
  Download,
  X,
  Printer,
} from 'lucide-react';
import { Card } from '../../_components/shared/Card';
import { Badge } from '../../_components/shared/Badge';
import type {
  EnrichedMutabakatSatir,
  RaporTipi,
  MutabakatOzet,
} from '../_types/cariMutabakat';
import { ROOT_CAUSE_CONFIG } from '../_types/cariMutabakat';

interface RaporOlusturProps {
  satirlar: EnrichedMutabakatSatir[];
  ozet: MutabakatOzet | null;
  clientName: string;
  periodName: string;
  formatTL: (val: number) => string;
}

/**
 * 3 rapor butonu + rapor gorunumleri.
 *
 * 1. Resmi Mutabakat Raporu (karar === RESMI)
 * 2. Defter Disi Bilgi Raporu (karar === DEFTER_DISI)
 * 3. Acik Konular Raporu (karar === BILINMIYOR)
 */
export function RaporOlustur({
  satirlar,
  ozet,
  clientName,
  periodName,
  formatTL,
}: RaporOlusturProps) {
  const [activeRapor, setActiveRapor] = useState<RaporTipi | null>(null);

  const resmiSatirlar = satirlar.filter((s) => s.smmmKarar.karar === 'RESMI');
  const defterDisiSatirlar = satirlar.filter((s) => s.smmmKarar.karar === 'DEFTER_DISI');
  const bilinmiyorSatirlar = satirlar.filter((s) => s.smmmKarar.karar === 'BILINMIYOR');

  const raporlar: { tipi: RaporTipi; label: string; sayisi: number; icon: React.ReactNode; variant: 'info' | 'default' | 'warning' }[] = [
    {
      tipi: 'resmi',
      label: 'Resmi Rapor',
      sayisi: resmiSatirlar.length,
      icon: <FileText className="w-4 h-4" />,
      variant: 'info',
    },
    {
      tipi: 'defter_disi',
      label: 'Defter Disi Bilgi',
      sayisi: defterDisiSatirlar.length,
      icon: <FolderOpen className="w-4 h-4" />,
      variant: 'default',
    },
    {
      tipi: 'acik_konular',
      label: 'Acik Konular',
      sayisi: bilinmiyorSatirlar.length,
      icon: <AlertCircle className="w-4 h-4" />,
      variant: 'warning',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Rapor Butonlari */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#969696]">Raporlar:</span>
        {raporlar.map((rapor) => (
          <button
            key={rapor.tipi}
            onClick={() => setActiveRapor(activeRapor === rapor.tipi ? null : rapor.tipi)}
            disabled={rapor.sayisi === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              activeRapor === rapor.tipi
                ? 'bg-[#0049AA] text-white'
                : rapor.sayisi > 0
                  ? 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
                  : 'bg-[#F5F6F8] text-[#B4B4B4] cursor-not-allowed'
            }`}
          >
            {rapor.icon}
            {rapor.label}
            {rapor.sayisi > 0 && (
              <Badge variant={rapor.variant} size="xs" style="solid">
                {rapor.sayisi}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Rapor Gorunumu */}
      {activeRapor && (
        <RaporGorunumu
          tipi={activeRapor}
          satirlar={
            activeRapor === 'resmi'
              ? resmiSatirlar
              : activeRapor === 'defter_disi'
                ? defterDisiSatirlar
                : bilinmiyorSatirlar
          }
          ozet={ozet}
          clientName={clientName}
          periodName={periodName}
          formatTL={formatTL}
          onClose={() => setActiveRapor(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RAPOR GORUNUMU
// ═══════════════════════════════════════════════════════════

interface RaporGorunumuProps {
  tipi: RaporTipi;
  satirlar: EnrichedMutabakatSatir[];
  ozet: MutabakatOzet | null;
  clientName: string;
  periodName: string;
  formatTL: (val: number) => string;
  onClose: () => void;
}

function RaporGorunumu({
  tipi,
  satirlar,
  ozet,
  clientName,
  periodName,
  formatTL,
  onClose,
}: RaporGorunumuProps) {
  const config = RAPOR_CONFIG[tipi];
  const tarih = new Date().toLocaleDateString('tr-TR');

  return (
    <Card>
      <div className="p-6 print:p-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 print:mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#2E2E2E]">{config.baslik}</h2>
            <p className="text-sm text-[#969696] mt-1">
              {clientName} | {periodName} | {tarih}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8] transition-colors"
            >
              <Printer className="w-4 h-4" />
              Yazdir
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#F5F6F8] transition-colors"
            >
              <X className="w-4 h-4 text-[#969696]" />
            </button>
          </div>
        </div>

        {/* Uyari Banner */}
        {config.uyari && (
          <div className={`${config.uyariBg} rounded-lg p-3 mb-4`}>
            <p className={`text-sm ${config.uyariText}`}>{config.uyari}</p>
          </div>
        )}

        {/* Tablo */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#E5E5E5]">
                <th className="text-left py-2 px-3 font-medium text-[#5A5A5A]">Hesap Kodu</th>
                <th className="text-left py-2 px-3 font-medium text-[#5A5A5A]">Karsi Taraf</th>
                <th className="text-right py-2 px-3 font-medium text-[#5A5A5A]">Mizan</th>
                <th className="text-right py-2 px-3 font-medium text-[#5A5A5A]">Ekstre</th>
                <th className="text-right py-2 px-3 font-medium text-[#5A5A5A]">Fark</th>
                <th className="text-center py-2 px-3 font-medium text-[#5A5A5A]">
                  {tipi === 'acik_konular' ? 'Neden' : 'Not'}
                </th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((satir, idx) => (
                <tr key={satir.id || idx} className="border-b border-[#E5E5E5]">
                  <td className="py-2 px-3 font-mono">{satir.hesap_kodu}</td>
                  <td className="py-2 px-3">{satir.karsi_taraf || satir.hesap_adi || '-'}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatTL(satir.mizan_bakiye)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatTL(satir.ekstre_bakiye)}</td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-[#BF192B]">
                    {formatTL(satir.fark)}
                  </td>
                  <td className="py-2 px-3 text-center text-xs text-[#5A5A5A]">
                    {tipi === 'acik_konular'
                      ? ROOT_CAUSE_CONFIG[satir.rootCause.neden].kisaEtiket
                      : satir.smmmKarar.not || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#5A5A5A]">
                <td colSpan={4} className="py-2 px-3 font-semibold text-right">
                  Toplam Fark:
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-[#BF192B]">
                  {formatTL(satirlar.reduce((sum, s) => sum + s.fark, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mevzuat Referansi */}
        <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
          <p className="text-xs text-[#969696]">
            Mevzuat: VUK Md. 177, TTK Md. 64, VUK Md. 323 |
            TDHP: 120 Alicilar, 320 Saticilar, 128/129 Supheli Ticari Alacaklar |
            Tolerans: 10 TL
          </p>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// RAPOR CONFIG
// ═══════════════════════════════════════════════════════════

const RAPOR_CONFIG: Record<
  RaporTipi,
  {
    baslik: string;
    uyari: string | null;
    uyariBg: string;
    uyariText: string;
  }
> = {
  resmi: {
    baslik: 'Resmi Mutabakat Raporu',
    uyari: null,
    uyariBg: '',
    uyariText: '',
  },
  defter_disi: {
    baslik: 'Defter Disi Bilgi Raporu',
    uyari:
      'Bu rapor defter disi bilgi niteligindedir. Resmi kayitlara dahil degildir. Risk hesaplamalarina ve KPI\'lara dahil edilmez.',
    uyariBg: 'bg-[#FFFBEB] border border-[#FFE045]',
    uyariText: 'text-[#E67324]',
  },
  acik_konular: {
    baslik: 'Acik Konular Raporu',
    uyari:
      'Asagidaki satirlar icin henuz SMMM karari verilmemistir. Kanitlari inceleyerek RESMI veya DEFTER_DISI olarak siniflandiriniz.',
    uyariBg: 'bg-[#FEF2F2] border border-[#FF9196]',
    uyariText: 'text-[#BF192B]',
  },
};
