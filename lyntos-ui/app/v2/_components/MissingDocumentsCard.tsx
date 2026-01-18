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
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  // Status badge colors
  const getStatusBadge = (status: DocCategoryStatus['status']) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'missing':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Belge Durumu
            </h3>
            {period && (
              <p className="text-sm text-gray-500 mt-0.5">
                {period} donemi
              </p>
            )}
          </div>

          {/* Completion badge */}
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            isComplete
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
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
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">{summary.present} Mevcut</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">{summary.missing} Eksik</span>
          </div>
          {summary.error > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-gray-600">{summary.error} Hatali</span>
            </div>
          )}
        </div>
      </div>

      {/* Document list */}
      <div className="divide-y divide-gray-100">
        {statuses.map((item) => {
          const IconComponent = ICONS[item.info.icon] || FileText;

          return (
            <div
              key={item.docType}
              className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                onCategoryClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onCategoryClick?.(item.docType)}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${
                  item.status === 'present'
                    ? 'bg-green-50'
                    : item.status === 'missing'
                    ? 'bg-red-50'
                    : 'bg-gray-50'
                }`}>
                  <IconComponent className={`w-5 h-5 ${
                    item.status === 'present'
                      ? 'text-green-600'
                      : item.status === 'missing'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`} />
                </div>

                {/* Label and description */}
                <div>
                  <div className="font-medium text-gray-900">
                    {item.info.labelTr}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.info.description}
                  </div>
                </div>
              </div>

              {/* Right side: status and count */}
              <div className="flex items-center gap-3">
                {item.count > 0 && (
                  <span className="text-sm text-gray-500">
                    {item.count} dosya
                  </span>
                )}

                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(item.status)}`}>
                  {getStatusText(item.status)}
                </span>

                <StatusIcon status={item.status} />

                {onCategoryClick && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with action */}
      {summary.missing > 0 && (
        <div className="px-6 py-4 bg-red-50 border-t border-red-100 rounded-b-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {summary.missing} belge kategorisi eksik
              </p>
              <p className="text-sm text-red-600 mt-1">
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
