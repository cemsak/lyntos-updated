'use client';

import {
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import type { EDefterRapor } from './types';
import { getDefterTipi, formatNumber } from './types';

interface DefterListesiProps {
  raporlar: EDefterRapor[];
  selectedRapor: EDefterRapor | null;
  onSelect: (rapor: EDefterRapor) => void;
  loading: boolean;
}

export function DefterListesi({
  raporlar,
  selectedRapor,
  onSelect,
  loading,
}: DefterListesiProps) {
  return (
    <div className="col-span-1">
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5E5] bg-[#F5F6F8]">
          <h2 className="font-semibold text-[#2E2E2E]">Yüklenen E-Defterler</h2>
          <p className="text-xs text-[#969696] mt-0.5">Detay için bir defter seçin</p>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 text-[#0078D0] animate-spin mx-auto mb-2" />
            <p className="text-sm text-[#969696]">Yükleniyor...</p>
          </div>
        ) : raporlar.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-[#5A5A5A] mb-2">E-Defter bulunamadı</p>
            <p className="text-xs text-[#969696]">
              Bu dönem için henüz e-defter XML dosyası yüklenmemiş.
              Veri Yükleme sayfasından e-defter dosyalarınızı yükleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5]">
            {raporlar.map((rapor, index) => {
              const tipInfo = getDefterTipi(rapor.defter_tipi);
              const hasFark = Math.abs(rapor.toplam_borc - rapor.toplam_alacak) > 0.01;
              return (
                <button
                  key={`${rapor.donem}-${rapor.defter_tipi}-${index}`}
                  onClick={() => onSelect(rapor)}
                  className={`w-full px-4 py-3 text-left hover:bg-[#F5F6F8] transition-colors ${
                    selectedRapor === rapor ? 'bg-[#E6F9FF] border-l-4 border-[#0078D0]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-[#969696]" />
                    <span className="font-medium text-[#2E2E2E]">
                      {tipInfo.label}
                    </span>
                    {tipInfo.isBerat && (
                      <span className="text-xs bg-[#F5F6F8] text-[#969696] px-1.5 py-0.5 rounded">
                        Özet
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#969696] mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>{rapor.donem}</span>
                    <span className="text-[#B4B4B4]">&bull;</span>
                    <span>{formatNumber(rapor.satir_sayisi)} satır</span>
                  </div>
                  {/* Denge durumu göstergesi */}
                  <div className="flex items-center gap-1 text-xs">
                    {tipInfo.isBerat ? (
                      <span className="text-[#969696]">Bakiye özeti</span>
                    ) : hasFark ? (
                      <span className="text-[#F0282D] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Dengesiz
                      </span>
                    ) : (
                      <span className="text-[#00804D] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Dengeli
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
