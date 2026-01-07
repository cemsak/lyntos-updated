'use client';

/**
 * Document Card Component
 * Sprint 8.2 - LYNTOS V2
 *
 * Displays a single document with upload, preview, and status functionality.
 * Supports drag-and-drop file upload.
 */

import React, { useCallback, useState } from 'react';
import { Upload, Eye, Trash2, Check, Clock } from 'lucide-react';
import type { DocumentItem, Priority } from './types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from './types';

interface DocumentCardProps {
  document: DocumentItem;
  ruleId: string;
  onUpload: (file: File, notes?: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  isUploading: boolean;
}

export function DocumentCard({
  document,
  ruleId,
  onUpload,
  onDelete,
  isUploading,
}: DocumentCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(document.notes || '');

  const priority = PRIORITY_CONFIG[document.priority] || PRIORITY_CONFIG.medium;
  const status = STATUS_CONFIG[document.status] || STATUS_CONFIG.pending;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        await onUpload(file, notes);
      }
    },
    [onUpload, notes]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await onUpload(file, notes);
      }
    },
    [onUpload, notes]
  );

  const isUploaded =
    document.status === 'uploaded' || document.status === 'verified';

  return (
    <div
      className={`
        p-4 rounded-lg border-2 transition-all
        ${isDragOver ? 'border-[#635bff] bg-[#635bff]/5' : 'border-[#e3e8ee] dark:border-[#2d3343]'}
        ${isUploaded ? 'bg-[#0caf60]/5' : 'bg-white dark:bg-[#1a1f2e]'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-[16px]">{status.icon}</span>
          <div className="flex-1">
            <p
              className={`text-[13px] font-medium ${
                isUploaded
                  ? 'text-[#697386] line-through'
                  : 'text-[#1a1f36] dark:text-white'
              }`}
            >
              {document.name}
            </p>
            {document.description && (
              <p className="text-[11px] text-[#697386] mt-0.5">
                {document.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-[10px] font-medium rounded"
            style={{
              backgroundColor: `${priority.color}20`,
              color: priority.color,
            }}
          >
            {priority.label}
          </span>
        </div>
      </div>

      {/* Status / Upload */}
      <div className="mt-3">
        {isUploaded ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-[#0caf60]">
              <Check className="w-4 h-4" />
              <span>{document.file_name}</span>
              {document.uploaded_at && (
                <span className="text-[#697386]">
                  ({new Date(document.uploaded_at).toLocaleDateString('tr-TR')})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {document.file_url && (
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-[#697386] hover:text-[#635bff] hover:bg-[#635bff]/10 rounded transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </a>
              )}
              <button
                onClick={onDelete}
                className="p-1.5 text-[#697386] hover:text-[#cd3d64] hover:bg-[#cd3d64]/10 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Upload Area */}
            <div
              className={`
              p-3 border-2 border-dashed rounded-lg text-center transition-colors
              ${isDragOver ? 'border-[#635bff] bg-[#635bff]/5' : 'border-[#e3e8ee] dark:border-[#2d3343]'}
            `}
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-2 text-[12px] text-[#697386]">
                  <div className="w-4 h-4 border-2 border-[#635bff] border-t-transparent rounded-full animate-spin" />
                  Yukleniyor...
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2 text-[12px] text-[#697386]">
                    <Upload className="w-4 h-4" />
                    <span>
                      Surukle veya{' '}
                      <span className="text-[#635bff]">Dosya Sec</span>
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.csv,.txt"
                  />
                </label>
              )}
            </div>

            {/* Notes Toggle */}
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="mt-2 text-[11px] text-[#697386] hover:text-[#635bff] transition-colors"
            >
              {showNotes ? '- Not gizle' : '+ Not ekle'}
            </button>

            {showNotes && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Belge hakkinda not..."
                className="mt-2 w-full px-2 py-1.5 text-[12px] bg-[#f6f9fc] dark:bg-[#0a0d14] border border-[#e3e8ee] dark:border-[#2d3343] rounded resize-none h-16 text-[#1a1f36] dark:text-white placeholder:text-[#697386] focus:outline-none focus:ring-2 focus:ring-[#635bff]/20"
              />
            )}

            {/* Waiting Status Note */}
            {document.status === 'waiting' && document.notes && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[#f5a623]">
                <Clock className="w-3 h-3" />
                {document.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
