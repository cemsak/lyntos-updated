export interface MukellefOranlari {
  // Likidite
  cari_oran?: number;
  asit_test_orani?: number;
  nakit_orani?: number;
  // Finansal Yapı
  yabanci_kaynak_aktif?: number;
  ozkaynak_aktif?: number;
  // Karlılık
  net_kar_marji?: number;
  brut_kar_marji?: number;
  roa?: number;
  // Devir Hızları
  alacak_devir_hizi?: number;
  borc_devir_hizi?: number;
  stok_devir_hizi?: number;
  // Vergi
  vergi_yuku?: number;
}

// Oran tanımları - YMM/SMMM terminolojisi + Formül + Kanıt
export interface OranTanimi {
  ad: string;
  aciklama: string;
  formul: string;
  hesap_kodlari: string[];
  birim: '%' | 'x' | 'gün';
  ideal: 'yuksek' | 'dusuk' | 'dengeli';
  esik_iyi: number;
  esik_kotu: number;
  mevzuat?: string;
  vdk_riski?: string;
}

export const ORAN_TANIMLARI: Record<string, OranTanimi> = {
  cari_oran: {
    ad: 'Cari Oran',
    aciklama: 'Kısa vadeli borç ödeme gücünü gösterir. 1\'in altında olması likidite sıkıntısı işaretidir.',
    formul: 'Dönen Varlıklar (1xx) / Kısa Vadeli Yabancı Kaynaklar (3xx)',
    hesap_kodlari: ['100-199', '300-399'],
    birim: '%',
    ideal: 'yuksek',
    esik_iyi: 150,
    esik_kotu: 100,
    mevzuat: 'TMS 1 Finansal Tabloların Sunuluşu, SPK Finansal Raporlama',
    vdk_riski: 'Düşük cari oran, işletme sürekliliği şüphesi doğurabilir'
  },
  asit_test_orani: {
    ad: 'Asit-Test (Likidite) Oranı',
    aciklama: 'Stoklar hariç dönen varlıklarla kısa vadeli borçları karşılama gücü. Daha muhafazakar likidite ölçüsü.',
    formul: '(Dönen Varlıklar - Stoklar) / KVYK',
    hesap_kodlari: ['100-149', '150-159 (-)','300-399'],
    birim: '%',
    ideal: 'yuksek',
    esik_iyi: 100,
    esik_kotu: 70,
    mevzuat: 'TMS 1, TMS 2 Stoklar'
  },
  nakit_orani: {
    ad: 'Nakit Oranı',
    aciklama: 'En likit varlıklarla (kasa, banka) kısa vadeli borçları karşılama.',
    formul: '(Hazır Değerler + Menkul Kıymetler) / KVYK',
    hesap_kodlari: ['100', '102', '110-119', '300-399'],
    birim: '%',
    ideal: 'dengeli',
    esik_iyi: 20,
    esik_kotu: 5,
  },
  yabanci_kaynak_aktif: {
    ad: 'Borçlanma Oranı',
    aciklama: 'Varlıkların ne kadarının borçla finanse edildiğini gösterir. Yüksek oran finansal risk demektir.',
    formul: 'Toplam Yabancı Kaynaklar (3+4) / Toplam Aktifler',
    hesap_kodlari: ['300-399', '400-499', '1xx-2xx'],
    birim: '%',
    ideal: 'dusuk',
    esik_iyi: 50,
    esik_kotu: 70,
    mevzuat: 'KVK Md.12 - Örtülü Sermaye',
    vdk_riski: 'KVYK > Özkaynak × 3 ise örtülü sermaye riski'
  },
  ozkaynak_aktif: {
    ad: 'Özkaynak Oranı',
    aciklama: 'Finansal bağımsızlık göstergesi. Varlıkların ne kadarının özkaynaklarla finanse edildiği.',
    formul: 'Özkaynaklar (5xx) / Toplam Aktifler',
    hesap_kodlari: ['500-599', '1xx-2xx'],
    birim: '%',
    ideal: 'yuksek',
    esik_iyi: 50,
    esik_kotu: 30,
    mevzuat: 'TTK Md.376 - Sermaye Kaybı ve Borca Batıklık',
    vdk_riski: 'Özkaynak < Sermaye/2 ise TTK 376 uyarısı'
  },
  net_kar_marji: {
    ad: 'Net Kâr Marjı',
    aciklama: 'Her 100 TL satıştan ne kadar net kâr kaldığını gösterir.',
    formul: 'Net Dönem Kârı (590) / Net Satışlar (600-610-611)',
    hesap_kodlari: ['590', '600', '610', '611'],
    birim: '%',
    ideal: 'yuksek',
    esik_iyi: 5,
    esik_kotu: 0,
    mevzuat: 'VDK Genelgesi',
    vdk_riski: 'KURGAN KRG-08: Sürekli zarar veya düşük kârlılık'
  },
  brut_kar_marji: {
    ad: 'Brüt Satış Kârı Marjı',
    aciklama: 'Satış maliyeti kontrolünü gösterir. SMM\'nin satışa oranı.',
    formul: '(Net Satışlar - SMM) / Net Satışlar',
    hesap_kodlari: ['600', '620', '621'],
    birim: '%',
    ideal: 'yuksek',
    esik_iyi: 20,
    esik_kotu: 10,
    vdk_riski: 'KURGAN KRG-04: Stok şişkinliği veya düşük brüt kâr'
  },
  roa: {
    ad: 'Aktif Kârlılığı (ROA)',
    aciklama: 'Varlıkların ne kadar verimli kullanıldığını, kâr üretme gücünü gösterir.',
    formul: 'Net Dönem Kârı / Toplam Aktifler',
    hesap_kodlari: ['590', '1xx-2xx'],
    birim: '%',
    ideal: 'yuksek',
    esik_iyi: 5,
    esik_kotu: 1,
    mevzuat: 'Finansal analiz standartları'
  },
  alacak_devir_hizi: {
    ad: 'Alacak Devir Hızı',
    aciklama: 'Ticari alacakların yılda kaç kez tahsil edildiği. Yüksek hız iyi tahsilat demektir.',
    formul: 'Net Satışlar / Ortalama Ticari Alacaklar',
    hesap_kodlari: ['600', '120', '121'],
    birim: 'x',
    ideal: 'yuksek',
    esik_iyi: 6,
    esik_kotu: 3,
    vdk_riski: 'Düşük devir hızı tahsilat sorunu veya şüpheli alacak riski'
  },
  borc_devir_hizi: {
    ad: 'Borç Devir Hızı',
    aciklama: 'Ticari borçların yılda kaç kez ödendiği.',
    formul: 'SMM / Ortalama Ticari Borçlar',
    hesap_kodlari: ['620', '320', '321'],
    birim: 'x',
    ideal: 'dengeli',
    esik_iyi: 6,
    esik_kotu: 12,
  },
  vergi_yuku: {
    ad: 'Efektif Vergi Yükü',
    aciklama: 'Ciro üzerinden ödenen vergi oranı. Sektör ortalamasından sapma VDK dikkatini çeker.',
    formul: 'Ödenen Vergiler (360, 391) / Net Satışlar (600)',
    hesap_kodlari: ['360', '391', '600'],
    birim: '%',
    ideal: 'dengeli',
    esik_iyi: 2,
    esik_kotu: 0.5,
    mevzuat: 'VDK Genelgesi, GİB Sektörel Vergi İstatistikleri',
    vdk_riski: 'KURGAN KRG-15: Düşük vergi yükü, sektörden sapma'
  },
};

