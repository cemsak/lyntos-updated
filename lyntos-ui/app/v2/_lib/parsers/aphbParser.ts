/**
 * LYNTOS APHB Parser
 * ==================
 * SGK Aylık Prim ve Hizmet Belgesi (APHB) parser
 * Excel ve CSV formatlarını destekler
 *
 * APHB Yapısı:
 * - İşveren bilgileri (SGK sicil no, unvan)
 * - Dönem bilgisi (yıl/ay)
 * - Çalışan listesi (TC, ad-soyad, gün, kazanç, prim)
 * - Teşvik kodları (5510, 6111, 7103, vb.)
 * - Eksik gün nedenleri
 */

import * as XLSX from 'xlsx';
import type { DetectedFile } from './types';

// Teşvik Kodları Haritası
export const TESVIK_KODLARI: Record<string, { kod: string; aciklama: string; indirimOrani: number }> = {
  '0': { kod: '0', aciklama: 'Teşviksiz', indirimOrani: 0 },
  '5510': { kod: '5510', aciklama: '5510 Sayılı Kanun (Normal)', indirimOrani: 0 },
  '6111': { kod: '6111', aciklama: 'Genç ve Kadın İstihdamı', indirimOrani: 100 },
  '7103': { kod: '7103', aciklama: 'İlave İstihdam Teşviki', indirimOrani: 100 },
  '7252': { kod: '7252', aciklama: 'Normalleşme Desteği', indirimOrani: 100 },
  '7316': { kod: '7316', aciklama: 'Kısa Çalışma Ödeneği', indirimOrani: 100 },
  '7256': { kod: '7256', aciklama: 'İstihdama Dönüş Desteği', indirimOrani: 100 },
  '14857': { kod: '14857', aciklama: 'Engelli İstihdamı', indirimOrani: 100 },
  '15746': { kod: '15746', aciklama: '18-29 Yaş Teşviki', indirimOrani: 50 },
  '16322': { kod: '16322', aciklama: 'Ar-Ge Personeli', indirimOrani: 100 },
  '25510': { kod: '25510', aciklama: '5 Puanlık İndirim', indirimOrani: 5 },
  '46486': { kod: '46486', aciklama: 'Yatırım Teşvik Belgesi', indirimOrani: 100 },
  '55510': { kod: '55510', aciklama: 'Asgari Ücret Desteği', indirimOrani: 0 },
  '66111': { kod: '66111', aciklama: 'Kadın İstihdamı', indirimOrani: 100 },
  '77103': { kod: '77103', aciklama: 'Genç İstihdamı', indirimOrani: 100 },
};

// Eksik Gün Nedenleri Haritası
export const EKSIK_GUN_NEDENLERI: Record<string, string> = {
  '01': 'İstirahat',
  '02': 'Ücretsiz izin',
  '03': 'Disiplin cezası',
  '04': 'Gözaltına alınma',
  '05': 'Tutukluluk',
  '06': 'Kısmi istihdam',
  '07': 'Puantaj kayıtları',
  '08': 'Grev',
  '09': 'Lokavt',
  '10': 'Genel hayatı etkileyen olaylar',
  '11': 'Doğal afet',
  '12': 'Birden fazla',
  '13': 'Diğer',
  '14': 'Devamsızlık',
  '15': 'Fesih tarihinde çalışılmayan gün',
  '16': 'Kısmi süreli çalışma',
  '17': 'Ev hizmetleri',
  '18': 'Yarım çalışma ödeneği',
  '19': 'Yarım çalışma',
  '21': 'Diğer nedenler',
  '22': 'Pandemi ücretsiz izin',
  '23': 'Pandemi kısa çalışma',
  '24': 'Nakdi ücret desteği',
  '25': 'Yarım gün çalışma',
  '26': 'Yarım gün çalışma (analık)',
  '27': 'Engelli yarım zamanlı',
};

