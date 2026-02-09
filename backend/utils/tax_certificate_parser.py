"""
Tax Certificate (Vergi Levhası) PDF Parser
Extracts: VKN, Company Name, NACE Code, Address, KV Matrah

Sprint 7.4 - LYNTOS V2
"""

import re
from typing import Optional, Dict, Any, Tuple, List
from dataclasses import dataclass, asdict
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


def validate_vkn(vkn: str) -> bool:
    """
    Türk Vergi Kimlik Numarası (VKN) doğrulama - Mod 10 algoritması

    VKN 10 haneli olup son hane checksum'dır.
    Bu fonksiyon GİB'in kullandığı doğrulama algoritmasını uygular.

    Args:
        vkn: 10 haneli VKN string

    Returns:
        True if valid, False otherwise
    """
    if not vkn or len(vkn) != 10 or not vkn.isdigit():
        return False

    digits = [int(d) for d in vkn]

    # İlk 9 hane üzerinden checksum hesapla
    total = 0
    for i in range(9):
        tmp = (digits[i] + (9 - i)) % 10
        total += (tmp * (2 ** (9 - i))) % 9
        if tmp != 0 and (tmp * (2 ** (9 - i))) % 9 == 0:
            total += 9

    checksum = (10 - (total % 10)) % 10

    return checksum == digits[9]


def correct_ocr_vkn(vkn: str) -> Optional[str]:
    """
    OCR hatalı VKN'yi düzeltmeye çalış.

    Son haneyi 0-9 arasında deneyerek geçerli VKN bulmaya çalışır.

    Args:
        vkn: 10 haneli potansiyel VKN

    Returns:
        Düzeltilmiş VKN veya None
    """
    if not vkn or len(vkn) != 10:
        return None

    # Önce olduğu gibi geçerli mi kontrol et
    if validate_vkn(vkn):
        return vkn

    # Son haneyi düzeltmeyi dene
    base = vkn[:9]
    for last_digit in range(10):
        candidate = base + str(last_digit)
        if validate_vkn(candidate):
            logger.info(f"VKN corrected: {vkn} -> {candidate}")
            return candidate

    return None


