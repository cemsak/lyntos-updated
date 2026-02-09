'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LYNTOS SMMM RİSK ÖZETİ PANELİ
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "Koruyucu Melek" konseptine uygun SMMM/YMM odaklı risk özeti.
 * VDK sayfası tasarım dili ile uyumlu, tutarlı görsel deneyim.
 *
 * 3 Ana Gösterge:
 * 1. VDK Risk Skoru - Gerçek risk puanı (0-100, yüksek = kötü)
 * 2. Yasal Süreler - Beyanname takvimi
 * 3. Kritik Hesaplar - Riskli hesap sayısı ve listesi
 *
 * LYNTOS ANAYASASI:
 * - ❌ Mock data / Demo data / Dummy data YASAK
 * - ✅ Gerçek mükellef verisi (mizan, beyanname)
 * - ✅ Eksik veri varsa → açık mesaj göster
 * - ✅ Her sonuç → yasal dayanak ile birlikte
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import Link from 'next/link';
import {
  Shield,
  Calendar,
  AlertTriangle,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { useVdkRiskScore, type RiskSeviyesi } from '../../_hooks/useVdkRiskScore';
import { useYasalSureler, type SureOnceligi } from '../../_hooks/useYasalSureler';
import { formatNumber } from '../../_lib/format';

// ============== HELPER FUNCTIONS ==============

/**
 * Risk seviyesine göre tutarlı config döndür
 * NOT: Risk puanı gösteriliyor, yüksek = kötü
 */
function getRiskConfig(toplamPuan: number) {
  if (toplamPuan >= 70) {
    return {
      bg: 'bg-[#FEF2F2]',
      border: 'border-[#FFC7C9]',
      text: 'text-[#BF192B]',
      badge: 'bg-[#F0282D] text-white',
      label: 'KRİTİK RİSK',
      description: 'Acil müdahale gerekli',
    };
  }
  if (toplamPuan >= 50) {
    return {
      bg: 'bg-[#FFFBEB]',
      border: 'border-[#FFF08C]',
      text: 'text-[#FA841E]',
      badge: 'bg-[#FFB114] text-white',
      label: 'YÜKSEK RİSK',
      description: 'Dikkatli takip gerekli',
    };
  }
  if (toplamPuan >= 25) {
    return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      badge: 'bg-yellow-500 text-white',
      label: 'ORTA RİSK',
      description: 'İzlenmeli',
    };
  }
  if (toplamPuan >= 10) {
    return {
      bg: 'bg-[#E6F9FF]',
      border: 'border-[#ABEBFF]',
      text: 'text-[#0049AA]',
      badge: 'bg-[#0078D0] text-white',
      label: 'DÜŞÜK RİSK',
      description: 'Genel olarak iyi',
    };
  }
  return {
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#AAE8B8]',
    text: 'text-[#00804D]',
    badge: 'bg-[#00A651] text-white',
    label: 'TEMİZ',
    description: 'Risk bulunmuyor',
  };
}

function getSureConfig(oncelik: SureOnceligi) {
  switch (oncelik) {
    case 'kritik':
      return {
        bg: 'bg-[#FEF2F2]',
        border: 'border-[#FFC7C9]',
        text: 'text-[#BF192B]',
        badge: 'bg-[#F0282D] text-white',
      };
    case 'uyari':
      return {
        bg: 'bg-[#FFFBEB]',
        border: 'border-[#FFF08C]',
        text: 'text-[#FA841E]',
        badge: 'bg-[#FFB114] text-white',
      };
    default:
      return {
        bg: 'bg-[#F5F6F8]',
        border: 'border-[#E5E5E5]',
        text: 'text-[#5A5A5A]',
        badge: 'bg-[#969696] text-white',
      };
  }
}

