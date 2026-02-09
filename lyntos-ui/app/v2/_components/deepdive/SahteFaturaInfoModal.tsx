'use client';
import React from 'react';
import { X, Shield, FileText, Building2, FileSearch, Activity, AlertTriangle } from 'lucide-react';

export function SahteFaturaInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden max-h-[80vh] overflow-y-auto">
        <div className="p-4 flex items-center justify-between bg-[#FEF2F2] border-b border-[#FFC7C9] sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#FEF2F2]">
              <Shield className="w-6 h-6 text-[#BF192B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#980F30]">Sahte Fatura Risk Analizi</h2>
              <p className="text-sm text-[#5A5A5A]">VDK KURGAN + GİB Entegrasyonu</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#969696] hover:text-[#5A5A5A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Veri Kaynakları */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">📊 Veri Kaynakları</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <FileText className="w-4 h-4" />, label: 'Vergi Levhası', desc: 'Matrah, NACE kodu, trend analizi' },
                { icon: <Building2 className="w-4 h-4" />, label: 'Ticaret Sicili', desc: 'Kuruluş tarihi, sermaye, adres değişikliği' },
                { icon: <FileSearch className="w-4 h-4" />, label: 'e-Fatura/e-İrsaliye', desc: 'Fatura paterni, zamanlama, tutar analizi' },
                { icon: <Activity className="w-4 h-4" />, label: 'Sektör Benchmark', desc: 'KDV yükü, brüt kar marjı karşılaştırması' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-[#F5F6F8] rounded-lg">
                  <span className="text-[#969696]">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-[#969696]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Kriterleri */}
          <div>
            <h3 className="text-sm font-semibold text-[#5A5A5A] mb-2">⚠️ Tespit Edilen Risk Kriterleri</h3>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-[#FEF2F2] rounded text-[#BF192B]">
                <strong>K-25 Riskli Mükelleften Alım:</strong> KURGAN sisteminde yüksek risk puanlı mükelleften alım. 1 Ekim 2025 sonrası &quot;bilmiyordum&quot; savunması geçersiz.
              </div>
              <div className="p-2 bg-[#FFFBEB] rounded text-[#FA841E]">
                <strong>K-26 Komisyon Faturası:</strong> Yıl sonlarında komisyon adı altında düzenlenen faturalar. Sözleşme olmadan kabul edilmez.
              </div>
              <div className="p-2 bg-[#FFFBEB] rounded text-[#FA841E]">
                <strong>K-27 Mal/Hizmet Akışı Tutarsızlığı:</strong> Alınan mal/hizmetin işletme faaliyetiyle uyumsuzluğu.
              </div>
            </div>
          </div>

          {/* SMMM Aksiyon Listesi */}
          <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3">
            <h3 className="text-sm font-semibold text-[#00287F] mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              SMMM Olarak Yapılması Gerekenler
            </h3>
            <ol className="space-y-1 text-sm text-[#5A5A5A] list-decimal list-inside">
              <li>Riskli tedarikçileri GİB sorgulamasından kontrol edin</li>
              <li>Tüm ödemelerinin banka yoluyla yapıldığını doğrulayın</li>
              <li>Sevk irsaliyesi ve taşıma belgeleri alın</li>
              <li>Mal/hizmetin işletmede kullanıldığını belgeleyin</li>
              <li>Kritik risk tespit edilirse mükellefe yazılı uyarı yapın</li>
            </ol>
          </div>

          {/* Mevzuat */}
          <div className="text-xs text-[#969696]">
            <strong>İlgili Mevzuat:</strong> VUK 359 (Sahte Belge), VUK 370 (İzaha Davet), KVK 13 (Transfer Fiyatlandırması), VDK KURGAN Rehberi
          </div>
        </div>

        <div className="p-4 border-t border-[#E5E5E5] flex justify-end sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 bg-[#BF192B] text-white rounded-lg hover:bg-[#BF192B] transition-colors">
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
