/**
 * LYNTOS MT940 Parser
 * ===================
 * SWIFT MT940 banka ekstresi formatını parse eder
 * Tüm Türk bankalarının MT940 çıktılarını destekler
 * 
 * MT940 Yapısı:
 * :20: - Transaction Reference Number
 * :25: - Account Identification (IBAN/Hesap No)
 * :28C: - Statement Number/Sequence
 * :60F: - Opening Balance
 * :61: - Statement Line (işlem)
 * :86: - Information to Account Owner (açıklama)
 * :62F: - Closing Balance
 */

export interface MT940Header {
  transactionRef: string;      // :20:
  accountId: string;           // :25: IBAN veya hesap no
  statementNo: string;         // :28C:
  banka?: string;              // Tespit edilen banka
}

export interface MT940Balance {
  tip: 'opening' | 'closing';
  creditDebit: 'C' | 'D';      // C=Credit (alacak), D=Debit (borç)
  tarih: string;               // YYMMDD -> YYYY-MM-DD
  paraBirimi: string;
  tutar: number;
}

export interface MT940Transaction {
  tarih: string;               // Valör tarihi (YYYY-MM-DD)
  islemTarihi?: string;        // İşlem tarihi
  creditDebit: 'C' | 'D';      // C=giriş, D=çıkış
  tutar: number;
  transactionType: string;     // N=normal, S=SWIFT, vb.
  referans?: string;
  aciklama: string;
  // Türkçe dönüşüm
  borc: number;                // D ise tutar, C ise 0
  alacak: number;              // C ise tutar, D ise 0
}

export interface ParsedMT940 {
  header: MT940Header;
  acilisBakiye: MT940Balance;
  kapanisBakiye: MT940Balance;
  islemler: MT940Transaction[];
  toplamlar: {
    toplamGiris: number;
    toplamCikis: number;
    islemSayisi: number;
    netDegisim: number;
  };
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
    format: 'MT940';
  };
}

// Banka IBAN prefix'leri
const BANKA_IBAN_MAP: Record<string, string> = {
  '0001': 'TCMB',
  '0004': 'IS_BANKASI',
  '0006': 'AKBANK',
  '0010': 'ZIRAAT',
  '0012': 'HALKBANK',
  '0015': 'VAKIFBANK',
  '0016': 'SEKERBANK',
  '0017': 'QNB_FINANSBANK',
  '0032': 'YAPI_KREDI',
  '0046': 'GARANTI',
  '0059': 'SEKERBANK',
  '0062': 'GARANTI',
  '0064': 'ISBANK',
  '0067': 'YAPI_KREDI',
  '0091': 'ANADOLUBANK',
  '0092': 'CITIBANK',
  '0096': 'TURKIYE_FINANS',
  '0098': 'ING',
  '0099': 'ING',
  '0100': 'ADABANK',
  '0103': 'FIBABANKA',
  '0108': 'TEB',
  '0109': 'TEB',
  '0111': 'QNB_FINANSBANK',
  '0115': 'DEUTSCHE',
  '0121': 'KUVEYT_TURK',
  '0122': 'KUVEYT_TURK',
  '0123': 'HSBC',
  '0124': 'ALBARAKA',
  '0125': 'BURGAN',
  '0129': 'ODEABANK',
  '0132': 'ICBC',
  '0134': 'DENIZBANK',
  '0135': 'DENIZBANK',
  '0137': 'ZIRAAT_KATILIM',
  '0139': 'VAKIF_KATILIM',
  '0141': 'EMLAK_KATILIM',
  '0142': 'ALTERNATIFBANK',
  '0143': 'AKTIFBANK',
  '0146': 'MUFG',
  '0203': 'ALBARAKA',
  '0205': 'KUVEYT_TURK',
  '0206': 'TURKIYE_FINANS',
  '0209': 'ZIRAAT_KATILIM',
  '0210': 'VAKIF_KATILIM',
  '0211': 'EMLAK_KATILIM',
};

/**
 * IBAN'dan banka tespit et
 */
function detectBankaFromIBAN(iban: string): string | undefined {
  // TR + 2 check digit + 4 banka kodu + 16 hesap
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  if (cleaned.startsWith('TR') && cleaned.length >= 8) {
    const bankaKodu = cleaned.substring(4, 8);
    return BANKA_IBAN_MAP[bankaKodu];
  }
  
  return undefined;
}

