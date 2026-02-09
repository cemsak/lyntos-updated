// Turkce sayi formati helper
export function formatTurkishNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

// Turkce para formati
export function formatTurkishCurrency(value: number): string {
  return `${formatTurkishNumber(value, 0)} TL`;
}

// Esik degerleri icin YMM/SMMM'ye anlasilir aciklamalar
// Terminoloji: VDK Genelgesi E-55935724-010.06-7361 ve SMMM meslek standardi
export function getEsikAciklama(kontrolAdi: string, tip: 'uyari' | 'kritik', esikDeger?: number): string {
  const aciklamalar: Record<string, { uyari: string; kritik: string; dayanak?: string }> = {
    'Siskinlik Orani': {
      uyari: 'Kasa/Aktif orani %5\'i gecerse adat faizi hesaplamasi gerekir',
      kritik: 'Kasa/Aktif orani %15\'i gecerse VDK inceleme riski (adat faizi zorunlu)',
      dayanak: 'VDK Genelgesi, GVK 41/5'
    },
    'Sermayeye Oran': {
      uyari: 'Ortaklardan alacak sermayenin %10\'una ulasti - adat faizi hesaplamasi degerlendirilmeli',
      kritik: 'Ortaklardan alacak sermayenin %30\'unu asti - TTK 358 borclanma yasagi riski',
      dayanak: 'TTK 358, KVK 13'
    },
    'Aktif Orani': {
      uyari: 'Toplam aktiflerin %5\'ini gecti - dikkate alinmali',
      kritik: 'Toplam aktiflerin %15\'ini gecti - VDK oncelikli izleme',
      dayanak: 'VDK Risk Senaryolari'
    },
    'Yaslandirma': {
      uyari: '90 gunu gecmis alacak - tahsilat takibi ve supheli alacak degerlendirmesi gerekli',
      kritik: '180 gunu gecmis alacak - VUK 323 supheli alacak karsiligi ayrilmali',
      dayanak: 'VUK 323'
    },
    'Ortulu Sermaye (3x Kural)': {
      uyari: 'Iliskili kisi borclanmasi ozkaynak sinirina (%80) yaklasti - KVK 12 degerlendirmesi gerekli',
      kritik: 'Iliskili kisi borcu ozkaynak x 3 sinirini asti - ortulu sermaye nedeniyle faiz gideri KKEG olarak dikkate alinmali',
      dayanak: 'KVK 12'
    },
    'KKEG Kontrolu': {
      uyari: 'Kanunen kabul edilmeyen gider (KKEG) olabilir - GVK 40 ve KVK 11 kapsaminda incelenmeli',
      kritik: 'KKEG tutari beyanname ile uyumsuz - duzeltme beyani degerlendirilmeli',
      dayanak: 'GVK 40, KVK 11'
    },
    '36 Ay Sureli Devir': {
      uyari: '24+ ay devreden KDV - VDK dikkat listesinde, KDV iade/mahsup degerlendirilmeli',
      kritik: '36+ ay devreden KDV - VDK oncelikli risk senaryosu (KURGAN KRG-03)',
      dayanak: 'VDK KURGAN KRG-03, KDVK 29'
    },
    'Adat Faizi': {
      uyari: 'Ortaklara/iliskili kisilere 100.000 TL+ bakiye - adat faizi (emsal faiz) hesaplamasi yapilmali',
      kritik: 'Adat faizi hesaplanmamis - transfer fiyatlandirmasi yoluyla ortulu kazanc dagitimi riski',
      dayanak: 'KVK 13, GVK 41/5'
    },
    'Devir Hizi': {
      uyari: 'Stok devir hizi 180+ gun - sektor ortalamasinin altinda, stok degerleme kontrolu onerilir',
      kritik: 'Stok devir hizi 360+ gun - atil stok, VUK 274 deger dusukluğu karsiligi degerlendirilmeli',
      dayanak: 'VUK 274, TMS 2'
    },
    'Stok-Satis Uyumu': {
      uyari: 'Stok/SMM orani 1.5x uzeri - stok degerleme ve fire analizi yapilmali',
      kritik: 'Stok/SMM orani 2x uzeri - KURGAN KRG-04 stok siskinligi riski, fiziki sayim zorunlu',
      dayanak: 'VDK KURGAN KRG-04'
    },
    'Dusuk KDV Odemesi': {
      uyari: 'KDV odemesi cironun %0.5\'inin altinda - sektor ortalamasindan dusuk, beyanname kontrolu onerilir',
      kritik: 'KDV odemesi cironun %0.1\'inin altinda - VDK dusuk vergi yuku riski (KURGAN KRG-15)',
      dayanak: 'VDK KURGAN KRG-15'
    },
    'Genel Durum': {
      uyari: 'Bu hesap grubunda tespit edilen risk yok - normal isleyis',
      kritik: 'Bu hesap grubunda tespit edilen risk yok - normal isleyis'
    },
    'Virman Kontrolu': {
      uyari: 'Odenmeyen vergi/SGK tutarlari 368 hesaba virmanlanmali - Tekduzen Hesap Plani uyumu',
      kritik: 'Virman eksik - beyanname ile mizan uyumsuzlugu, duzeltme gerekli',
      dayanak: 'Tekduzen Hesap Plani'
    },
    'Birinci Tertip': {
      uyari: 'Birinci tertip yasal yedek yetersiz - TTK 519 kontrol edilmeli',
      kritik: 'Yasal yedek ayrilmamis - TTK 519 ihlali, Genel Kurul karari gerekli',
      dayanak: 'TTK 519'
    },
    default: {
      uyari: esikDeger === 0 ? 'Esik kontrolu degil, varlik/yokluk kontrolu yapilmaktadir' : 'Bu degeri asarsa uyari durumu',
      kritik: esikDeger === 0 ? 'Esik kontrolu degil, varlik/yokluk kontrolu yapilmaktadir' : 'Bu degeri asarsa kritik risk'
    }
  };

  const aciklama = aciklamalar[kontrolAdi] || aciklamalar['default'];
  return tip === 'uyari' ? aciklama.uyari : aciklama.kritik;
}

