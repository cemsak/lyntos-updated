'use client';

import {
  Building2, FileText, DollarSign, CheckCircle2,
  AlertTriangle, BookOpen, Info,
} from 'lucide-react';
import type { EDefterRapor, ClientInfo } from './types';
import { getDefterTipi, formatNumber } from './types';
import { formatCurrency } from '../../_lib/format';

interface DefterDetayProps {
  selectedRapor: EDefterRapor | null;
  clientInfo: ClientInfo | null;
}

export function DefterDetay({ selectedRapor, clientInfo }: DefterDetayProps) {
  if (!selectedRapor) {
    return (
      <div className="col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] p-12 text-center">
          <BookOpen className="w-12 h-12 text-[#B4B4B4] mx-auto mb-4" />
          <p className="text-[#969696] mb-2">Detay görüntülemek için soldaki listeden bir defter seçin</p>
          <p className="text-xs text-[#969696]">
            Seçtiğiniz defterin fiş sayısı, satır sayısı ve borç-alacak özeti görüntülenecektir.
          </p>
        </div>
      </div>
    );
  }

  const tipInfo = getDefterTipi(selectedRapor.defter_tipi);
  const fark = Math.abs(selectedRapor.toplam_borc - selectedRapor.toplam_alacak);
  const isDengeli = fark < 0.01;

  return (
    <div className="col-span-2">
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E5E5] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E5] bg-[#F5F6F8]">
          <h2 className="font-semibold text-[#2E2E2E]">
            {tipInfo.label} Detayı
          </h2>
          <p className="text-sm text-[#969696]">
            {tipInfo.aciklama}
          </p>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Mükellef Bilgileri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F5F6F8] rounded-lg p-3">
                <p className="text-xs text-[#969696] mb-1">Vergi Kimlik No</p>
                <p className="font-mono text-sm text-[#2E2E2E]">{clientInfo?.vkn || '-'}</p>
              </div>
              <div className="bg-[#F5F6F8] rounded-lg p-3">
                <p className="text-xs text-[#969696] mb-1">Dönem</p>
                <p className="text-sm text-[#2E2E2E]">{selectedRapor.donem || '-'}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Defter İstatistikleri
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#F5F6F8] rounded-lg p-3">
                <p className="text-xs text-[#969696] mb-1">Defter Tipi</p>
                <p className="text-sm font-medium text-[#2E2E2E]">
                  {tipInfo.label}
                </p>
              </div>
              <div className="bg-[#F5F6F8] rounded-lg p-3">
                <p className="text-xs text-[#969696] mb-1">Fiş Sayısı</p>
                <p className="text-sm font-semibold text-[#2E2E2E]">{formatNumber(selectedRapor.fis_sayisi)}</p>
                <p className="text-xs text-[#969696]">yevmiye maddesi</p>
              </div>
              <div className="bg-[#F5F6F8] rounded-lg p-3">
                <p className="text-xs text-[#969696] mb-1">Satır Sayısı</p>
                <p className="text-sm font-semibold text-[#2E2E2E]">{formatNumber(selectedRapor.satir_sayisi)}</p>
                <p className="text-xs text-[#969696]">kayıt satırı</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Borç-Alacak Dengesi
            </h3>

            {tipInfo.isBerat && (
              <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#0049AA] mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-[#0049AA]">
                    <p className="font-medium">Berat Dosyası Hakkında</p>
                    <p className="mt-1">
                      Beratlar, GİB&apos;e gönderilen <strong>özet belgelerdir</strong>. Sadece dönem sonu hesap bakiyelerini içerir,
                      tam defter değildir. Bu nedenle borç-alacak farkı olması <strong>normaldir</strong> ve hata değildir.
                      Asıl borç-alacak dengesi kontrolü için Yevmiye Defteri veya Kebir&apos;i inceleyiniz.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#ECFDF5] rounded-lg p-4 border border-[#AAE8B8]">
                <p className="text-xs text-[#00804D] mb-1">Toplam Borç</p>
                <p className="text-lg font-bold text-[#00804D]">{formatCurrency(selectedRapor.toplam_borc)}</p>
              </div>
              <div className="bg-[#FEF2F2] rounded-lg p-4 border border-[#FFC7C9]">
                <p className="text-xs text-[#BF192B] mb-1">Toplam Alacak</p>
                <p className="text-lg font-bold text-[#BF192B]">{formatCurrency(selectedRapor.toplam_alacak)}</p>
              </div>
              {tipInfo.isBerat ? (
                <div className="bg-[#F5F6F8] rounded-lg p-4 border border-[#E5E5E5]">
                  <p className="text-xs text-[#969696] mb-1">Bakiye Farkı</p>
                  <p className="text-lg font-bold text-[#5A5A5A]">{formatCurrency(fark)}</p>
                  <p className="text-xs text-[#969696] mt-1">Berat özeti - normal</p>
                </div>
              ) : (
                <div className={`rounded-lg p-4 border ${isDengeli ? 'bg-[#ECFDF5] border-[#AAE8B8]' : 'bg-[#FEF2F2] border-[#FFC7C9]'}`}>
                  <p className={`text-xs mb-1 ${isDengeli ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>Fark</p>
                  <div className="flex items-center gap-2">
                    {isDengeli ? (<CheckCircle2 className="w-5 h-5 text-[#00804D]" />) : (<AlertTriangle className="w-5 h-5 text-[#BF192B]" />)}
                    <p className={`text-lg font-bold ${isDengeli ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>{formatCurrency(fark)}</p>
                  </div>
                  <p className={`text-xs mt-1 ${isDengeli ? 'text-[#00804D]' : 'text-[#BF192B]'}`}>
                    {isDengeli ? 'Borç-alacak dengeli ✓' : 'Dikkat: Borç-alacak dengesizliği!'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
