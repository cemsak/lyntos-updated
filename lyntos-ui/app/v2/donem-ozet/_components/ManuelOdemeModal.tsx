import React from 'react';
import { formatCurrency } from '../../_lib/format';
import type { Tahakkuk, ManuelOdemeForm } from './types';

export function ManuelOdemeModal({
  tahakkuk,
  form,
  saving,
  onFormChange,
  onSave,
  onClose,
}: {
  tahakkuk: Tahakkuk;
  form: ManuelOdemeForm;
  saving: boolean;
  onFormChange: (updater: (prev: ManuelOdemeForm) => ManuelOdemeForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-[#2E2E2E] mb-4">
          Manuel Ödeme Kaydı
        </h3>

        <div className="bg-[#F5F6F8] rounded-lg p-3 mb-4">
          <div className="text-sm text-[#5A5A5A]">
            <strong>{tahakkuk.beyanname_turu}</strong> - {tahakkuk.donem}
          </div>
          <div className="text-sm mt-1">
            Anapara: <strong>{formatCurrency(tahakkuk.toplam_borc)}</strong>
            {tahakkuk.gecikme_zammi && tahakkuk.gecikme_zammi > 0 && (
              <span className="text-[#BF192B] ml-2">
                + Gecikme Zammı: {formatCurrency(tahakkuk.gecikme_zammi)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5A5A5A] mb-1">Ödeme Tarihi</label>
            <input
              type="date"
              value={form.odeme_tarihi}
              onChange={(e) => onFormChange(f => ({ ...f, odeme_tarihi: e.target.value }))}
              className="w-full px-3 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5A5A5A] mb-1">Ödeme Tutarı (TL)</label>
            <input
              type="number"
              step="0.01"
              value={form.odeme_tutari}
              onChange={(e) => onFormChange(f => ({ ...f, odeme_tutari: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5A5A5A] mb-1">Ödeme Kaynağı</label>
            <select
              value={form.odeme_kaynagi}
              onChange={(e) => onFormChange(f => ({ ...f, odeme_kaynagi: e.target.value }))}
              className="w-full px-3 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
            >
              <option value="kredi_karti">Kredi Kartı</option>
              <option value="nakit_vergi_dairesi">Nakit (Vergi Dairesi)</option>
              <option value="banka">Banka Havalesi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5A5A5A] mb-1">Açıklama (Opsiyonel)</label>
            <textarea
              value={form.aciklama}
              onChange={(e) => onFormChange(f => ({ ...f, aciklama: e.target.value }))}
              placeholder="Ödeme hakkında not..."
              rows={2}
              className="w-full px-3 py-2 border border-[#B4B4B4] rounded-lg focus:ring-2 focus:ring-[#0078D0] focus:border-[#0078D0]"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-[#B4B4B4] text-[#5A5A5A] rounded-lg hover:bg-[#F5F6F8] transition-colors"
          >
            İptal
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-[#00804D] text-white rounded-lg hover:bg-[#00804D] transition-colors disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Ödendi Olarak Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