export interface APHBCalisan {
  siraNo: number;
  tcKimlik: string;
  adSoyad: string;
  isGiris?: string;           // İşe giriş tarihi
  isCikis?: string;           // İşten çıkış tarihi
  meslek?: string;
  gunSayisi: number;          // Prim gün sayısı
  ucretGunSayisi?: number;    // Ücret gün sayısı
  eksikGunSayisi: number;
  eksikGunNedeni?: string;
  eksikGunNedenKod?: string;
  primKazanc: number;         // Toplam prime esas kazanç
  sgkIsciPay: number;         // İşçi payı (%14)
  sgkIsverenPay: number;      // İşveren payı (%20.5)
  issizlikIsci: number;       // İşsizlik işçi (%1)
  issizlikIsveren: number;    // İşsizlik işveren (%2)
  toplamPrim: number;         // Toplam prim
  tesvikKodu?: string;        // Teşvik kodu
  tesvikAciklama?: string;    // Teşvik açıklaması
  tesvikTutar?: number;       // Teşvik tutarı
}

export interface APHBOzet {
  toplamCalisan: number;
  toplamGun: number;
  toplamEksikGun: number;
  toplamKazanc: number;
  toplamSgkIsciPay: number;
  toplamSgkIsverenPay: number;
  toplamIssizlikIsci: number;
  toplamIssizlikIsveren: number;
  toplamPrim: number;
  toplamTesvik: number;
  netOdenecek: number;
}

export interface APHBTesvikOzet {
  tesvikKodu: string;
  tesvikAciklama: string;
  calisanSayisi: number;
  toplamKazanc: number;
  toplamTesvik: number;
}

export interface ParsedAPHB {
  isveren: {
    sgkSicilNo: string;
    unvan: string;
    vergiNo?: string;
    adres?: string;
    mahiyet?: string;
  };
  donem: {
    yil: number;
    ay: number;
    donemStr: string;         // "2024-01" formatında
  };
  calisanlar: APHBCalisan[];
  ozet: APHBOzet;
  tesvikOzet: APHBTesvikOzet[];
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
    format: 'APHB_EXCEL' | 'APHB_CSV';
    satirSayisi: number;
  };
}

/**
 * TC Kimlik No geçerlilik kontrolü
 */
function validateTCKimlik(tc: string): boolean {
  if (!tc || tc.length !== 11) return false;
  if (tc[0] === '0') return false;

  const digits = tc.split('').map(Number);
  if (digits.some(isNaN)) return false;

  // 10. hane kontrolü
  const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const even = digits[1] + digits[3] + digits[5] + digits[7];
  const check10 = ((odd * 7) - even) % 10;
  if (check10 !== digits[9]) return false;

  // 11. hane kontrolü
  const sum10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  if (sum10 % 10 !== digits[10]) return false;

  return true;
}

/**
 * Türkçe sayı formatını parse et (1.234.567,89 -> 1234567.89)
 */
function parseTurkishNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value)
    .replace(/\s/g, '')
    .replace(/\./g, '')      // Binlik ayırıcı
    .replace(',', '.');       // Ondalık ayırıcı

  return parseFloat(str) || 0;
}

/**
 * Ay-Yıl string'ini parse et
 */
function parseDonem(value: string): { yil: number; ay: number } | null {
  if (!value) return null;

  // Formatlar: "2024-01", "01/2024", "Ocak 2024", "2024/01"
  const patterns = [
    /(\d{4})[-\/](\d{1,2})/,    // 2024-01, 2024/01
    /(\d{1,2})[-\/](\d{4})/,    // 01/2024, 01-2024
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      const [, a, b] = match;
      if (parseInt(a) > 12) {
        return { yil: parseInt(a), ay: parseInt(b) };
      } else {
        return { yil: parseInt(b), ay: parseInt(a) };
      }
    }
  }

  return null;
}

/**
 * Sütun adından alan tipini tespit et
 */
