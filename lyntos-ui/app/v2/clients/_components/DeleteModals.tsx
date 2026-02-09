'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Taxpayer } from '../_types/client';

interface DeleteClientModalProps {
  isOpen: boolean;
  client: Taxpayer | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteClientModal({
  isOpen,
  client,
  isLoading,
  onConfirm,
  onCancel,
}: DeleteClientModalProps) {
  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-[#BF192B]" />
          </div>
          <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">
            Mükellefi Sil
          </h3>
          <p className="text-[#5A5A5A] mb-2">
            <span className="font-medium">{client.name}</span> isimli mükellefi silmek istediğinize emin misiniz?
          </p>
          <p className="text-sm text-[#BF192B] bg-[#FEF2F2] rounded-lg p-3">
            Bu işlem geri alınamaz. Mükellefe ait tüm veriler (mizan, beyanname, analiz sonuçları) silinecektir.
          </p>
        </div>

        <div className="flex gap-3 p-4 border-t bg-[#F5F6F8] rounded-b-xl">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-[#E5E5E5] rounded-lg hover:bg-[#F5F6F8] transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-[#BF192B] text-white rounded-lg hover:bg-[#9E0F1F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}

interface BulkDeleteModalProps {
  isOpen: boolean;
  selectedCount: number;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkDeleteModal({
  isOpen,
  selectedCount,
  isLoading,
  onConfirm,
  onCancel,
}: BulkDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-[#BF192B]" />
          </div>
          <h3 className="text-lg font-semibold text-[#2E2E2E] mb-2">
            Toplu Silme
          </h3>
          <p className="text-[#5A5A5A] mb-2">
            <span className="font-bold text-[#BF192B]">{selectedCount}</span> mükellefi silmek istediğinize emin misiniz?
          </p>
          <p className="text-sm text-[#BF192B] bg-[#FEF2F2] rounded-lg p-3">
            Bu işlem geri alınamaz. Seçili mükelleflere ait tüm veriler silinecektir.
          </p>
        </div>
        <div className="flex gap-3 p-4 border-t bg-[#F5F6F8] rounded-b-xl">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-[#E5E5E5] rounded-lg hover:bg-[#F5F6F8] transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-[#BF192B] text-white rounded-lg hover:bg-[#9E0F1F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {selectedCount} Mükellefi Sil
          </button>
        </div>
      </div>
    </div>
  );
}
