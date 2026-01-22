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
    Also handles already-parsed floats from Excel.
    Returns 0.0 for empty, None, or '-'.
    """
    if s is None:
        return 0.0

    # If it's already a number (from Excel), return it directly
    if isinstance(s, (int, float)):
        return float(s)

    s = str(s).strip()
    if not s or s == "-" or s.lower() == 'nan':
        return 0.0

    # Check if it's already in standard float format (e.g., "12345.67")
    # This happens when Excel returns floats as strings
    if re.match(r'^-?\d+\.?\d*$', s):
        try:
            return float(s)
        except ValueError:
            pass

    # Turkish format: 3.983.434,26 (dots as thousand sep, comma as decimal)
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


# =============================================================================
# BANKA EKSTRESİ PARSER
# =============================================================================

def parse_bank_statement(file_path: Path) -> List[Dict[str, Any]]:
    """
    Parse bank statement CSV file.

    Supports Turkish bank statement format:
    - Delimiter: semicolon (;)
    - Encoding: windows-1254 or utf-8
    - Columns: Tarih, Aciklama, Islem Tutari, Bakiye

    Returns list of transactions with normalized fields.
    """
    results = []

    if not file_path.exists():
        logger.warning(f"Bank statement file not found: {file_path}")
        return results

    # Extract bank info from filename
    # Format: Q1 102.01 YKB 1-2-3.csv
    filename = file_path.name
    hesap_kodu = None
    banka_adi = None

    # Try to extract account code (102.xx)
    match = re.search(r'(102\.\d{2})', filename)
    if match:
        hesap_kodu = match.group(1)

    # Try to extract bank name
    bank_names = ['YKB', 'AKBANK', 'HALKBANK', 'ZİRAAT', 'ZIRAAT', 'ALBARAKA',
                  'GARANTİ', 'İŞBANK', 'VAKIF', 'DENİZ', 'QNB', 'ING', 'TEB']
    for bank in bank_names:
        if bank.upper() in filename.upper():
            banka_adi = bank
            break

    # Try different encodings
    content = None
    for encoding in ['utf-8-sig', 'utf-8', 'windows-1254', 'latin-1', 'iso-8859-9']:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
            break
        except (UnicodeDecodeError, UnicodeError):
            continue

    if not content:
        logger.error(f"Could not read bank statement with any encoding: {file_path}")
        return results

    lines = content.strip().split('\n')

    # Detect delimiter
    first_data_line = lines[0] if lines else ""
    delimiter = ';' if ';' in first_data_line else ','

    # Find header row (Tarih, Açıklama, etc.)
    header_idx = 0
    for i, line in enumerate(lines[:10]):  # Check first 10 lines
        line_upper = line.upper()
        if 'TARİH' in line_upper or 'TARIH' in line_upper:
            header_idx = i
            break

    # Parse header
    header_line = lines[header_idx]
    header = [col.strip() for col in header_line.split(delimiter)]

    # Find column indices
    tarih_idx = None
    aciklama_idx = None
    tutar_idx = None
    bakiye_idx = None

    for i, col in enumerate(header):
        col_upper = col.upper()
        if 'TARİH' in col_upper or 'TARIH' in col_upper:
            tarih_idx = i
        elif 'AÇIKLAMA' in col_upper or 'ACIKLAMA' in col_upper:
            aciklama_idx = i
        elif 'TUTAR' in col_upper or 'İŞLEM' in col_upper or 'ISLEM' in col_upper:
            tutar_idx = i
        elif 'BAKİYE' in col_upper or 'BAKIYE' in col_upper:
            bakiye_idx = i

    # Parse data rows
    for line_num, line in enumerate(lines[header_idx + 1:], start=header_idx + 2):
        if not line.strip():
            continue

        cols = line.split(delimiter)

        try:
            tarih = cols[tarih_idx].strip() if tarih_idx is not None and tarih_idx < len(cols) else None
            aciklama = cols[aciklama_idx].strip() if aciklama_idx is not None and aciklama_idx < len(cols) else None
            tutar_str = cols[tutar_idx].strip() if tutar_idx is not None and tutar_idx < len(cols) else None
            bakiye_str = cols[bakiye_idx].strip() if bakiye_idx is not None and bakiye_idx < len(cols) else None

            # Skip empty rows
            if not tarih and not aciklama:
                continue

            # Parse amount (can be negative)
            tutar = _parse_tr_number(tutar_str) if tutar_str else 0.0
            bakiye = _parse_tr_number(bakiye_str) if bakiye_str else 0.0

            # Determine transaction type from description
            islem_tipi = _classify_bank_transaction(aciklama or '')

            results.append({
                'hesap_kodu': hesap_kodu,
                'banka_adi': banka_adi,
                'tarih': tarih,
                'aciklama': aciklama,
                'islem_tipi': islem_tipi,
                'tutar': tutar,
                'bakiye': bakiye,
                'line_number': line_num
            })

        except Exception as e:
            logger.warning(f"Error parsing line {line_num}: {e}")
            continue

    logger.info(f"Parsed {len(results)} bank transactions from: {file_path.name}")
    return results


def _classify_bank_transaction(aciklama: str) -> str:
    """Classify bank transaction type from description."""
    aciklama_upper = aciklama.upper()

    if 'PEŞIN SATIŞ' in aciklama_upper or 'PESIN SATIS' in aciklama_upper:
        return 'POS_PESIN'
    elif 'TAKSİT' in aciklama_upper or 'TAKSIT' in aciklama_upper:
        return 'POS_TAKSIT'
    elif 'KATKI PAYI' in aciklama_upper:
        return 'KOMISYON'
    elif 'ÜYE İŞYERİ' in aciklama_upper or 'UYE ISYERI' in aciklama_upper:
        return 'POS_UCRETI'
    elif 'BSMV' in aciklama_upper:
        return 'VERGI'
    elif 'GİDEN EFT' in aciklama_upper or 'GIDEN EFT' in aciklama_upper:
        return 'EFT_GIDEN'
    elif 'GELEN EFT' in aciklama_upper:
        return 'EFT_GELEN'
    elif 'GİDEN FAST' in aciklama_upper or 'GIDEN FAST' in aciklama_upper:
        return 'FAST_GIDEN'
    elif 'GELEN FAST' in aciklama_upper:
        return 'FAST_GELEN'
    elif 'VİRMAN' in aciklama_upper or 'VIRMAN' in aciklama_upper:
        return 'VIRMAN'
    elif 'FAİZ' in aciklama_upper or 'FAIZ' in aciklama_upper:
        return 'FAIZ'
    elif 'HAVALE' in aciklama_upper:
        return 'HAVALE'
    elif 'MASRAF' in aciklama_upper or 'ÜCRET' in aciklama_upper or 'UCRET' in aciklama_upper:
        return 'MASRAF'
    else:
        return 'DIGER'


# =============================================================================
# YEVMİYE DEFTERİ PARSER
# =============================================================================

def parse_yevmiye_defteri(file_path: Path) -> List[Dict[str, Any]]:
    """
    Parse yevmiye defteri (journal/day book) Excel file.

    Structure:
    - Header contains company info
    - Each entry starts with a "fiş header" line: 00001-----00001-----AÇILIŞ-----01/01/2025
    - Followed by account lines with hesap_kodu, hesap_adi, aciklama, borc, alacak

    Returns list of journal entry lines.
    """
    results = []

    if not file_path.exists():
        logger.warning(f"Yevmiye file not found: {file_path}")
        return results

    try:
        import pandas as pd
        df = pd.read_excel(file_path, header=None)
    except Exception as e:
        logger.error(f"Could not read yevmiye Excel file {file_path}: {e}")
        return results

    current_fis_no = None
    current_tarih = None
    current_aciklama = None

    for idx, row in df.iterrows():
        # Get first cell to check for fiş header
        first_cell = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ''

        # Check if this is a fiş header line (contains -----)
        if '-----' in first_cell:
            # Parse fiş header: 00001-----00001-----AÇILIŞ-----01/01/2025
            parts = first_cell.split('-----')
            if len(parts) >= 4:
                current_fis_no = parts[0].strip()
                current_aciklama = parts[2].strip() if len(parts) > 2 else ''
                current_tarih = parts[3].strip() if len(parts) > 3 else ''
            continue

        # Check if this is a column header row
        if 'HESAP KODU' in first_cell.upper():
            continue

        # Check if this is a data row (has hesap kodu)
        hesap_kodu = first_cell.strip()

        # Skip if not a valid account code
        if not hesap_kodu or hesap_kodu.upper() in ['NAN', 'TOPLAM', '']:
            continue

        # Check if it looks like an account code (digits and dots)
        if not re.match(r'^[\d.]+$', hesap_kodu):
            continue

        try:
            hesap_adi = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ''
            aciklama = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else ''
            detay = str(row.iloc[3]).strip() if len(row) > 3 and pd.notna(row.iloc[3]) else ''

            # Borç and Alacak can be in different positions
            borc = 0.0
            alacak = 0.0

            # Try to find borç and alacak values
            for i in range(3, min(len(row), 7)):
                val = row.iloc[i]
                if pd.notna(val):
                    val_str = str(val).strip()
                    if val_str and val_str not in ['NaN', 'nan', '']:
                        parsed = _parse_tr_number(val_str)
                        if parsed > 0:
                            if borc == 0:
                                borc = parsed
                            elif alacak == 0:
                                alacak = parsed

            # Skip rows without any values
            if borc == 0 and alacak == 0:
                continue

            results.append({
                'fis_no': current_fis_no,
                'tarih': current_tarih,
                'fis_aciklama': current_aciklama,
                'hesap_kodu': hesap_kodu,
                'hesap_adi': hesap_adi,
                'aciklama': aciklama or detay,
                'borc': borc,
                'alacak': alacak,
                'line_number': idx
            })

        except Exception as e:
            logger.warning(f"Error parsing yevmiye row {idx}: {e}")
            continue

    logger.info(f"Parsed {len(results)} yevmiye entries from: {file_path.name}")
    return results


# =============================================================================
# DEFTERİ KEBİR PARSER
# =============================================================================

def parse_defteri_kebir(file_path: Path) -> List[Dict[str, Any]]:
    """
    Parse defteri kebir (general ledger) Excel file.

    Structure:
    - Header row with: KEBİR HESAP, TARİH, MADDE NO, FİŞ NO, EVRAK NO, EVRAK TARİHİ,
                       HESAP KODU, HESAP ADI, AÇIKLAMA, BORÇ, ALACAK, BAKİYE

    Returns list of ledger entries.
    """
    results = []

    if not file_path.exists():
        logger.warning(f"Kebir file not found: {file_path}")
        return results

    try:
        import pandas as pd
        df = pd.read_excel(file_path, header=0)
    except Exception as e:
        logger.error(f"Could not read kebir Excel file {file_path}: {e}")
        return results

    # Map column names (handle variations)
    col_map = {}
    for col in df.columns:
        col_str = str(col).upper().strip()
        if 'KEBİR' in col_str or 'KEBIR' in col_str:
            col_map['kebir_hesap'] = col
        elif col_str == 'TARİH' or col_str == 'TARIH':
            col_map['tarih'] = col
        elif 'MADDE' in col_str:
            col_map['madde_no'] = col
        elif 'FİŞ' in col_str or 'FIS' in col_str:
            col_map['fis_no'] = col
        elif 'EVRAK NO' in col_str:
            col_map['evrak_no'] = col
        elif 'EVRAK' in col_str and 'TARİH' in col_str:
            col_map['evrak_tarihi'] = col
        elif 'HESAP KODU' in col_str or 'HESAPKODU' in col_str:
            col_map['hesap_kodu'] = col
        elif 'HESAP ADI' in col_str or 'HESAPADI' in col_str:
            col_map['hesap_adi'] = col
        elif 'AÇIKLAMA' in col_str or 'ACIKLAMA' in col_str:
            col_map['aciklama'] = col
        elif col_str == 'BORÇ' or col_str == 'BORC':
            col_map['borc'] = col
        elif col_str == 'ALACAK':
            col_map['alacak'] = col
        elif 'BAKİYE' in col_str or 'BAKIYE' in col_str:
            col_map['bakiye'] = col

    for idx, row in df.iterrows():
        try:
            kebir_hesap = str(row.get(col_map.get('kebir_hesap', ''), '')).strip()
            hesap_kodu = str(row.get(col_map.get('hesap_kodu', ''), '')).strip()

            # Skip invalid rows
            if not hesap_kodu or hesap_kodu.upper() in ['NAN', '', 'NONE']:
                continue

            tarih = row.get(col_map.get('tarih', ''))
            if pd.notna(tarih):
                tarih = str(tarih)
            else:
                tarih = None

            borc = row.get(col_map.get('borc', ''))
            borc = _parse_tr_number(str(borc)) if pd.notna(borc) else 0.0

            alacak = row.get(col_map.get('alacak', ''))
            alacak = _parse_tr_number(str(alacak)) if pd.notna(alacak) else 0.0

            bakiye = row.get(col_map.get('bakiye', ''))
            bakiye = _parse_tr_number(str(bakiye)) if pd.notna(bakiye) else 0.0

            results.append({
                'kebir_hesap': kebir_hesap,
                'tarih': tarih,
                'madde_no': str(row.get(col_map.get('madde_no', ''), '')),
                'fis_no': str(row.get(col_map.get('fis_no', ''), '')),
                'evrak_no': str(row.get(col_map.get('evrak_no', ''), '')),
                'evrak_tarihi': str(row.get(col_map.get('evrak_tarihi', ''), '')),
                'hesap_kodu': hesap_kodu,
                'hesap_adi': str(row.get(col_map.get('hesap_adi', ''), '')),
                'aciklama': str(row.get(col_map.get('aciklama', ''), '')),
                'borc': borc,
                'alacak': alacak,
                'bakiye': bakiye,
                'line_number': idx
            })

        except Exception as e:
            logger.warning(f"Error parsing kebir row {idx}: {e}")
            continue

    logger.info(f"Parsed {len(results)} kebir entries from: {file_path.name}")
    return results


# =============================================================================
# E-DEFTER XML PARSER
# =============================================================================

def parse_edefter_xml(file_path: Path) -> List[Dict[str, Any]]:
    """
    Parse E-Defter XML file (XBRL GL format).

    Supports:
    - Yevmiye (Y) files - Journal entries
    - Kebir (K) files - Ledger entries
    - Berat files (YB, KB) - Certificate/seal info

    Returns list of accounting entries.
    """
    results = []

    if not file_path.exists():
        logger.warning(f"E-Defter XML file not found: {file_path}")
        return results

    # Determine file type from name
    # Format: VKN-YYYYMM-TYPE-SEQ.xml
    filename = file_path.name
    file_type = None
    match = re.search(r'-(\d{6})-([YKD][RB]?)-', filename)
    if match:
        file_type = match.group(2)  # Y, K, YB, KB, DR

    try:
        import xml.etree.ElementTree as ET
        tree = ET.parse(file_path)
        root = tree.getroot()
    except Exception as e:
        logger.error(f"Could not parse E-Defter XML {file_path}: {e}")
        return results

    # Define namespaces
    ns = {
        'edefter': 'http://www.edefter.gov.tr',
        'xbrli': 'http://www.xbrl.org/2003/instance',
        'gl-cor': 'http://www.xbrl.org/int/gl/cor/2006-10-25',
        'gl-bus': 'http://www.xbrl.org/int/gl/bus/2006-10-25',
    }

    # Find all entry headers
    for entry_header in root.findall('.//gl-cor:entryHeader', ns):
        try:
            # Get entry-level info
            entry_number = entry_header.findtext('gl-cor:entryNumber', '', ns)
            entered_date = entry_header.findtext('gl-cor:enteredDate', '', ns)
            entry_comment = entry_header.findtext('gl-cor:entryComment', '', ns)

            # Get entry details (line items)
            for detail in entry_header.findall('gl-cor:entryDetail', ns):
                line_number = detail.findtext('gl-cor:lineNumber', '', ns)

                # Get account info
                account = detail.find('gl-cor:account', ns)
                if account is not None:
                    account_main_id = account.findtext('gl-cor:accountMainID', '', ns)
                    account_main_desc = account.findtext('gl-cor:accountMainDescription', '', ns)

                    account_sub = account.find('gl-cor:accountSub', ns)
                    account_sub_id = ''
                    account_sub_desc = ''
                    if account_sub is not None:
                        account_sub_id = account_sub.findtext('gl-cor:accountSubID', '', ns)
                        account_sub_desc = account_sub.findtext('gl-cor:accountSubDescription', '', ns)
                else:
                    account_main_id = ''
                    account_main_desc = ''
                    account_sub_id = ''
                    account_sub_desc = ''

                # Get amount and D/C code
                amount = detail.findtext('gl-cor:amount', '0', ns)
                debit_credit = detail.findtext('gl-cor:debitCreditCode', '', ns)

                # Get document info
                doc_number = detail.findtext('gl-cor:documentNumber', '', ns)
                doc_date = detail.findtext('gl-cor:documentDate', '', ns)
                posting_date = detail.findtext('gl-cor:postingDate', '', ns)

                # Get detail comment
                detail_comment = detail.findtext('gl-cor:detailComment', '', ns)

                results.append({
                    'defter_tipi': file_type,
                    'fis_no': entry_number,
                    'tarih': entered_date or posting_date,
                    'fis_aciklama': entry_comment,
                    'satir_no': line_number,
                    'hesap_kodu': account_main_id,
                    'hesap_adi': account_main_desc,
                    'alt_hesap_kodu': account_sub_id,
                    'alt_hesap_adi': account_sub_desc,
                    'tutar': _parse_tr_number(amount),
                    'borc_alacak': debit_credit,  # D or C
                    'belge_no': doc_number,
                    'belge_tarihi': doc_date,
                    'aciklama': detail_comment,
                })

        except Exception as e:
            logger.warning(f"Error parsing E-Defter entry: {e}")
            continue

    logger.info(f"Parsed {len(results)} E-Defter entries from: {file_path.name}")
    return results
