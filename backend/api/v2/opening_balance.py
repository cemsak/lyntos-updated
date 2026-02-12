"""
LYNTOS Opening Balance API Endpoints
=====================================
Açılış Fişi ve Açılış Mizanı yönetimi için REST API.

Endpoints:
- GET  /api/v2/opening-balance/{client_id}/{period_id}/summary - Özet durumu
- GET  /api/v2/opening-balance/{client_id}/{period_id}/balances - Hesap listesi
- GET  /api/v2/opening-balance/{client_id}/{period_id}/status - Dashboard için durum
- POST /api/v2/opening-balance/{client_id}/{period_id}/upload-mizan - Excel yükle
- POST /api/v2/opening-balance/{client_id}/{period_id}/extract-from-yevmiye - Yevmiye'den çıkar
- POST /api/v2/opening-balance/{client_id}/{period_id}/manual - Manuel giriş
- GET  /api/v2/opening-balance/{client_id}/{period_id}/missing - Eksik bakiyeleri hesapla
- DELETE /api/v2/opening-balance/{client_id}/{period_id}/{fiscal_year} - Sil
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional, List
from pydantic import BaseModel
import tempfile
import os
from datetime import datetime

from services.opening_balance_service import opening_balance_service
from middleware.auth import verify_token, check_client_access
from utils.period_utils import normalize_period_db

router = APIRouter(prefix="/opening-balance", tags=["opening-balance"])


# ════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ════════════════════════════════════════════════════════════════

class OpeningBalanceSummaryResponse(BaseModel):
    """Açılış bakiyesi özet yanıtı"""
    has_data: bool
    status: Optional[str] = None
    fiscal_year: Optional[int] = None
    toplam_hesap_sayisi: int = 0
    toplam_borc: float = 0
    toplam_alacak: float = 0
    is_balanced: bool = False
    balance_diff: float = 0
    source_type: Optional[str] = None
    upload_date: Optional[str] = None


class OpeningBalanceItem(BaseModel):
    """Tek hesap açılış bakiyesi"""
    hesap_kodu: str
    hesap_adi: Optional[str] = None
    borc_bakiye: float = 0
    alacak_bakiye: float = 0
    source_type: Optional[str] = None


class ManualBalanceRequest(BaseModel):
    """Manuel açılış bakiyesi ekleme isteği"""
    fiscal_year: int
    hesap_kodu: str
    hesap_adi: Optional[str] = None
    borc_bakiye: float = 0
    alacak_bakiye: float = 0


class MissingBalanceItem(BaseModel):
    """Eksik açılış bakiyesi öğesi"""
    hesap_kodu: str
    hesap_adi: Optional[str] = None
    mizan_borc: float = 0
    mizan_alacak: float = 0
    kebir_borc: float = 0
    kebir_alacak: float = 0
    eksik_borc: float = 0
    eksik_alacak: float = 0


class DashboardStatusResponse(BaseModel):
    """Dashboard için açılış bakiyesi durumu"""
    status: str  # 'missing', 'loaded', 'verified', 'warning'
    status_color: str  # 'red', 'yellow', 'green'
    status_text: str
    fiscal_year: Optional[int] = None
    has_opening_balance: bool = False
    total_accounts: int = 0
    total_amount: float = 0
    is_balanced: bool = False
    last_updated: Optional[str] = None


# ════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════

@router.get("/{client_id}/{period_id}/summary", response_model=OpeningBalanceSummaryResponse)
async def get_summary(client_id: str, period_id: str, user: dict = Depends(verify_token), fiscal_year: Optional[int] = None):
    """Açılış bakiyesi özet durumunu getir"""
    period_id = normalize_period_db(period_id)
    await check_client_access(user, client_id)
    summary = opening_balance_service.get_summary(client_id, period_id, fiscal_year)

    if not summary:
        return OpeningBalanceSummaryResponse(
            has_data=False,
            status='missing',
            toplam_hesap_sayisi=0,
            toplam_borc=0,
            toplam_alacak=0,
            is_balanced=False
        )

    return OpeningBalanceSummaryResponse(
        has_data=True,
        status=summary.get('status'),
        fiscal_year=summary.get('fiscal_year'),
        toplam_hesap_sayisi=summary.get('toplam_hesap_sayisi', 0),
        toplam_borc=summary.get('toplam_borc', 0),
        toplam_alacak=summary.get('toplam_alacak', 0),
        is_balanced=bool(summary.get('is_balanced')),
        balance_diff=summary.get('balance_diff', 0),
        source_type=summary.get('source_type'),
        upload_date=summary.get('upload_date')
    )


@router.get("/{client_id}/{period_id}/balances", response_model=List[OpeningBalanceItem])
async def get_balances(client_id: str, period_id: str, user: dict = Depends(verify_token), fiscal_year: Optional[int] = None):
    """Hesap bazında açılış bakiyelerini getir"""
    period_id = normalize_period_db(period_id)
    await check_client_access(user, client_id)
    balances = opening_balance_service.get_balances(client_id, period_id, fiscal_year)

    return [
        OpeningBalanceItem(
            hesap_kodu=b['hesap_kodu'],
            hesap_adi=b.get('hesap_adi'),
            borc_bakiye=b.get('borc_bakiye', 0),
            alacak_bakiye=b.get('alacak_bakiye', 0),
            source_type=b.get('source_type')
        )
        for b in balances
    ]


@router.get("/{client_id}/{period_id}/status", response_model=DashboardStatusResponse)
async def get_dashboard_status(client_id: str, period_id: str, user: dict = Depends(verify_token)):
    """
    Dashboard için açılış bakiyesi durumunu getir

    Bu endpoint dashboard'daki "Açılış Bakiyesi" kartı için kullanılır.
    """
    period_id = normalize_period_db(period_id)
    await check_client_access(user, client_id)
    # Period'dan yılı çıkar (örn: "2025-Q1" -> 2025)
    try:
        fiscal_year = int(period_id.split('-')[0])
    except (ValueError, IndexError):
        fiscal_year = datetime.now().year

    summary = opening_balance_service.get_summary(client_id, period_id, fiscal_year)

    if not summary:
        return DashboardStatusResponse(
            status='missing',
            status_color='red',
            status_text='Açılış bakiyesi yüklenmedi',
            fiscal_year=fiscal_year,
            has_opening_balance=False,
            total_accounts=0,
            total_amount=0,
            is_balanced=False
        )

    status = summary.get('status', 'pending')
    is_balanced = bool(summary.get('is_balanced'))
    total_borc = summary.get('toplam_borc', 0)

    # Durum belirleme
    if status == 'verified':
        status_color = 'green'
        status_text = 'Açılış bakiyesi doğrulandı'
    elif status == 'loaded' and is_balanced:
        status_color = 'green'
        status_text = 'Açılış bakiyesi yüklendi'
    elif status == 'loaded' and not is_balanced:
        status_color = 'yellow'
        status_text = f'Açılış bakiyesi dengesiz ({summary.get("balance_diff", 0):,.2f} TL fark)'
    elif status == 'error':
        status_color = 'red'
        status_text = 'Açılış bakiyesi hatası'
    else:
        status_color = 'yellow'
        status_text = 'Açılış bakiyesi beklemede'

    return DashboardStatusResponse(
        status=status,
        status_color=status_color,
        status_text=status_text,
        fiscal_year=fiscal_year,
        has_opening_balance=True,
        total_accounts=summary.get('toplam_hesap_sayisi', 0),
        total_amount=total_borc,
        is_balanced=is_balanced,
        last_updated=summary.get('upload_date')
    )


@router.post("/{client_id}/{period_id}/upload-mizan")
async def upload_mizan(
    client_id: str,
    period_id: str,
    fiscal_year: int = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(verify_token)
):
    """
    Açılış mizanı Excel dosyası yükle

    Beklenen format:
    - HESAP KODU | HESAP ADI | BORÇ | ALACAK | BORÇ BAKİYE | ALACAK BAKİYE
    """
    period_id = normalize_period_db(period_id)
    await check_client_access(user, client_id)
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Sadece Excel dosyaları (.xlsx, .xls) desteklenir")

    # Geçici dosyaya kaydet
    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = opening_balance_service.load_from_mizan_excel(
            client_id=client_id,
            period_id=period_id,
            file_path=tmp_path,
            fiscal_year=fiscal_year
        )

        if not result['success']:
            raise HTTPException(status_code=400, detail=result['message'])

        return {
            'success': True,
            'message': result['message'],
            'data': {
                'loaded_count': result['loaded_count'],
                'total_borc': result['total_borc'],
                'total_alacak': result['total_alacak'],
                'is_balanced': result['is_balanced'],
                'balance_diff': result.get('balance_diff', 0)
            }
        }

    finally:
        os.unlink(tmp_path)


@router.post("/{client_id}/{period_id}/extract-from-yevmiye")
async def extract_from_yevmiye(
    client_id: str,
    period_id: str,
    fiscal_year: int,
    user: dict = Depends(verify_token)
):
    """
    Yevmiye defterindeki açılış fişinden bakiyeleri çıkar

    Bu endpoint, yevmiye'de "AÇILIŞ" açıklamalı kayıtları bulur ve
    bunları açılış bakiyesi olarak kaydeder.
    """
    period_id = normalize_period_db(period_id)
    await check_client_access(user, client_id)
    result = opening_balance_service.load_from_yevmiye(
        client_id=client_id,
        period_id=period_id,
        fiscal_year=fiscal_year
    )

    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])

    return {
        'success': True,
        'message': result['message'],
        'data': {
            'loaded_count': result['loaded_count'],
            'total_borc': result['total_borc'],
            'total_alacak': result['total_alacak'],
            'is_balanced': result['is_balanced']
        }
    }


@router.post("/{client_id}/{period_id}/manual")
async def add_manual_balance(
    client_id: str,
    period_id: str,
    request: ManualBalanceRequest,
    user: dict = Depends(verify_token)
):
    """Manuel olarak tek hesap için açılış bakiyesi ekle"""
    period_id = normalize_period_db(period_id)
    await check_client_access(user, client_id)
    result = opening_balance_service.add_manual_balance(
        client_id=client_id,
        period_id=period_id,
        fiscal_year=request.fiscal_year,
        hesap_kodu=request.hesap_kodu,
        hesap_adi=request.hesap_adi,
        borc_bakiye=request.borc_bakiye,
        alacak_bakiye=request.alacak_bakiye
    )

    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])

    return {
        'success': True,
        'message': result['message']
    }


@router.get("/{client_id}/{period_id}/missing", response_model=List[MissingBalanceItem])
async def get_missing_balances(
    client_id: str,
    period_id: str,
    user: dict = Depends(verify_token),
    fiscal_year: Optional[int] = None
):
    """
    Mizan ile Kebir arasındaki farktan eksik açılış bakiyelerini hesapla

    Bu endpoint, cross-check C3 hatasının nedenini tespit etmek için kullanılır.
    """
    period_id = normalize_period_db(period_id)
    await check_client_access(user, client_id)
    result = opening_balance_service.calculate_missing_opening_balances(
        client_id=client_id,
        period_id=period_id,
        fiscal_year=fiscal_year
    )

    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])

    return [
        MissingBalanceItem(
            hesap_kodu=m['hesap_kodu'],
            hesap_adi=m.get('hesap_adi'),
            mizan_borc=m.get('mizan_borc', 0),
            mizan_alacak=m.get('mizan_alacak', 0),
            kebir_borc=m.get('kebir_borc', 0),
            kebir_alacak=m.get('kebir_alacak', 0),
            eksik_borc=m.get('eksik_borc', 0),
            eksik_alacak=m.get('eksik_alacak', 0)
        )
        for m in result['missing_balances']
    ]


@router.delete("/{client_id}/{period_id}/{fiscal_year}")
async def delete_balances(client_id: str, period_id: str, fiscal_year: int, user: dict = Depends(verify_token)):
    """Belirli bir yılın açılış bakiyelerini sil"""
    period_id = normalize_period_db(period_id)
    await check_client_access(user, client_id)
    result = opening_balance_service.delete_balances(
        client_id=client_id,
        period_id=period_id,
        fiscal_year=fiscal_year
    )

    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])

    return {
        'success': True,
        'message': result['message'],
        'deleted_count': result['deleted_count']
    }
