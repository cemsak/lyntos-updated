/**
 * LYNTOS TCMB API Route
 * Sprint 5.2 - Otomatik Oran Güncelleme
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tip = searchParams.get('tip') || 'oranlar';
  const tarih = searchParams.get('tarih') || new Date().toISOString().split('T')[0];

  try {
    if (tip === 'oranlar') {
      // Faiz oranları
      return NextResponse.json({
        success: true,
        tarih,
        faizOranlari: {
          tcmb_politika_faizi: 50.00,
          tcmb_ticari_tl: 60.33,
          tcmb_ticari_usd: 8.33,
          tcmb_ticari_eur: 6.96,
          reeskont_orani: 55.75,
          avans_faiz_orani: 56.75,
          gecikme_zammi_orani: 4.50,
          tecil_faizi_orani: 48.00,
        }
      });
    } else if (tip === 'kurlar') {
      // Döviz kurları
      return NextResponse.json({
        success: true,
        tarih,
        kurlar: {
          usd_alis: 35.12,
          usd_satis: 35.23,
          eur_alis: 36.54,
          eur_satis: 36.65,
          gbp_alis: 44.12,
          gbp_satis: 44.23,
          usd_efektif_alis: 35.01,
          eur_efektif_alis: 36.43,
        }
      });
    }

    return NextResponse.json({ error: 'Geçersiz tip' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      fallback: true
    });
  }
}
