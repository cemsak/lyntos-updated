'use client';

import React from 'react';
import {
  getYaklasanBeyanlar,
  formatTarihUzun,
  getKalanGun,
  type BeyanTarih
} from '../../_lib/vergiTakvimi';

/**
 * ═══════════════════════════════════════════════════════════════
 * BEYAN TAKVİMİ DETAY MODAL
 * GİB Resmi Vergi Takvimi 2026
 * ═══════════════════════════════════════════════════════════════
 *
 * SMMM İÇİN ÖNEMLİ:
 * - Beyan gecikmesi = VUK Md. 352 Usulsüzlük Cezası
 * - Ödeme gecikmesi = Gecikme Zammı (%4.5/ay)
 * - Re'sen Tarhiyat riski (VUK Md. 30)
 */

interface BeyanTakvimiDetayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BeyanTakvimiDetayModal({
  isOpen,
  onClose,
}: BeyanTakvimiDetayModalProps) {
  if (!isOpen) return null;

  // Yaklaşan 10 beyanı al
  const yaklasanBeyanlar = getYaklasanBeyanlar(10);

  // Kalan güne göre renk
  const getKalanGunRenk = (kalanGun: number) => {
    if (kalanGun <= 3) return 'bg-[#FEF2F2] text-[#980F30] border-[#FF9196]';
    if (kalanGun <= 7) return 'bg-[#FFFBEB] text-[#E67324] border-[#FFE045]';
    if (kalanGun <= 14) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-[#ECFDF5] text-[#005A46] border-[#6BDB83]';
  };

  // Kalan güne göre badge
  const getKalanGunBadge = (kalanGun: number) => {
    if (kalanGun <= 0) return { text: 'BUGÜN!', color: 'bg-[#BF192B] text-white' };
    if (kalanGun === 1) return { text: 'YARIN', color: 'bg-[#F0282D] text-white' };
    if (kalanGun <= 3) return { text: 'KRİTİK', color: 'bg-[#FF555F] text-white' };
    if (kalanGun <= 7) return { text: 'ACİL', color: 'bg-[#FFB114] text-white' };
    return null;
  };

  // Beyan türüne göre ikon
  const getBeyanIcon = (beyanname: string) => {
    if (beyanname.includes('KDV')) return '📋';
    if (beyanname.includes('Muhtasar')) return '👥';
    if (beyanname.includes('Gecici')) return '💰';
    if (beyanname.includes('Kurumlar')) return '🏢';
    if (beyanname.includes('Gelir')) return '📊';
    return '📄';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#FEF2F2] to-[#FFFBEB]">
          <div>
            <h2 className="text-lg font-semibold text-[#2E2E2E]">Beyan Takvimi</h2>
            <p className="text-sm text-[#969696]">GİB Resmi Vergi Takvimi 2026</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F5F6F8] rounded-lg transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* UYARI */}
          <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <h3 className="font-medium text-[#980F30]">Beyan Tarihleri Kritik!</h3>
                <p className="text-sm text-[#BF192B] mt-1">
                  Geciken beyanlar için VUK Md. 352 usulsüzlük cezası ve gecikme zammı uygulanır.
                </p>
              </div>
            </div>
          </div>

          {/* YAKLASAN BEYANLAR */}
          <div className="space-y-3">
            {yaklasanBeyanlar.length === 0 ? (
              <div className="bg-[#F5F6F8] rounded-lg p-6 text-center">
                <span className="text-4xl mb-3 block">✅</span>
                <h3 className="font-medium text-[#2E2E2E]">Yaklaşan Beyan Yok</h3>
                <p className="text-sm text-[#5A5A5A]">Tüm beyanlar tamamlandı.</p>
              </div>
            ) : (
              yaklasanBeyanlar.map((beyan: BeyanTarih) => {
                const kalanGun = getKalanGun(beyan.sonTarih);
                const badge = getKalanGunBadge(kalanGun);

                return (
                  <div
                    key={beyan.id}
                    className={`border rounded-lg p-4 ${getKalanGunRenk(kalanGun)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getBeyanIcon(beyan.beyanname)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{beyan.beyanname}</h4>
                            {badge && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                                {badge.text}
                              </span>
                            )}
                          </div>
                          <p className="text-sm opacity-80">{beyan.donem}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-medium">
                          {formatTarihUzun(beyan.sonTarih)}
                        </div>
                        <div className="text-sm">
                          {kalanGun === 0 ? (
                            <span className="font-bold">BUGÜN!</span>
                          ) : kalanGun === 1 ? (
                            <span className="font-bold">Yarın</span>
                          ) : (
                            <span>{kalanGun} gün kaldı</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {beyan.odemeTarihi && beyan.odemeTarihi !== beyan.sonTarih && (
                      <div className="mt-2 text-sm opacity-75">
                        Ödeme: {formatTarihUzun(beyan.odemeTarihi)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* BEYAN TÜRLERİ AÇIKLAMA */}
          <div className="bg-[#F5F6F8] border rounded-lg p-4">
            <h3 className="font-medium text-[#2E2E2E] mb-3">📚 Beyan Türleri</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span className="text-[#5A5A5A]">KDV Beyannamesi (Aylık)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span className="text-[#5A5A5A]">Muhtasar ve Prim Hizmet (Aylık)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>💰</span>
                <span className="text-[#5A5A5A]">Geçici Vergi (Çeyreklik)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🏢</span>
                <span className="text-[#5A5A5A]">Kurumlar Vergisi (Yıllık)</span>
              </div>
            </div>
          </div>

          {/* CEZA BİLGİSİ */}
          <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-4">
            <h3 className="font-medium text-[#980F30] mb-2">⚖️ Gecikme Cezaları</h3>
            <ul className="text-sm text-[#980F30] space-y-1">
              <li>• <strong>Usulsüzlük Cezası:</strong> VUK Md. 352 - 1. derece (550 TL - 2.700 TL)</li>
              <li>• <strong>Gecikme Zammı:</strong> %4.5 / ay (6183 Sayılı Kanun)</li>
              <li>• <strong>Re'sen Tarhiyat:</strong> VUK Md. 30 - Beyan verilmezse</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-[#F5F6F8]">
          <span className="text-xs text-[#969696]">
            Kaynak: GİB Resmi Vergi Takvimi 2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2E2E2E] text-white rounded-lg hover:bg-[#2E2E2E] transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
