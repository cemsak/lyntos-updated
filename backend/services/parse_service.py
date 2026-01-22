"""
Parse Service - Sprint 8: Parse uploaded files and populate data tables
Bridges the gap between document_uploads and mizan_entries/bank_transactions.

Data Flow:
Upload -> document_uploads -> parse_service -> mizan_entries

This service is called after files are uploaded to:
1. Read the uploaded file
2. Parse it according to doc_type
3. Insert parsed rows into appropriate tables (mizan_entries, bank_transactions)
"""

import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import csv
import re

logger = logging.getLogger(__name__)

# Base paths
BACKEND_DIR = Path(__file__).parent.parent
UPLOAD_DIR = BACKEND_DIR / "backend" / "uploads"  # Actual file location (nested)


def _parse_tr_number(s: Optional[str]) -> float:
    """
    Parse Turkish number format (3.983.434,26) to float.
    Returns 0.0 for empty, None, or '-'.
    """
    if s is None:
        return 0.0
    s = str(s).strip()
    if not s or s == "-":
        return 0.0
    # Remove thousand separators (dots), convert decimal comma to dot
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _try_get(row: Dict[str, str], keys: List[str]) -> Optional[str]:
    """
    Get value from dict by trying multiple possible column names.
    Handles case-insensitive matching.
    """
    lower_map: Dict[str, str] = {}
    for k in row.keys():
        if k is None:
            continue
        norm = k.strip().lower()
        lower_map[norm] = k

    for key in keys:
        wanted = key.strip().lower()
        if wanted in lower_map:
            return row[lower_map[wanted]]

    return None


def parse_mizan_file(file_path: Path) -> List[Dict[str, Any]]:
    """
    Parse a mizan (trial balance) file (CSV or Excel).

    Supports various header formats:
    - HESAP KODU, HESAP ADI, BORC, ALACAK, BORC BAKIYE, ALACAK BAKIYE
    - Simple format: code name debit credit ...

    Returns list of parsed rows with normalized field names.
    """
    results = []

    if not file_path.exists():
        logger.warning(f"Mizan file not found: {file_path}")
        return results

    suffix = file_path.suffix.lower()

    # Excel files (.xlsx, .xls)
    if suffix in ['.xlsx', '.xls']:
        return _parse_mizan_excel(file_path)

    # CSV files
    return _parse_mizan_csv(file_path)


def _parse_mizan_excel(file_path: Path) -> List[Dict[str, Any]]:
    """Parse mizan from Excel file."""
    results = []

    try:
        import pandas as pd
    except ImportError:
        logger.error("pandas not installed, cannot parse Excel files")
        return results

    try:
        df = pd.read_excel(file_path, header=None)
    except Exception as e:
        logger.error(f"Could not read Excel file {file_path}: {e}")
        return results

    # Find header row (contains HESAP KODU)
    header_idx = None
    for i, row in df.iterrows():
        row_str = ' '.join([str(c).upper() for c in row.values if pd.notna(c)])
        if 'HESAP KODU' in row_str or 'HESAP_KODU' in row_str or 'HESAPKODU' in row_str:
            header_idx = i
            break

    if header_idx is None:
        logger.warning(f"No header row found in {file_path}")
        return results

    # Set header row
    df.columns = df.iloc[header_idx].values
    df = df.iloc[header_idx + 1:].reset_index(drop=True)

    # Clean column names
    df.columns = [str(c).strip() if pd.notna(c) else f'col_{i}' for i, c in enumerate(df.columns)]

    # Find column indices
    col_map = {}
    for col in df.columns:
        col_upper = col.upper()
        if 'HESAP KODU' in col_upper or col_upper == 'HESAPKODU':
            col_map['hesap_kodu'] = col
        elif 'HESAP ADI' in col_upper or 'HESAP ADI' in col_upper:
            col_map['hesap_adi'] = col
        elif col_upper == 'BORÇ' or col_upper == 'BORC':
            col_map['borc'] = col
        elif col_upper == 'ALACAK':
            col_map['alacak'] = col
        elif 'BORÇ BAKİYE' in col_upper or 'BORC BAKIYE' in col_upper:
            col_map['borc_bakiye'] = col
        elif 'ALACAK BAKİYE' in col_upper:
            col_map['alacak_bakiye'] = col

    if 'hesap_kodu' not in col_map:
        logger.warning(f"HESAP KODU column not found in {file_path}")
        return results

    for _, row in df.iterrows():
        hesap_kodu = row.get(col_map.get('hesap_kodu'))
        if pd.isna(hesap_kodu) or str(hesap_kodu).strip() == '':
            continue

        hesap_kodu = str(hesap_kodu).strip()

        # Skip total rows
        if hesap_kodu.upper() in ['TOPLAM', 'GENEL TOPLAM', 'ARA TOPLAM', 'NAN']:
            continue

        # Skip single digit group headers (1, 2, 3, etc.) - they're category summaries
        # Keep 3+ digit actual accounts (100, 102, 320, etc.)
        if hesap_kodu.isdigit() and len(hesap_kodu) < 3:
            continue

        hesap_adi = row.get(col_map.get('hesap_adi', ''))
        hesap_adi = str(hesap_adi).strip() if pd.notna(hesap_adi) else None

        borc = row.get(col_map.get('borc', ''))
        alacak = row.get(col_map.get('alacak', ''))
        borc_bakiye = row.get(col_map.get('borc_bakiye', ''))
        alacak_bakiye = row.get(col_map.get('alacak_bakiye', ''))

        results.append({
            'hesap_kodu': hesap_kodu,
            'hesap_adi': hesap_adi,
            'borc_toplam': _parse_tr_number(str(borc) if pd.notna(borc) else None),
            'alacak_toplam': _parse_tr_number(str(alacak) if pd.notna(alacak) else None),
            'borc_bakiye': _parse_tr_number(str(borc_bakiye) if pd.notna(borc_bakiye) else None),
            'alacak_bakiye': _parse_tr_number(str(alacak_bakiye) if pd.notna(alacak_bakiye) else None),
        })

    logger.info(f"Parsed {len(results)} mizan entries from Excel: {file_path.name}")
    return results


