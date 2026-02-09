'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ŞİRKET UYUM DURUMU PANELİ - GERÇEK ANALİZ
 * Sprint 7.4 - LYNTOS V2
 *
 * SMMM için şirket hukuku perspektifinden GERÇEK uyum analizi:
 * - TTK 376 Sermaye Kaybı Durumu (mizan verisinden)
 * - Asgari Sermaye Uyumu (250K A.Ş. / 50K Ltd. - 31.12.2026)
 * - Genel Kurul Tarihi Kontrolü
 * - Örtülü Sermaye Uyarısı
 *
 * Veri Kaynakları:
 * - useVdkRiskScore: TTK 376, özkaynak, sermaye, örtülü sermaye
 * - useDashboardScope: selectedClient (şirket adı, VKN, NACE)
 *
 * ❌ Mock data YOK - %100 gerçek veri
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Scale,
  TrendingDown,
  Users,
  Calendar,
} from 'lucide-react';
import { useDashboardScope } from '../scope/ScopeProvider';
import { useVdkRiskScore } from '../../_hooks/useVdkRiskScore';
import { formatNumber } from '../../_lib/format';

// ============== TYPES ==============

type SirketTuru = 'A.Ş.' | 'Ltd.Şti.' | 'Bilinmiyor';

type TTK376Durum = 'normal' | 'uyari_50' | 'tehlike_66' | 'borca_batik';

// ============== HELPERS ==============

function extractSirketTuru(companyName: string | null | undefined): SirketTuru {
  if (!companyName) return 'Bilinmiyor';
  const upper = companyName.toUpperCase();

  if (
    upper.includes('ANONİM ŞİRKETİ') ||
    upper.includes('ANONIM SIRKETI') ||
    upper.includes('A.Ş.') ||
    upper.includes(' AŞ')
  ) {
    return 'A.Ş.';
  }

  if (
    upper.includes('LİMİTED ŞİRKETİ') ||
    upper.includes('LIMITED SIRKETI') ||
    upper.includes('LTD.ŞTİ.') ||
    upper.includes('LTD.') ||
    upper.includes(' LTD')
  ) {
    return 'Ltd.Şti.';
  }

  return 'Bilinmiyor';
}

function formatCurrency(value: number): string {
  return formatNumber(value);
}

// TTK 376 durumuna göre config
function getTTK376Config(durum: TTK376Durum) {
  switch (durum) {
    case 'borca_batik':
      return {
        bg: 'bg-[#FEF2F2]',
        border: 'border-[#FF9196]',
        text: 'text-[#980F30]',
        icon: XCircle,
        label: 'BORCA BATIK',
        description: 'Mahkemeye iflas bildirimi zorunlu!',
      };
    case 'tehlike_66':
      return {
        bg: 'bg-[#FEF2F2]',
        border: 'border-[#FFC7C9]',
        text: 'text-[#BF192B]',
        icon: AlertTriangle,
        label: '2/3 KAYIP',
        description: 'Sermaye artırımı/azaltımı ZORUNLU',
      };
    case 'uyari_50':
      return {
        bg: 'bg-[#FFFBEB]',
        border: 'border-[#FFF08C]',
        text: 'text-[#FA841E]',
        icon: AlertTriangle,
        label: '1/2 KAYIP',
        description: 'Genel Kurulu toplantıya çağır',
      };
    default:
      return {
        bg: 'bg-[#ECFDF5]',
        border: 'border-[#AAE8B8]',
        text: 'text-[#00804D]',
        icon: CheckCircle2,
        label: 'SAĞLIKLI',
        description: 'Sermaye durumu normal',
      };
  }
}

// ============== MAIN COMPONENT ==============

