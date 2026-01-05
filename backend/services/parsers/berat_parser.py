"""
E-Defter Berat Parser
Extracts: period dates from XML, signature info
"""

import re
from typing import Dict


class BeratParser:
    """Parse e-defter berat XML documents"""

    def parse(self, content: bytes, filename: str) -> Dict:
        """
        Parse berat XML file
        Returns: {status, doc_date_min, doc_date_max, metadata, warnings}
        """

        warnings = []
        metadata = {
            'parser': 'BeratParser',
            'parser_version': '1.0',
            'is_xml': False,
            'has_signature': False
        }

        try:
            text = content.decode('utf-8', errors='ignore')
        except Exception:
            return {
                'status': 'ERROR',
                'error': 'Dosya decode edilemedi',
                'warnings': []
            }

        # Check if XML
        if '<?xml' in text or '<berat' in text.lower() or '<edefter' in text.lower():
            metadata['is_xml'] = True
        else:
            warnings.append('XML formatında değil')

        # Extract dates from XML tags
        doc_date_min = None
        doc_date_max = None

        # Look for <baslangicTarihi> and <bitisTarihi>
        start_match = re.search(
            r'<baslangictarihi>(\d{4}-\d{2}-\d{2})</baslangictarihi>',
            text.lower()
        )
        end_match = re.search(
            r'<bitistarihi>(\d{4}-\d{2}-\d{2})</bitistarihi>',
            text.lower()
        )

        if start_match:
            doc_date_min = start_match.group(1)
        if end_match:
            doc_date_max = end_match.group(1)

        # Alternative date patterns
        if not doc_date_min:
            date_match = re.search(r'<tarih>(\d{4}-\d{2}-\d{2})</tarih>', text.lower())
            if date_match:
                doc_date_min = date_match.group(1)
                doc_date_max = date_match.group(1)

        # Check for signature
        if '<signature' in text.lower() or 'imza' in text.lower():
            metadata['has_signature'] = True

        if not doc_date_min:
            warnings.append('Dönem tarihleri XML içinde bulunamadı')

        return {
            'status': 'OK' if metadata['is_xml'] and doc_date_min else 'WARN',
            'parser_name': 'BeratParser',
            'parser_version': '1.0',
            'doc_date_min': doc_date_min,
            'doc_date_max': doc_date_max,
            'metadata': metadata,
            'warnings': warnings
        }