def _parse_mizan_csv(file_path: Path) -> List[Dict[str, Any]]:
    """Parse mizan from CSV file."""
    results = []

    try:
        # Try to read as CSV
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            content = f.read()
    except UnicodeDecodeError:
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Could not read file {file_path}: {e}")
            return results

    lines = content.strip().split('\n')

    # Try to find header row FIRST (delimiter detection needs header line)
    header_idx = None
    for i, line in enumerate(lines):
        line_upper = line.upper()
        if 'HESAP KODU' in line_upper or 'HESAP_KODU' in line_upper or 'HESAPKODU' in line_upper:
            header_idx = i
            break

    if header_idx is not None:
        # Parse as structured CSV with header
        header_line = lines[header_idx]

        # Detect delimiter from HEADER LINE (not first line which may be metadata)
        delimiter = ';' if ';' in header_line else ','

        header = [c.strip() for c in header_line.split(delimiter)]

        for line in lines[header_idx + 1:]:
            if not line.strip():
                continue

            cols = line.split(delimiter)
            if len(cols) < len(header):
                cols = cols + [''] * (len(header) - len(cols))

            row = {header[i]: cols[i] if i < len(cols) else '' for i in range(len(header))}

            hesap_kodu = _try_get(row, ['Hesap Kodu', 'HESAP KODU', 'hesap_kodu', 'Kod', 'Hesap No'])
            if not hesap_kodu or not hesap_kodu.strip():
                continue

            hesap_kodu = hesap_kodu.strip()

            # Skip if it looks like a total row
            if hesap_kodu.upper() in ['TOPLAM', 'GENEL TOPLAM', 'ARA TOPLAM']:
                continue

            hesap_adi = _try_get(row, ['Hesap Adi', 'HESAP ADI', 'HesapAdi', 'hesap_adi', 'Ad'])
            borc_str = _try_get(row, ['Borç', 'BORÇ', 'Borc', 'BORC', 'Borç Toplamı', 'Borc Toplami', 'DonemBorc'])
            alacak_str = _try_get(row, ['Alacak', 'ALACAK', 'Alacak Toplamı', 'Alacak Toplami', 'DonemAlacak'])
            bakiye_borc_str = _try_get(row, ['Borç Bakiyesi', 'BORÇ BAKİYESİ', 'Borç Bakiye', 'BORÇ BAKİYE', 'Bakiye Borc', 'Borc Bakiye', 'BorcBakiye', 'BORC BAKIYE', 'BORC BAKIYESI'])
            bakiye_alacak_str = _try_get(row, ['Alacak Bakiyesi', 'ALACAK BAKİYESİ', 'Alacak Bakiye', 'ALACAK BAKİYE', 'Bakiye Alacak', 'AlacakBakiye', 'ALACAK BAKIYE', 'ALACAK BAKIYESI'])

            results.append({
                'hesap_kodu': hesap_kodu,
                'hesap_adi': hesap_adi.strip() if hesap_adi else None,
                'borc_toplam': _parse_tr_number(borc_str),
                'alacak_toplam': _parse_tr_number(alacak_str),
                'borc_bakiye': _parse_tr_number(bakiye_borc_str),
                'alacak_bakiye': _parse_tr_number(bakiye_alacak_str),
            })
    else:
        # Try to parse as simple space/tab separated format
        # Example: "100 Kasa 10000 0 10000"
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Skip header-like or total lines
            if line.upper().startswith('TOPLAM') or line.upper().startswith('TARIH'):
                continue

            # Try to extract account code (3-digit number at start)
            match = re.match(r'^(\d{3})\s+(.+?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)', line)
            if match:
                results.append({
                    'hesap_kodu': match.group(1),
                    'hesap_adi': match.group(2).strip(),
                    'borc_toplam': _parse_tr_number(match.group(3)),
                    'alacak_toplam': _parse_tr_number(match.group(4)),
                    'borc_bakiye': _parse_tr_number(match.group(5)),
                    'alacak_bakiye': 0.0,
                })

    return results


