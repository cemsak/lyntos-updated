'use client';

import React, { useMemo } from 'react';
import {
  Table,
  FileText,
  Receipt,
  Landmark,
  BookCheck,
  FileStack,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import type { DocCategoryStatus, Big6DocType } from '../_lib/constants/docTypes';
import {
  calculateDocStatuses,
  getDocStatusSummary,
  isPeriodComplete
} from '../_lib/utils/docStatusHelper';

// Icon mapping
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Table,
  FileText,
  Receipt,
  Landmark,
  BookCheck,
  FileStack,
};

interface MissingDocumentsCardProps {
  byDocType: Record<string, unknown[]> | undefined | null;
  period?: string;
  onCategoryClick?: (docType: Big6DocType) => void;
  className?: string;
}

export function MissingDocumentsCard({
  byDocType,
  period,
  onCategoryClick,
  className = '',
}: MissingDocumentsCardProps) {
  // Calculate statuses
  const statuses = useMemo(
    () => calculateDocStatuses(byDocType),
    [byDocType]
  );

  const summary = useMemo(
    () => getDocStatusSummary(statuses),
    [statuses]
  );

  const isComplete = useMemo(
    () => isPeriodComplete(statuses),
    [statuses]
  );

  // Status icon component
  const StatusIcon = ({ status }: { status: DocCategoryStatus['status'] }) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="w-5 h-5 text-[#00A651]" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-[#F0282D]" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#FFB114]" />;
      default:
        return <AlertCircle className="w-5 h-5 text-[#969696]" />;
    }
  };

  // Status badge colors
  const getStatusBadge = (status: DocCategoryStatus['status']) => {
    switch (status) {
      case 'present':
        return 'bg-[#ECFDF5] text-[#005A46] border-[#AAE8B8]';
      case 'missing':
        return 'bg-[#FEF2F2] text-[#980F30] border-[#FFC7C9]';
      case 'error':
        return 'bg-[#FFFBEB] text-[#E67324] border-[#FFF08C]';
      default:
        return 'bg-[#F5F6F8] text-[#2E2E2E] border-[#E5E5E5]';
    }
  };

  const getStatusText = (status: DocCategoryStatus['status']) => {
    switch (status) {
      case 'present':
        return 'Mevcut';
      case 'missing':
        return 'Eksik';
      case 'error':
        return 'Hatali';
      default:
        return 'Bilinmiyor';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-[#E5E5E5] ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#2E2E2E]">
              Belge Durumu
            </h3>
            {period && (
              <p className="text-sm text-[#969696] mt-0.5">
                {period} donemi
              </p>
            )}
          </div>

          {/* Completion badge */}
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            isComplete
              ? 'bg-[#ECFDF5] text-[#005A46]'
              : 'bg-[#FFFBEB] text-[#E67324]'
          }`}>
            {isComplete ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Tam
              </span>
            ) : (
              <span>%{summary.completionPercent} Tamamlandi</span>
            )}
          </div>
        </div>

        {/* Summary bar */}
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#00A651]"></div>
            <span className="text-[#5A5A5A]">{summary.present} Mevcut</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#F0282D]"></div>
            <span className="text-[#5A5A5A]">{summary.missing} Eksik</span>
          </div>
          {summary.error > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FFB114]"></div>
              <span className="text-[#5A5A5A]">{summary.error} Hatali</span>
            </div>
          )}
        </div>
      </div>

      {/* Document list */}
      <div className="divide-y divide-[#E5E5E5]">
        {statuses.map((item) => {
          const IconComponent = ICONS[item.info.icon] || FileText;

          return (
            <div
              key={item.docType}
              className={`px-6 py-4 flex items-center justify-between hover:bg-[#F5F6F8] transition-colors ${
                onCategoryClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onCategoryClick?.(item.docType)}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${
                  item.status === 'present'
                    ? 'bg-[#ECFDF5]'
                    : item.status === 'missing'
                    ? 'bg-[#FEF2F2]'
                    : 'bg-[#F5F6F8]'
                }`}>
                  <IconComponent className={`w-5 h-5 ${
                    item.status === 'present'
                      ? 'text-[#00804D]'
                      : item.status === 'missing'
                      ? 'text-[#BF192B]'
                      : 'text-[#5A5A5A]'
                  }`} />
                </div>

                {/* Label and description */}
                <div>
                  <div className="font-medium text-[#2E2E2E]">
                    {item.info.labelTr}
                  </div>
                  <div className="text-sm text-[#969696]">
                    {item.info.description}
                  </div>
                </div>
              </div>

              {/* Right side: status and count */}
              <div className="flex items-center gap-3">
                {item.count > 0 && (
                  <span className="text-sm text-[#969696]">
                    {item.count} dosya
                  </span>
                )}

                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(item.status)}`}>
                  {getStatusText(item.status)}
                </span>

                <StatusIcon status={item.status} />

                {onCategoryClick && (
                  <ChevronRight className="w-4 h-4 text-[#969696]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with action */}
      {summary.missing > 0 && (
        <div className="px-6 py-4 bg-[#FEF2F2] border-t border-[#FEF2F2] rounded-b-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#BF192B] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#980F30]">
                {summary.missing} belge kategorisi eksik
              </p>
              <p className="text-sm text-[#BF192B] mt-1">
                Donem analizinin tamamlanmasi icin eksik belgeleri yukleyin.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MissingDocumentsCard;
