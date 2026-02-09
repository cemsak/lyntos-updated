'use client';

/**
 * Kurumlar Vergisi Beyanname Hazırlık Sayfası
 * Pencere 12 - Beyanname Hazırlık
 *
 * Yıllık Kurumlar Vergisi beyanname hazırlığı
 */

import { useState, useEffect } from 'react';
import { useDashboardScope } from '../../_components/scope/ScopeProvider';
import { API_BASE_URL } from '../../_lib/config/api';
import { formatCurrency } from '../../_lib/format';
import {
  Landmark,
  Download,
  Calculator,
  AlertCircle,
  CheckCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
} from 'lucide-react';

interface BeyannameSatiri {
  kod: string;
  aciklama: string;
  tutar: number;
  tip: 'gelir' | 'gider' | 'matrah' | 'vergi' | 'sonuc';
}

export default function KurumlarVergisiBeyannameHazirlik() {
  const { scope, isReady } = useDashboardScope();

  const clientId = scope.client_id;
  const periodId = scope.period;
  const isScopeComplete = Boolean(clientId && periodId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Başlangıç değerleri sıfır — gerçek veri API'den gelecek
  const [hesaplama, setHesaplama] = useState({
    ticariKar: 0,
    kkeg: 0,
    istisnalar: 0,
    indirimler: 0,
    gecmisYilZarar: 0,
    odenecekGeciciVergi: 0,
  });

  // API'den kurumlar vergisi verilerini çek
  useEffect(() => {
    if (!isScopeComplete) return;

    const fetchKurumlarData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v2/beyanname/kurumlar?client_id=${clientId}&period_id=${periodId}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.ticariKar === 'number') {
            setHesaplama({
              ticariKar: data.ticariKar ?? 0,
              kkeg: data.kkeg ?? 0,
              istisnalar: data.istisnalar ?? 0,
              indirimler: data.indirimler ?? 0,
              gecmisYilZarar: data.gecmisYilZarar ?? 0,
              odenecekGeciciVergi: data.odenecekGeciciVergi ?? 0,
            });
          }
          // API 200 dönüp veri yoksa — sıfır kalır (veri henüz yüklenmemiş)
        } else if (res.status !== 404) {
          setError('Kurumlar vergisi verileri yüklenemedi');
        }
        // 404 = endpoint henüz mevcut değil, sıfır ile devam et
      } catch {
        // API erişilemiyorsa sessizce sıfır ile devam et
        console.warn('Kurumlar vergisi API erişilemedi — sıfır değerlerle devam ediliyor');
      } finally {
        setLoading(false);
      }
    };

    fetchKurumlarData();
  }, [clientId, periodId, isScopeComplete]);

  const matrah = hesaplama.ticariKar + hesaplama.kkeg - hesaplama.istisnalar - hesaplama.indirimler - hesaplama.gecmisYilZarar;
  const hesaplananVergi = matrah * 0.25;
  const odenecekVergi = hesaplananVergi - hesaplama.odenecekGeciciVergi;

  const beyannameSatirlari: BeyannameSatiri[] = [
    { kod: '110', aciklama: 'Ticari Bilanço Karı', tutar: hesaplama.ticariKar, tip: 'gelir' },
    { kod: '120', aciklama: 'Kanunen Kabul Edilmeyen Giderler (KKEG)', tutar: hesaplama.kkeg, tip: 'gider' },
    { kod: '130', aciklama: 'Zarar Olsa Dahi İndirilecek İstisnalar', tutar: hesaplama.istisnalar, tip: 'gider' },
    { kod: '140', aciklama: 'Kazancın Bulunması Halinde İndirilecek İstisnalar', tutar: hesaplama.indirimler, tip: 'gider' },
    { kod: '150', aciklama: 'Geçmiş Yıl Zararları', tutar: hesaplama.gecmisYilZarar, tip: 'gider' },
    { kod: '200', aciklama: 'Kurumlar Vergisi Matrahı', tutar: matrah, tip: 'matrah' },
    { kod: '210', aciklama: 'Hesaplanan Kurumlar Vergisi (%25)', tutar: hesaplananVergi, tip: 'vergi' },
    { kod: '220', aciklama: 'Mahsup Edilecek Vergiler (Geçici Vergi)', tutar: hesaplama.odenecekGeciciVergi, tip: 'gider' },
    { kod: '300', aciklama: 'ÖDENECEK KURUMLAR VERGİSİ', tutar: odenecekVergi, tip: 'sonuc' },
  ];

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="h-8 w-8 border-3 border-[#B4B4B4] border-t-[#0049AA] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isScopeComplete) {
    return (
      <div className="p-6">
        <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#FFB114]" />
          <p className="text-[#FA841E]">Lütfen mükellef ve dönem seçin.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#0049AA] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2E2E2E] flex items-center gap-3">
            <Landmark className="w-7 h-7 text-[#0049AA]" />
            Kurumlar Vergisi Beyanname Hazırlık
          </h1>
          <p className="text-[#969696] mt-1">
            2025 Hesap Dönemi Kurumlar Vergisi Beyannamesi
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-[#E5E5E5] rounded-lg text-[#5A5A5A] hover:bg-[#F5F6F8] flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Yeniden Hesapla
          </button>
          <button className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] flex items-center gap-2">
            <Download className="w-4 h-4" />
            PDF İndir
          </button>
        </div>
      </div>

      {/* Veri yoksa bilgilendirme */}
      {hesaplama.ticariKar === 0 && hesaplama.kkeg === 0 && !error && (
        <div className="bg-[#FFFBEB] border border-[#FFF08C] rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#FFB114] flex-shrink-0" />
          <p className="text-sm text-[#FA841E]">
            Bu dönem için kurumlar vergisi hesaplama verisi henüz yüklenmemiş. Veriler yüklendikten sonra hesaplamalar otomatik güncellenecektir.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-[#FEF2F2] border border-[#FFC7C9] rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#F0282D] flex-shrink-0" />
          <p className="text-sm text-[#BF192B]">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#969696] text-sm">Ticari Kar</span>
            <TrendingUp className="w-5 h-5 text-[#00A651]" />
          </div>
          <p className="text-2xl font-bold text-[#00804D] mt-2">
            {formatCurrency(hesaplama.ticariKar)}
          </p>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#969696] text-sm">Vergi Matrahı</span>
            <Calculator className="w-5 h-5 text-[#969696]" />
          </div>
          <p className="text-2xl font-bold text-[#2E2E2E] mt-2">
            {formatCurrency(matrah)}
          </p>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#969696] text-sm">Hesaplanan Vergi</span>
            <FileText className="w-5 h-5 text-[#0078D0]" />
          </div>
          <p className="text-2xl font-bold text-[#0049AA] mt-2">
            {formatCurrency(hesaplananVergi)}
          </p>
          <p className="text-xs text-[#969696] mt-1">%25 oran</p>
        </div>

        <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#0049AA] text-sm font-medium">Ödenecek Vergi</span>
            <Landmark className="w-5 h-5 text-[#0049AA]" />
          </div>
          <p className="text-2xl font-bold text-[#0049AA] mt-2">
            {formatCurrency(odenecekVergi)}
          </p>
          <p className="text-xs text-[#0078D0] mt-1">Geçici vergi mahsup sonrası</p>
        </div>
      </div>

      {/* Beyanname Detay Tablosu */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#2E2E2E]">Beyanname Hesaplama Detayı</h2>
          <span className="text-sm text-[#969696]">KVK Md. 6, 8, 9, 10</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E5E5]">
            <thead className="bg-[#F5F6F8]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase w-20">Kod</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5A5A5A] uppercase">Açıklama</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#5A5A5A] uppercase w-48">Tutar (₺)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {beyannameSatirlari.map((satir) => (
                <tr
                  key={satir.kod}
                  className={`
                    ${satir.tip === 'matrah' ? 'bg-[#E6F9FF]' : ''}
                    ${satir.tip === 'vergi' ? 'bg-[#E6F9FF]' : ''}
                    ${satir.tip === 'sonuc' ? 'bg-[#E6F9FF]' : ''}
                    hover:bg-[#F5F6F8] transition-colors
                  `}
                >
                  <td className="px-4 py-3 text-sm font-mono text-[#969696]">{satir.kod}</td>
                  <td className={`px-4 py-3 text-sm ${satir.tip === 'sonuc' ? 'font-bold text-[#00287F]' : 'text-[#5A5A5A]'}`}>
                    {satir.aciklama}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-mono ${
                    satir.tip === 'gelir' ? 'text-[#00804D]' :
                    satir.tip === 'gider' ? 'text-[#5A5A5A]' :
                    satir.tip === 'matrah' ? 'font-semibold text-[#0049AA]' :
                    satir.tip === 'vergi' ? 'font-semibold text-[#0049AA]' :
                    'font-bold text-[#00287F] text-lg'
                  }`}>
                    {satir.tip === 'gider' && satir.tutar > 0 ? '-' : ''}
                    {formatCurrency(satir.tutar)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Beyan Tarihleri */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-[#5A5A5A] mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#969696]" />
            Beyan ve Ödeme Tarihleri
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
              <span className="text-[#5A5A5A]">Hesap Dönemi</span>
              <span className="font-medium text-[#2E2E2E]">01.01.2025 - 31.12.2025</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
              <span className="text-[#5A5A5A]">Beyanname Son Tarihi</span>
              <span className="font-medium text-[#BF192B]">30 Nisan 2026</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5A5A5A]">Ödeme Son Tarihi</span>
              <span className="font-medium text-[#BF192B]">30 Nisan 2026</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-[#5A5A5A] mb-3 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#969696]" />
            Vergi Oranları (2025)
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
              <span className="text-[#5A5A5A]">Genel Kurumlar Vergisi</span>
              <span className="font-medium text-[#2E2E2E]">%25</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5E5E5]">
              <span className="text-[#5A5A5A]">İhracat Kazancı İndirimi</span>
              <span className="font-medium text-[#00804D]">1 puan</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#5A5A5A]">Sanayi Teşvik</span>
              <span className="font-medium text-[#00804D]">1 puan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-xl p-5">
        <h3 className="text-[#00287F] font-semibold flex items-center gap-2">
          <Info className="w-5 h-5" />
          Kurumlar Vergisi Beyanname Bilgileri
        </h3>
        <ul className="mt-3 text-sm text-[#0049AA] space-y-1">
          <li>• Kurumlar vergisi oranı 2025 hesap dönemi için %25'tir (KVK Md. 32).</li>
          <li>• Yıl içinde ödenen geçici vergiler kurumlar vergisinden mahsup edilir.</li>
          <li>• Beyanname elektronik ortamda 30 Nisan'a kadar verilmelidir.</li>
          <li>• Tahakkuk eden vergi aynı gün ödenir veya taksitlendirilir.</li>
        </ul>
      </div>
    </div>
  );
}
