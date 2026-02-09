'use client';
import React, { useRef } from 'react';
import {
  Upload,
  RefreshCw,
  FileCheck,
  Loader2,
  Filter,
} from 'lucide-react';
import { Card } from '../../_components/shared/Card';
import { Badge } from '../../_components/shared/Badge';
import { DataFreshness } from '../../_components/shared/DataFreshness';
import type { MutabakatFiltre } from '../_types/cariMutabakat';

interface CariMutabakatHeaderProps {
  loading: boolean;
  uploading: boolean;
  filtre: MutabakatFiltre;
  lastFetchedAt: string | null;
  onRefresh: () => void;
  onUpload: (file: File) => void;
  onFiltreChange: (filtre: MutabakatFiltre) => void;
  hasData: boolean;
}

const FILTRE_OPTIONS: { value: MutabakatFiltre; label: string }[] = [
  { value: 'tumu', label: 'Tumu' },
  { value: 'farkli', label: 'Farkli' },
  { value: 'onaylanan', label: 'Onaylanan' },
  { value: 'supheli', label: 'Supheli' },
];

/**
 * Sayfa header: Upload zone + filtre bar + yenile butonu
 */
export function CariMutabakatHeader({
  loading,
  uploading,
  filtre,
  lastFetchedAt,
  onRefresh,
  onUpload,
  onFiltreChange,
  hasData,
}: CariMutabakatHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Sayfa Başlığı */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E]">Cari Mutabakat</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[#969696]">
              Mizan 120 (Alicilar) ve 320 (Saticilar) ile cari hesap ekstre karsilastirmasi
            </p>
            <DataFreshness lastUpdated={lastFetchedAt} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Mevzuat Bilgi Banner */}
      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileCheck className="w-5 h-5 text-[#0049AA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-[#00287F]">Cari Hesap Mutabakat Kontrolu</p>
            <p className="text-sm text-[#0049AA] mt-1">
              Musteri ve tedarikci cari hesap ekstrelerini CSV veya Excel formatinda yukleyin.
              Mizan 120/320 alt hesaplari ile otomatik karsilastirma yapilir.
              10 TL alti farklar uyumlu kabul edilir. 365 gunu asan alacaklar icin VUK Md. 323
              kapsaminda supheli alacak karsiligi uyarisi verilir.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#2E2E2E]">Cari Ekstre Yukle</h2>
            <Badge variant="info" size="sm">CSV / Excel</Badge>
          </div>

          <div
            className="border-2 border-dashed border-[#B4B4B4] rounded-lg p-8 text-center hover:border-[#5ED6FF] hover:bg-[#F5F6F8]/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div>
                <Loader2 className="w-10 h-10 text-[#0049AA] animate-spin mx-auto mb-3" />
                <p className="text-[#5A5A5A] font-medium">Dosya isleniyor...</p>
                <p className="text-sm text-[#969696] mt-1">
                  Ekstre parse ediliyor ve mizan ile karsilastiriliyor
                </p>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-[#B4B4B4] mx-auto mb-3" />
                <p className="text-[#5A5A5A] font-medium">Cari hesap ekstresi yukleyin</p>
                <p className="text-sm text-[#969696] mt-1">
                  CSV formati: hesap_kodu ; karsi_taraf ; bakiye
                </p>
                <p className="text-xs text-[#B4B4B4] mt-2">
                  Desteklenen: .csv, .txt, .xlsx, .xls (maks. 10 MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </Card>

      {/* Filtre Bar */}
      {hasData && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#969696]" />
          {FILTRE_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFiltreChange(f.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filtre === f.value
                  ? 'bg-[#0049AA] text-white'
                  : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
