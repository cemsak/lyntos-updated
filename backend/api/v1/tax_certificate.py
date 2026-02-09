"""
Tax Certificate (Vergi Levhası) Upload API
Sprint 7.4 - LYNTOS V2

Endpoints:
- POST /api/v1/tax-certificate/upload - Upload and parse PDF
- POST /api/v1/tax-certificate/confirm - Confirm and save parsed data
- GET /api/v1/tax-certificate/{client_id} - Get certificates for client
- GET /api/v1/tax-certificate/nace-codes - Get NACE code list
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends, Request
from typing import Optional
import json
import uuid
import logging
from pathlib import Path
import sys

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection
from middleware.auth import verify_token, check_client_access
from utils.tax_certificate_parser import TaxCertificateParser, extract_text_from_pdf, extract_vkn_from_barcode_region, validate_vkn
from utils.audit import log_action
from schemas.response_envelope import wrap_response
from services.tax_certificate_analyzer import analyze_tax_certificate

router = APIRouter(prefix="/tax-certificate", tags=["tax-certificate"])
logger = logging.getLogger(__name__)

# Load NACE codes from JSON
NACE_CODES_PATH = Path(__file__).parent.parent.parent / "data" / "nace_codes.json"


def load_nace_codes():
    """Load NACE codes from JSON file"""
    try:
        with open(NACE_CODES_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('nace_codes', []), data.get('sector_groups', {})
    except Exception as e:
        logger.error(f"Failed to load NACE codes: {e}")
        return [], {}


def get_nace_info(code: str):
    """Get NACE code info from JSON"""
    nace_codes, sector_groups = load_nace_codes()
    for nace in nace_codes:
        if nace['code'] == code:
            sector_info = sector_groups.get(nace['sector_group'], {})
            return {
                'code': nace['code'],
                'description': nace['description_tr'],
                'sector_group': nace['sector_group'],
                'risk_profile': nace['risk_profile'],
                'k_criteria': nace['k_criteria'],
                'avg_margin': sector_info.get('avg_margin'),
                'risk_weight': sector_info.get('risk_weight')
            }
    return None


@router.post("/parse")
async def parse_tax_certificate(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(verify_token)
):
    """
    Parse tax certificate PDF without requiring client_id
    Used for adding new taxpayers from Vergi Levhası PDF

    Sprint 7: New taxpayer creation from PDF
    """
    tenant_id = user["id"]

    # Validate file type
    filename_lower = file.filename.lower() if file.filename else ""
    if not filename_lower.endswith('.pdf'):
        raise HTTPException(400, "Sadece PDF dosyaları desteklenir")

    # Read file content
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(400, "Boş dosya yüklenemez")

    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "Dosya boyutu 10MB'dan büyük olamaz")

    try:
        # Extract text from PDF
        text = extract_text_from_pdf(content)
        ocr_used = False
        ocr_vkn = None

        # Parse text
        parsed_data = None
        if text and len(text.strip()) >= 50:
            parsed_data = TaxCertificateParser.parse_text(text)

        # === OCR FALLBACK ===
        # GİB Vergi Levhası PDF'lerinde VKN barkod olarak gömülü olabiliyor
        # Text extraction VKN bulamazsa OCR'a başvur
        if not parsed_data or not parsed_data.vkn or len(parsed_data.vkn) < 10:
            logger.info("VKN not found in text, trying OCR on barcode region...")
            ocr_vkn = extract_vkn_from_barcode_region(content)
            if ocr_vkn:
                logger.info(f"VKN extracted via OCR: {ocr_vkn}")
                ocr_used = True
                if parsed_data:
                    # Mevcut parsed data'ya OCR VKN'yi ekle
                    parsed_data.vkn = ocr_vkn
                else:
                    # Yeni TaxCertificateData oluştur
                    from utils.tax_certificate_parser import TaxCertificateData
                    parsed_data = TaxCertificateData(
                        vkn=ocr_vkn,
                        company_name='',  # Manuel girilmesi gerekecek
                        raw_text=text[:5000] if text else None
                    )

        # Hala VKN bulunamadıysa hata döndür
        if not parsed_data or not parsed_data.vkn:
            return wrap_response(
                endpoint_name="tax_certificate_parse",
                smmm_id=tenant_id,
                client_id=None,
                period=None,
                data={
                    "success": False,
                    "message": "PDF'den VKN çıkarılamadı. Dosya taranmış görüntü olabilir veya format desteklenmiyor."
                }
            )

        validation = TaxCertificateParser.validate(parsed_data)

    except Exception as e:
        logger.error(f"PDF parse error: {e}")
        return wrap_response(
            endpoint_name="tax_certificate_parse",
            smmm_id=tenant_id,
            client_id=None,
            period=None,
            data={
                "success": False,
                "message": f"PDF okunamadı: {str(e)}"
            }
        )

    # Get NACE info if available
    nace_info = None
    if parsed_data.nace_code:
        nace_info = get_nace_info(parsed_data.nace_code)

    # VKN checksum doğrulaması
    vkn_valid = validate_vkn(parsed_data.vkn) if parsed_data.vkn else False

    # Yıllık verileri serialize et
    yearly_data_serialized = None
    if parsed_data.yearly_data:
        yearly_data_serialized = [
            {
                'year': yd['year'],
                'matrah': str(yd['matrah']) if yd.get('matrah') else None,
                'tax': str(yd['tax']) if yd.get('tax') else None
            }
            for yd in parsed_data.yearly_data
        ]

    # === RİSK ANALİZİ ===
    # Vergi levhası verilerini analiz et
    risk_analysis = None
    try:
        analysis_data = {
            'vkn': parsed_data.vkn,
            'company_name': parsed_data.company_name,
            'nace_code': parsed_data.nace_code,
            'nace_description': parsed_data.nace_description,
            'tax_office': parsed_data.tax_office,
            'tax_type': parsed_data.tax_type,
            'start_date': parsed_data.start_date,
            'address': parsed_data.address,
            'city': parsed_data.city,
            'district': parsed_data.district,
            'yearly_data': parsed_data.yearly_data
        }
        risk_analysis = analyze_tax_certificate(analysis_data)
        logger.info(f"Risk analysis completed: score={risk_analysis.get('overall_risk_score')}, level={risk_analysis.get('risk_level')}")
    except Exception as e:
        logger.error(f"Risk analysis error: {e}")
        risk_analysis = {
            'error': str(e),
            'overall_risk_score': None,
            'risk_level': 'unknown'
        }

    return wrap_response(
        endpoint_name="tax_certificate_parse",
        smmm_id=tenant_id,
        client_id=None,
        period=None,
        data={
            "success": True,
            "validation": validation,
            "ocr_used": ocr_used,  # True ise VKN barkoddan OCR ile çıkarıldı
            "vkn_checksum_valid": vkn_valid,  # VKN Mod10 checksum doğrulaması
            "parsed_data": {
                "vkn": parsed_data.vkn,
                "company_name": parsed_data.company_name,
                "nace_code": parsed_data.nace_code,
                "nace_description": parsed_data.nace_description,
                "tax_office": parsed_data.tax_office,
                "tax_type": parsed_data.tax_type,  # Vergi türü
                "start_date": parsed_data.start_date,  # İşe başlama tarihi
                "address": parsed_data.address,
                "city": parsed_data.city,
                "district": parsed_data.district,
                "yearly_data": yearly_data_serialized,  # Yıllık matrah/vergi
                "kv_matrah": str(parsed_data.kv_matrah) if parsed_data.kv_matrah else None,
                "kv_paid": str(parsed_data.kv_paid) if parsed_data.kv_paid else None,
                "year": parsed_data.year
            },
            "nace_info": nace_info,
            "risk_analysis": risk_analysis  # Risk analiz sonuçları
        }
    )


@router.post("/upload")
async def upload_tax_certificate(
    request: Request,
    file: UploadFile = File(...),
    client_id: str = Query(..., description="Client ID"),
    user: dict = Depends(verify_token)
):
    """
    Upload and parse tax certificate PDF

    Returns parsed data for user confirmation before saving.
    Supports PDF files. Images require manual entry.
    """

    # Check client access (RBAC)
    await check_client_access(user, client_id)

    tenant_id = user["id"]

    # Validate file type
    filename_lower = file.filename.lower() if file.filename else ""
    if not filename_lower.endswith(('.pdf', '.png', '.jpg', '.jpeg')):
        raise HTTPException(400, "Desteklenen formatlar: PDF, PNG, JPG")

    # Read file content
    content = await file.read()

    if len(content) == 0:
        raise HTTPException(400, "Bos dosya yuklenemez")

    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "Dosya boyutu 10MB'dan buyuk olamaz")

    # For images, return manual entry required
    if not filename_lower.endswith('.pdf'):
        return wrap_response(
            endpoint_name="tax_certificate_upload",
            smmm_id=tenant_id,
            client_id=client_id,
            period=None,
            data={
                "success": False,
                "requires_manual_entry": True,
                "message": "Gorsel dosyalar icin manuel giris gerekli. Lutfen PDF yukleyin veya bilgileri manuel girin."
            }
        )

    try:
        # Extract text from PDF
        text = extract_text_from_pdf(content)

        if not text or len(text.strip()) < 50:
            return wrap_response(
                endpoint_name="tax_certificate_upload",
                smmm_id=tenant_id,
                client_id=client_id,
                period=None,
                data={
                    "success": False,
                    "requires_manual_entry": True,
                    "message": "PDF'den metin cikarilmadi. Taranmis goruntu olabilir, lutfen manuel girin."
                }
            )

        # Parse text
        parsed_data = TaxCertificateParser.parse_text(text)
        validation = TaxCertificateParser.validate(parsed_data)

    except Exception as e:
        logger.error(f"PDF parse error: {e}")
        return wrap_response(
            endpoint_name="tax_certificate_upload",
            smmm_id=tenant_id,
            client_id=client_id,
            period=None,
            data={
                "success": False,
                "requires_manual_entry": True,
                "message": f"PDF okunamadi: {str(e)}. Lutfen manuel girin."
            }
        )

    # Get client info for VKN verification
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT tax_id, name FROM clients WHERE id = ?", (client_id,))
        client_row = cursor.fetchone()

        if not client_row:
            raise HTTPException(404, "Mukellef bulunamadi")

        client_vkn = client_row['tax_id']
        client_name = client_row['name']

    # Check VKN match
    vkn_match = client_vkn == parsed_data.vkn

    # Get NACE info if available
    nace_info = None
    if parsed_data.nace_code:
        nace_info = get_nace_info(parsed_data.nace_code)

    # Get previous year's certificate for comparison
    comparison = {}
    if parsed_data.year:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT year, kv_matrah FROM tax_certificates
                WHERE client_id = ? AND year = ?
            """, (client_id, parsed_data.year - 1))
            prev_cert = cursor.fetchone()

            if prev_cert and prev_cert['kv_matrah'] and parsed_data.kv_matrah:
                prev_matrah = float(prev_cert['kv_matrah'])
                curr_matrah = float(parsed_data.kv_matrah)
                if prev_matrah > 0:
                    change_percent = ((curr_matrah - prev_matrah) / prev_matrah) * 100
                    comparison = {
                        "previous_year": prev_cert['year'],
                        "previous_matrah": str(prev_matrah),
                        "matrah_change_percent": round(change_percent, 1)
                    }

    # Audit log
    log_action(
        user_id=user["id"],
        client_id=client_id,
        period_id=None,
        action="tax_certificate_upload",
        resource_type="tax_certificate",
        resource_id=None,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=json.dumps({
            "filename": file.filename,
            "vkn_found": parsed_data.vkn,
            "nace_found": parsed_data.nace_code,
            "vkn_match": vkn_match
        })
    )

    return wrap_response(
        endpoint_name="tax_certificate_upload",
        smmm_id=tenant_id,
        client_id=client_id,
        period=None,
        data={
            "success": True,
            "requires_manual_entry": not validation["is_valid"],
            "validation": validation,
            "parsed_data": {
                "vkn": parsed_data.vkn,
                "company_name": parsed_data.company_name,
                "nace_code": parsed_data.nace_code,
                "nace_description": parsed_data.nace_description,
                "tax_office": parsed_data.tax_office,
                "address": parsed_data.address,
                "city": parsed_data.city,
                "district": parsed_data.district,
                "kv_matrah": str(parsed_data.kv_matrah) if parsed_data.kv_matrah else None,
                "kv_paid": str(parsed_data.kv_paid) if parsed_data.kv_paid else None,
                "year": parsed_data.year
            },
            "vkn_match": vkn_match,
            "client_vkn": client_vkn,
            "client_name": client_name,
            "nace_info": nace_info,
            "comparison": comparison
        }
    )