def get_actual_file_path(stored_path: str) -> Optional[Path]:
    """
    Convert stored_path from database to actual filesystem path.

    DB stores: backend/uploads/HKOZKAN/...
    Actual:    backend/backend/uploads/HKOZKAN/...
    """
    if stored_path.startswith('memory://'):
        # Frontend-parsed file, no physical file
        return None

    # Handle relative paths stored in DB
    if stored_path.startswith('backend/uploads/'):
        # Actual files are in backend/backend/uploads
        actual_path = BACKEND_DIR / stored_path
        if actual_path.exists():
            return actual_path

    # Try direct path
    direct_path = Path(stored_path)
    if direct_path.exists():
        return direct_path

    # Try from UPLOAD_DIR
    relative = stored_path.replace('backend/uploads/', '')
    upload_path = UPLOAD_DIR / relative
    if upload_path.exists():
        return upload_path

    return None


def parse_and_store_mizan(
    cursor,
    tenant_id: str,
    client_id: str,
    period_id: str,
    stored_path: str,
    source_file: str
) -> Dict[str, Any]:
    """
    Parse a mizan file and insert rows into mizan_entries table.

    Args:
        cursor: Database cursor
        tenant_id: SMMM identifier
        client_id: Client identifier
        period_id: Period code (e.g., "2025-Q2")
        stored_path: Path stored in document_uploads
        source_file: Original filename

    Returns:
        Dict with status, parsed_count, inserted_count, errors
    """
    result = {
        'status': 'OK',
        'parsed_count': 0,
        'inserted_count': 0,
        'updated_count': 0,
        'skipped_count': 0,
        'errors': []
    }

    # Get actual file path
    file_path = get_actual_file_path(stored_path)

    if not file_path:
        result['status'] = 'SKIP'
        result['errors'].append(f'No physical file for: {stored_path}')
        return result

    # Parse the file
    try:
        rows = parse_mizan_file(file_path)
        result['parsed_count'] = len(rows)
    except Exception as e:
        result['status'] = 'ERROR'
        result['errors'].append(f'Parse error: {str(e)}')
        return result

    if not rows:
        result['status'] = 'EMPTY'
        result['errors'].append('No rows parsed from file')
        return result

    # Insert/update rows in mizan_entries
    now = datetime.utcnow().isoformat()

    for idx, row in enumerate(rows):
        try:
            # Check if entry exists
            cursor.execute("""
                SELECT id FROM mizan_entries
                WHERE tenant_id = ? AND client_id = ? AND period_id = ? AND hesap_kodu = ?
            """, (tenant_id, client_id, period_id, row['hesap_kodu']))

            existing = cursor.fetchone()

            if existing:
                # Update existing
                cursor.execute("""
                    UPDATE mizan_entries
                    SET hesap_adi = ?, borc_toplam = ?, alacak_toplam = ?,
                        borc_bakiye = ?, alacak_bakiye = ?,
                        source_file = ?, row_index = ?, updated_at = ?
                    WHERE id = ?
                """, (
                    row['hesap_adi'],
                    row['borc_toplam'],
                    row['alacak_toplam'],
                    row['borc_bakiye'],
                    row['alacak_bakiye'],
                    source_file,
                    idx,
                    now,
                    existing['id']
                ))
                result['updated_count'] += 1
            else:
                # Insert new
                cursor.execute("""
                    INSERT INTO mizan_entries (
                        tenant_id, client_id, period_id,
                        hesap_kodu, hesap_adi,
                        borc_toplam, alacak_toplam,
                        borc_bakiye, alacak_bakiye,
                        source_file, row_index,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    tenant_id,
                    client_id,
                    period_id,
                    row['hesap_kodu'],
                    row['hesap_adi'],
                    row['borc_toplam'],
                    row['alacak_toplam'],
                    row['borc_bakiye'],
                    row['alacak_bakiye'],
                    source_file,
                    idx,
                    now,
                    now
                ))
                result['inserted_count'] += 1

        except Exception as e:
            result['errors'].append(f"Row {idx} ({row.get('hesap_kodu', '?')}): {str(e)}")
            result['skipped_count'] += 1

    if result['errors']:
        result['status'] = 'PARTIAL'

    return result


def process_uploaded_documents(
    cursor,
    tenant_id: str,
    client_id: str,
    period_id: str,
    doc_types: Optional[List[str]] = None,
    force: bool = False
) -> Dict[str, Any]:
    """
    Process all pending documents for a client/period.

    Args:
        cursor: Database cursor
        tenant_id: SMMM identifier
        client_id: Client identifier
        period_id: Period code
        doc_types: Optional list of doc types to process (default: ['MIZAN'])
        force: If True, reprocess all documents regardless of parse_status

    Returns:
        Summary of processing results
    """
    if doc_types is None:
        doc_types = ['MIZAN']

    results = {
        'processed': 0,
        'success': 0,
        'errors': 0,
        'details': []
    }

    # Get documents to process
    placeholders = ','.join(['?' for _ in doc_types])

    if force:
        # Process all documents regardless of status
        query = f"""
            SELECT id, doc_type, original_filename, stored_path
            FROM document_uploads
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
              AND doc_type IN ({placeholders})
              AND is_active = 1
        """
    else:
        # Only process pending documents
        query = f"""
            SELECT id, doc_type, original_filename, stored_path
            FROM document_uploads
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
              AND doc_type IN ({placeholders})
              AND is_active = 1
              AND (parse_status = 'PENDING' OR parse_status IS NULL)
        """

    cursor.execute(query, (tenant_id, client_id, period_id, *doc_types))

    docs = cursor.fetchall()

    for doc in docs:
        results['processed'] += 1
        doc_id = doc['id']
        doc_type = doc['doc_type']
        filename = doc['original_filename']
        stored_path = doc['stored_path']

        if doc_type == 'MIZAN':
            parse_result = parse_and_store_mizan(
                cursor,
                tenant_id,
                client_id,
                period_id,
                stored_path,
                filename
            )

            # Update document parse status
            new_status = 'OK' if parse_result['status'] in ('OK', 'PARTIAL') else parse_result['status']
            cursor.execute("""
                UPDATE document_uploads
                SET parse_status = ?, updated_at = ?
                WHERE id = ?
            """, (new_status, datetime.utcnow().isoformat(), doc_id))

            if parse_result['status'] in ('OK', 'PARTIAL'):
                results['success'] += 1
            else:
                results['errors'] += 1

            results['details'].append({
                'filename': filename,
                'doc_type': doc_type,
                **parse_result
            })

    return results


def trigger_parse_for_document(
    cursor,
    doc_id: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
    doc_type: str,
    stored_path: str,
    filename: str
) -> Dict[str, Any]:
    """
    Parse a single document immediately after upload.
    Called from upload handlers.
    """
    result = {'status': 'SKIP', 'message': 'Unknown doc type'}

    if doc_type == 'MIZAN':
        result = parse_and_store_mizan(
            cursor,
            tenant_id,
            client_id,
            period_id,
            stored_path,
            filename
        )

        # Update document parse status
        new_status = 'OK' if result['status'] in ('OK', 'PARTIAL') else result['status']
        cursor.execute("""
            UPDATE document_uploads
            SET parse_status = ?, updated_at = ?
            WHERE id = ?
        """, (new_status, datetime.utcnow().isoformat(), doc_id))

    return result
