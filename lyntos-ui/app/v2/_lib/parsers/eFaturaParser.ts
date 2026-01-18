/**
 * LYNTOS e-Fatura / e-Arşiv Parser
 * ================================
 * UBL-TR 1.2 formatını parse eder
 * GİB standartlarına tam uyumlu
 * 
 * Desteklenen tipler:
 * - SATIS: Satış faturası
 * - IADE: İade faturası
 * - TEVKIFAT: Tevkifatlı fatura
 * - ISTISNA: İstisna faturası
 * - OZELMATRAH: Özel matrah faturası
 * - IHRAC: İhraç kayıtlı fatura
 */

export interface EFaturaHeader {
  faturaNo: string;
  faturaUUID: string;
  faturaTarihi: string;
  faturaTipi: 'SATIS' | 'IADE' | 'TEVKIFAT' | 'ISTISNA' | 'OZELMATRAH' | 'IHRAC';
  profilId: string;          // TICARIFATURA, TEMELFATURA, EARSIVFATURA
  paraBirimi: string;
}

export interface EFaturaParti {
  vkn: string;
  tckn?: string;
  unvan: string;
  vergiDairesi?: string;
  adres?: string;
  ilce?: string;
  il?: string;
  ulke?: string;
  telefon?: string;
  email?: string;
}

export interface EFaturaKalem {
  siraNo: number;
  urunKodu?: string;
  urunAdi: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  iskonto: number;
  kdvOrani: number;
  kdvTutari: number;
  kalemToplam: number;
}

export interface EFaturaVergi {
  vergiKodu: string;
  vergiAdi: string;
  matrah: number;
  oran: number;
  tutar: number;
}

export interface EFaturaToplam {
  kalemToplamTutar: number;
  toplamIskonto: number;
  vergiHaricToplam: number;
  kdvToplam: number;
  vergilerToplam: number;
  odenecekTutar: number;
}

export interface ParsedEFatura {
  tip: 'E_FATURA' | 'E_ARSIV';
  header: EFaturaHeader;
  satici: EFaturaParti;
  alici: EFaturaParti;
  kalemler: EFaturaKalem[];
  vergiler: EFaturaVergi[];
  toplamlar: EFaturaToplam;
  notlar?: string[];
  parseInfo: {
    kaynak: string;
    parseTarihi: string;
    xmlVersion?: string;
  };
}

// XML Namespace'leri
const NS = {
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
};

/**
 * XML'den text içeriği al
 */
function getTextContent(parent: Element | null, tagName: string, ns?: string): string {
  if (!parent) return '';
  
  // Namespace ile dene
  let el = ns ? parent.getElementsByTagNameNS(NS[ns as keyof typeof NS], tagName)[0] : null;
  
  // Namespace'siz dene
  if (!el) {
    el = parent.getElementsByTagName(tagName)[0];
  }
  
  // cbc: veya cac: prefix ile dene
  if (!el) {
    el = parent.getElementsByTagName(`cbc:${tagName}`)[0];
  }
  if (!el) {
    el = parent.getElementsByTagName(`cac:${tagName}`)[0];
  }
  
  return el?.textContent?.trim() || '';
}

/**
 * Sayıyı parse et
 */
function parseNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Fatura tipini tespit et
 */
function detectFaturaTipi(profileId: string, invoiceTypeCode: string): EFaturaHeader['faturaTipi'] {
  const code = invoiceTypeCode.toUpperCase();
  
  if (code.includes('IADE') || code === 'IADE') return 'IADE';
  if (code.includes('TEVKIFAT')) return 'TEVKIFAT';
  if (code.includes('ISTISNA')) return 'ISTISNA';
  if (code.includes('OZELMATRAH')) return 'OZELMATRAH';
  if (code.includes('IHRAC')) return 'IHRAC';
  
  return 'SATIS';
}

/**
 * Parti (satıcı/alıcı) bilgilerini parse et
 */