function detectColumnType(header: string): string | null {
  const h = header.toLowerCase().trim();

  // TC Kimlik
  if (h.includes('tc') || h.includes('kimlik') || h.includes('tckn')) return 'tcKimlik';

  // İsim
  if (h.includes('ad') && h.includes('soyad')) return 'adSoyad';
  if (h === 'ad' || h === 'isim') return 'ad';
  if (h === 'soyad') return 'soyad';

  // Gün sayısı
  if (h.includes('prim') && h.includes('gün')) return 'gunSayisi';
  if (h === 'gün' || h === 'gun') return 'gunSayisi';

  // Eksik gün
  if (h.includes('eksik') && h.includes('gün')) return 'eksikGunSayisi';
  if (h.includes('eksik') && h.includes('neden')) return 'eksikGunNedeni';

  // Kazanç
  if (h.includes('kazanç') || h.includes('kazanc') || h.includes('pek') || h.includes('pesk')) return 'primKazanc';
  if (h.includes('brüt') || h.includes('brut')) return 'primKazanc';

  // Primler
  if (h.includes('işçi') && (h.includes('sgk') || h.includes('prim'))) return 'sgkIsciPay';
  if (h.includes('işveren') && (h.includes('sgk') || h.includes('prim'))) return 'sgkIsverenPay';
  if (h.includes('işsizlik') && h.includes('işçi')) return 'issizlikIsci';
  if (h.includes('işsizlik') && h.includes('işveren')) return 'issizlikIsveren';

  // Teşvik
  if (h.includes('teşvik') || h.includes('tesvik')) {
    if (h.includes('kod')) return 'tesvikKodu';
    if (h.includes('tutar')) return 'tesvikTutar';
    return 'tesvikKodu';
  }

  // Tarihler
  if (h.includes('giriş') || h.includes('giris')) return 'isGiris';
  if (h.includes('çıkış') || h.includes('cikis')) return 'isCikis';

  // Sıra
  if (h === 'sıra' || h === 'sira' || h === 'no' || h === 's.no') return 'siraNo';

  return null;
}

/**
 * APHB Excel/CSV dosyasını parse et
 */