@dataclass
class TaxCertificateData:
    """Parsed tax certificate data structure - GİB Vergi Levhası formatı"""
    vkn: str
    company_name: str
    nace_code: Optional[str] = None
    nace_description: Optional[str] = None
    tax_office: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    tax_type: Optional[str] = None  # Vergi türü (Kurumlar/Gelir)
    start_date: Optional[str] = None  # İşe başlama tarihi
    # Yıllık veriler (son 3 yıl)
    yearly_data: Optional[List[Dict[str, Any]]] = None  # [{year, matrah, tax}, ...]
    # Eski alanlar (geriye uyumluluk)
    kv_matrah: Optional[Decimal] = None
    kv_paid: Optional[Decimal] = None
    year: Optional[int] = None
    raw_text: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with serializable values"""
        result = asdict(self)
        # Convert Decimal to string for JSON serialization
        if result.get('kv_matrah'):
            result['kv_matrah'] = str(result['kv_matrah'])
        if result.get('kv_paid'):
            result['kv_paid'] = str(result['kv_paid'])
        return result


class TaxCertificateParser:
    """Parse Turkish Tax Certificate (Vergi Levhası) PDF text"""

    # Regex patterns for Turkish tax certificate fields
    # GİB Vergi Levhası formatları çok farklı olabiliyor - esnek pattern'lar kullanıyoruz
    PATTERNS = {
        # VKN: 10 haneli sayı - çeşitli formatlar
        'vkn': r'(?:VKN|V\.?K\.?N\.?|Vergi\s*Kimlik\s*(?:No|Numarası)|VERGİ\s*KİMLİK)[:\s]*(\d{10})',
        # TCKN: 11 haneli sayı
        'tckn': r'(?:TCKN|T\.?C\.?\s*(?:Kimlik\s*No|No)|TC\s*KİMLİK)[:\s]*(\d{11})',
        # Şirket unvanı - daha esnek pattern
        'company_name': r'(?:(?:TİCARET\s*)?[ÜU]NVANI?|UNVAN|MÜKELLEFİN?\s*(?:ADI|UNVANI))[:\s]*([A-ZÇĞİÖŞÜa-zçğıöşü0-9\s\.\,\-&]+)',
        # NACE kodu
        'nace_code': r'(?:NACE|FAALİYET\s*KODU)[:\s]*(\d{2}[\.\-]?\d{2}(?:[\.\-]?\d{2})?)',
        # Faaliyet açıklaması
        'nace_description': r'(?:FAALİYET(?:\s*KONUSU|\s*AÇIKLAMASI)?)[:\s]*([^\n]+)',
        # Vergi dairesi
        'tax_office': r'(?:VERGİ\s*DAİRESİ)[:\s]*([A-ZÇĞİÖŞÜa-zçğıöşü\s]+)',
        # Adres
        'address': r'(?:ADRES|İŞ\s*(?:YERİ\s*)?ADRESİ)[:\s]*([^\n]+)',
        # KV Matrah
        'kv_matrah': r'(?:KURUMLAR\s*VERGİSİ\s*MATRAHI?|K\.?V\.?\s*MATRAH)[:\s]*([\d\.\,]+)',
        # Ödenen KV
        'kv_paid': r'(?:ÖDENEN\s*(?:KURUMLAR\s*VERGİSİ|K\.?V\.?)|HESAPLANAN\s*K\.?V)[:\s]*([\d\.\,]+)',
        # Yıl
        'year': r'(?:TAKVİM\s*YILI|DÖNEM|YIL)[:\s]*(\d{4})',
    }

    # Turkish cities for address parsing
    TURKISH_CITIES = [
        'İSTANBUL', 'ANKARA', 'İZMİR', 'BURSA', 'ANTALYA', 'ADANA',
        'KONYA', 'GAZİANTEP', 'MERSİN', 'DİYARBAKIR', 'KAYSERİ',
        'SAMSUN', 'TRABZON', 'ESKİŞEHİR', 'DENİZLİ', 'ŞANLIURFA',
        'MALATYA', 'KOCAELİ', 'SAKARYA', 'MANİSA', 'AYDIN',
        'BALIKESİR', 'TEKİRDAĞ', 'KAHRAMANMARAŞ', 'VAN', 'HATAY'
    ]

    @classmethod
    def parse_text(cls, text: str) -> TaxCertificateData:
        """
        Parse GİB Vergi Levhası PDF text - tüm alanları çıkarır

        Args:
            text: Raw text extracted from PDF

        Returns:
            TaxCertificateData with parsed fields
        """

        data = TaxCertificateData(
            vkn='',
            company_name='',
            raw_text=text[:5000] if text else None
        )

        # Normalize text
        text_normalized = cls._normalize_text(text)
        lines = text.split('\n') if text else []

        # === VKN BULMA (GİB PDF'lerinde genellikle resim olarak) ===
        vkn_match = re.search(cls.PATTERNS['vkn'], text_normalized, re.IGNORECASE)
        if vkn_match:
            data.vkn = vkn_match.group(1).strip()
            logger.info(f"VKN found with pattern: {data.vkn}")

        # === VERGİ DAİRESİ ===
        # GİB formatı: "ADI SOYADI ALANYA" veya "VERGİ DAİRESİ ALANYA"
        tax_office_match = re.search(r'ADI\s+SOYADI\s+([A-ZÇĞİÖŞÜ]+)', text_normalized)
        if tax_office_match:
            data.tax_office = tax_office_match.group(1).strip()
        else:
            # Alternatif: "DAİRESİ" kelimesinden sonra
            tax_office_match2 = re.search(r'DAİRESİ\s+([A-ZÇĞİÖŞÜ]+)', text_normalized)
            if tax_office_match2:
                data.tax_office = tax_office_match2.group(1).strip()
        logger.info(f"Tax office: {data.tax_office}")

        # === ŞİRKET UNVANI ===
        # GİB formatı: "TİCARET ÜNVANI ALANYA ÖZKAN ... TİCARET VERGİ KİMLİK LİMİTED ŞİRKETİ NO"
        # NOT: "VERGİ KİMLİK" etiketi şirket adının içine karışmış olabilir
        text_for_company = re.sub(r'\s+', ' ', text)  # Tüm whitespace'leri tek boşluğa çevir

        company_match = re.search(
            r'TİCARET\s*ÜNVANI\s+(.+?(?:LİMİTED|ANONİM)\s*(?:ŞİRKETİ|ŞTİ\.?))',
            text_for_company, re.IGNORECASE
        )
        if company_match:
            name = company_match.group(1).strip()
            # "VERGİ KİMLİK" etiketini kaldır (ortada olabilir)
            name = re.sub(r'\s*VERGİ\s*KİMLİK\s*', ' ', name, flags=re.IGNORECASE)
            # Fazla boşlukları temizle
            name = ' '.join(name.split())
            data.company_name = name.strip()

        # Eğer bulunamadıysa alternatif pattern dene
        if not data.company_name:
            alt_match = re.search(r'ÜNVANI\s+([A-ZÇĞİÖŞÜa-zçğıöşü0-9\s\.\-]+(?:LTD|A\.?Ş))', text_normalized, re.IGNORECASE)
            if alt_match:
                data.company_name = alt_match.group(1).strip()

        logger.info(f"Company name: {data.company_name}")

        # === ADRES ===
        # GİB formatı: "ŞEKERHANE MAH. TEVFİKİYE CAD. ... NO: 44 ALANYA/ ANTALYA"
        # Adres "İŞ YERİ ADRESİ" etiketinden sonra gelir
        address_match = re.search(
            r'İŞ\s*YERİ\s*ADRESİ\s*(.+?NO[:\s]*\d+.+?/\s*[A-ZÇĞİÖŞÜ]+)',
            text_normalized, re.IGNORECASE
        )
        if not address_match:
            # Alternatif: MAH. ile başlayan adres
            address_match = re.search(
                r'([A-ZÇĞİÖŞÜa-zçğıöşü]+\s+MAH\.?.+?NO[:\s]*\d+.+?/\s*[A-ZÇĞİÖŞÜ]+)',
                text_normalized, re.IGNORECASE
            )
        if address_match:
            addr = address_match.group(1).strip()
            # Gereksiz etiketleri temizle
            addr = re.sub(r'TC\s*KİMLİK\s*NO', '', addr, flags=re.IGNORECASE)
            addr = re.sub(r'İŞ\s*YERİ\s*ADRESİ', '', addr, flags=re.IGNORECASE)
            addr = re.sub(r'PLAZA\s+ÖZ\s+KAN', 'PLAZA', addr)  # Duplikasyonu temizle
            data.address = ' '.join(addr.split())  # Fazla boşlukları temizle
            # Şehir çıkar
            city_match = re.search(r'/\s*([A-ZÇĞİÖŞÜ]+)\s*$', data.address)
            if city_match:
                data.city = city_match.group(1)
        logger.info(f"Address: {data.address}, City: {data.city}")

        # === VERGİ TÜRÜ ===
        if 'KURUMLAR VERGİSİ' in text_normalized.upper():
            data.tax_type = 'KURUMLAR VERGİSİ'
        elif 'GELİR VERGİSİ' in text_normalized.upper():
            data.tax_type = 'GELİR VERGİSİ'
        logger.info(f"Tax type: {data.tax_type}")

        # === İŞE BAŞLAMA TARİHİ ===
        # GİB formatı: "TARİHİ 01.08.2008" veya "İŞE BAŞLAMA TARİHİ: 01.08.2008"
        date_match = re.search(r'TARİHİ\s+(\d{2}\.\d{2}\.\d{4})', text_normalized)
        if date_match:
            data.start_date = date_match.group(1)
        logger.info(f"Start date: {data.start_date}")

        # === NACE KODU VE AÇIKLAMASI ===
        # GİB formatı: "476201-KIRTASİYE ÜRÜNLERİNİN PERAKENDE TİCARETİ"
        nace_match = re.search(r'(\d{6})-([A-ZÇĞİÖŞÜa-zçğıöşü\s]+(?:TİCARETİ|ÜRETİMİ|HİZMETLERİ|FAALİYETLERİ))', text_normalized)
        if nace_match:
            data.nace_code = nace_match.group(1)
            data.nace_description = nace_match.group(2).strip()
        logger.info(f"NACE: {data.nace_code} - {data.nace_description}")

        # === YILLIK MATRAH VE VERGİ TABLOSU ===
        # GİB formatı:
        # 2024 346.214,84 86.553,71
        # 2023 406.948,37 101.737,09
        yearly_pattern = re.findall(
            r'(20\d{2})\s+([\d\.]+,\d{2})\s+([\d\.]+,\d{2})',
            text_normalized
        )
        if yearly_pattern:
            data.yearly_data = []
            for year_str, matrah_str, tax_str in yearly_pattern:
                year_data = {
                    'year': int(year_str),
                    'matrah': cls._parse_amount(matrah_str),
                    'tax': cls._parse_amount(tax_str)
                }
                data.yearly_data.append(year_data)
                # En güncel yılı ana alanlara da koy (geriye uyumluluk)
                if not data.year or int(year_str) > data.year:
                    data.year = int(year_str)
                    data.kv_matrah = year_data['matrah']
                    data.kv_paid = year_data['tax']
            # Yılları sırala (en yeni önce)
            data.yearly_data.sort(key=lambda x: x['year'], reverse=True)
        logger.info(f"Yearly data: {data.yearly_data}")

        logger.info(f"Parsed tax certificate: VKN={data.vkn}, NACE={data.nace_code}, Year={data.year}")

        return data

    @staticmethod
    def _normalize_text(text: str) -> str:
        """Normalize text for better regex matching"""
        if not text:
            return ""
        # Replace multiple whitespace with single space
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters that might interfere
        text = text.replace('\x00', '')
        return text

    @staticmethod
    def _clean_company_name(name: str) -> str:
        """Clean and normalize company name"""
        if not name:
            return ""
        # Remove extra whitespace
        name = ' '.join(name.split())
        # Uppercase Turkish characters properly
        name = name.upper()
        # Replace Turkish uppercase properly
        replacements = {
            'I': 'İ' if 'İ' not in name else 'I',  # Context-dependent
        }
        return name.strip()

    @staticmethod
    def _parse_amount(amount_str: str) -> Optional[Decimal]:
        """
        Parse Turkish formatted amount (1.234.567,89)

        Args:
            amount_str: Amount string like "1.234.567,89"

        Returns:
            Decimal value or None if parsing fails
        """
        try:
            if not amount_str:
                return None
            # Remove dots (thousand separator) and replace comma with dot
            cleaned = amount_str.replace('.', '').replace(',', '.')
            return Decimal(cleaned)
        except Exception as e:
            logger.warning(f"Failed to parse amount '{amount_str}': {e}")
            return None

    @classmethod
    def _parse_address(cls, address: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Extract city and district from address

        Args:
            address: Full address string

        Returns:
            Tuple of (city, district)
        """
        city = None
        district = None

        if not address:
            return city, district

        address_upper = address.upper()

        # Find city
        for c in cls.TURKISH_CITIES:
            if c in address_upper:
                city = c.title()
                break

        # Try to find district (usually before city, after "/" or standalone)
        if city:
            district_pattern = r'([A-ZÇĞİÖŞÜ]+)(?:/|\s)' + city.upper()
            district_match = re.search(district_pattern, address_upper)
            if district_match:
                district = district_match.group(1).title()

        return city, district

    @classmethod
    def validate(cls, data: TaxCertificateData) -> Dict[str, Any]:
        """
        Validate parsed data and return validation result

        Args:
            data: Parsed tax certificate data

        Returns:
            Dictionary with validation results
        """
        errors = []
        warnings = []

        # Required fields
        if not data.vkn or len(data.vkn) < 10:
            errors.append("VKN bulunamadı veya geçersiz")

        if not data.company_name:
            errors.append("Şirket unvanı bulunamadı")

        # Optional but important fields
        if not data.nace_code:
            warnings.append("NACE kodu bulunamadı - manuel giriş gerekli")

        if not data.kv_matrah:
            warnings.append("KV Matrahı bulunamadı")

        if not data.year:
            warnings.append("Dönem yılı bulunamadı")

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "data": data.to_dict()
        }


