'use client';
/**
 * LYNTOS Delete Dönem Modal
 * ==========================
 * SMMM'in dönem verisini silmesi için onay modalı
 *
 * Özellikler:
 * - Çift onay mekanizması (checkbox + buton)
 * - Backend'den soft delete (is_active = 0)
 * - Local store'u da temizler
 * - Hata durumu gösterimi
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { clearDonemFromBackend } from '../../_lib/api/donemSync';
import { useDonemStore } from '../../_lib/stores/donemStore';
import { useToast } from '../shared/Toast';

interface DeleteDonemModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: string | null; // "2025-Q1" gibi
  clientName?: string;
  onSuccess?: () => void;
}

export function DeleteDonemModal({
  isOpen,
  onClose,
  period,
  clientName = 'Mükellef',
  onSuccess,
}: DeleteDonemModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearDonemData = useDonemStore(s => s.clearDonemData);
  const { showToast } = useToast();

  if (!isOpen || !period) return null;

  const handleDelete = async () => {
    if (!confirmed) {
      setError('Lütfen silme işlemini onaylayın');
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      // 1. Backend'den sil
      const result = await clearDonemFromBackend(period, 'default', 'current');

      if (!result.success) {
        setError(result.message);
        setDeleting(false);
        return;
      }

      // 2. Local store'u temizle
      clearDonemData();

      // 3. Başarılı mesajı
      showToast('success', `${period} dönemi başarıyla silindi (${result.deletedCount} kayıt)`);

      // 4. Kapat ve callback
      handleClose();
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen hata');
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    setDeleting(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-donem-modal-title"
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onKeyDown={(e) => e.key === 'Escape' && !deleting && handleClose()}
        tabIndex={-1}
      >
        {/* Header - Red warning */}
        <div className="bg-[#FEF2F2] border-b border-[#FEF2F2] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FEF2F2] rounded-full">
                <AlertTriangle className="w-5 h-5 text-[#BF192B]" />
              </div>
              <div>
                <h3 id="delete-donem-modal-title" className="text-lg font-semibold text-[#980F30]">
                  Dönem Verisini Sil
                </h3>
                <p className="text-sm text-[#BF192B]">{period}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-[#FF555F] hover:text-[#BF192B] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning Message */}
          <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4 mb-4">
            <p className="text-sm text-[#E67324]">
              <strong>{clientName}</strong> için <strong>{period}</strong> dönemine ait
              tüm yüklenen belgeler ve analizler silinecektir.
            </p>
            <ul className="mt-2 text-sm text-[#FA841E] list-disc list-inside">
              <li>Mizan verileri</li>
              <li>e-Defter kayıtları</li>
              <li>Beyanname bilgileri</li>
              <li>Banka ekstreleri</li>
              <li>Tüm analiz sonuçları</li>
            </ul>
          </div>

          {/* Soft Delete Info */}
          <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3 mb-4">
            <p className="text-xs text-[#0049AA]">
              <strong>Not:</strong> Veriler kalıcı olarak silinmez, pasif hale getirilir.
              Gerektiğinde sistem yöneticisi tarafından geri alınabilir.
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                setError(null);
              }}
              className="mt-1 w-4 h-4 text-[#BF192B] border-[#B4B4B4] rounded focus:ring-[#F0282D]"
            />
            <span className="text-sm text-[#5A5A5A] group-hover:text-[#2E2E2E]">
              <strong>{period}</strong> dönemine ait tüm verilerin silineceğini anlıyorum
              ve bu işlemi onaylıyorum.
            </span>
          </label>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg">
              <p className="text-sm text-[#BF192B]">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-[#F5F6F8] border-t border-[#E5E5E5] flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-[#5A5A5A] hover:text-[#2E2E2E]
                       hover:bg-[#F5F6F8] rounded-lg transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleDelete}
            disabled={!confirmed || deleting}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${confirmed && !deleting
                ? 'bg-[#BF192B] text-white hover:bg-[#BF192B]'
                : 'bg-[#E5E5E5] text-[#969696] cursor-not-allowed'
              }
            `}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Siliniyor...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Dönemi Sil
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteDonemModal;