function parseParti(partyEl: Element | null): EFaturaParti {
  if (!partyEl) {
    return { vkn: '', unvan: '' };
  }
  
  // PartyIdentification içinden VKN/TCKN
  const idElements = partyEl.getElementsByTagName('cac:PartyIdentification');
  let vkn = '';
  let tckn = '';
  
  for (let i = 0; i < idElements.length; i++) {
    const idEl = idElements[i];
    const schemeID = idEl.getElementsByTagName('cbc:ID')[0]?.getAttribute('schemeID');
    const idValue = getTextContent(idEl, 'ID');
    
    if (schemeID === 'VKN' || schemeID === 'VKNUMBER') {
      vkn = idValue;
    } else if (schemeID === 'TCKN' || schemeID === 'TCNUMBER') {
      tckn = idValue;
    } else if (!vkn && idValue.length === 10) {
      vkn = idValue;
    } else if (!tckn && idValue.length === 11) {
      tckn = idValue;
    }
  }
  
  // PartyName
  const partyNameEl = partyEl.getElementsByTagName('cac:PartyName')[0];
  const unvan = getTextContent(partyNameEl, 'Name');
  
  // PartyTaxScheme
  const taxSchemeEl = partyEl.getElementsByTagName('cac:PartyTaxScheme')[0];
  const vergiDairesi = getTextContent(taxSchemeEl, 'Name');
  
  // PostalAddress
  const addressEl = partyEl.getElementsByTagName('cac:PostalAddress')[0];
  const adres = [
    getTextContent(addressEl, 'StreetName'),
    getTextContent(addressEl, 'BuildingNumber'),
    getTextContent(addressEl, 'Room'),
  ].filter(Boolean).join(' ');
  
  const ilce = getTextContent(addressEl, 'CitySubdivisionName');
  const il = getTextContent(addressEl, 'CityName');
  const ulke = getTextContent(addressEl, 'Country') || 
               getTextContent(addressEl.getElementsByTagName('cac:Country')[0], 'Name');
  
  // Contact
  const contactEl = partyEl.getElementsByTagName('cac:Contact')[0];
  const telefon = getTextContent(contactEl, 'Telephone');
  const email = getTextContent(contactEl, 'ElectronicMail');
  
  return {
    vkn: vkn || tckn || '',
    tckn: tckn || undefined,
    unvan,
    vergiDairesi: vergiDairesi || undefined,
    adres: adres || undefined,
    ilce: ilce || undefined,
    il: il || undefined,
    ulke: ulke || undefined,
    telefon: telefon || undefined,
    email: email || undefined,
  };
}

/**
 * Fatura kalemlerini parse et
 */
function parseKalemler(doc: Document): EFaturaKalem[] {
  const kalemler: EFaturaKalem[] = [];
  
  const lineElements = doc.getElementsByTagName('cac:InvoiceLine');
  
  for (let i = 0; i < lineElements.length; i++) {
    const lineEl = lineElements[i];
    
    const siraNo = parseInt(getTextContent(lineEl, 'ID')) || (i + 1);
    
    // Item bilgileri
    const itemEl = lineEl.getElementsByTagName('cac:Item')[0];
    const urunAdi = getTextContent(itemEl, 'Name');
    
    // SellersItemIdentification
    const sellersIdEl = itemEl?.getElementsByTagName('cac:SellersItemIdentification')[0];
    const urunKodu = getTextContent(sellersIdEl, 'ID');
    
    // Miktar
    const miktarEl = lineEl.getElementsByTagName('cbc:InvoicedQuantity')[0];
    const miktar = parseNumber(miktarEl?.textContent || '0');
    const birim = miktarEl?.getAttribute('unitCode') || 'C62'; // C62 = adet
    
    // Fiyat
    const priceEl = lineEl.getElementsByTagName('cac:Price')[0];
    const birimFiyat = parseNumber(getTextContent(priceEl, 'PriceAmount'));
    
    // İskonto
    const allowanceEl = lineEl.getElementsByTagName('cac:AllowanceCharge')[0];
    const iskonto = allowanceEl ? parseNumber(getTextContent(allowanceEl, 'Amount')) : 0;
    
    // KDV
    const taxTotalEl = lineEl.getElementsByTagName('cac:TaxTotal')[0];
    const taxSubtotalEl = taxTotalEl?.getElementsByTagName('cac:TaxSubtotal')[0];
    const kdvTutari = parseNumber(getTextContent(taxTotalEl, 'TaxAmount'));
    const kdvOrani = parseNumber(getTextContent(taxSubtotalEl, 'Percent'));
    
    // Kalem toplam
    const kalemToplam = parseNumber(getTextContent(lineEl, 'LineExtensionAmount'));
    
    kalemler.push({
      siraNo,
      urunKodu: urunKodu || undefined,
      urunAdi,
      miktar,
      birim,
      birimFiyat,
      iskonto,
      kdvOrani,
      kdvTutari,
      kalemToplam,
    });
  }
  
  return kalemler;
}

/**
 * Vergileri parse et
 */