export function SirketUyumDurumuPanel() {
  const { selectedClient } = useDashboardScope();
  const { data: vdkData, loading, error } = useVdkRiskScore();

  // Şirket bilgileri
  const sirketTuru = extractSirketTuru(selectedClient?.name);
  const asgariSermaye = sirketTuru === 'A.Ş.' ? 250_000 : sirketTuru === 'Ltd.Şti.' ? 50_000 : 0;

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#E6F9FF] to-[#E6F9FF]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0078D0] to-[#0078D0] flex items-center justify-center animate-pulse">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="h-4 w-40 bg-[#E5E5E5] rounded animate-pulse" />
              <div className="h-3 w-32 bg-[#F5F6F8] rounded mt-1 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="h-16 bg-[#F5F6F8] rounded-lg animate-pulse" />
          <div className="h-16 bg-[#F5F6F8] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // Mükellef seçilmemiş
  if (!selectedClient) {
    return (
      <Link href="/v2/corporate">
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
          <div className="px-5 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8] to-[#F5F6F8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#969696] to-[#969696] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-[#5A5A5A]">Şirket Uyum Durumu</h4>
                  <p className="text-xs text-[#969696]">Mükellef seçin</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#969696] group-hover:text-[#0049AA] group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Veri yoksa veya hata varsa
  if (error || !vdkData) {
    return (
      <Link href="/v2/corporate">
        <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
          <div className="px-5 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#E6F9FF] to-[#E6F9FF]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0078D0] to-[#0078D0] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-[#2E2E2E]">Şirket Uyum Durumu</h4>
                  <p className="text-xs text-[#969696]">TTK 376 ve sermaye uyumu</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#969696] group-hover:text-[#0049AA] group-hover:translate-x-1 transition-all" />
            </div>
          </div>
          <div className="p-5">
            {/* Şirket Bilgisi */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2E2E2E] truncate">{selectedClient.name}</p>
                <p className="text-xs text-[#969696]">VKN: {selectedClient.vkn}</p>
              </div>
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                sirketTuru === 'A.Ş.' ? 'bg-[#E6F9FF] text-[#0049AA]' :
                sirketTuru === 'Ltd.Şti.' ? 'bg-[#E6F9FF] text-[#0049AA]' :
                'bg-[#F5F6F8] text-[#5A5A5A]'
              }`}>
                {sirketTuru}
              </span>
            </div>

            {/* Mizan Yüklenmemiş Uyarısı */}
            <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FA841E] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#E67324]">Mizan Verisi Gerekli</p>
                  <p className="text-[11px] text-[#FA841E] mt-0.5">
                    TTK 376 ve sermaye uyumu analizi için mizan yükleyin.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#969696] mt-3">
              Detaylar için Şirket İşlemleri sayfasına gidin →
            </p>
          </div>
        </div>
      </Link>
    );
  }

  // ============== GERÇEK ANALİZ ==============

  const ttk376Config = getTTK376Config(vdkData.ttk376.durum);
  const TTK376Icon = ttk376Config.icon;

  // Sermaye uyumu kontrolü (mizan verisi varsa)
  const mevcutSermaye = vdkData.kritikHesaplar.find(h => h.kod === '500')?.bakiye || 0;
  const sermayeUyumlu = mevcutSermaye >= asgariSermaye;

  // Genel kurul kontrolü (her yıl ilk 3 ayda yapılmalı)
  const bugun = new Date();
  const yilBasi = new Date(bugun.getFullYear(), 0, 1);
  const martSonu = new Date(bugun.getFullYear(), 2, 31);
  const genelKurulSuresiIcinde = bugun <= martSonu;

  return (
    <Link href="/v2/corporate">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#E6F9FF] to-[#E6F9FF]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0078D0] to-[#0078D0] flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-[#2E2E2E]">Şirket Uyum Durumu</h4>
                <p className="text-xs text-[#969696]">TTK 376, Sermaye Uyumu</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#969696] group-hover:text-[#0049AA] group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Şirket Bilgisi */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2E2E2E] truncate">{selectedClient.name}</p>
              <p className="text-xs text-[#969696] font-mono">VKN: {selectedClient.vkn}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              sirketTuru === 'A.Ş.' ? 'bg-[#E6F9FF] text-[#0049AA] border border-[#ABEBFF]' :
              sirketTuru === 'Ltd.Şti.' ? 'bg-[#E6F9FF] text-[#0049AA] border border-[#ABEBFF]' :
              'bg-[#F5F6F8] text-[#5A5A5A] border border-[#E5E5E5]'
            }`}>
              {sirketTuru}
            </span>
          </div>

          {/* TTK 376 - SERMAYE KAYBI DURUMU */}
          <div className={`${ttk376Config.bg} ${ttk376Config.border} border rounded-lg p-3`}>
            <div className="flex items-start gap-2">
              <TTK376Icon className={`w-5 h-5 ${ttk376Config.text} mt-0.5 flex-shrink-0`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${ttk376Config.text}`}>TTK 376 Sermaye Durumu</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ttk376Config.bg} ${ttk376Config.text} border ${ttk376Config.border}`}>
                    {ttk376Config.label}
                  </span>
                </div>
                <p className={`text-[11px] ${ttk376Config.text} mt-1`}>
                  {ttk376Config.description}
                </p>
                {vdkData.ttk376.sermayeKaybiOrani > 0 && (
                  <p className="text-[10px] text-[#5A5A5A] mt-1">
                    Sermaye kaybı oranı: <strong>%{vdkData.ttk376.sermayeKaybiOrani.toFixed(1)}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ASGARİ SERMAYE UYUMU */}
          {sirketTuru !== 'Bilinmiyor' && (
            <div className={`${sermayeUyumlu ? 'bg-[#ECFDF5] border-[#AAE8B8]' : 'bg-[#FFFBEB] border-[#FFF08C]'} border rounded-lg p-3`}>
              <div className="flex items-start gap-2">
                <Scale className={`w-4 h-4 ${sermayeUyumlu ? 'text-[#00804D]' : 'text-[#FA841E]'} mt-0.5 flex-shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold ${sermayeUyumlu ? 'text-[#005A46]' : 'text-[#E67324]'}`}>
                      Asgari Sermaye Uyumu
                    </p>
                    {sermayeUyumlu ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00804D]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#FA841E]" />
                    )}
                  </div>
                  <p className={`text-[11px] ${sermayeUyumlu ? 'text-[#00804D]' : 'text-[#FA841E]'} mt-0.5`}>
                    {sirketTuru} için min. <strong>{formatCurrency(asgariSermaye)} ₺</strong>
                    {!sermayeUyumlu && ' gerekli'}
                  </p>
                  {!sermayeUyumlu && (
                    <p className="text-[10px] text-[#FA841E] mt-1">
                      Son tarih: <strong>31 Aralık 2026</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ÖRTÜLÜ SERMAYE UYARISI */}
          {vdkData.ortuluSermaye.sinirAsimi && (
            <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-[#BF192B] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#980F30]">Örtülü Sermaye Uyarısı</p>
                  <p className="text-[11px] text-[#BF192B] mt-0.5">
                    İlişkili kişi borçları özkaynak x3 sınırını aştı!
                  </p>
                  <p className="text-[10px] text-[#BF192B] mt-1">
                    Aşan kısma ait faizler KKEG olarak beyan edilmeli.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GENEL KURUL HATIRLATMASI */}
          {!genelKurulSuresiIcinde && (
            <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-[#0049AA] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#00287F]">Genel Kurul Hatırlatması</p>
                  <p className="text-[11px] text-[#0049AA] mt-0.5">
                    Olağan Genel Kurul hesap döneminden itibaren 3 ay içinde yapılmalıdır.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-[#E5E5E5]">
            <p className="text-xs text-[#969696]">
              Sermaye işlemleri, TTK yükümlülükleri için →
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