/**
 * MT940 tarih formatını ISO'ya çevir (YYMMDD -> YYYY-MM-DD)
 */
function parseMT940Date(dateStr: string): string {
  if (!dateStr || dateStr.length < 6) return '';
  
  const yy = dateStr.substring(0, 2);
  const mm = dateStr.substring(2, 4);
  const dd = dateStr.substring(4, 6);
  
  // 2000+ varsayımı (00-99 -> 2000-2099)
  const year = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
  
  return `${year}-${mm}-${dd}`;
}

/**
 * MT940 tutarını parse et (virgül = ondalık ayırıcı)
 */
function parseMT940Amount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // MT940'ta virgül ondalık ayırıcı
  const cleaned = amountStr.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * :60F: veya :62F: bakiye satırını parse et
 */
function parseBalanceLine(line: string): MT940Balance | null {
  // Format: :60F:C230101TRY1234,56
  // veya:   :62F:D230131TRY5678,90
  
  const match = line.match(/:6[02][FM]:([CD])(\d{6})([A-Z]{3})([\d,]+)/);
  if (!match) return null;
  
  const [, creditDebit, dateStr, currency, amountStr] = match;
  
  return {
    tip: line.includes(':60') ? 'opening' : 'closing',
    creditDebit: creditDebit as 'C' | 'D',
    tarih: parseMT940Date(dateStr),
    paraBirimi: currency,
    tutar: parseMT940Amount(amountStr),
  };
}

/**
 * :61: işlem satırını parse et
 */
function parseTransactionLine(line: string, nextLine?: string): MT940Transaction | null {
  // Format: :61:2301150115DN1234,56NTRFREF123//BANK456
  // YYMMDD[MMDD]CD[DC]Amount[N]TypeRef[//Ref]
  
  // Basit regex - çoğu format için çalışır
  const match = line.match(/:61:(\d{6})(\d{4})?([CD])[RD]?([\d,]+)([A-Z])(\S+)/);
  if (!match) return null;
  
  const [, valueDateStr, entryDateStr, creditDebit, amountStr, transType, rest] = match;
  
  const tutar = parseMT940Amount(amountStr);
  
  // Referans ve açıklama ayır
  const refParts = rest.split('//');
  const referans = refParts[0] || undefined;
  
  // :86: satırından açıklama al
  let aciklama = '';
  if (nextLine && nextLine.startsWith(':86:')) {
    aciklama = nextLine.substring(4).trim();
  }
  
  return {
    tarih: parseMT940Date(valueDateStr),
    islemTarihi: entryDateStr ? parseMT940Date(valueDateStr.substring(0, 2) + entryDateStr) : undefined,
    creditDebit: creditDebit as 'C' | 'D',
    tutar,
    transactionType: transType,
    referans,
    aciklama,
    borc: creditDebit === 'D' ? tutar : 0,
    alacak: creditDebit === 'C' ? tutar : 0,
  };
}

/**
 * MT940 dosyasını parse et
 */
export function parseMT940(content: string, fileName: string): ParsedMT940 {
  const lines = content.split(/\r?\n/);
  
  let header: MT940Header = {
    transactionRef: '',
    accountId: '',
    statementNo: '',
  };
  
  let acilisBakiye: MT940Balance | null = null;
  let kapanisBakiye: MT940Balance | null = null;
  const islemler: MT940Transaction[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // :20: Transaction Reference
    if (line.startsWith(':20:')) {
      header.transactionRef = line.substring(4).trim();
    }
    
    // :25: Account Identification
    else if (line.startsWith(':25:')) {
      const accountId = line.substring(4).trim();
      header.accountId = accountId;
      header.banka = detectBankaFromIBAN(accountId);
    }
    
    // :28C: Statement Number
    else if (line.startsWith(':28C:') || line.startsWith(':28:')) {
      header.statementNo = line.substring(line.indexOf(':') + 1).replace(/^28C?:/, '').trim();
    }
    
    // :60F: veya :60M: Opening Balance
    else if (line.startsWith(':60F:') || line.startsWith(':60M:')) {
      acilisBakiye = parseBalanceLine(line);
    }
    
    // :62F: veya :62M: Closing Balance
    else if (line.startsWith(':62F:') || line.startsWith(':62M:')) {
      kapanisBakiye = parseBalanceLine(line);
    }
    
    // :61: Transaction
    else if (line.startsWith(':61:')) {
      const nextLine = lines[i + 1]?.trim();
      const transaction = parseTransactionLine(line, nextLine);
      if (transaction) {
        islemler.push(transaction);
        // :86: satırını atla
        if (nextLine?.startsWith(':86:')) {
          i++;
        }
      }
    }
  }
  
  // Varsayılan bakiyeler
  if (!acilisBakiye) {
    acilisBakiye = {
      tip: 'opening',
      creditDebit: 'C',
      tarih: '',
      paraBirimi: 'TRY',
      tutar: 0,
    };
  }
  
  if (!kapanisBakiye) {
    kapanisBakiye = {
      tip: 'closing',
      creditDebit: 'C',
      tarih: '',
      paraBirimi: 'TRY',
      tutar: 0,
    };
  }
  
  // Toplamları hesapla
  let toplamGiris = 0;
  let toplamCikis = 0;
  
  for (const islem of islemler) {
    toplamGiris += islem.alacak;
    toplamCikis += islem.borc;
  }
  
  return {
    header,
    acilisBakiye,
    kapanisBakiye,
    islemler,
    toplamlar: {
      toplamGiris,
      toplamCikis,
      islemSayisi: islemler.length,
      netDegisim: toplamGiris - toplamCikis,
    },
    parseInfo: {
      kaynak: fileName,
      parseTarihi: new Date().toISOString(),
      format: 'MT940',
    },
  };
}