function parseVergiler(doc: Document): EFaturaVergi[] {
  const vergiler: EFaturaVergi[] = [];
  
  // Ana TaxTotal elementi
  const taxTotalElements = doc.querySelectorAll(':scope > cac\\:TaxTotal, :scope > TaxTotal');
  
  // Alternatif: tüm TaxSubtotal'ları bul
  const taxSubtotals = doc.getElementsByTagName('cac:TaxSubtotal');
  
  const processedKeys = new Set<string>();
  
  for (let i = 0; i < taxSubtotals.length; i++) {
    const subtotal = taxSubtotals[i];
    
    // Parent InvoiceLine içinde mi kontrol et (kalem bazlı vergileri atla)
    let parent = subtotal.parentElement;
    let isLineLevel = false;
    while (parent) {
      if (parent.tagName.includes('InvoiceLine')) {
        isLineLevel = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (isLineLevel) continue;
    
    const matrah = parseNumber(getTextContent(subtotal, 'TaxableAmount'));
    const tutar = parseNumber(getTextContent(subtotal, 'TaxAmount'));
    const oran = parseNumber(getTextContent(subtotal, 'Percent'));
    
    const taxCategoryEl = subtotal.getElementsByTagName('cac:TaxCategory')[0];
    const taxSchemeEl = taxCategoryEl?.getElementsByTagName('cac:TaxScheme')[0];
    const vergiKodu = getTextContent(taxSchemeEl, 'TaxTypeCode') || 
                      getTextContent(taxSchemeEl, 'ID') || '0015'; // 0015 = KDV
    const vergiAdi = getTextContent(taxSchemeEl, 'Name') || 
                     (vergiKodu === '0015' ? 'KDV' : vergiKodu);
    
    // Duplicate kontrolü
    const key = `${vergiKodu}-${oran}`;
    if (processedKeys.has(key)) continue;
    processedKeys.add(key);
    
    vergiler.push({
      vergiKodu,
      vergiAdi,
      matrah,
      oran,
      tutar,
    });
  }
  
  return vergiler;
}

/**
 * Toplamları parse et
 */
function parseToplamlar(doc: Document): EFaturaToplam {
  const legalMonetaryEl = doc.getElementsByTagName('cac:LegalMonetaryTotal')[0];
  
  const kalemToplamTutar = parseNumber(getTextContent(legalMonetaryEl, 'LineExtensionAmount'));
  const toplamIskonto = parseNumber(getTextContent(legalMonetaryEl, 'AllowanceTotalAmount'));
  const vergiHaricToplam = parseNumber(getTextContent(legalMonetaryEl, 'TaxExclusiveAmount'));
  const vergilerToplam = parseNumber(getTextContent(legalMonetaryEl, 'TaxInclusiveAmount')) - vergiHaricToplam;
  const odenecekTutar = parseNumber(getTextContent(legalMonetaryEl, 'PayableAmount'));
  
  // TaxTotal'dan KDV toplamı
  const taxTotalEl = doc.querySelector(':scope > cac\\:TaxTotal, Invoice > TaxTotal, TaxTotal');
  const kdvToplam = taxTotalEl ? parseNumber(getTextContent(taxTotalEl as Element, 'TaxAmount')) : vergilerToplam;
  
  return {
    kalemToplamTutar,
    toplamIskonto,
    vergiHaricToplam,
    kdvToplam,
    vergilerToplam: vergilerToplam || kdvToplam,
    odenecekTutar,
  };
}

/**
 * Notları parse et
 */
function parseNotlar(doc: Document): string[] {
  const notlar: string[] = [];
  const noteElements = doc.getElementsByTagName('cbc:Note');
  
  for (let i = 0; i < noteElements.length; i++) {
    const note = noteElements[i].textContent?.trim();
    if (note) notlar.push(note);
  }
  
  return notlar;
}

/**
 * Ana parse fonksiyonu
 */
export function parseEFatura(xmlContent: string, fileName: string): ParsedEFatura {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');
  
  // Parse hatası kontrolü
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parse hatası: ${parseError.textContent}`);
  }
  
  // Root element (Invoice)
  const invoiceEl = doc.documentElement;
  
  // Header bilgileri
  const faturaNo = getTextContent(invoiceEl, 'ID');
  const faturaUUID = getTextContent(invoiceEl, 'UUID');
  const faturaTarihi = getTextContent(invoiceEl, 'IssueDate');
  const invoiceTypeCode = getTextContent(invoiceEl, 'InvoiceTypeCode');
  const profileId = getTextContent(invoiceEl, 'ProfileID');
  const paraBirimi = invoiceEl.getElementsByTagName('cbc:DocumentCurrencyCode')[0]?.textContent || 'TRY';
  
  const faturaTipi = detectFaturaTipi(profileId, invoiceTypeCode);
  
  // e-Fatura mı e-Arşiv mi?
  const tip: 'E_FATURA' | 'E_ARSIV' = 
    profileId.toUpperCase().includes('EARSIV') || 
    profileId.toUpperCase().includes('E-ARSIV') ? 'E_ARSIV' : 'E_FATURA';
  
  // Satıcı (AccountingSupplierParty)
  const supplierPartyEl = invoiceEl.getElementsByTagName('cac:AccountingSupplierParty')[0];
  const supplierEl = supplierPartyEl?.getElementsByTagName('cac:Party')[0];
  const satici = parseParti(supplierEl || null);
  
  // Alıcı (AccountingCustomerParty)
  const customerPartyEl = invoiceEl.getElementsByTagName('cac:AccountingCustomerParty')[0];
  const customerEl = customerPartyEl?.getElementsByTagName('cac:Party')[0];
  const alici = parseParti(customerEl || null);
  
  // Kalemler
  const kalemler = parseKalemler(doc);
  
  // Vergiler
  const vergiler = parseVergiler(doc);
  
  // Toplamlar
  const toplamlar = parseToplamlar(doc);
  
  // Notlar
  const notlar = parseNotlar(doc);
  
  return {
    tip,
    header: {
      faturaNo,
      faturaUUID,
      faturaTarihi,
      faturaTipi,
      profilId: profileId,
      paraBirimi,
    },
    satici,
    alici,
    kalemler,
    vergiler,
    toplamlar,
    notlar: notlar.length > 0 ? notlar : undefined,
    parseInfo: {
      kaynak: fileName,
      parseTarihi: new Date().toISOString(),
      xmlVersion: (doc as unknown as { xmlVersion?: string }).xmlVersion || undefined,
    },
  };
}

/**
 * ArrayBuffer'dan parse et
 */
export function parseEFaturaFromBuffer(content: ArrayBuffer, fileName: string): ParsedEFatura {
  const decoder = new TextDecoder('utf-8');
  const xmlContent = decoder.decode(content);
  return parseEFatura(xmlContent, fileName);
}

/**
 * Birden fazla e-faturayı toplu parse et
 */
export function parseMultipleEFatura(
  files: { content: ArrayBuffer; fileName: string }[]
): { success: ParsedEFatura[]; errors: { fileName: string; error: string }[] } {
  const success: ParsedEFatura[] = [];
  const errors: { fileName: string; error: string }[] = [];
  
  for (const file of files) {
    try {
      const parsed = parseEFaturaFromBuffer(file.content, file.fileName);
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
 * e-Fatura özet istatistikleri
 */
export function getEFaturaStats(faturalar: ParsedEFatura[]): {
  toplamFatura: number;
  satisFaturasi: number;
  iadeFaturasi: number;
  toplamTutar: number;
  toplamKDV: number;
  enYuksekFatura: { no: string; tutar: number } | null;
  vknBazli: Record<string, { adet: number; tutar: number }>;
} {
  const stats = {
    toplamFatura: faturalar.length,
    satisFaturasi: 0,
    iadeFaturasi: 0,
    toplamTutar: 0,
    toplamKDV: 0,
    enYuksekFatura: null as { no: string; tutar: number } | null,
    vknBazli: {} as Record<string, { adet: number; tutar: number }>,
  };
  
  for (const fatura of faturalar) {
    // Tip sayacı
    if (fatura.header.faturaTipi === 'SATIS') {
      stats.satisFaturasi++;
    } else if (fatura.header.faturaTipi === 'IADE') {
      stats.iadeFaturasi++;
    }
    
    // Toplamlar
    stats.toplamTutar += fatura.toplamlar.odenecekTutar;
    stats.toplamKDV += fatura.toplamlar.kdvToplam;
    
    // En yüksek fatura
    if (!stats.enYuksekFatura || fatura.toplamlar.odenecekTutar > stats.enYuksekFatura.tutar) {
      stats.enYuksekFatura = {
        no: fatura.header.faturaNo,
        tutar: fatura.toplamlar.odenecekTutar,
      };
    }
    
    // VKN bazlı
    const vkn = fatura.alici.vkn || fatura.alici.tckn || 'UNKNOWN';
    if (!stats.vknBazli[vkn]) {
      stats.vknBazli[vkn] = { adet: 0, tutar: 0 };
    }
    stats.vknBazli[vkn].adet++;
    stats.vknBazli[vkn].tutar += fatura.toplamlar.odenecekTutar;
  }
  
  return stats;
}
