"""
Tax Certificate (Vergi Levhası) PDF Parser
Extracts: VKN, Company Name, NACE Code, Address, KV Matrah

Sprint 7.4 - LYNTOS V2
"""

import re
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, asdict
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


@dataclass
class TaxCertificateData:
    """Parsed tax certificate data structure"""
    vkn: str
    company_name: str
    nace_code: Optional[str] = None
    nace_description: Optional[str] = None
    tax_office: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
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
    PATTERNS = {
        'vkn': r'(?:VKN|Vergi\s*Kimlik\s*No|V\.K\.N)[:\s]*(\d{10,11})',
        'tckn': r'(?:TCKN|T\.C\.\s*Kimlik\s*No)[:\s]*(\d{11})',
        'company_name': r'(?:Unvan|Ticaret\s*Unvan[ıi]|Mükellef)[:\s]*([A-ZÇĞİÖŞÜa-zçğıöşü0-9\s\.\,\-]+(?:LTD|A\.?Ş|ŞTİ|TİC)[A-ZÇĞİÖŞÜa-zçğıöşü\s\.]*)',
        'nace_code': r'(?:NACE|Faaliyet\s*Kodu)[:\s]*(\d{2}\.\d{2})',
        'nace_description': r'(?:Faaliyet\s*(?:Konusu|Aç[ıi]klamas[ıi]))[:\s]*([^\n]+)',
        'tax_office': r'(?:Vergi\s*Dairesi)[:\s]*([A-ZÇĞİÖŞÜa-zçğıöşü\s]+)',
        'address': r'(?:Adres|İş\s*Adresi)[:\s]*([^\n]+)',
        'kv_matrah': r'(?:Kurumlar\s*Vergisi\s*Matrah[ıi]|K\.?V\.?\s*Matrah)[:\s]*([\d\.,]+)',
        'kv_paid': r'(?:Ödenen\s*Kurumlar\s*Vergisi|Hesaplanan\s*K\.?V)[:\s]*([\d\.,]+)',
        'year': r'(?:Takvim\s*Y[ıi]l[ıi]|Dönem|Y[ıi]l)[:\s]*(\d{4})',
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
        Parse extracted text from PDF

        Args:
            text: Raw text extracted from PDF

        Returns:
            TaxCertificateData with parsed fields
        """

        data = TaxCertificateData(
            vkn='',
            company_name='',
            raw_text=text[:5000] if text else None  # Limit raw text size
        )

        # Normalize text
        text_normalized = cls._normalize_text(text)

        # Extract VKN (try both VKN and TCKN patterns)
        vkn_match = re.search(cls.PATTERNS['vkn'], text_normalized, re.IGNORECASE)
        if vkn_match:
            data.vkn = vkn_match.group(1).strip()
        else:
            # Try TCKN pattern
            tckn_match = re.search(cls.PATTERNS['tckn'], text_normalized, re.IGNORECASE)
            if tckn_match:
                data.vkn = tckn_match.group(1).strip()

        # Extract company name
        name_match = re.search(cls.PATTERNS['company_name'], text_normalized, re.IGNORECASE)
        if name_match:
            data.company_name = cls._clean_company_name(name_match.group(1))

        # Extract NACE code
        nace_match = re.search(cls.PATTERNS['nace_code'], text_normalized, re.IGNORECASE)
        if nace_match:
            data.nace_code = nace_match.group(1).strip()

        # Extract NACE description
        nace_desc_match = re.search(cls.PATTERNS['nace_description'], text_normalized, re.IGNORECASE)
        if nace_desc_match:
            data.nace_description = nace_desc_match.group(1).strip()[:200]  # Limit length

        # Extract tax office
        office_match = re.search(cls.PATTERNS['tax_office'], text_normalized, re.IGNORECASE)
        if office_match:
            data.tax_office = office_match.group(1).strip()

        # Extract address
        address_match = re.search(cls.PATTERNS['address'], text_normalized, re.IGNORECASE)
        if address_match:
            data.address = address_match.group(1).strip()[:300]  # Limit length
            # Try to extract city/district from address
            data.city, data.district = cls._parse_address(data.address)

        # Extract KV Matrah
        matrah_match = re.search(cls.PATTERNS['kv_matrah'], text_normalized, re.IGNORECASE)
        if matrah_match:
            data.kv_matrah = cls._parse_amount(matrah_match.group(1))

        # Extract KV Paid
        paid_match = re.search(cls.PATTERNS['kv_paid'], text_normalized, re.IGNORECASE)
        if paid_match:
            data.kv_paid = cls._parse_amount(paid_match.group(1))

        # Extract year
        year_match = re.search(cls.PATTERNS['year'], text_normalized, re.IGNORECASE)
        if year_match:
            try:
                data.year = int(year_match.group(1))
            except ValueError:
                pass

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


def extract_text_from_pdf(content: bytes) -> str:
    """
    Extract text from PDF bytes using PyPDF2

    Args:
        content: PDF file content as bytes

    Returns:
        Extracted text string
    """
    try:
        import io
        import PyPDF2

        pdf_file = io.BytesIO(content)
        reader = PyPDF2.PdfReader(pdf_file)

        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

        return text
    except ImportError:
        logger.error("PyPDF2 not installed. Install with: pip install PyPDF2")
        raise
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {e}")
        raise
