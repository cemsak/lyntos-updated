import React from 'react';
import { X, BookOpen, Calculator, FileText, AlertTriangle } from 'lucide-react';
import type { OranTanimi } from './sektorTypes';
import { formatDeger } from './sektorTypes';

interface OranDetayModalProps {
  oranKey: string;
  tanim: OranTanimi;
  mukellef?: number;
  sektor?: number;
  onClose: () => void;
}

export function OranDetayModal({
  oranKey,
  tanim,
  mukellef,
  sektor,
  onClose,
}: OranDetayModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#0049AA] to-[#0049AA] px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{tanim.ad}</h3>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Açıklama */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#5A5A5A] mb-1">
              <BookOpen className="w-4 h-4" />
              Açıklama
            </div>
            <p className="text-[#5A5A5A]">{tanim.aciklama}</p>
          </div>

          {/* Formül */}
          <div className="bg-[#E6F9FF] rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#0049AA] mb-2">
              <Calculator className="w-4 h-4" />
              Hesaplama Formülü
            </div>
            <code className="text-sm text-[#00287F] font-mono bg-[#E6F9FF] px-2 py-1 rounded">
              {tanim.formul}
            </code>
          </div>

          {/* Hesap Kodları */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#5A5A5A] mb-2">
              <FileText className="w-4 h-4" />
              Kullanılan Hesap Kodları (Tekdüzen)
            </div>
            <div className="flex flex-wrap gap-2">
              {tanim.hesap_kodlari.map((kod, idx) => (
                <span key={idx} className="px-2 py-1 bg-[#F5F6F8] text-[#5A5A5A] rounded font-mono text-sm">
                  {kod}
                </span>
              ))}
            </div>
          </div>

          {/* Mevcut Değerler */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#E6F9FF] rounded-lg p-3">
              <div className="text-xs text-[#0049AA] font-medium mb-1">Mükellef Değeri</div>
              <div className="text-xl font-bold text-[#0049AA]">
                {mukellef !== undefined ? formatDeger(mukellef, tanim.birim) : '-'}
              </div>
            </div>
            <div className="bg-[#F5F6F8] rounded-lg p-3">
              <div className="text-xs text-[#5A5A5A] font-medium mb-1">Sektör Ortalaması</div>
              <div className="text-xl font-bold text-[#5A5A5A]">
                {sektor !== undefined ? formatDeger(sektor, tanim.birim) : '-'}
              </div>
            </div>
          </div>

          {/* İdeal Değer */}
          <div className="bg-[#ECFDF5] rounded-lg p-3">
            <div className="text-sm font-medium text-[#00804D] mb-1">İdeal Durum</div>
            <p className="text-[#005A46] text-sm">
              {tanim.ideal === 'yuksek' && '✓ Sektör ortalamasının üzerinde olması olumludur'}
              {tanim.ideal === 'dusuk' && '✓ Sektör ortalamasının altında olması olumludur'}
              {tanim.ideal === 'dengeli' && '✓ Sektör ortalamasına yakın olması beklenir'}
            </p>
          </div>

          {/* Mevzuat Referansı */}
          {tanim.mevzuat && (
            <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#FA841E] mb-1">
                <AlertTriangle className="w-4 h-4" />
                Mevzuat Dayanağı
              </div>
              <p className="text-[#E67324] text-sm">{tanim.mevzuat}</p>
            </div>
          )}

          {/* VDK Risk Uyarısı */}
          {tanim.vdk_riski && (
            <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#BF192B] mb-1">
                <AlertTriangle className="w-4 h-4" />
                VDK Risk Senaryosu
              </div>
              <p className="text-[#980F30] text-sm">{tanim.vdk_riski}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#F5F6F8] px-5 py-3 border-t border-[#E5E5E5]">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#0049AA] text-white rounded-lg font-medium hover:bg-[#0049AA] transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
