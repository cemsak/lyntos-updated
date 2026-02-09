/**
 * Rapor Kart Bileşeni
 */

import { useState } from 'react';
import { Eye, Download, Loader2, AlertCircle, FileText } from 'lucide-react';
import type { RaporTipi } from '../_types';
import { colorConfig, categoryLabels } from '../_lib/constants';

interface ReportCardProps {
  rapor: RaporTipi;
  isLoading: boolean;
  onView: () => void;
  onDownload: (format: 'PDF' | 'Excel' | 'Word') => void;
  hasData: boolean;
  index: number;
}

export function ReportCard({ rapor, isLoading, onView, onDownload, hasData, index }: ReportCardProps) {
  const [showFormats, setShowFormats] = useState(false);
  const Icon = rapor.icon;
  const colors = colorConfig[rapor.color];
  const category = categoryLabels[rapor.category];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border-2 transition-all duration-300
        ${colors.bg} ${colors.border}
        hover:shadow-lg hover:-translate-y-1
        animate-slide-up
      `}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Category Badge */}
      <div className="absolute top-3 right-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorConfig[category.color as keyof typeof colorConfig].badge}`}>
          {category.label}
        </span>
      </div>

      <div className="p-5">
        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${colors.icon}`}>
            <Icon className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-bold text-[#2E2E2E] text-lg">{rapor.name}</h3>
            <p className="text-sm text-[#5A5A5A] mt-1">{rapor.description}</p>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="mt-4 p-3 bg-white/50 rounded-xl border border-white/50">
          <p className="text-xs text-[#5A5A5A]">{rapor.detailedInfo}</p>
        </div>

        {/* Output Formats */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-[#969696]">Formatlar:</span>
          {rapor.outputFormats.map((format) => (
            <span
              key={format}
              className="px-2 py-0.5 bg-white rounded text-xs font-medium text-[#5A5A5A] border border-[#E5E5E5]"
            >
              {format}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onView}
            disabled={!hasData && rapor.requiresData}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
              text-sm font-semibold transition-all duration-200
              ${hasData || !rapor.requiresData
                ? 'bg-white text-[#5A5A5A] hover:bg-[#F5F6F8] border border-[#E5E5E5] shadow-sm'
                : 'bg-[#F5F6F8] text-[#969696] cursor-not-allowed'}
            `}
          >
            <Eye className="w-4 h-4" />
            Görüntüle
          </button>

          <div className="relative">
            <button
              onClick={() => setShowFormats(!showFormats)}
              disabled={isLoading || (!hasData && rapor.requiresData)}
              className={`
                flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                text-sm font-semibold transition-all duration-200 shadow-sm
                ${hasData || !rapor.requiresData
                  ? colors.button
                  : 'bg-[#F5F6F8] text-[#969696] cursor-not-allowed'}
              `}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              İndir
            </button>

            {/* Format Dropdown */}
            {showFormats && (
              <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-lg border border-[#E5E5E5] py-1 z-10">
                {rapor.outputFormats.map((format) => (
                  <button
                    key={format}
                    onClick={() => {
                      onDownload(format);
                      setShowFormats(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[#F5F6F8] flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-[#969696]" />
                    {format}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data Requirement Warning */}
        {rapor.requiresData && !hasData && (
          <p className="mt-3 text-xs text-[#FA841E] flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Veri yüklendikten sonra kullanılabilir
          </p>
        )}
      </div>
    </div>
  );
}
