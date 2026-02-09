"""
LYNTOS API v2 - Cari Mutabakat Endpoint'leri (IS-5)

SMMM'nin müşteri/tedarikçi cari hesap ekstrelerini yükleyip
mizan 120 (Alıcılar) ve 320 (Satıcılar) alt hesapları ile karşılaştırır.

Endpoint'ler:
  POST /api/v2/cari-mutabakat/upload   → CSV/Excel yükle + otomatik karşılaştır
  GET  /api/v2/cari-mutabakat/list     → Mutabakat sonuç listesi (filtreli)
  POST /api/v2/cari-mutabakat/onayla   → SMMM toplu onay
  GET  /api/v2/cari-mutabakat/ozet     → Dashboard özet

Mevzuat: VUK Md. 177, TTK Md. 64, VUK Md. 323
TDHP: 120 Alıcılar, 320 Satıcılar, 128 Şüpheli Ticari Alacaklar

NO AUTH REQUIRED - Frontend'den doğrudan erişilebilir.
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from typing import Dict, List, Optional
import logging

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.cari_mutabakat_service import (
    parse_ekstre_csv,
    parse_ekstre_excel,
    run_mutabakat,
    get_mutabakat_list,
    onayla_mutabakat,
    get_mutabakat_ozet,
    preview_ekstre,
    parse_ekstre_with_mapping,
    save_karar,
    save_kararlar_toplu,
    get_kararlar,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/cari-mutabakat", tags=["cari-mutabakat"])

# Desteklenen dosya formatları
ALLOWED_EXTENSIONS = {'.csv', '.txt', '.xlsx', '.xls'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ═══════════════════════════════════════════════════════════
# PYDANTIC MODELLER
# ═══════════════════════════════════════════════════════════

class MutabakatSonuc(BaseModel):
    hesap_kodu: str
    hesap_adi: str
    karsi_taraf: str
    ekstre_bakiye: float
    mizan_bakiye: float
    fark: float
    fark_yuzde: float
    durum: str
    aging_gun: int = 0
    supheli_alacak_riski: bool = False


class MutabakatOzet(BaseModel):
    toplam_hesap: int
    uyumlu_hesap: int
    farkli_hesap: int
    toplam_fark: float
    supheli_alacak_sayisi: int
    tolerans_tl: float
    mevzuat_ref: str


class UploadResponse(BaseModel):
    basarili: bool
    mesaj: str
    yuklenen_satir: int
    sonuclar: List[MutabakatSonuc]
    ozet: MutabakatOzet


class OnayRequest(BaseModel):
    ids: List[int]
    onaylayan: str = "SMMM"


class OnayResponse(BaseModel):
    basarili: bool
    onaylanan_sayisi: int
    onaylayan: str
    onay_tarihi: str


class DashboardOzet(BaseModel):
    veri_var: bool
    toplam_hesap: int
    uyumlu: int
    farkli: int
    onaylanan: int
    beklemede: int
    toplam_fark: float
    supheli_alacak_sayisi: int
    son_yukleme: Optional[str]
    mevzuat_ref: str


class ColumnMappingItem(BaseModel):
    source_column: str
    source_index: int
    confidence: int
    method: str


class PreviewResponse(BaseModel):
    basarili: bool
    column_mapping: Dict[str, ColumnMappingItem]
    preview_rows: List[Dict[str, str]]
    total_rows: int
    detected_delimiter: str
    detected_encoding: str
    detected_program: Optional[str]
    raw_headers: List[str]
    warnings: List[str]


class ConfirmRequest(BaseModel):
    client_id: str
    period_id: str
    filename: str
    column_mapping: Dict[str, Dict]


# ═══════════════════════════════════════════════════════════
# ENDPOINT'LER
# ═══════════════════════════════════════════════════════════

@router.post("/upload", response_model=UploadResponse)
async def upload_ekstre(
    file: UploadFile = File(...),
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Query(..., description="Dönem (ör: 2025-Q1)"),
):
    """
    Cari hesap ekstre dosyası yükler ve otomatik mizan karşılaştırması yapar.

    Desteklenen formatlar: CSV, TXT, XLSX, XLS
    CSV beklenen format: hesap_kodu;karsi_taraf;bakiye

    Karşılaştırma sonuçları otomatik olarak DB'ye kaydedilir.
    """
    if not client_id or not period_id:
        raise HTTPException(status_code=400, detail="client_id ve period_id zorunlu")

    # Dosya uzantı kontrolü
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya formatı: {ext}. "
                   f"Kabul edilen: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Dosya boyut kontrolü
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Dosya çok büyük ({len(content) / 1024 / 1024:.1f} MB). "
                   f"Maksimum: {MAX_FILE_SIZE / 1024 / 1024:.0f} MB"
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Dosya boş")

    try:
        # Parse
        if ext in ('.csv', '.txt'):
            ekstre_rows = parse_ekstre_csv(content, filename)
        else:
            ekstre_rows = parse_ekstre_excel(content, filename)

        if not ekstre_rows:
            raise HTTPException(
                status_code=400,
                detail="Dosyada geçerli cari hesap verisi bulunamadı. "
                       "Beklenen sütunlar: hesap_kodu, karsi_taraf (opsiyonel), bakiye"
            )

        # Mutabakat çalıştır
        result = run_mutabakat(client_id, period_id, ekstre_rows, filename)

        sonuclar = [MutabakatSonuc(**s) for s in result['sonuclar'] if 'not' not in s]
        ozet = MutabakatOzet(**result['ozet'])

        return UploadResponse(
            basarili=True,
            mesaj=f"{len(ekstre_rows)} cari hesap ekstre satırı yüklendi ve "
                  f"mizan ile karşılaştırıldı.",
            yuklenen_satir=len(ekstre_rows),
            sonuclar=sonuclar,
            ozet=ozet,
        )

    except ValueError as e:
        logger.error(f"[CariMutabakat] Upload parse hatası: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[CariMutabakat] Upload hatası: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Cari mutabakat işlemi sırasında hata: {e}"
        )


@router.get("/list")
async def list_mutabakat(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Query(..., description="Dönem"),
    filtre: Optional[str] = Query(None, description="Filtre: tumu/farkli/onaylanan/supheli"),
):
    """
    Kayıtlı mutabakat sonuçlarını listeler.

    Filtre seçenekleri:
    - tumu: Tüm kayıtlar (varsayılan)
    - farkli: Sadece farklı olanlar
    - onaylanan: SMMM tarafından onaylananlar
    - supheli: VUK 323 şüpheli alacak riski olanlar
    """
    if not client_id or not period_id:
        raise HTTPException(status_code=400, detail="client_id ve period_id zorunlu")

    try:
        result = get_mutabakat_list(client_id, period_id, filtre)
        return {
            'basarili': True,
            'kayit_sayisi': len(result),
            'filtre': filtre or 'tumu',
            'sonuclar': result,
        }
    except Exception as e:
        logger.error(f"[CariMutabakat] List hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Liste çekme hatası: {e}")


@router.post("/onayla", response_model=OnayResponse)
async def onayla(body: OnayRequest):
    """
    SMMM toplu onay işlemi.

    Seçili mutabakat satırlarını 'onaylandi' durumuna geçirir.
    Onaylayan SMMM bilgisi ve tarih kaydedilir.
    """
    if not body.ids:
        raise HTTPException(status_code=400, detail="Onaylanacak kayıt ID'leri zorunlu")

    try:
        result = onayla_mutabakat(body.ids, body.onaylayan)
        return OnayResponse(
            basarili=True,
            onaylanan_sayisi=result['onaylanan_sayisi'],
            onaylayan=result['onaylayan'],
            onay_tarihi=result['onay_tarihi'],
        )
    except Exception as e:
        logger.error(f"[CariMutabakat] Onay hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Onay işlemi hatası: {e}")


@router.post("/preview")
async def preview(
    file: UploadFile = File(...),
):
    """
    CSV/Excel dosyasını analiz edip sütun haritası ve örnek satırlar döndürür.
    Mutabakat çalıştırmaz. SMMM preview'ı inceleyip onaylayabilir.

    Akıllı özellikler:
    - 30+ Türkçe/İngilizce sütun başlığı tanır
    - Fuzzy matching (Levenshtein ≤ 2)
    - Muhasebe programı algılama (Logo, Mikro, ETA, Zirve, Luca, Netsis)
    - İlk 5 satır preview
    """
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya formatı: {ext}. "
                   f"Kabul edilen: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Dosya çok büyük ({len(content) / 1024 / 1024:.1f} MB). "
                   f"Maks: {MAX_FILE_SIZE / 1024 / 1024:.0f} MB"
        )
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Dosya boş")

    try:
        result = preview_ekstre(content, filename)

        # column_mapping'i Pydantic uyumlu hale getir
        clean_mapping = {}
        for field, info in result['column_mapping'].items():
            clean_mapping[field] = ColumnMappingItem(
                source_column=info.get('source_column', ''),
                source_index=info.get('source_index', -1),
                confidence=info.get('confidence', 0),
                method=info.get('method', ''),
            )

        return PreviewResponse(
            basarili=True,
            column_mapping=clean_mapping,
            preview_rows=result['preview_rows'],
            total_rows=result['total_rows'],
            detected_delimiter=result['detected_delimiter'],
            detected_encoding=result['detected_encoding'],
            detected_program=result.get('detected_program'),
            raw_headers=result['raw_headers'],
            warnings=result.get('warnings', []),
        )

    except ValueError as e:
        logger.error(f"[CariMutabakat] Preview hatası: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[CariMutabakat] Preview hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Preview hatası: {e}")


@router.post("/confirm")
async def confirm(
    file: UploadFile = File(...),
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Query(..., description="Dönem (ör: 2026-Q1)"),
    column_mapping: str = Query(..., description="JSON encoded column_mapping"),
):
    """
    Preview onaylandıktan sonra, onaylı sütun haritasıyla mutabakat çalıştırır.

    column_mapping parametresi JSON string olarak gönderilir:
    {"hesap_kodu": {"source_column": "HspKodu", "source_index": 0, ...}, ...}
    """
    import json as json_mod

    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya formatı: {ext}"
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Dosya boş")

    # column_mapping parse
    try:
        mapping = json_mod.loads(column_mapping)
    except (json_mod.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="column_mapping geçerli JSON değil")

    if 'hesap_kodu' not in mapping:
        raise HTTPException(status_code=400, detail="column_mapping'de 'hesap_kodu' zorunlu")

    try:
        # Onaylı mapping ile parse et
        ekstre_rows = parse_ekstre_with_mapping(content, filename, mapping)

        if not ekstre_rows:
            raise HTTPException(
                status_code=400,
                detail="Dosyada geçerli cari hesap verisi bulunamadı"
            )

        # Mutabakat çalıştır
        result = run_mutabakat(client_id, period_id, ekstre_rows, filename)

        sonuclar = [MutabakatSonuc(**s) for s in result['sonuclar'] if 'not' not in s]
        ozet = MutabakatOzet(**result['ozet'])

        return UploadResponse(
            basarili=True,
            mesaj=f"{len(ekstre_rows)} cari hesap ekstre satırı yüklendi ve "
                  f"mizan ile karşılaştırıldı.",
            yuklenen_satir=len(ekstre_rows),
            sonuclar=sonuclar,
            ozet=ozet,
        )

    except ValueError as e:
        logger.error(f"[CariMutabakat] Confirm parse hatası: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[CariMutabakat] Confirm hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Mutabakat hatası: {e}")


@router.get("/ozet", response_model=DashboardOzet)
async def ozet(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Query(..., description="Dönem"),
):
    """
    Dashboard için cari mutabakat özeti.

    Toplam hesap, uyumlu/farklı/onaylanan sayıları,
    toplam fark tutarı ve şüpheli alacak sayısını döndürür.
    """
    if not client_id or not period_id:
        raise HTTPException(status_code=400, detail="client_id ve period_id zorunlu")

    try:
        result = get_mutabakat_ozet(client_id, period_id)
        return DashboardOzet(**result)
    except Exception as e:
        logger.error(f"[CariMutabakat] Özet hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Özet çekme hatası: {e}")


# ═══════════════════════════════════════════════════════════
# SMMM KARAR ENDPOINT'LERİ (Pencere 7)
# ═══════════════════════════════════════════════════════════

class KararRequest(BaseModel):
    client_id: str
    period_id: str
    hesap_kodu: str
    karar: str  # RESMI | DEFTER_DISI | BILINMIYOR
    smmm_id: str = "SMMM"
    not_metni: str = ""


class KararItem(BaseModel):
    hesap_kodu: str
    karar: str
    not_metni: str = ""


class TopluKararRequest(BaseModel):
    client_id: str
    period_id: str
    kararlar: List[KararItem]
    smmm_id: str = "SMMM"


@router.post("/karar")
async def karar_kaydet(body: KararRequest):
    """
    Tek SMMM kararı kaydet (UPSERT).

    Karar tipleri:
    - RESMI: Resmi kayıtlarda yer alan fark
    - DEFTER_DISI: Defter dışı nedenlerden kaynaklanan fark
    - BILINMIYOR: Henüz karar verilmemiş
    """
    try:
        result = save_karar(
            client_id=body.client_id,
            period_id=body.period_id,
            hesap_kodu=body.hesap_kodu,
            karar=body.karar,
            smmm_id=body.smmm_id,
            not_metni=body.not_metni,
        )
        return {"basarili": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[SmmmKarar] Kayıt hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Karar kayıt hatası: {e}")


@router.get("/kararlar")
async def kararlar_listele(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Query(..., description="Dönem"),
):
    """
    Tüm SMMM kararlarını getir.

    Returns:
        {hesap_kodu: {karar, not, tarih}} formatında dict
    """
    if not client_id or not period_id:
        raise HTTPException(status_code=400, detail="client_id ve period_id zorunlu")

    try:
        result = get_kararlar(client_id, period_id)
        return {"basarili": True, "kararlar": result}
    except Exception as e:
        logger.error(f"[SmmmKarar] Liste hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Karar listesi hatası: {e}")


@router.post("/kararlar/toplu")
async def kararlar_toplu_kaydet(body: TopluKararRequest):
    """
    Toplu SMMM kararı kaydet.

    localStorage'dan migration için veya toplu karar işlemleri için kullanılır.
    Her kayıt UPSERT mantığıyla çalışır.
    """
    try:
        items = [{"hesap_kodu": k.hesap_kodu, "karar": k.karar, "not_metni": k.not_metni} for k in body.kararlar]
        result = save_kararlar_toplu(
            client_id=body.client_id,
            period_id=body.period_id,
            kararlar=items,
            smmm_id=body.smmm_id,
        )
        return {"basarili": True, **result}
    except Exception as e:
        logger.error(f"[SmmmKarar] Toplu kayıt hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Toplu karar hatası: {e}")
