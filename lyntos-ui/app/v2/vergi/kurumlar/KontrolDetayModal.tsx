'use client';

/**
 * KontrolDetayModal
 * Modal displaying detailed information for a specific tax control item
 */

import React from 'react';
import {
  Circle,
  X,
  ExternalLink,
  FileText,
} from 'lucide-react';

export interface KontrolDetail {
  id: string;
  name: string;
  description: string;
  mevzuatRef: string;
  checkItems: string[];
  status: 'passed' | 'failed' | 'pending';
}

// Kontrol detayları veritabanı (gerçek uygulamada API'den gelecek)
export const KONTROL_DETAYLARI: Record<string, KontrolDetail> = {
  'KV-01': {
    id: 'KV-01',
    name: 'KKEG Kontrolü',
    description: 'Kanunen Kabul Edilmeyen Giderlerin doğru tespit ve beyan edilmesi',
    mevzuatRef: 'KVK Md. 11',
    checkItems: [
      'Temettü ödemeleri kontrol edildi mi?',
      'Transfer fiyatlandırması farkları eklendi mi?',
      'Bağış sınırları aşımı kontrol edildi mi?',
      'Örtülü kazanç dağıtımı incelendi mi?'
    ],
    status: 'pending'
  },
  'KV-02': {
    id: 'KV-02',
    name: 'İştirak Kazançları İstisnası',
    description: 'Tam mükellef kurumlardan alınan temettülerin istisna kontrolü',
    mevzuatRef: 'KVK Md. 5/1-a',
    checkItems: [
      'İştirak oranı %10 üzerinde mi?',
      'Holding şartları sağlanıyor mu?',
      'Yurtdışı iştirakler için şartlar kontrol edildi mi?'
    ],
    status: 'pending'
  },
  'KV-03': {
    id: 'KV-03',
    name: 'Ar-Ge İndirimi',
    description: 'Ar-Ge ve tasarım merkezi indirimlerinin uygunluğu',
    mevzuatRef: '5746 Sayılı Kanun',
    checkItems: [
      'Ar-Ge merkezi belgesi mevcut mu?',
      'Personel sayısı yeterli mi?',
      'Harcamalar doğru sınıflandırıldı mı?'
    ],
    status: 'pending'
  }
};

interface KontrolDetayModalProps {
  kontrol: KontrolDetail;
  onClose: () => void;
}

export function KontrolDetayModal({ kontrol, onClose }: KontrolDetayModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#2E2E2E]">{kontrol.name}</h3>
            <p className="text-sm text-[#969696]">{kontrol.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F5F6F8] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#969696]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm text-[#5A5A5A]">{kontrol.description}</p>
          </div>

          {/* Mevzuat Ref */}
          <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3">
            <div className="flex items-center gap-2 text-[#0049AA]">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Mevzuat Referansı:</span>
              <span className="text-sm">{kontrol.mevzuatRef}</span>
            </div>
          </div>

          {/* Check Items */}
          {kontrol.checkItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#5A5A5A] mb-2">Kontrol Edilecekler:</h4>
              <div className="space-y-2">
                {kontrol.checkItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Circle className="w-3 h-3 text-[#969696] mt-1 flex-shrink-0" />
                    <span className="text-sm text-[#5A5A5A]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#969696]">Durum:</span>
            <span className={`text-sm font-medium px-2 py-1 rounded ${
              kontrol.status === 'passed'
                ? 'bg-[#ECFDF5] text-[#00804D]'
                : kontrol.status === 'failed'
                ? 'bg-[#FEF2F2] text-[#BF192B]'
                : 'bg-[#FFFBEB] text-[#FA841E]'
            }`}>
              {kontrol.status === 'passed' ? 'Tamamlandı' :
               kontrol.status === 'failed' ? 'Başarısız' : 'Bekliyor'}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#5A5A5A] hover:bg-[#F5F6F8] rounded-lg transition-colors"
          >
            Kapat
          </button>
          <button
            className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Detaylı İncele
          </button>
        </div>
      </div>
    </div>
  );
}

export default KontrolDetayModal;
