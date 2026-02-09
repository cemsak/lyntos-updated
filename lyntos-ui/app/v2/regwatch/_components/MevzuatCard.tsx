'use client';

import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Tag,
  Link2,
  BookOpen,
  Scale,
  Info,
  FileText,
} from 'lucide-react';
import type { MevzuatResult } from './regwatch-types';
import { TypeBadge } from './TypeBadge';

/** Bilinen kanun numaralarına göre kanun adını döndürür */
function getKanunAdi(mevzuatNo: string | null): string | null {
  if (!mevzuatNo) return null;
  const kanunlar: Record<string, string> = {
    '193': 'Gelir Vergisi Kanunu (GVK)',
    '213': 'Vergi Usul Kanunu (VUK)',
    '3065': 'Katma Değer Vergisi Kanunu (KDVK)',
    '5510': 'Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu',
    '5520': 'Kurumlar Vergisi Kanunu (KVK)',
    '5746': 'Ar-Ge ve Tasarım Faaliyetleri Kanunu',
    '6102': 'Türk Ticaret Kanunu (TTK)',
    '6098': 'Türk Borçlar Kanunu (TBK)',
    '6331': 'İş Sağlığı ve Güvenliği Kanunu',
    '6698': 'Kişisel Verilerin Korunması Kanunu (KVKK)',
    '492': 'Harçlar Kanunu',
    '488': 'Damga Vergisi Kanunu',
    '6183': 'Amme Alacakları Tahsil Usulü Kanunu',
    '4760': 'Özel Tüketim Vergisi Kanunu (ÖTV)',
  };
  return kanunlar[mevzuatNo] || null;
}

/**
 * Kanun numarasına göre mevzuat.gov.tr URL'si üretir.
 * Eski kanunlar (213, 193 vb.) MevzuatTertip=4, yeni kanunlar (5520 vb.) MevzuatTertip=5.
 */
function getMevzuatGovTrUrl(mevzuatNo: string): string {
  const eskiKanunlar = ['193', '213', '488', '492', '3065', '6183'];
  const tertip = eskiKanunlar.includes(mevzuatNo) ? '4' : '5';
  return `https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=${mevzuatNo}&MevzuatTur=1&MevzuatTertip=${tertip}`;
}

/** Bilinen GİB kanun sayfaları */
function getGibUrl(mevzuatNo: string): string | null {
  const gibKodlari: Record<string, string> = {
    '193': '433',
    '213': '434',
    '5520': '435',
  };
  const kod = gibKodlari[mevzuatNo];
  return kod ? `https://www.gib.gov.tr/mevzuat/kanun/${kod}` : null;
}

/** Mevzuat no ve tipine göre otomatik kaynak URL'si üretir */
function buildKaynakUrl(mevzuat: MevzuatResult): string | null {
  if (mevzuat.canonical_url) return mevzuat.canonical_url;
  if (mevzuat.mevzuat_no) return getMevzuatGovTrUrl(mevzuat.mevzuat_no);
  return null;
}