// Hesap kodu aciklamalari - YMM/SMMM jargonu
export const HESAP_ACIKLAMALARI: Record<string, string> = {
  '100': 'Kasa Hesabi - Nakit varliklar',
  '102': 'Bankalar - Vadesiz/vadeli mevduat',
  '108': 'Diger Hazir Degerler',
  '120': 'Alicilar - Ticari alacaklar',
  '121': 'Alacak Senetleri',
  '128': 'Supheli Ticari Alacaklar',
  '129': 'Supheli Ticari Alacaklar Karsiligi (-)',
  '131': 'Ortaklardan Alacaklar',
  '153': 'Ticari Mallar - Stoklar',
  '190': 'Devreden KDV',
  '191': 'Indirilecek KDV',
  '231': 'Ortaklardan Alacaklar (Uzun Vadeli)',
  '320': 'Saticilar - Ticari borclar',
  '331': 'Ortaklara Borclar',
  '360': 'Odenecek Vergi ve Fonlar',
  '361': 'Odenecek Sosyal Guvenlik Kesintileri',
  '368': 'Vadesi Gecmis Ertelenmis Vergi/SGK',
  '391': 'Hesaplanan KDV',
  '431': 'Ortaklara Borclar (Uzun Vadeli)',
  '500': 'Sermaye',
  '540': 'Yasal Yedekler',
  '570': 'Gecmis Yillar Karlari',
  '580': 'Gecmis Yillar Zararlari (-)',
  '600': 'Yurtici Satislar',
  '620': 'Satilan Malin Maliyeti (SMM)',
  '642': 'Faiz Gelirleri',
  '660': 'Kisa Vadeli Borclanma Giderleri',
  '689': 'Diger Olagandisi Gider ve Zararlar',
};
