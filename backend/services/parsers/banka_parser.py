"""
Banka (Bank Statement) Parser v2
=================================

İçerik bazlı banka tespiti, tarih aralığı çıkarma, transaction sayısı.
Gerçek transaction parse işlemi parse_service.parse_bank_statement() tarafından yapılır.

Author: Claude
Date: 2026-02-08
"""

import re
from datetime import datetime
from typing import Dict, Optional


class BankaParser:
    """Parse bank statement documents — metadata extraction."""

    BANK_PATTERNS = [
        ('YAPIKREDI', ['YAPI KREDİ', 'YAPI KREDI', 'YAPIKREDI', 'YKB']),
        ('ZIRAAT', ['ZİRAAT', 'ZIRAAT', 'T.C. ZİRAAT', 'TC ZIRAAT']),
        ('GARANTI', ['GARANTİ', 'GARANTI', 'GARANTİ BBVA']),
        ('AKBANK', ['AKBANK', 'AK BANK']),
        ('ISBANK', ['İŞ BANK', 'IS BANK', 'İŞBANK', 'ISBANK', 'TÜRKİYE İŞ BANKASI']),
        ('HALKBANK', ['HALK BANK', 'HALKBANK']),
        ('VAKIF', ['VAKIF', 'VAKIFBANK', 'VAKIF BANK']),
        ('DENIZ', ['DENİZ', 'DENIZ', 'DENİZBANK', 'DENIZBANK']),
        ('QNB', ['QNB', 'FİNANS', 'FINANS']),
        ('ING', ['ING BANK', 'ING ']),
        ('TEB', ['TEB ', 'TÜRK EKONOMİ']),
        ('HSBC', ['HSBC']),
        ('ALBARAKA', ['ALBARAKA']),
    ]

    def parse(self, content: bytes, filename: str) -> Dict:
        """
        Parse bank statement file — metadata only.
        Returns: {status, doc_date_min, doc_date_max, metadata, warnings}
        """

        warnings = []
        metadata = {
            'parser': 'BankaParser',
            'parser_version': '2.0',
            'bank_name': None,
            'hesap_kodu': None,
            'transactions': 0,
        }

        # Encoding algılama
        text = None
        for encoding in ['utf-8-sig', 'utf-8', 'windows-1254', 'latin-1', 'iso-8859-9']:
            try:
                text = content.decode(encoding)
                break
            except (UnicodeDecodeError, UnicodeError):
                continue

        if not text:
            return {
                'status': 'ERROR',
                'error': 'Dosya decode edilemedi',
                'warnings': []
            }

        text_lower = text.lower()
        text_upper = text.upper()

        # Dosya adından hesap kodu çıkar
        match = re.search(r'(102\.\d{2})', filename)
        if match:
            metadata['hesap_kodu'] = match.group(1)

        # Banka ismi tespiti: önce dosya adından, sonra içerikten
        bank_name = self._detect_bank_from_filename(filename)
        if not bank_name:
            bank_name = self._detect_bank_from_content(text_upper)
        metadata['bank_name'] = bank_name

        # Tarih çıkarma
        date_patterns = [
            (r'(\d{2})[./](\d{2})[./](\d{4})', '%d.%m.%Y'),  # DD.MM.YYYY
            (r'(\d{4})-(\d{2})-(\d{2})', '%Y-%m-%d'),          # YYYY-MM-DD
        ]

        parsed_dates = []
        for pattern, _ in date_patterns:
            for match in re.finditer(pattern, text):
                groups = match.groups()
                try:
                    if len(groups[0]) == 4:  # YYYY-MM-DD
                        d = datetime(int(groups[0]), int(groups[1]), int(groups[2])).date()
                    else:  # DD.MM.YYYY
                        d = datetime(int(groups[2]), int(groups[1]), int(groups[0])).date()
                    if 2020 <= d.year <= 2030:
                        parsed_dates.append(d)
                except (ValueError, IndexError):
                    continue

        doc_date_min = None
        doc_date_max = None
        if parsed_dates:
            doc_date_min = min(parsed_dates).isoformat()
            doc_date_max = max(parsed_dates).isoformat()

        # Transaction sayma (tutar pattern'i olan satırlar)
        lines = text.split('\n')
        tx_count = 0
        for line in lines:
            # Tarih ile başlayan satırları say (gerçek transaction)
            if re.match(r'\s*\d{2}[./]\d{2}[./]\d{4}', line.strip()):
                tx_count += 1
            elif re.match(r'\s*\d{4}-\d{2}-\d{2}', line.strip()):
                tx_count += 1

        metadata['transactions'] = tx_count
        metadata['line_count'] = len(lines)
        metadata['date_count'] = len(parsed_dates)

        if not doc_date_min:
            warnings.append('Ekstre tarihi tespit edilemedi')

        if not metadata['bank_name']:
            warnings.append('Banka adı tespit edilemedi')

        return {
            'status': 'OK' if not warnings else 'WARN',
            'parser_name': 'BankaParser',
            'parser_version': '2.0',
            'doc_date_min': doc_date_min,
            'doc_date_max': doc_date_max,
            'metadata': metadata,
            'warnings': warnings
        }

    def _detect_bank_from_filename(self, filename: str) -> Optional[str]:
        """Dosya adından banka tespiti."""
        fn_upper = filename.upper()
        for bank_name, keywords in self.BANK_PATTERNS:
            for kw in keywords:
                if kw in fn_upper:
                    return bank_name
        return None

    def _detect_bank_from_content(self, text_upper: str) -> Optional[str]:
        """İçerik bazlı banka tespiti (ilk 2000 karakter)."""
        preview = text_upper[:2000]
        for bank_name, keywords in self.BANK_PATTERNS:
            for kw in keywords:
                if kw in preview:
                    return bank_name
        return None
