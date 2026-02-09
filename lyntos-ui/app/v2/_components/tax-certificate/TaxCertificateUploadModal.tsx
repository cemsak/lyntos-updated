'use client';

/**
 * Tax Certificate Upload Modal
 * Sprint 7.4 - LYNTOS V2
 * Multi-step modal: Upload -> Preview -> Success
 */

import React, { useState, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, Check, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { useTaxCertificate } from './useTaxCertificate';
import type { TaxCertificateData, UploadResponse } from './types';
import { K_CRITERIA_LABELS } from './types';

interface TaxCertificateUploadModalProps {
  clientId: string;
  clientName: string;
  clientVkn: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'upload' | 'preview' | 'success';

export function TaxCertificateUploadModal({
  clientId,
  clientName,
  clientVkn,
  isOpen,
  onClose,
  onSuccess,
}: TaxCertificateUploadModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [editedData, setEditedData] = useState<TaxCertificateData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [confirmedResult, setConfirmedResult] = useState<{ activatedKCriteria?: string[] } | null>(null);

  const { upload, confirm, isUploading, isConfirming, uploadResult, error, reset } = useTaxCertificate({
    clientId,
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      const result = await upload(files[0]);
      if (result?.success && result.parsedData) {
        setEditedData(result.parsedData);
        setStep('preview');
      }
    }
  }, [upload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      const result = await upload(files[0]);
      if (result?.success && result.parsedData) {
        setEditedData(result.parsedData);
        setStep('preview');
      }
    }
  }, [upload]);

  const handleConfirm = useCallback(async () => {
    if (!editedData) return;
    const result = await confirm(editedData);
    if (result?.success) {
      setConfirmedResult(result);
      setStep('success');
    }
  }, [editedData, confirm]);

  const handleClose = useCallback(() => {
    setStep('upload');
    setEditedData(null);
    setConfirmedResult(null);
    reset();
    onClose();
  }, [reset, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tax-cert-modal-title"
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden"
        onKeyDown={(e) => e.key === 'Escape' && handleClose()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <div>
            <h2 id="tax-cert-modal-title" className="text-[16px] font-semibold text-[#2E2E2E]">
              {step === 'upload' && 'Vergi Levhasi Yukle'}
              {step === 'preview' && 'Bilgileri Kontrol Edin'}
              {step === 'success' && 'Basariyla Kaydedildi'}
            </h2>
            <p className="text-[13px] text-[#5A5A5A] mt-0.5">{clientName}</p>
          </div>
          <button onClick={handleClose} className="p-2 text-[#5A5A5A] hover:text-[#2E2E2E] rounded-lg hover:bg-[#F5F6F8]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* STEP: UPLOAD */}
          {step === 'upload' && (
            <div>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-colors
                  ${dragActive
                    ? 'border-[#0049AA] bg-[#0049AA]/5'
                    : 'border-[#E5E5E5] hover:border-[#0049AA]'
                  }
                `}
              >
                <Upload className="w-12 h-12 text-[#5A5A5A] mx-auto mb-4" />
                <p className="text-[14px] font-medium text-[#2E2E2E] mb-2">
                  PDF veya Gorsel Surukleyin
                </p>
                <p className="text-[13px] text-[#5A5A5A] mb-4">
                  veya tiklayarak secin
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-[#0049AA] hover:bg-[#00287F] rounded-lg cursor-pointer transition-colors">
                  <FileText className="w-4 h-4" />
                  Dosya Sec
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-[12px] text-[#5A5A5A] mt-4">
                  Desteklenen: PDF, PNG, JPG (max 10MB)
                </p>
              </div>

              {isUploading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-[#5A5A5A]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Dosya isleniyor...
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-[#F0282D]/10 text-[#F0282D] rounded-lg text-[13px]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {uploadResult?.requiresManualEntry && uploadResult.message && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-[#FFB114]/10 text-[#FFB114] rounded-lg text-[13px]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {uploadResult.message}
                </div>
              )}

              <div className="mt-6 p-4 bg-[#F5F6F8] rounded-lg">
                <p className="text-[12px] text-[#5A5A5A]">
                  GIB'den indirdiginiz Vergi Levhasi PDF'ini dogrudan yukleyebilirsiniz.
                  Bilgiler otomatik olarak okunacaktir.
                </p>
              </div>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && editedData && uploadResult && (
            <div className="space-y-4">
              {/* VKN Match Status */}
              <div className={`flex items-center gap-2 p-3 rounded-lg text-[13px] ${
                uploadResult.vknMatch
                  ? 'bg-[#00A651]/10 text-[#00A651]'
                  : 'bg-[#F0282D]/10 text-[#F0282D]'
              }`}>
                {uploadResult.vknMatch ? (
                  <>
                    <Check className="w-4 h-4" />
                    VKN eslesti: {editedData.vkn}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    VKN eslesmedi! Beklenen: {clientVkn}, Bulunan: {editedData.vkn}
                  </>
                )}
              </div>

              {/* Parsed Data */}
              <div className="space-y-3">
                <DataRow label="Unvan" value={editedData.companyName || '-'} />
                <div className="border-t border-[#E5E5E5]" />

                <DataRow
                  label="NACE Kodu"
                  value={editedData.naceCode || '-'}
                  badge={editedData.naceCode ? 'Yeni' : undefined}
                />
                <DataRow label="Faaliyet" value={editedData.naceDescription || '-'} />
                {uploadResult.naceInfo && (
                  <DataRow label="Sektor Grubu" value={uploadResult.naceInfo.sectorGroup} />
                )}
                <div className="border-t border-[#E5E5E5]" />

                <DataRow label="Vergi Dairesi" value={editedData.taxOffice || '-'} />
                <DataRow label="Adres" value={editedData.address || '-'} />
                <div className="border-t border-[#E5E5E5]" />

                <DataRow
                  label={`${editedData.year || ''} KV Matrahi`}
                  value={editedData.kvMatrah ? `${Number(editedData.kvMatrah).toLocaleString('tr-TR')} TL` : '-'}
                  highlight
                />
                <DataRow
                  label="Odenen KV"
                  value={editedData.kvPaid ? `${Number(editedData.kvPaid).toLocaleString('tr-TR')} TL` : '-'}
                />
              </div>

              {/* Year-over-Year Comparison */}
              {uploadResult.comparison?.matrahChangePercent != null && (
                <div className={`p-4 rounded-lg ${
                  uploadResult.comparison.matrahChangePercent < -20
                    ? 'bg-[#F0282D]/10'
                    : uploadResult.comparison.matrahChangePercent > 20
                      ? 'bg-[#00A651]/10'
                      : 'bg-[#FFB114]/10'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {uploadResult.comparison.matrahChangePercent < 0 ? (
                      <TrendingDown className={`w-4 h-4 ${uploadResult.comparison.matrahChangePercent < -20 ? 'text-[#F0282D]' : 'text-[#FFB114]'}`} />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-[#00A651]" />
                    )}
                    <span className="text-[13px] font-medium text-[#2E2E2E]">
                      Gecen Yila Gore: %{Math.abs(uploadResult.comparison.matrahChangePercent).toFixed(1)}
                      {uploadResult.comparison.matrahChangePercent < 0 ? ' dusus' : ' artis'}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#5A5A5A]">
                    {uploadResult.comparison.previousYear}: {Number(uploadResult.comparison.previousMatrah).toLocaleString('tr-TR')} TL
                    {' -> '}{editedData.year}: {Number(editedData.kvMatrah).toLocaleString('tr-TR')} TL
                  </p>
                  {uploadResult.comparison.matrahChangePercent < -20 && (
                    <p className="text-[12px] text-[#F0282D] mt-2">
                      Yuksek dusus VDK incelemesi tetikleyebilir
                    </p>
                  )}
                </div>
              )}

              {/* Warnings */}
              {uploadResult.validation?.warnings && uploadResult.validation.warnings.length > 0 && (
                <div className="p-3 bg-[#FFB114]/10 rounded-lg">
                  {uploadResult.validation.warnings.map((w, i) => (
                    <p key={i} className="text-[12px] text-[#FFB114]">{w}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && confirmedResult && (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00A651]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-[#00A651]" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#2E2E2E] mb-2">
                Vergi Levhasi Kaydedildi
              </h3>

              {uploadResult?.naceInfo && (
                <div className="mt-6 p-4 bg-[#F5F6F8] rounded-lg text-left">
                  <p className="text-[13px] font-medium text-[#2E2E2E] mb-2">
                    Sektor Profili Guncellendi
                  </p>
                  <p className="text-[12px] text-[#5A5A5A]">
                    {uploadResult.naceInfo.sectorGroup} (NACE {uploadResult.naceInfo.code})
                  </p>

                  {confirmedResult.activatedKCriteria && confirmedResult.activatedKCriteria.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[13px] font-medium text-[#2E2E2E] mb-2">
                        Aktif K-Kriterleri
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {confirmedResult.activatedKCriteria.map((k: string) => (
                          <span key={k} className="px-2 py-1 text-[11px] font-medium bg-[#0049AA]/10 text-[#0049AA] rounded" title={K_CRITERIA_LABELS[k]}>
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E5E5]">
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-[13px] font-medium text-[#5A5A5A] hover:text-[#2E2E2E]"
              >
                Geri
              </button>
              <button
                onClick={handleConfirm}
                disabled={isConfirming || !uploadResult?.vknMatch}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-[#0049AA] hover:bg-[#00287F] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConfirming && <Loader2 className="w-4 h-4 animate-spin" />}
                {isConfirming ? 'Kaydediliyor...' : 'Onayla ve Kaydet'}
              </button>
            </>
          )}
          {step === 'success' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-[13px] font-medium text-white bg-[#0049AA] hover:bg-[#00287F] rounded-lg"
            >
              Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value, badge, highlight }: {
  label: string;
  value: string;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[13px] text-[#5A5A5A] flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className={`text-[13px] ${highlight ? 'font-semibold text-[#2E2E2E]' : 'text-[#2E2E2E]'}`}>
          {value}
        </span>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#0049AA]/10 text-[#0049AA] rounded">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
