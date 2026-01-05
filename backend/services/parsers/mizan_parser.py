"""
Mizan (Trial Balance) Parser
Extracts: period dates, account totals, balance summaries
"""

import re
from datetime import datetime
from typing import Dict


class MizanParser:
    """Parse mizan (trial balance) documents"""

    def parse(self, content: bytes, filename: str) -> Dict:
        """
        Parse mizan file (CSV/Excel/Text)
        Returns: {status, doc_date_min, doc_date_max, metadata, warnings}
        """

        warnings = []
        metadata = {
            'parser': 'MizanParser',
            'parser_version': '1.0',
            'accounts': [],
            'totals': {}
        }

        try:
            text = content.decode('utf-8', errors='ignore')
        except Exception:
            return {
                'status': 'ERROR',
                'error': 'Dosya decode edilemedi',
                'warnings': []
            }

        # Try to parse as CSV
        lines = text.strip().split('\n')

        # Look for date patterns
        date_pattern = r'(\d{1,2}[./]\d{1,2}[./]\d{2,4})'
        dates_found = re.findall(date_pattern, text)

        doc_date_min = None
        doc_date_max = None

        if dates_found:
            parsed_dates = []
            for d in dates_found:
                # Try different formats
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

        # Parse account lines
        account_pattern = r'^(\d{3})\s+'  # 3-digit account code
        accounts = []

        for line in lines:
            match = re.match(account_pattern, line)
            if match:
                accounts.append(match.group(1))

        metadata['accounts'] = list(set(accounts))
        metadata['account_count'] = len(metadata['accounts'])
        metadata['line_count'] = len(lines)

        # Look for totals
        if 'toplam' in text.lower():
            metadata['has_totals'] = True

        if not doc_date_min:
            warnings.append('Döküman tarihi tespit edilemedi')

        return {
            'status': 'OK' if not warnings else 'WARN',
            'parser_name': 'MizanParser',
            'parser_version': '1.0',
            'doc_date_min': doc_date_min,
            'doc_date_max': doc_date_max,
            'metadata': metadata,
            'warnings': warnings
        }
