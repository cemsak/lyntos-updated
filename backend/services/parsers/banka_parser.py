"""
Banka (Bank Statement) Parser
Extracts: transaction dates, totals, bank info
"""

import re
from datetime import datetime
from typing import Dict


class BankaParser:
    """Parse bank statement documents"""

    BANK_KEYWORDS = [
        'garanti', 'işbank', 'isbank', 'akbank', 'yapıkredi', 'ziraat',
        'halkbank', 'vakıfbank', 'qnb', 'denizbank', 'teb', 'ing'
    ]

    def parse(self, content: bytes, filename: str) -> Dict:
        """
        Parse bank statement file
        Returns: {status, doc_date_min, doc_date_max, metadata, warnings}
        """

        warnings = []
        metadata = {
            'parser': 'BankaParser',
            'parser_version': '1.0',
            'bank_name': None,
            'transactions': 0
        }

        try:
            text = content.decode('utf-8', errors='ignore').lower()
        except Exception:
            return {
                'status': 'ERROR',
                'error': 'Dosya decode edilemedi',
                'warnings': []
            }

        # Detect bank name
        for bank in self.BANK_KEYWORDS:
            if bank in text:
                metadata['bank_name'] = bank.upper()
                break

        # Extract dates
        date_pattern = r'(\d{1,2}[./]\d{1,2}[./]\d{2,4})'
        dates_found = re.findall(date_pattern, text)

        doc_date_min = None
        doc_date_max = None

        if dates_found:
            parsed_dates = []
            for d in dates_found:
                for fmt in ['%d.%m.%Y', '%d/%m/%Y', '%d.%m.%y', '%d/%m/%y']:
                    try:
                        parsed = datetime.strptime(d, fmt).date()
                        parsed_dates.append(parsed)
                        break
                    except Exception:
                        continue

            if parsed_dates:
                doc_date_min = min(parsed_dates).isoformat()
                doc_date_max = max(parsed_dates).isoformat()

        # Count transaction-like lines
        lines = text.split('\n')
        tx_count = 0
        for line in lines:
            if re.search(r'\d+[.,]\d{2}', line):  # Looks like amount
                tx_count += 1

        metadata['transactions'] = tx_count
        metadata['line_count'] = len(lines)

        if not doc_date_min:
            warnings.append('Ekstre tarihi tespit edilemedi')

        if not metadata['bank_name']:
            warnings.append('Banka adı tespit edilemedi')

        return {
            'status': 'OK' if not warnings else 'WARN',
            'parser_name': 'BankaParser',
            'parser_version': '1.0',
            'doc_date_min': doc_date_min,
            'doc_date_max': doc_date_max,
            'metadata': metadata,
            'warnings': warnings
        }