// Sapma durumunu hesapla
export function hesaplaSapma(
  mukellef: number | undefined,
  sektor: number | undefined,
  ideal: 'yuksek' | 'dusuk' | 'dengeli'
): { durum: 'iyi' | 'kotu' | 'normal' | 'veri_yok'; sapmaYuzde: number } {
  if (mukellef === undefined || sektor === undefined || sektor === 0) {
    return { durum: 'veri_yok', sapmaYuzde: 0 };
  }

  const sapmaYuzde = ((mukellef - sektor) / sektor) * 100;

  // Sapma değerlendirmesi
  if (ideal === 'yuksek') {
    // Yüksek olması iyi (örn: cari oran, kâr marjı)
    if (sapmaYuzde >= 10) return { durum: 'iyi', sapmaYuzde };
    if (sapmaYuzde <= -20) return { durum: 'kotu', sapmaYuzde };
    return { durum: 'normal', sapmaYuzde };
  } else if (ideal === 'dusuk') {
    // Düşük olması iyi (örn: borçlanma oranı)
    if (sapmaYuzde <= -10) return { durum: 'iyi', sapmaYuzde };
    if (sapmaYuzde >= 20) return { durum: 'kotu', sapmaYuzde };
    return { durum: 'normal', sapmaYuzde };
  } else {
    // Dengeli olması iyi
    if (Math.abs(sapmaYuzde) <= 15) return { durum: 'normal', sapmaYuzde };
    return { durum: 'kotu', sapmaYuzde };
  }
}

// Değer formatlama
export function formatDeger(deger: number | undefined, birim: '%' | 'x' | 'gün'): string {
  if (deger === undefined) return '-';
  if (birim === '%') return `%${(deger * 100).toFixed(1)}`;
  if (birim === 'x') return `${deger.toFixed(1)}x`;
  return `${deger.toFixed(0)} gün`;
}
