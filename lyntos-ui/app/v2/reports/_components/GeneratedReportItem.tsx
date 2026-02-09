/**
 * Oluşturulan Rapor Listesi Öğesi
 */

import { useState } from 'react';
import {
  Eye,
  Download,
  Printer,
  Share2,
  Trash2,
  MoreVertical,
  Calendar,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import type { OlusturulanRapor } from '../_types';
import { RAPOR_TIPLERI, colorConfig } from '../_lib/constants';

interface GeneratedReportItemProps {
  rapor: OlusturulanRapor;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function GeneratedReportItem({ rapor, onView, onDownload, onDelete }: GeneratedReportItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const raporTipi = RAPOR_TIPLERI.find(r => r.id === rapor.raporTipiId);
  const Icon = raporTipi?.icon || FileText;
  const colors = raporTipi ? colorConfig[raporTipi.color] : colorConfig.blue;

  const formatIcon = {
    PDF: <FileText className="w-4 h-4 text-[#F0282D]" />,
    Excel: <FileSpreadsheet className="w-4 h-4 text-[#00A651]" />,
    Word: <FileText className="w-4 h-4 text-[#0078D0]" />,
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-[#F5F6F8] rounded-xl transition-colors group">
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.icon}`}>
        <Icon className="w-6 h-6" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[#2E2E2E] truncate">{rapor.name}</p>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-[#F5F6F8] rounded text-xs text-[#5A5A5A]">
            {formatIcon[rapor.format]}
            {rapor.format}
          </span>
        </div>
        <p className="text-sm text-[#969696] flex items-center gap-2 mt-0.5">
          <span>{rapor.mukellef}</span>
          <span>•</span>
          <span>{rapor.donem}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(rapor.createdAt).toLocaleDateString('tr-TR')}
          </span>
          {rapor.size && (
            <>
              <span>•</span>
              <span>{rapor.size}</span>
            </>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onView}
          className="p-2 text-[#0049AA] hover:bg-[#E6F9FF] rounded-lg transition-colors"
          title="Görüntüle"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onDownload}
          className="p-2 text-[#5A5A5A] hover:bg-[#F5F6F8] rounded-lg transition-colors"
          title="İndir"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => {}}
          className="p-2 text-[#5A5A5A] hover:bg-[#F5F6F8] rounded-lg transition-colors"
          title="Yazdır"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-[#969696] hover:bg-[#F5F6F8] rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-[#E5E5E5] py-1 z-10">
              <button
                onClick={() => {
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[#F5F6F8] flex items-center gap-2"
              >
                <Share2 className="w-4 h-4 text-[#969696]" />
                Paylaş
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[#FEF2F2] flex items-center gap-2 text-[#BF192B]"
              >
                <Trash2 className="w-4 h-4" />
                Sil
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