@router.post("/confirm")
async def confirm_tax_certificate(
    request: Request,
    client_id: str = Query(..., description="Client ID"),
    data: dict = None,
    user: dict = Depends(verify_token)
):
    """
    Confirm and save parsed tax certificate data

    Updates client's NACE code and creates certificate record.
    """

    # Check client access
    await check_client_access(user, client_id)

    tenant_id = user["id"]

    if not data:
        raise HTTPException(400, "Data required")

    # Validate required fields
    if not data.get("vkn") or not data.get("company_name"):
        raise HTTPException(400, "VKN ve Unvan zorunlu")

    cert_id = f"TC-{uuid.uuid4().hex[:8].upper()}"

    with get_connection() as conn:
        cursor = conn.cursor()

        # Check if certificate already exists for this year
        if data.get("year"):
            cursor.execute("""
                SELECT id FROM tax_certificates
                WHERE client_id = ? AND year = ?
            """, (client_id, data["year"]))
            existing = cursor.fetchone()
            if existing:
                raise HTTPException(400, f"{data['year']} yili icin vergi levhasi zaten mevcut")

        # Create tax certificate record
        cursor.execute("""
            INSERT INTO tax_certificates (
                id, client_id, year, vkn, company_name, nace_code, nace_description,
                tax_office, address, city, district, kv_matrah, kv_paid,
                file_url, file_name, parsed_data, uploaded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cert_id,
            client_id,
            data.get("year"),
            data.get("vkn"),
            data.get("company_name"),
            data.get("nace_code"),
            data.get("nace_description"),
            data.get("tax_office"),
            data.get("address"),
            data.get("city"),
            data.get("district"),
            float(data["kv_matrah"]) if data.get("kv_matrah") else None,
            float(data["kv_paid"]) if data.get("kv_paid") else None,
            data.get("file_url"),
            data.get("file_name"),
            json.dumps(data),
            user["id"]
        ))

        # Update client's NACE code if provided
        if data.get("nace_code"):
            cursor.execute("""
                UPDATE clients
                SET nace_code = ?, nace_description = ?, updated_at = datetime('now')
                WHERE id = ?
            """, (data["nace_code"], data.get("nace_description"), client_id))

        conn.commit()

    # Get activated K-criteria
    k_criteria = []
    if data.get("nace_code"):
        nace_info = get_nace_info(data["nace_code"])
        if nace_info:
            k_criteria = nace_info.get("k_criteria", [])

    # Audit log
    log_action(
        user_id=user["id"],
        client_id=client_id,
        period_id=None,
        action="tax_certificate_confirm",
        resource_type="tax_certificate",
        resource_id=cert_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=json.dumps({
            "year": data.get("year"),
            "nace_code": data.get("nace_code"),
            "kv_matrah": data.get("kv_matrah")
        })
    )

    return wrap_response(
        endpoint_name="tax_certificate_confirm",
        smmm_id=tenant_id,
        client_id=client_id,
        period=None,
        data={
            "success": True,
            "certificate_id": cert_id,
            "activated_k_criteria": k_criteria,
            "message": "Vergi levhasi kaydedildi"
        }
    )


@router.get("/{client_id}")
async def get_tax_certificates(
    client_id: str,
    user: dict = Depends(verify_token)
):
    """Get all tax certificates for a client"""

    await check_client_access(user, client_id)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, year, nace_code, nace_description, kv_matrah, kv_paid,
                   company_name, tax_office, uploaded_at
            FROM tax_certificates
            WHERE client_id = ?
            ORDER BY year DESC
        """, (client_id,))

        certificates = []
        for row in cursor.fetchall():
            certificates.append({
                "id": row["id"],
                "year": row["year"],
                "nace_code": row["nace_code"],
                "nace_description": row["nace_description"],
                "kv_matrah": str(row["kv_matrah"]) if row["kv_matrah"] else None,
                "kv_paid": str(row["kv_paid"]) if row["kv_paid"] else None,
                "company_name": row["company_name"],
                "tax_office": row["tax_office"],
                "uploaded_at": row["uploaded_at"]
            })

    return wrap_response(
        endpoint_name="tax_certificate_list",
        smmm_id=user["id"],
        client_id=client_id,
        period=None,
        data={
            "client_id": client_id,
            "certificates": certificates
        }
    )


@router.get("/nace-codes/list")
async def get_nace_codes(
    sector_group: Optional[str] = Query(None, description="Filter by sector group"),
    user: dict = Depends(verify_token)
):
    """Get NACE codes list with optional sector filter"""

    nace_codes, sector_groups = load_nace_codes()

    # Filter by sector group if provided
    if sector_group:
        nace_codes = [n for n in nace_codes if n['sector_group'] == sector_group]

    return wrap_response(
        endpoint_name="nace_codes_list",
        smmm_id=user["id"],
        client_id=None,
        period=None,
        data={
            "nace_codes": nace_codes,
            "sector_groups": list(sector_groups.keys()),
            "total": len(nace_codes)
        }
    )
