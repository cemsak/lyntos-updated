'use client';
import React from 'react';
import { formatCurrency } from '../../_lib/format';
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Badge } from '../shared/Badge';
import { formatValue } from './mizanOmurgaHelpers';
import type { VdkRiskBulgusu } from './mizanOmurgaTypes';

interface VdkRiskTabProps {
  dengeliMi: boolean;
  fark: number;
  toplamBorc: number;
  toplamAlacak: number;
  vdkBulgular: VdkRiskBulgusu[];
  expandedBulgu: string | null;
  setExpandedBulgu: (val: string | null) => void;
  smmmUyarilari: Array<{
    kod: string;
    mesaj: string;
    oneri: string;
    seviye: 'kritik' | 'uyari';
  }>;
}

export function MizanVdkRiskTab({
  dengeliMi,
  fark,
  toplamBorc,
  toplamAlacak,
  vdkBulgular,
  expandedBulgu,
  setExpandedBulgu,
  smmmUyarilari,
}: VdkRiskTabProps) {
  return (
    <div className="space-y-3">
      <div className={`p-4 rounded-lg border-2 ${dengeliMi ? 'bg-[#ECFDF5] border-[#AAE8B8]' : 'bg-[#FEF2F2] border-[#FFC7C9]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className={`w-6 h-6 ${dengeliMi ? 'text-[#00804D]' : 'text-[#BF192B]'}`} />
            <div>
              <h4 className={`font-semibold ${dengeliMi ? 'text-[#005A46]' : 'text-[#980F30]'}`}>Denge Kontrolü</h4>
              <p className="text-xs text-[#5A5A5A]">Toplam Borç = Toplam Alacak</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#969696]">Fark</p>
            <p className={`font-bold ${dengeliMi ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>
              {formatCurrency(fark)} TL
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="text-center p-2 bg-white rounded border">
            <p className="text-xs text-[#969696]">Toplam Borç</p>
            <p className="text-sm font-bold text-[#2E2E2E]">{formatCurrency(toplamBorc)} TL</p>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <p className="text-xs text-[#969696]">Toplam Alacak</p>
            <p className="text-sm font-bold text-[#2E2E2E]">{formatCurrency(toplamAlacak)} TL</p>
          </div>
        </div>
      </div>

      {vdkBulgular.length === 0 ? (
        <div className="p-4 bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg text-center">
          <CheckCircle2 className="w-8 h-8 text-[#00A651] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#00804D]">VDK risk bulgusu tespit edilmedi</p>
          <p className="text-xs text-[#00804D]">Tüm kritik hesaplar normal aralıkta</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[#5A5A5A] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#F0282D]" />
            VDK Risk Bulguları ({vdkBulgular.length})
          </h4>
          {vdkBulgular.map((bulgu, i) => (
            <div
              key={i}
              className={`rounded-lg border overflow-hidden cursor-pointer transition-all ${
                bulgu.durum === 'kritik'
                  ? 'bg-[#FEF2F2] border-[#FFC7C9] hover:border-[#FF9196]'
                  : 'bg-[#FFFBEB] border-[#FFF08C] hover:border-[#FFE045]'
              }`}
              onClick={() => setExpandedBulgu(expandedBulgu === bulgu.kod + i ? null : bulgu.kod + i)}
            >
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                        bulgu.vdkRiski ? 'bg-[#FEF2F2] text-[#BF192B]' : 'bg-[#F5F6F8] text-[#5A5A5A]'
                      }`}>
                        {bulgu.kod}
                      </span>
                      <span className="text-xs font-mono bg-[#E5E5E5] px-1.5 py-0.5 rounded">
                        {bulgu.hesapKodu}
                      </span>
                      {bulgu.vdkRiski && (
                        <span className="text-xs bg-[#E6F9FF] text-[#0049AA] px-1.5 py-0.5 rounded font-medium">
                          VDK İnceleme Riski
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#2E2E2E]">{bulgu.baslik}</p>
                    <p className="text-xs text-[#5A5A5A] mt-1">
                      Mevcut: <strong className={bulgu.durum === 'kritik' ? 'text-[#BF192B]' : 'text-[#FA841E]'}>
                        {formatValue(bulgu.mevcutDeger, bulgu.birim)}
                      </strong>
                      {' '} | Eşik: {formatValue(bulgu.esikDeger, bulgu.birim)}
                    </p>
                  </div>
                  <Badge variant={bulgu.durum === 'kritik' ? 'error' : 'warning'}>
                    {bulgu.durum === 'kritik' ? 'Kritik' : 'Uyarı'}
                  </Badge>
                </div>
              </div>

              {expandedBulgu === bulgu.kod + i && (
                <div className="px-3 pb-3 pt-0 border-t border-[#E5E5E5]/50 bg-white/50">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-[#969696]">Açıklama:</span>
                      <p className="text-[#5A5A5A]">{bulgu.aciklama}</p>
                    </div>
                    <div>
                      <span className="font-medium text-[#969696]">Mevzuat:</span>
                      <p className="text-[#5A5A5A]">{bulgu.mevzuat}</p>
                    </div>
                    <div className="p-2 bg-[#E6F9FF] rounded border border-[#ABEBFF]">
                      <span className="font-medium text-[#0049AA]">💡 Öneri:</span>
                      <p className="text-[#00287F] mt-0.5">{bulgu.oneri}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {smmmUyarilari.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-semibold text-[#5A5A5A] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FFB114]" />
            SMMM Dikkat: Eksik Veri Uyarıları ({smmmUyarilari.length})
          </h4>
          {smmmUyarilari.map((uyari, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                uyari.seviye === 'kritik'
                  ? 'bg-[#FFFBEB] border-[#FFE045]'
                  : 'bg-yellow-50 border-yellow-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  uyari.seviye === 'kritik' ? 'text-[#FA841E]' : 'text-yellow-600'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-[#E5E5E5] px-1.5 py-0.5 rounded">
                      {uyari.kod}
                    </span>
                    <Badge variant={uyari.seviye === 'kritik' ? 'error' : 'warning'}>
                      {uyari.seviye === 'kritik' ? 'Kritik' : 'Uyarı'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-[#2E2E2E]">{uyari.mesaj}</p>
                  <p className="text-xs text-[#5A5A5A] mt-1 p-2 bg-white/50 rounded border border-[#E5E5E5]">
                    💡 {uyari.oneri}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
