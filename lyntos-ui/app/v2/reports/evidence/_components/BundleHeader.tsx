import React from 'react';
import {
  FolderArchive,
  Download,
  Activity,
} from 'lucide-react';
import type { BundleSummary } from './types';
import { formatDate } from './helpers';

interface BundleHeaderProps {
  bundleData: BundleSummary | null;
  hasData: boolean;
  completedFiles: number;
  totalFiles: number;
  showAuditTrail: boolean;
  onToggleAuditTrail: () => void;
}

export function BundleHeader({
  bundleData,
  hasData,
  completedFiles,
  totalFiles,
  showAuditTrail,
  onToggleAuditTrail,
}: BundleHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-[#2E2E2E] to-[#2E2E2E] rounded-2xl p-6 text-white">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
            <FolderArchive className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kanıt Paketi</h1>
            <p className="text-white/70 text-sm mt-1">
              Big 4 Audit Trail Formatında Denetim Dosyası
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleAuditTrail}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
          >
            <Activity className="w-4 h-4" />
            Audit Trail
          </button>
          <button
            disabled={!hasData}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasData
                ? 'bg-[#00A651] hover:bg-[#00804D] text-white'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            ZIP İndir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-[10px] text-white/50 uppercase tracking-wider">Hazırlayan</p>
          <p className="text-sm font-medium mt-1">{bundleData?.preparedBy || 'SMMM Özkan Koçak'}</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-[10px] text-white/50 uppercase tracking-wider">Son Güncelleme</p>
          <p className="text-sm font-medium mt-1">
            {bundleData?.lastUpdated ? formatDate(bundleData.lastUpdated) : '20.01.2025'}
          </p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-[10px] text-white/50 uppercase tracking-wider">Dosya Durumu</p>
          <p className="text-sm font-medium mt-1">
            {hasData ? `${completedFiles}/${totalFiles} Tamamlandı` : 'Veri Bekleniyor'}
          </p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-[10px] text-white/50 uppercase tracking-wider">Paket Hash</p>
          <p className="text-sm font-mono mt-1 truncate">
            {bundleData?.bundleHash || 'Hesaplanacak...'}
          </p>
        </div>
      </div>
    </div>
  );
}
