import React from 'react';
import {
  Download,
  Upload,
  Shield,
  Hash,
  Calendar,
  User,
  Eye,
  FileCheck,
  Scale,
  ChevronDown,
  ChevronRight,
  Fingerprint,
  FolderArchive,
} from 'lucide-react';
import Link from 'next/link';
import type { BundleSection } from './types';
import { STATUS_CONFIG, DOC_STATUS_CONFIG } from './types';
import { copyHash, formatFileSize, formatDate } from './helpers';

interface WorkpaperSectionsProps {
  sections: BundleSection[];
  hasData: boolean;
  expandedSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
}

export function WorkpaperSections({
  sections,
  hasData,
  expandedSections,
  onToggleSection,
}: WorkpaperSectionsProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2E2E2E] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#0049AA]" />
          Çalışma Kağıtları (Workpapers)
        </h2>
        <span className="text-xs px-2 py-1 bg-[#E6F9FF] text-[#0049AA] rounded">
          Big 4 Standart Format
        </span>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 bg-[#F5F6F8] rounded-full flex items-center justify-center mb-4">
            <FolderArchive className="w-10 h-10 text-[#969696]" />
          </div>
          <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">Veri Yüklenmedi</h3>
          <p className="text-[#5A5A5A] max-w-md mb-6">
            Big 4 formatında kanıt paketi oluşturmak için önce verilerinizi yükleyin.
            Her belge otomatik olarak kategorize edilecek ve hash ile korunacaktır.
          </p>
          <Link
            href="/v2/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0049AA] text-white rounded-xl hover:bg-[#0049AA] transition-colors font-medium"
          >
            <Upload className="w-5 h-5" />
            Veri Yükle
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#E5E5E5]">
          {sections.map((section) => {
            const statusConfig = STATUS_CONFIG[section.status];
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedSections[section.id];

            return (
              <div key={section.id}>
                <button
                  onClick={() => onToggleSection(section.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F5F6F8] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${statusConfig.bg} flex items-center justify-center`}>
                      <span className="text-lg font-bold text-[#5A5A5A]">{section.workpaperPrefix}</span>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#2E2E2E]">{section.title}</p>
                        {section.legalBasis && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#F5F6F8] text-[#5A5A5A] rounded">
                            {section.legalBasis}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#969696] mt-0.5">{section.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                        <span className={`text-sm font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#969696]">{section.files} dosya</p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-[#969696]" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-[#969696]" />
                    )}
                  </div>
                </button>

                {isExpanded && section.documents.length > 0 && (
                  <div className="px-6 pb-4">
                    <div className="ml-16 space-y-2">
                      {section.documents.map((doc) => {
                        const docStatus = DOC_STATUS_CONFIG[doc.status];
                        const DocStatusIcon = docStatus.icon;

                        return (
                          <div
                            key={doc.id}
                            className={`border rounded-lg p-3 ${docStatus.bg}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <FileCheck className={`w-5 h-5 mt-0.5 ${docStatus.color}`} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-[#2E2E2E] text-sm">{doc.filename}</p>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-white rounded text-[#5A5A5A]">
                                      {doc.workpaperRef}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[#969696]">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(doc.uploadedAt)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {doc.uploadedBy}
                                    </span>
                                    <span>{formatFileSize(doc.fileSize)}</span>
                                  </div>
                                  {doc.legalReference && (
                                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#0049AA]">
                                      <Scale className="w-3 h-3" />
                                      {doc.legalReference}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => copyHash(doc.hash)}
                                  className="p-1.5 text-[#969696] hover:text-[#5A5A5A] hover:bg-white rounded transition-colors"
                                  title="Hash kopyala"
                                >
                                  <Fingerprint className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 text-[#969696] hover:text-[#0049AA] hover:bg-white rounded transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 text-[#969696] hover:text-[#00804D] hover:bg-white rounded transition-colors">
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-[#969696]">
                              <Hash className="w-3 h-3" />
                              <span>SHA-256: {doc.hash}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isExpanded && section.documents.length === 0 && (
                  <div className="px-6 pb-4">
                    <div className="ml-16 p-4 bg-[#F5F6F8] rounded-lg text-center">
                      <p className="text-sm text-[#969696]">
                        Bu kategoride henüz belge yüklenmedi.
                      </p>
                      <Link
                        href="/v2/upload"
                        className="inline-flex items-center gap-1 mt-2 text-sm text-[#0049AA] hover:underline"
                      >
                        <Upload className="w-4 h-4" />
                        Belge Yükle
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