export function parseAPHBExcel(file: DetectedFile): ParsedAPHB {
  if (!file.rawContent) {
    throw new Error('Dosya içeriği bulunamadı');
  }

  const workbook = XLSX.read(file.rawContent, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // JSON'a çevir (header: 1 ile array of arrays döner)
  const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: ''
  }) as unknown as unknown[][];

  if (data.length < 2) {
    throw new Error('Dosyada yeterli veri yok');
  }

  // Header satırını bul (TC Kimlik içeren ilk satır)
  let headerRow = 0;
  let columnMap: Record<string, number> = {};

  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const headers = row.map(h => String(h || '').toLowerCase());

    // TC Kimlik sütunu varsa bu header satırı
    const tcIndex = headers.findIndex(h =>
      h.includes('tc') || h.includes('kimlik') || h.includes('tckn')
    );

    if (tcIndex >= 0) {
      headerRow = i;

      // Sütun haritası oluştur
      headers.forEach((h, idx) => {
        const colType = detectColumnType(h);
        if (colType) {
          columnMap[colType] = idx;
        }
      });

      break;
    }
  }

  // Çalışan verilerini parse et
  const calisanlar: APHBCalisan[] = [];
  let siraNo = 0;

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    // TC Kimlik al
    const tcKimlik = String(row[columnMap.tcKimlik] || '').replace(/\D/g, '');

    // Geçerli TC değilse atla
    if (!tcKimlik || tcKimlik.length !== 11) continue;

    siraNo++;

    // Ad-Soyad
    let adSoyad = '';
    if (columnMap.adSoyad !== undefined) {
      adSoyad = String(row[columnMap.adSoyad] || '');
    } else if (columnMap.ad !== undefined) {
      adSoyad = String(row[columnMap.ad] || '');
      if (columnMap.soyad !== undefined) {
        adSoyad += ' ' + String(row[columnMap.soyad] || '');
      }
    }

    // Sayısal değerler
    const gunSayisi = parseInt(String(row[columnMap.gunSayisi] || '0')) || 0;
    const eksikGunSayisi = parseInt(String(row[columnMap.eksikGunSayisi] || '0')) || 0;
    const primKazanc = parseTurkishNumber(row[columnMap.primKazanc]);

    // Prim hesaplamaları (yoksa hesapla)
    let sgkIsciPay = parseTurkishNumber(row[columnMap.sgkIsciPay]);
    let sgkIsverenPay = parseTurkishNumber(row[columnMap.sgkIsverenPay]);
    let issizlikIsci = parseTurkishNumber(row[columnMap.issizlikIsci]);
    let issizlikIsveren = parseTurkishNumber(row[columnMap.issizlikIsveren]);

    // Yoksa hesapla
    if (!sgkIsciPay && primKazanc) sgkIsciPay = primKazanc * 0.14;
    if (!sgkIsverenPay && primKazanc) sgkIsverenPay = primKazanc * 0.205;
    if (!issizlikIsci && primKazanc) issizlikIsci = primKazanc * 0.01;
    if (!issizlikIsveren && primKazanc) issizlikIsveren = primKazanc * 0.02;

    // Teşvik
    const tesvikKodu = String(row[columnMap.tesvikKodu] || '5510');
    const tesvikInfo = TESVIK_KODLARI[tesvikKodu] || TESVIK_KODLARI['5510'];
    const tesvikTutar = parseTurkishNumber(row[columnMap.tesvikTutar]) || 0;

    // Eksik gün nedeni
    const eksikGunNedenKod = String(row[columnMap.eksikGunNedeni] || '');
    const eksikGunNedeni = EKSIK_GUN_NEDENLERI[eksikGunNedenKod] || eksikGunNedenKod;

    const calisan: APHBCalisan = {
      siraNo,
      tcKimlik,
      adSoyad: adSoyad.trim(),
      gunSayisi,
      eksikGunSayisi,
      eksikGunNedeni,
      eksikGunNedenKod,
      primKazanc,
      sgkIsciPay,
      sgkIsverenPay,
      issizlikIsci,
      issizlikIsveren,
      toplamPrim: sgkIsciPay + sgkIsverenPay + issizlikIsci + issizlikIsveren,
      tesvikKodu,
      tesvikAciklama: tesvikInfo.aciklama,
      tesvikTutar,
    };

    if (columnMap.isGiris !== undefined) {
      calisan.isGiris = String(row[columnMap.isGiris] || '');
    }
    if (columnMap.isCikis !== undefined) {
      calisan.isCikis = String(row[columnMap.isCikis] || '');
    }

    calisanlar.push(calisan);
  }

  // Özet hesapla
  const ozet: APHBOzet = {
    toplamCalisan: calisanlar.length,
    toplamGun: calisanlar.reduce((sum, c) => sum + c.gunSayisi, 0),
    toplamEksikGun: calisanlar.reduce((sum, c) => sum + c.eksikGunSayisi, 0),
    toplamKazanc: calisanlar.reduce((sum, c) => sum + c.primKazanc, 0),
    toplamSgkIsciPay: calisanlar.reduce((sum, c) => sum + c.sgkIsciPay, 0),
    toplamSgkIsverenPay: calisanlar.reduce((sum, c) => sum + c.sgkIsverenPay, 0),
    toplamIssizlikIsci: calisanlar.reduce((sum, c) => sum + c.issizlikIsci, 0),
    toplamIssizlikIsveren: calisanlar.reduce((sum, c) => sum + c.issizlikIsveren, 0),
    toplamPrim: calisanlar.reduce((sum, c) => sum + c.toplamPrim, 0),
    toplamTesvik: calisanlar.reduce((sum, c) => sum + (c.tesvikTutar || 0), 0),
    netOdenecek: 0,
  };
  ozet.netOdenecek = ozet.toplamPrim - ozet.toplamTesvik;

  // Teşvik bazlı özet
  const tesvikMap = new Map<string, APHBTesvikOzet>();
  for (const calisan of calisanlar) {
    const kod = calisan.tesvikKodu || '5510';
    if (!tesvikMap.has(kod)) {
      tesvikMap.set(kod, {
        tesvikKodu: kod,
        tesvikAciklama: calisan.tesvikAciklama || TESVIK_KODLARI[kod]?.aciklama || 'Bilinmiyor',
        calisanSayisi: 0,
        toplamKazanc: 0,
        toplamTesvik: 0,
      });
    }
    const t = tesvikMap.get(kod)!;
    t.calisanSayisi++;
    t.toplamKazanc += calisan.primKazanc;
    t.toplamTesvik += calisan.tesvikTutar || 0;
  }

  // Dönem tespit (dosya adından)
  let yil = new Date().getFullYear();
  let ay = new Date().getMonth() + 1;

  // Dosya adından dönem çıkarmayı dene
  const donemMatch = file.fileName.match(/(\d{4})[-_]?(\d{2})/);
  if (donemMatch) {
    const [, y, m] = donemMatch;
    if (parseInt(y) > 2000 && parseInt(m) >= 1 && parseInt(m) <= 12) {
      yil = parseInt(y);
      ay = parseInt(m);
    }
  }

  // İşveren bilgileri (dosya meta verisinden veya varsayılan)
  const isveren = {
    sgkSicilNo: '',
    unvan: '',
    vergiNo: file.metadata?.vkn,
  };

  return {
    isveren,
    donem: {
      yil,
      ay,
      donemStr: `${yil}-${String(ay).padStart(2, '0')}`,
    },
    calisanlar,
    ozet,
    tesvikOzet: Array.from(tesvikMap.values()),
    parseInfo: {
      kaynak: file.fileName,
      parseTarihi: new Date().toISOString(),
      format: file.fileType === 'SGK_APHB_EXCEL' ? 'APHB_EXCEL' : 'APHB_CSV',
      satirSayisi: calisanlar.length,
    },
  };
}