/** Kapsam etiketlerini parse et (JSON string veya array) */
function parseEtiketler(val: string[] | string | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

export function MevzuatCard({
  mevzuat,
  typeLabels,
  kurumLabels,
  expanded,
  onToggle
}: {
  mevzuat: MevzuatResult;
  typeLabels: Record<string, string>;
  kurumLabels: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showFullText, setShowFullText] = useState(false);
  const kaynakUrl = buildKaynakUrl(mevzuat);
  const kanunAdi = getKanunAdi(mevzuat.mevzuat_no);
  const etiketler = parseEtiketler(mevzuat.kapsam_etiketleri);
  const affectedRules = parseEtiketler(mevzuat.affected_rules as string[] | string);
  const tamMetin = mevzuat.tam_metin || '';
  const TEXT_PREVIEW_LEN = 500;

  return (
    <div className="border border-[#E5E5E5] dark:border-[#5A5A5A] rounded-xl bg-white dark:bg-[#2E2E2E] hover:border-[#5ED6FF] dark:hover:border-[#0049AA] transition-colors">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div className="mt-1">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-[#969696]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#969696]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={mevzuat.mevzuat_type} label={typeLabels[mevzuat.mevzuat_type]} />
            {mevzuat.mevzuat_no && (
              <span className="text-xs text-[#969696]">No: {mevzuat.mevzuat_no}</span>
            )}
            {mevzuat.madde && (
              <span className="text-xs text-[#969696]">Md. {mevzuat.madde}</span>
            )}
          </div>

          <h3 className="mt-1 font-medium text-[#2E2E2E] dark:text-white">
            {mevzuat.baslik}
          </h3>

          {/* Kısa açıklama - collapsed'da da göster */}
          {mevzuat.kisa_aciklama && !expanded && (
            <p className="mt-1 text-sm text-[#969696] line-clamp-1">
              {mevzuat.kisa_aciklama}
            </p>
          )}

          <div className="mt-2 flex items-center gap-4 text-xs text-[#969696]">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {kurumLabels[mevzuat.kurum] || mevzuat.kurum}
            </span>
            {mevzuat.yururluk_tarih && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {mevzuat.yururluk_tarih}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              mevzuat.trust_class === 'A'
                ? 'bg-[#ECFDF5] text-[#00804D] dark:bg-[#005A46]/30 dark:text-[#6BDB83]'
                : 'bg-[#F5F6F8] text-[#5A5A5A] dark:bg-[#5A5A5A] dark:text-[#B4B4B4]'
            }`}>
              {mevzuat.trust_class === 'A' ? 'Güvenilir' : 'Kaynak'}
            </span>
          </div>
        </div>

        {mevzuat.relevance_score > 0 && (
          <div className="flex flex-col items-end">
            <div className="text-xs text-[#969696]">Alaka</div>
            <div className="text-sm font-medium text-[#0049AA] dark:text-[#00B4EB]">
              {Math.round(mevzuat.relevance_score * 100)}%
            </div>
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#E5E5E5] dark:border-[#5A5A5A]">
          <div className="pt-3 space-y-3">

            {/* Kanun adı ve madde bilgisi */}
            {kanunAdi && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-[#E6F9FF] dark:bg-[#0049AA]/20 rounded-lg">
                <Scale className="h-4 w-4 text-[#0049AA] dark:text-[#5ED6FF] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#0049AA] dark:text-[#5ED6FF]">
                    {kanunAdi}
                  </p>
                  {mevzuat.madde && (
                    <p className="text-xs text-[#0049AA]/70 dark:text-[#ABEBFF] mt-0.5">
                      Madde {mevzuat.madde}
                      {mevzuat.fikra && ` / Fıkra ${mevzuat.fikra}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Kısa açıklama - HER ZAMAN göster */}
            {mevzuat.kisa_aciklama && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-[#F5F6F8] dark:bg-[#5A5A5A]/30 rounded-lg">
                <Info className="h-4 w-4 text-[#5A5A5A] dark:text-[#B4B4B4] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#5A5A5A] dark:text-[#B4B4B4]">
                  {mevzuat.kisa_aciklama}
                </p>
              </div>
            )}

            {/* Tam metin (detaylı içerik) */}
            {tamMetin && (
              <div className="px-3 py-2.5 bg-white dark:bg-[#363636] rounded-lg border border-[#E5E5E5] dark:border-[#5A5A5A]">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5 text-[#0049AA] dark:text-[#5ED6FF]" />
                  <span className="text-xs font-medium text-[#0049AA] dark:text-[#5ED6FF]">
                    Mevzuat İçeriği
                  </span>
                </div>
                <p className="text-sm text-[#2E2E2E] dark:text-[#E5E5E5] leading-relaxed whitespace-pre-line">
                  {showFullText || tamMetin.length <= TEXT_PREVIEW_LEN
                    ? tamMetin
                    : `${tamMetin.slice(0, TEXT_PREVIEW_LEN)}...`}
                </p>
                {tamMetin.length > TEXT_PREVIEW_LEN && (
                  <button
                    onClick={() => setShowFullText(!showFullText)}
                    className="mt-2 text-xs text-[#0049AA] dark:text-[#5ED6FF] hover:underline"
                  >
                    {showFullText ? 'Kısalt' : 'Devamını oku...'}
                  </button>
                )}
              </div>
            )}

            {/* Eşleşen bölümler (arama sonuçları için) */}
            {mevzuat.highlights && mevzuat.highlights.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#969696]">
                  Eşleşen bölümler:
                </div>
                {mevzuat.highlights.map((h, i) => (
                  <div
                    key={i}
                    className="text-sm text-[#5A5A5A] dark:text-[#B4B4B4] bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border-l-2 border-yellow-400"
                  >
                    {h}
                  </div>
                ))}
              </div>
            )}

            {/* Kapsam etiketleri + tür/kurum etiketleri */}
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3 w-3 text-[#969696]" />
              <span className="px-2 py-0.5 rounded text-xs bg-[#E6F9FF] text-[#0049AA] dark:bg-[#0049AA]/20 dark:text-[#5ED6FF]">
                {typeLabels[mevzuat.mevzuat_type] || mevzuat.mevzuat_type}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-[#F5F6F8] text-[#5A5A5A] dark:bg-[#5A5A5A] dark:text-[#B4B4B4]">
                {kurumLabels[mevzuat.kurum] || mevzuat.kurum}
              </span>
              {etiketler.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-xs bg-[#F5F6F8] text-[#5A5A5A] dark:bg-[#5A5A5A] dark:text-[#B4B4B4]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Bağlı kurallar */}
            {affectedRules.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Link2 className="h-3 w-3 text-[#969696]" />
                <span className="text-xs text-[#969696]">Bağlı kurallar:</span>
                {affectedRules.map((rule, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-xs bg-[#E6F9FF] text-[#0049AA] dark:bg-[#00287F]/30 dark:text-[#5ED6FF]"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            )}

            {/* Kaynak linki ve aksiyonlar */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#E5E5E5]/50 dark:border-[#5A5A5A]/50">
              {kaynakUrl && (
                <a
                  href={kaynakUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#0049AA] text-white rounded-lg hover:bg-[#00287F] transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Kaynağa Git
                </a>
              )}
              {mevzuat.mevzuat_no && getGibUrl(mevzuat.mevzuat_no) && (
                <a
                  href={getGibUrl(mevzuat.mevzuat_no)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#E5E5E5] dark:border-[#5A5A5A] text-[#5A5A5A] dark:text-[#B4B4B4] rounded-lg hover:bg-[#F5F6F8] dark:hover:bg-[#5A5A5A]/30 transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  GİB Kanun Metni
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