/**
 * ArrayBuffer'dan parse et
 */
export function parseMT940FromBuffer(content: ArrayBuffer, fileName: string): ParsedMT940 {
  // Encoding denemeleri
  const encodings = ['utf-8', 'iso-8859-9', 'windows-1254', 'iso-8859-1'];
  
  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding);
      const text = decoder.decode(content);
      
      // MT940 marker kontrolü
      if (text.includes(':20:') || text.includes(':25:')) {
        return parseMT940(text, fileName);
      }
    } catch {
      continue;
    }
  }
  
  // Son çare
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return parseMT940(decoder.decode(content), fileName);
}

/**
 * Birden fazla MT940 dosyasını parse et
 */
export function parseMultipleMT940(
  files: { content: ArrayBuffer; fileName: string }[]
): { success: ParsedMT940[]; errors: { fileName: string; error: string }[] } {
  const success: ParsedMT940[] = [];
  const errors: { fileName: string; error: string }[] = [];
  
  for (const file of files) {
    try {
      const parsed = parseMT940FromBuffer(file.content, file.fileName);
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
 * MT940 verisini standart banka ekstresi formatına dönüştür
 */
export function mt940ToBankaEkstre(mt940: ParsedMT940): {
  banka: string;
  hesapNo: string;
  donem: string;
  hareketler: Array<{
    tarih: string;
    aciklama: string;
    borc: number;
    alacak: number;
    bakiye: number;
  }>;
  toplamlar: {
    giris: number;
    cikis: number;
    acilisBakiye: number;
    kapanisBakiye: number;
  };
} {
  // Hesap bakiyesi hesapla
  let bakiye = mt940.acilisBakiye.creditDebit === 'C' 
    ? mt940.acilisBakiye.tutar 
    : -mt940.acilisBakiye.tutar;
  
  const hareketler = mt940.islemler.map(islem => {
    if (islem.creditDebit === 'C') {
      bakiye += islem.tutar;
    } else {
      bakiye -= islem.tutar;
    }
    
    return {
      tarih: islem.tarih,
      aciklama: islem.aciklama,
      borc: islem.borc,
      alacak: islem.alacak,
      bakiye,
    };
  });
  
  // Dönem tespit (ilk ve son işlem tarihi)
  const tarihler = mt940.islemler.map(i => i.tarih).filter(Boolean).sort();
  const donem = tarihler.length > 0 
    ? `${tarihler[0].substring(0, 7)}` 
    : '';
  
  return {
    banka: mt940.header.banka || 'UNKNOWN',
    hesapNo: mt940.header.accountId,
    donem,
    hareketler,
    toplamlar: {
      giris: mt940.toplamlar.toplamGiris,
      cikis: mt940.toplamlar.toplamCikis,
      acilisBakiye: mt940.acilisBakiye.creditDebit === 'C' 
        ? mt940.acilisBakiye.tutar 
        : -mt940.acilisBakiye.tutar,
      kapanisBakiye: mt940.kapanisBakiye.creditDebit === 'C'
        ? mt940.kapanisBakiye.tutar
        : -mt940.kapanisBakiye.tutar,
    },
  };
}