/**
 * ArrayBuffer'dan parse et
 */
export function parseAPHBFromBuffer(content: ArrayBuffer, fileName: string): ParsedAPHB {
  const file: DetectedFile = {
    id: `aphb-${Date.now()}`,
    originalPath: fileName,
    fileName,
    fileType: 'SGK_APHB_EXCEL',
    fileExtension: fileName.split('.').pop() || 'xlsx',
    fileSize: content.byteLength,
    confidence: 100,
    detectionMethod: 'content',
    metadata: {},
    rawContent: content,
  };
  return parseAPHBExcel(file);
}

/**
 * Birden fazla APHB dosyasını parse et
 */
export function parseMultipleAPHB(
  files: { content: ArrayBuffer; fileName: string }[]
): { success: ParsedAPHB[]; errors: { fileName: string; error: string }[] } {
  const success: ParsedAPHB[] = [];
  const errors: { fileName: string; error: string }[] = [];

  for (const file of files) {
    try {
      const parsed = parseAPHBFromBuffer(file.content, file.fileName);
      success.push(parsed);
    } catch (err) {
      errors.push({
        fileName: file.fileName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { success, errors };
}

/**
 * APHB verisini muhasebe fişine dönüştür
 */
export function aphbToMuhasebeFisi(aphb: ParsedAPHB): {
  fisNo: string;
  tarih: string;
  aciklama: string;
  satirlar: Array<{
    hesapKodu: string;
    hesapAdi: string;
    borc: number;
    alacak: number;
    aciklama: string;
  }>;
} {
  const donem = `${aphb.donem.yil}-${String(aphb.donem.ay).padStart(2, '0')}`;

  const satirlar: Array<{
    hesapKodu: string;
    hesapAdi: string;
    borc: number;
    alacak: number;
    aciklama: string;
  }> = [];

  // Brüt ücret gideri (770)
  if (aphb.ozet.toplamKazanc > 0) {
    satirlar.push({
      hesapKodu: '770',
      hesapAdi: 'Genel Yönetim Giderleri',
      borc: aphb.ozet.toplamKazanc,
      alacak: 0,
      aciklama: `${donem} Brüt Ücret Gideri`,
    });
  }

  // SGK işveren payı gideri (770)
  const sgkIsverenToplam = aphb.ozet.toplamSgkIsverenPay + aphb.ozet.toplamIssizlikIsveren;
  if (sgkIsverenToplam > 0) {
    satirlar.push({
      hesapKodu: '770',
      hesapAdi: 'Genel Yönetim Giderleri',
      borc: sgkIsverenToplam,
      alacak: 0,
      aciklama: `${donem} SGK İşveren Payı`,
    });
  }

  // SGK kesintisi borcu (361)
  if (aphb.ozet.toplamPrim > 0) {
    satirlar.push({
      hesapKodu: '361',
      hesapAdi: 'Ödenecek Sosyal Güvenlik Kesintileri',
      borc: 0,
      alacak: aphb.ozet.netOdenecek,
      aciklama: `${donem} Ödenecek SGK Primi`,
    });
  }

  // Personele borç (335)
  const netUcret = aphb.ozet.toplamKazanc - aphb.ozet.toplamSgkIsciPay - aphb.ozet.toplamIssizlikIsci;
  if (netUcret > 0) {
    satirlar.push({
      hesapKodu: '335',
      hesapAdi: 'Personele Borçlar',
      borc: 0,
      alacak: netUcret,
      aciklama: `${donem} Ödenecek Net Ücret`,
    });
  }

  // Teşvik alacağı (varsa)
  if (aphb.ozet.toplamTesvik > 0) {
    satirlar.push({
      hesapKodu: '136',
      hesapAdi: 'Diğer Çeşitli Alacaklar',
      borc: aphb.ozet.toplamTesvik,
      alacak: 0,
      aciklama: `${donem} SGK Teşvik Alacağı`,
    });
    satirlar.push({
      hesapKodu: '602',
      hesapAdi: 'Diğer Gelirler',
      borc: 0,
      alacak: aphb.ozet.toplamTesvik,
      aciklama: `${donem} SGK Teşvik Geliri`,
    });
  }

  return {
    fisNo: `APHB-${donem}`,
    tarih: `${aphb.donem.yil}-${String(aphb.donem.ay).padStart(2, '0')}-28`,
    aciklama: `${donem} Aylık Prim ve Hizmet Belgesi Tahakkuku`,
    satirlar,
  };
}

/**
 * APHB istatistiklerini al
 */
export function getAPHBStats(aphbList: ParsedAPHB[]): {
  toplamDosya: number;
  toplamCalisan: number;
  toplamGun: number;
  toplamKazanc: number;
  toplamPrim: number;
  toplamTesvik: number;
  tesvikDagilimi: Record<string, number>;
  aylikDagilim: Array<{ donem: string; calisan: number; kazanc: number; prim: number }>;
} {
  const tesvikDagilimi: Record<string, number> = {};
  const aylikMap = new Map<string, { calisan: number; kazanc: number; prim: number }>();

  let toplamCalisan = 0;
  let toplamGun = 0;
  let toplamKazanc = 0;
  let toplamPrim = 0;
  let toplamTesvik = 0;

  for (const aphb of aphbList) {
    toplamCalisan += aphb.ozet.toplamCalisan;
    toplamGun += aphb.ozet.toplamGun;
    toplamKazanc += aphb.ozet.toplamKazanc;
    toplamPrim += aphb.ozet.toplamPrim;
    toplamTesvik += aphb.ozet.toplamTesvik;

    // Teşvik dağılımı
    for (const t of aphb.tesvikOzet) {
      tesvikDagilimi[t.tesvikKodu] = (tesvikDagilimi[t.tesvikKodu] || 0) + t.calisanSayisi;
    }

    // Aylık dağılım
    const donem = aphb.donem.donemStr;
    if (!aylikMap.has(donem)) {
      aylikMap.set(donem, { calisan: 0, kazanc: 0, prim: 0 });
    }
    const m = aylikMap.get(donem)!;
    m.calisan += aphb.ozet.toplamCalisan;
    m.kazanc += aphb.ozet.toplamKazanc;
    m.prim += aphb.ozet.toplamPrim;
  }

  const aylikDagilim = Array.from(aylikMap.entries())
    .map(([donem, data]) => ({ donem, ...data }))
    .sort((a, b) => a.donem.localeCompare(b.donem));

  return {
    toplamDosya: aphbList.length,
    toplamCalisan,
    toplamGun,
    toplamKazanc,
    toplamPrim,
    toplamTesvik,
    tesvikDagilimi,
    aylikDagilim,
  };
}
