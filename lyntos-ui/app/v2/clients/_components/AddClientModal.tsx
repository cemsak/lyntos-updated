'use client';

import React, { useState, useCallback } from 'react';
import {
  X,
  Building2,
  FileSpreadsheet,
  FileImage,
  Loader2,
} from 'lucide-react';
import { useToast } from '../../_components/shared/Toast';
import type {
  AddModalTab,
  NewClientForm,
  ParsedTaxpayer,
  VergiLevhasiData,
  BulkError,
} from '../_types/client';
import { ManualEntryTab } from './ManualEntryTab';
import { BulkUploadTab } from './BulkUploadTab';
import { PdfUploadTab } from './PdfUploadTab';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (client: NewClientForm) => Promise<boolean>;
  onBulkAdd: (items: ParsedTaxpayer[]) => Promise<{ success: number; errors: BulkError[] }>;
  onPdfAdd: (items: VergiLevhasiData[]) => Promise<{ success: number; error: number }>;
  parseBulkFile: (file: File) => Promise<ParsedTaxpayer[]>;
  parsePdfFile: (file: File) => Promise<VergiLevhasiData>;
  validateVKN: (vkn: string) => { valid: boolean; error?: string };
  onSuccess: () => void;
}

export function AddClientModal({
  isOpen,
  onClose,
  onAddClient,
  onBulkAdd,
  onPdfAdd,
  parseBulkFile,
  parsePdfFile,
  validateVKN,
  onSuccess,
}: AddClientModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AddModalTab>('manual');
  const [newClient, setNewClient] = useState<NewClientForm>({
    name: '',
    vkn: '',
    type: 'limited',
  });

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [parsedBulkData, setParsedBulkData] = useState<ParsedTaxpayer[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<BulkError[]>([]);

  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [parsedPdfData, setParsedPdfData] = useState<VergiLevhasiData[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  const resetModalState = useCallback(() => {
    setActiveTab('manual');
    setNewClient({ name: '', vkn: '', type: 'limited' });
    setBulkFile(null);
    setParsedBulkData([]);
    setBulkErrors([]);
    setPdfFiles([]);
    setParsedPdfData([]);
  }, []);

  const handleClose = useCallback(() => {
    resetModalState();
    onClose();
  }, [resetModalState, onClose]);

  const handleAddClient = async () => {
    if (!newClient.name.trim()) {
      showToast('warning', 'Firma adı zorunludur');
      return;
    }

    const vknValidation = validateVKN(newClient.vkn);
    if (!vknValidation.valid) {
      showToast('error', vknValidation.error || 'VKN doğrulama hatası');
      return;
    }

    try {
      await onAddClient(newClient);
      handleClose();
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      showToast('error', errorMessage);
    }
  };

  const handleBulkFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setBulkLoading(true);
    setParsedBulkData([]);
    setBulkErrors([]);

    try {
      const parsed = await parseBulkFile(file);
      setParsedBulkData(parsed);
    } catch {
      showToast('error', 'Dosya okunamadı. Lütfen geçerli bir CSV veya Excel dosyası seçin.');
    } finally {
      setBulkLoading(false);
    }
  }, [parseBulkFile]);

  const handleBulkAdd = async () => {
    const validItems = parsedBulkData.filter((p) => p.valid);
    if (validItems.length === 0) {
      showToast('warning', 'Eklenecek geçerli mükellef bulunamadı');
      return;
    }

    setBulkLoading(true);

    try {
      const result = await onBulkAdd(parsedBulkData);
      setBulkErrors(result.errors);

      const errorCount = result.errors.filter(e =>
        !parsedBulkData.some((p, idx) => !p.valid && idx + 1 === e.satir)
      ).length;

      showToast('info', `Toplu yükleme tamamlandı: ${result.success} mükellef eklendi, ${errorCount} API hatası`);

      if (result.success > 0) {
        onSuccess();
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handlePdfFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const pdfFilesOnly = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFilesOnly.length === 0) {
      showToast('warning', 'Lütfen PDF dosyası seçin');
      return;
    }

    setPdfFiles(pdfFilesOnly);
    setPdfLoading(true);
    setParsedPdfData([]);

    const results: VergiLevhasiData[] = [];
    for (const file of pdfFilesOnly) {
      const parsed = await parsePdfFile(file);
      results.push(parsed);
    }

    setParsedPdfData(results);
    setPdfLoading(false);
  }, [parsePdfFile]);

  const handlePdfAdd = async () => {
    const validItems = parsedPdfData.filter((p) => p.valid);
    if (validItems.length === 0) {
      showToast('warning', 'Eklenecek geçerli mükellef bulunamadı. PDF\'lerin doğru okunduğundan emin olun.');
      return;
    }

    setPdfLoading(true);

    try {
      const result = await onPdfAdd(parsedPdfData);
      showToast('info', `PDF'den mükellef ekleme tamamlandı: ${result.success} mükellef eklendi, ${result.error} hata`);

      if (result.success > 0) {
        onSuccess();
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSubmit = () => {
    if (activeTab === 'manual') handleAddClient();
    else if (activeTab === 'bulk') handleBulkAdd();
    else if (activeTab === 'pdf') handlePdfAdd();
  };

  const isSubmitDisabled =
    (activeTab === 'bulk' && (bulkLoading || parsedBulkData.filter(p => p.valid).length === 0)) ||
    (activeTab === 'pdf' && (pdfLoading || parsedPdfData.filter(p => p.valid).length === 0));

  const submitLabel =
    activeTab === 'manual'
      ? 'Mükellef Ekle'
      : activeTab === 'bulk'
      ? `${parsedBulkData.filter(p => p.valid).length} Mükellef Ekle`
      : `${parsedPdfData.filter(p => p.valid).length} Mükellef Ekle`;

  if (!isOpen) return null;

  const tabs: { key: AddModalTab; label: string; icon: React.ReactNode }[] = [
    { key: 'manual', label: 'Tek Mükellef', icon: <Building2 className="w-4 h-4" /> },
    { key: 'bulk', label: 'CSV / Excel', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { key: 'pdf', label: 'Vergi Levhası', icon: <FileImage className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-[#2E2E2E]">
            Yeni Mükellef Ekle
          </h2>
          <button
            onClick={handleClose}
            className="text-[#969696] hover:text-[#5A5A5A]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab.key
                  ? 'text-[#0049AA] border-b-2 border-[#0049AA] bg-[#E6F9FF]/50'
                  : 'text-[#5A5A5A] hover:text-[#2E2E2E] hover:bg-[#F5F6F8]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'manual' && (
            <ManualEntryTab
              newClient={newClient}
              setNewClient={setNewClient}
            />
          )}

          {activeTab === 'bulk' && (
            <BulkUploadTab
              bulkFile={bulkFile}
              bulkLoading={bulkLoading}
              parsedBulkData={parsedBulkData}
              bulkErrors={bulkErrors}
              onFileChange={handleBulkFileChange}
            />
          )}

          {activeTab === 'pdf' && (
            <PdfUploadTab
              pdfFiles={pdfFiles}
              pdfLoading={pdfLoading}
              parsedPdfData={parsedPdfData}
              onPdfFiles={handlePdfFiles}
            />
          )}
        </div>

        <div className="flex gap-3 p-4 border-t bg-[#F5F6F8]">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-[#E5E5E5] rounded-lg hover:bg-[#F5F6F8] transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="flex-1 px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#00287F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {(bulkLoading || pdfLoading) && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