function formatTarih(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

function formatCurrency(amount: number): string {
  return formatNumber(amount);
}

// ============== VDK RİSK SKORU KARTI ==============

function VdkRiskSkoruCard() {
  const { data, loading, error } = useVdkRiskScore();

  if (loading) {
    return (
      <div className="bg-[#F5F6F8] rounded-xl border border-[#E5E5E5] p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-[#E5E5E5] rounded" />
          <div className="h-4 w-24 bg-[#E5E5E5] rounded" />
        </div>
        <div className="h-8 w-16 bg-[#E5E5E5] rounded mb-2" />
        <div className="h-3 w-32 bg-[#E5E5E5] rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#F5F6F8] rounded-xl border border-[#E5E5E5] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-[#969696]" />
          <span className="text-sm font-medium text-[#5A5A5A]">VDK Risk Skoru</span>
        </div>
        <p className="text-2xl font-bold text-[#969696]">---/100</p>
        <p className="text-xs text-[#969696] mt-2">{error || 'Mizan verisi gerekli'}</p>
        <Link
          href="/v2/veri-yukleme"
          className="mt-2 inline-flex items-center gap-1 text-xs text-[#0049AA] hover:text-[#00287F]"
        >
          Veri Yükle <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  const config = getRiskConfig(data.toplamPuan);
  const kritikVeYuksek = data.kritikHesaplar.filter(
    h => h.riskSeviyesi === 'kritik' || h.riskSeviyesi === 'yuksek'
  ).length;

  return (
    <Link href="/v2/vdk">
      <div className={`${config.bg} rounded-xl border ${config.border} p-4 hover:shadow-md transition-all cursor-pointer group h-full`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${config.text}`} />
            <span className="text-sm font-medium text-[#5A5A5A]">VDK Risk Skoru</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${config.badge}`}>
            {config.label}
          </span>
        </div>

        {/* Risk Puanı */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className={`text-3xl font-bold ${config.text}`}>{data.toplamPuan}</span>
          <span className="text-sm text-[#969696]">/100</span>
        </div>

        <p className="text-xs text-[#5A5A5A] mb-3">{config.description}</p>

        {/* Kritik hesap sayısı */}
        {kritikVeYuksek > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#5A5A5A] mb-2">
            <AlertTriangle className="w-3 h-3 text-[#FFB114]" />
            <span>{kritikVeYuksek} kritik/yüksek riskli hesap</span>
          </div>
        )}

        {/* TTK 376 Uyarısı */}
        {data.ttk376.durum !== 'normal' && (
          <div className="p-2 bg-[#FEF2F2] rounded border border-[#FFC7C9] mb-2">
            <p className="text-[10px] font-medium text-[#BF192B]">
              ⚠️ TTK 376: {data.ttk376.durum === 'borca_batik' ? 'BORCA BATIK' :
                data.ttk376.durum === 'tehlike_66' ? '%66 KAYIP' : '%50 KAYIP'}
            </p>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-[#969696] group-hover:text-[#0049AA] transition-colors">
          Detaylı Analiz <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

// ============== YASAL SÜRELER KARTI ==============

function YasalSurelerCard() {
  const { surelerListesi, kritikSureler } = useYasalSureler();

  if (!surelerListesi || surelerListesi.length === 0) {
    return (
      <div className="bg-[#F5F6F8] rounded-xl border border-[#E5E5E5] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-[#969696]" />
          <span className="text-sm font-medium text-[#5A5A5A]">Yasal Süreler</span>
        </div>
        <p className="text-2xl font-bold text-[#969696]">—</p>
        <p className="text-xs text-[#969696] mt-2">Dönem seçilmedi</p>
      </div>
    );
  }

  // En yakın süreyi al
  const enYakin = surelerListesi[0];
  const config = getSureConfig(enYakin.oncelik);
  const gecmisSureler = surelerListesi.filter(s => s.kalanGun < 0);

  return (
    <div className={`${config.bg} rounded-xl border ${config.border} p-4 h-full`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className={`w-5 h-5 ${config.text}`} />
          <span className="text-sm font-medium text-[#5A5A5A]">Yasal Süreler</span>
        </div>
        {kritikSureler.length > 0 && (
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${config.badge}`}>
            {kritikSureler.length} KRİTİK
          </span>
        )}
      </div>

      {/* En yakın süre */}
      <div className="mb-3">
        {enYakin.kalanGun < 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#BF192B]">GEÇMİŞ</span>
            <span className="text-xs text-[#F0282D]">({Math.abs(enYakin.kalanGun)} gün)</span>
          </div>
        ) : enYakin.kalanGun === 0 ? (
          <span className="text-2xl font-bold text-[#BF192B]">BUGÜN!</span>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold ${config.text}`}>{enYakin.kalanGun}</span>
            <span className="text-sm text-[#969696]">gün</span>
          </div>
        )}
        <p className="text-sm font-medium text-[#5A5A5A] mt-1">{enYakin.ad}</p>
        <p className="text-xs text-[#969696]">{formatTarih(enYakin.sonTarih)} · {enYakin.yasalDayanak}</p>
      </div>

      {/* Geçmiş süreler uyarısı */}
      {gecmisSureler.length > 0 && (
        <div className="p-2 bg-[#FEF2F2] rounded border border-[#FFC7C9] mb-2">
          <p className="text-[10px] font-medium text-[#BF192B]">
            ⚠️ {gecmisSureler.length} beyanname süresi geçmiş!
          </p>
        </div>
      )}

      {/* Diğer süreler */}
      {surelerListesi.length > 1 && (
        <div className="border-t border-[#E5E5E5] pt-2 mt-2 space-y-1">
          {surelerListesi.slice(1, 3).map(sure => (
            <div key={sure.id} className="flex items-center justify-between text-xs">
              <span className="text-[#5A5A5A] truncate">{sure.ad}</span>
              <span className={`font-medium ${
                sure.kalanGun < 0 ? 'text-[#BF192B]' :
                sure.kalanGun <= 7 ? 'text-[#FA841E]' : 'text-[#5A5A5A]'
              }`}>
                {sure.kalanGun < 0 ? `${Math.abs(sure.kalanGun)} gün geçti` : `${sure.kalanGun} gün`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============== KRİTİK HESAPLAR KARTI ==============

function KritikHesaplarCard() {
  const { data, loading, error } = useVdkRiskScore();

  if (loading) {
    return (
      <div className="bg-[#F5F6F8] rounded-xl border border-[#E5E5E5] p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-[#E5E5E5] rounded" />
          <div className="h-4 w-24 bg-[#E5E5E5] rounded" />
        </div>
        <div className="h-8 w-16 bg-[#E5E5E5] rounded mb-2" />
        <div className="h-3 w-32 bg-[#E5E5E5] rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#F5F6F8] rounded-xl border border-[#E5E5E5] p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-[#969696]" />
          <span className="text-sm font-medium text-[#5A5A5A]">Kritik Hesaplar</span>
        </div>
        <p className="text-2xl font-bold text-[#969696]">—</p>
        <p className="text-xs text-[#969696] mt-2">Mizan verisi gerekli</p>
      </div>
    );
  }

  // Sadece kritik ve yüksek riskli hesapları al
  const riskliHesaplar = data.kritikHesaplar.filter(
    h => h.riskSeviyesi === 'kritik' || h.riskSeviyesi === 'yuksek'
  );
  const kritikSayisi = data.kritikHesaplar.filter(h => h.riskSeviyesi === 'kritik').length;
  const yuksekSayisi = data.kritikHesaplar.filter(h => h.riskSeviyesi === 'yuksek').length;

  // Renk seçimi
  let bgColor = 'bg-[#ECFDF5]';
  let borderColor = 'border-[#AAE8B8]';
  let textColor = 'text-[#00804D]';
  let badgeConfig = { bg: 'bg-[#00A651] text-white', label: 'TEMİZ' };

  if (kritikSayisi > 0) {
    bgColor = 'bg-[#FEF2F2]';
    borderColor = 'border-[#FFC7C9]';
    textColor = 'text-[#BF192B]';
    badgeConfig = { bg: 'bg-[#F0282D] text-white', label: 'ACİL' };
  } else if (yuksekSayisi > 0) {
    bgColor = 'bg-[#FFFBEB]';
    borderColor = 'border-[#FFF08C]';
    textColor = 'text-[#FA841E]';
    badgeConfig = { bg: 'bg-[#FFB114] text-white', label: 'DİKKAT' };
  }

  return (
    <Link href="/v2/vdk">
      <div className={`${bgColor} rounded-xl border ${borderColor} p-4 hover:shadow-md transition-all cursor-pointer group h-full`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${textColor}`} />
            <span className="text-sm font-medium text-[#5A5A5A]">Kritik Hesaplar</span>
          </div>
          {riskliHesaplar.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${badgeConfig.bg}`}>
              {badgeConfig.label}
            </span>
          )}
        </div>

        {/* Hesap sayısı */}
        <div className="flex items-baseline gap-1 mb-2">
          <span className={`text-3xl font-bold ${textColor}`}>{riskliHesaplar.length}</span>
          <span className="text-sm text-[#969696]">hesap</span>
        </div>

        <p className="text-xs text-[#5A5A5A] mb-3">
          {riskliHesaplar.length === 0
            ? 'Tüm hesaplar normal aralıkta'
            : `${kritikSayisi} kritik, ${yuksekSayisi} yüksek risk`}
        </p>

        {/* Riskli hesaplar listesi - SADECE riskli olanları göster */}
        {riskliHesaplar.length > 0 && (
          <div className="space-y-1.5">
            {riskliHesaplar.slice(0, 2).map(hesap => (
              <div key={hesap.kod} className="p-2 bg-white/60 rounded border border-white/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#5A5A5A]">{hesap.kod} {hesap.ad}</span>
                  <span className={`text-xs font-bold ${
                    hesap.riskSeviyesi === 'kritik' ? 'text-[#BF192B]' : 'text-[#FA841E]'
                  }`}>
                    ₺{formatCurrency(hesap.bakiye)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-[#969696] group-hover:text-[#0049AA] transition-colors mt-3">
          Tüm Hesaplar <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

// ============== MAIN COMPONENT ==============

export function SmmmRiskOzetiPanel() {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8] to-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0078D0] to-[#0078D0] flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#2E2E2E] text-sm">SMMM Risk Özeti</h3>
            <p className="text-xs text-[#969696]">VDK kriterleri ve yasal süreler</p>
          </div>
        </div>
      </div>

      {/* 3 Kart Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <VdkRiskSkoruCard />
          <YasalSurelerCard />
          <KritikHesaplarCard />
        </div>
      </div>
    </div>
  );
}

export default SmmmRiskOzetiPanel;