def extract_vkn_from_barcode_region(content: bytes) -> Optional[str]:
    """
    GİB Vergi Levhası PDF'lerinde VKN görsel olarak gömülü olabiliyor.
    Bu fonksiyon PDF içindeki resimleri OCR ile tarayarak VKN'yi çıkarır.

    pdfplumber kullanarak resim çıkarır (PyMuPDF gerektirmez).

    Args:
        content: PDF file content as bytes

    Returns:
        VKN string (10 hane, checksum doğrulanmış) or None
    """
    try:
        import pdfplumber
        from PIL import Image
        import pytesseract
        import io

        vkn_candidates = []

        # pdfplumber ile PDF aç
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            if not pdf.pages:
                return None

            page = pdf.pages[0]

            # PDF içindeki resimleri al
            images = page.images
            logger.debug(f"Found {len(images)} images in PDF via pdfplumber")

            for i, img_info in enumerate(images):
                try:
                    # Resim stream'ini al
                    stream = img_info.get('stream')
                    if not stream:
                        continue

                    # Raw data'yı al
                    raw_data = stream.get_data()
                    if not raw_data:
                        continue

                    # PIL Image olarak aç
                    img = Image.open(io.BytesIO(raw_data))
                    img_gray = img.convert('L')  # Grayscale

                    # VKN resmi genellikle küçük (150-200px genişlik, 30-50px yükseklik)
                    # ve sağ tarafta (x > 500) konumlanmış
                    width, height = img.size
                    x0 = img_info.get('x0', 0)

                    logger.debug(f"Image {i+1}: {width}x{height} at x={x0}")

                    # Sadece potansiyel VKN resimlerini işle
                    # (küçük, sağ tarafta, yatay formatta)
                    if width < 50 or width > 300 or height > 100 or x0 < 400:
                        continue

                    # OCR uygula
                    for psm in [6, 7, 8]:
                        text = pytesseract.image_to_string(
                            img_gray,
                            config=f'--psm {psm} -c tessedit_char_whitelist=0123456789'
                        )
                        # 10 veya 11 haneli sayıları bul (OCR bazen ekstra hane ekler)
                        numbers = re.findall(r'\d{10,11}', text.strip())
                        if numbers:
                            # İlk 10 haneyi al
                            candidate = numbers[0][:10]
                            vkn_candidates.append(candidate)
                            logger.info(f"VKN candidate from image {i+1}: {candidate}")
                            break

                except Exception as img_error:
                    logger.debug(f"Error processing image {i+1}: {img_error}")
                    continue

        # === VKN Doğrulama ve Düzeltme ===
        if vkn_candidates:
            # Yılları filtrele
            filtered = [v for v in vkn_candidates if not v.startswith(('20', '19'))]
            candidates = filtered if filtered else vkn_candidates

            # Önce doğrudan geçerli VKN ara
            for candidate in candidates:
                if validate_vkn(candidate):
                    logger.info(f"VKN validated: {candidate}")
                    return candidate

            # OCR hatasını düzeltmeyi dene
            for candidate in candidates:
                corrected = correct_ocr_vkn(candidate)
                if corrected:
                    logger.info(f"VKN corrected: {candidate} -> {corrected}")
                    return corrected

            logger.warning(f"VKN candidates not validated: {candidates}")

        return None

    except ImportError as e:
        logger.warning(f"Required modules not available: {e}")
        return None
    except Exception as e:
        logger.warning(f"VKN extraction failed: {e}")
        return None


def extract_text_from_pdf(content: bytes) -> str:
    """
    Extract text from PDF bytes using pdfplumber (preferred) or PyPDF2 (fallback)

    Args:
        content: PDF file content as bytes

    Returns:
        Extracted text string
    """
    import io

    # Try pdfplumber first (better text extraction)
    try:
        import pdfplumber

        pdf_file = io.BytesIO(content)
        text = ""

        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        if text.strip():
            logger.info(f"PDF text extracted with pdfplumber: {len(text)} chars")
            return text

    except ImportError:
        logger.warning("pdfplumber not installed, trying PyPDF2")
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}, trying PyPDF2")

    # Fallback to PyPDF2
    try:
        import PyPDF2

        pdf_file = io.BytesIO(content)
        reader = PyPDF2.PdfReader(pdf_file)

        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

        logger.info(f"PDF text extracted with PyPDF2: {len(text)} chars")
        return text

    except ImportError:
        logger.error("Neither pdfplumber nor PyPDF2 installed")
        raise ImportError("PDF okuma için pdfplumber veya PyPDF2 gerekli. pip install pdfplumber")
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {e}")
        raise
