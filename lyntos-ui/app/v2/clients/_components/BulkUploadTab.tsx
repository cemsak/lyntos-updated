import React from 'react';
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
} from 'lucide-react';
import type { ParsedTaxpayer, BulkError } from '../_types/client';
import { downloadBulkErrors } from './downloadBulkErrors';

interface BulkUploadTabProps {
  bulkFile: File | null;
  bulkLoading: boolean;
  parsedBulkData: ParsedTaxpayer[];
  bulkErrors: BulkError[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BulkUploadTab({
  bulkFile,
  bulkLoading,
  parsedBulkData,
  bulkErrors,
  onFileChange,
}: BulkUploadTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-[#ECFDF5] border border-[#AAE8B8] rounded-lg p-3">
        <p className="text-sm text-[#00804D]">
          Muhasebe programınızdan (Luca, Zirve, Logo, Mikro vb.) aldığınız mükellef listesini CSV veya Excel formatında yükleyin.
        </p>
      </div>

      <div className="border-2 border-dashed border-[#B4B4B4] rounded-lg p-6 text-center hover:border-[#00B4EB] transition-colors">
        <input
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          onChange={onFileChange}
          className="hidden"
          id="bulk-file-input"
        />
        <label
          htmlFor="bulk-file-input"
          className="cursor-pointer flex flex-col items-center"
        >
          <Upload className="w-10 h-10 text-[#969696] mb-3" />
          <span className="text-sm font-medium text-[#5A5A5A]">
            {bulkFile ? bulkFile.name : 'Dosya seçmek için tıklayın'}
          </span>
          <span className="text-xs text-[#969696] mt-1">
            CSV, Excel (.xlsx, .xls) veya TXT
          </span>
        </label>
      </div>

      <div className="bg-[#F5F6F8] rounded-lg p-3">
        <p className="text-xs font-medium text-[#5A5A5A] mb-2">Beklenen Format:</p>
        <code className="text-xs text-[#969696] block bg-white p-2 rounded border">
          VKN;Firma Adı<br/>
          1234567890;ABC Ticaret Ltd. Şti.<br/>
          9876543210;XYZ Sanayi A.Ş.
        </code>
      </div>

      {bulkLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-[#0078D0]" />
          <span className="ml-2 text-sm text-[#5A5A5A]">Dosya okunuyor...</span>
        </div>
      )}

      {parsedBulkData.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-[#F5F6F8] px-3 py-2 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-[#5A5A5A]">
              Bulunan Mükellefler ({parsedBulkData.filter(p => p.valid).length} geçerli / {parsedBulkData.length} toplam)
            </span>
            {parsedBulkData.some(p => !p.valid) && (
              <span className="text-xs text-[#BF192B] font-medium">
                {parsedBulkData.filter(p => !p.valid).length} hatalı satır
              </span>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {parsedBulkData.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between px-3 py-2 border-b last:border-0 ${
                  item.valid ? 'bg-white' : 'bg-[#FEF2F2]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2E2E2E] truncate">
                    {item.name || 'İsimsiz'}
                  </p>
                  <p className="text-xs text-[#969696]">{item.vkn || 'VKN yok'}</p>
                </div>
                {item.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00A651] flex-shrink-0" />
                ) : (
                  <div className="flex items-center gap-1 text-[#F0282D]">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">{item.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {bulkErrors.length > 0 && (
        <div className="border border-[#FFC7C9] rounded-lg overflow-hidden">
          <div className="bg-[#FEF2F2] px-3 py-2 border-b border-[#FFC7C9] flex items-center justify-between">
            <span className="text-sm font-medium text-[#BF192B]">
              Hatalı Satırlar ({bulkErrors.length})
            </span>
            <button
              onClick={() => downloadBulkErrors(bulkErrors)}
              className="flex items-center gap-1 text-xs text-[#0049AA] hover:underline"
            >
              <Download className="w-3 h-3" />
              CSV İndir
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#FEF2F2]/50">
                <tr>
                  <th className="px-2 py-1 text-left text-[#969696]">Satır</th>
                  <th className="px-2 py-1 text-left text-[#969696]">VKN</th>
                  <th className="px-2 py-1 text-left text-[#969696]">Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFC7C9]/50">
                {bulkErrors.map((err, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-2 py-1 font-mono text-[#5A5A5A]">{err.satir}</td>
                    <td className="px-2 py-1 font-mono text-[#5A5A5A]">{err.vkn}</td>
                    <td className="px-2 py-1 text-[#BF192B]">{err.hata}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
