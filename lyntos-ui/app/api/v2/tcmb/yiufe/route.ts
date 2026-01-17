/**
 * TCMB EVDS Yi-UFE API Route
 * Enflasyon duzeltmesi icin Yi-UFE verilerini ceker
 *
 * TCMB Nisan 2024 guncellemesi: API key header'da gonderilmeli
 */

import { NextRequest, NextResponse } from 'next/server';

const TCMB_API_URL = 'https://evds2.tcmb.gov.tr/service/evds';

// Yi-UFE serileri
const SERIES_CODE = 'TP.FG.J0';  // Yi-UFE Genel Endeks
// TCMB response'da noktalar alt cizgiye donusuyor: TP.FG.J0 -> TP_FG_J0
const SERIES_FIELD = SERIES_CODE.replace(/\./g, '_');

interface TCMBResponse {
  items?: Array<{
    Tarih: string;
    [key: string]: string | number;
  }>;
  totalCount?: number;
}

export async function GET(request: NextRequest) {
  try {
    // API key'i environment'tan al
    const apiKey = process.env.TCMB_EVDS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'TCMB API anahtari tanimlanmamis',
          code: 'API_KEY_MISSING',
          help: 'Lutfen .env.local dosyasina TCMB_EVDS_API_KEY ekleyin'
        },
        { status: 503 }
      );
    }

    // Tarih araligi - son 4 yil
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 4);

    const formatDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

    // TCMB API cagrisi
    const url = `${TCMB_API_URL}/series=${SERIES_CODE}&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}&type=json&frequency=5`;

    console.log('[TCMB API] Fetching:', url);

    const response = await fetch(url, {
      headers: {
        'key': apiKey  // Nisan 2024 guncellemesi: header'da gonder
      },
      next: { revalidate: 86400 } // 24 saat cache
    });

    if (!response.ok) {
      console.error('[TCMB API] Error:', response.status, response.statusText);
      return NextResponse.json(
        {
          error: 'TCMB API yanit vermedi',
          code: 'TCMB_ERROR',
          status: response.status
        },
        { status: 502 }
      );
    }

    const data: TCMBResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        {
          error: 'TCMB veri dondurmedi',
          code: 'NO_DATA'
        },
        { status: 404 }
      );
    }

    // Veriyi isle
    const items = data.items;
    const latestItem = items[items.length - 1];
    const latestValue = parseFloat(latestItem[SERIES_FIELD] as string);
    const latestDate = latestItem.Tarih;

    // 3 yil onceki degeri bul
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const threeYearItem = items.find(item => {
      const itemDate = parseDate(item.Tarih);
      return itemDate && itemDate.getFullYear() === threeYearsAgo.getFullYear() &&
             itemDate.getMonth() === threeYearsAgo.getMonth();
    });

    // 12 ay onceki degeri bul
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearItem = items.find(item => {
      const itemDate = parseDate(item.Tarih);
      return itemDate && itemDate.getFullYear() === oneYearAgo.getFullYear() &&
             itemDate.getMonth() === oneYearAgo.getMonth();
    });

    // Hesaplamalar
    const threeYearValue = threeYearItem ? parseFloat(threeYearItem[SERIES_FIELD] as string) : null;
    const oneYearValue = oneYearItem ? parseFloat(oneYearItem[SERIES_FIELD] as string) : null;

    const son3Yil = threeYearValue ? ((latestValue - threeYearValue) / threeYearValue) * 100 : null;
    const son12Ay = oneYearValue ? ((latestValue - oneYearValue) / oneYearValue) * 100 : null;
    const duzeltmeKatsayisi = threeYearValue ? latestValue / threeYearValue : null;

    return NextResponse.json({
      success: true,
      data: {
        son3Yil: son3Yil ? parseFloat(son3Yil.toFixed(1)) : null,
        son12Ay: son12Ay ? parseFloat(son12Ay.toFixed(1)) : null,
        duzeltmeKatsayisi: duzeltmeKatsayisi ? parseFloat(duzeltmeKatsayisi.toFixed(3)) : null,
        referansTarih: latestDate,
        guncelEndeks: latestValue,
        kaynak: 'TCMB EVDS',
        kaynakUrl: 'https://evds2.tcmb.gov.tr'
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        seriesCode: SERIES_CODE,
        dataPoints: items.length
      }
    });

  } catch (error) {
    console.error('[TCMB API] Exception:', error);
    return NextResponse.json(
      {
        error: 'Beklenmeyen hata olustu',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
}

// Tarih parse helper
function parseDate(dateStr: string): Date | null {
  // TCMB format: "YYYY-M" (ornek: "2023-1", "2025-12")
  try {
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months 0-indexed
        return new Date(year, month, 1);
      }
    }
    return null;
  } catch {
    return null;
  }
}
