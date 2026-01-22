"""
LYNTOS API v2 - Complete Dönem Data Endpoint
Sprint: Architecture Refactor - Phase 1

TEK ENDPOINT - TÜM VERİ
Bu endpoint Dashboard'un ihtiyaç duyduğu TÜM veriyi tek bir response'da döndürür.
Frontend artık localStorage kullanmayacak, her şey buradan gelecek.

Kaynaklar:
1. mizan_entries tablosu (Database)
2. document_uploads tablosu (Yüklenen dosyalar)
3. Hesaplanan analizler (VDK risk, oranlar)
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from pathlib import Path
from datetime import datetime
import sqlite3
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/donem", tags=["donem-complete"])

DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"


# ============== PYDANTIC MODELS ==============

class DonemFileSummary(BaseModel):
    """Yüklenen dosya özeti"""
    id: str
    doc_type: str
    original_filename: str
    parse_status: str
    row_count: Optional[int] = None
    uploaded_at: str


class MizanHesap(BaseModel):
    """Mizan hesabı"""
    hesap_kodu: str
    hesap_adi: Optional[str] = None
    borc_toplam: float = 0
    alacak_toplam: float = 0
    borc_bakiye: float = 0
    alacak_bakiye: float = 0


class MizanSummary(BaseModel):
    """Mizan özeti"""
    hesap_sayisi: int = 0
    toplam_borc: float = 0
    toplam_alacak: float = 0
    fark: float = 0
    dengeli: bool = False
    aktif_toplam: float = 0
    pasif_toplam: float = 0
    ozsermaye: float = 0
    yabanci_kaynak: float = 0
    gelir_toplam: float = 0
    gider_toplam: float = 0
    net_kar: float = 0


class VdkRiskItem(BaseModel):
    """VDK risk kriteri"""
    kriter_kodu: str
    kriter_adi: str
    severity: str  # kritik, uyari, bilgi
    hesaplanan_deger: float
    esik_deger: float
    durum: str  # asim, normal, eksik_veri
    aciklama: str
    oneri: Optional[str] = None
    mevzuat_ref: Optional[str] = None


class DonemAnalysis(BaseModel):
    """Dönem analiz sonuçları"""
    vdk_risks: List[VdkRiskItem] = Field(default_factory=list)
    risk_score: float = 0
    risk_level: str = "bilinmiyor"  # dusuk, orta, yuksek, kritik
    oranlar: Dict[str, Any] = Field(default_factory=dict)


class DonemMeta(BaseModel):
    """Dönem meta bilgisi"""
    smmm_id: str
    client_id: str
    period: str
    status: str = "unknown"  # no_data, partial, ready, error
    has_mizan: bool = False
    has_beyanname: bool = False
    has_banka: bool = False
    file_count: int = 0
    uploaded_at: Optional[str] = None
    analyzed_at: Optional[str] = None


class DonemCompleteResponse(BaseModel):
    """Tam dönem response - TEK ENDPOINT TÜM VERİ"""
    ok: bool = True
    has_data: bool = False
    meta: DonemMeta
    files: List[DonemFileSummary] = Field(default_factory=list)
    mizan: Optional[Dict[str, Any]] = None  # hesaplar + summary
    analysis: Optional[DonemAnalysis] = None
    message: Optional[str] = None


# ============== VDK KRİTERLERİ ==============

VDK_CRITERIA = [
    {
        "kodu": "K-09",
        "adi": "Kasa/Aktif Toplam Oranı",
        "esik": 0.15,
        "hesap_kodu": "100",
        "paylda_prefix": ["100"],
        "paydada": "aktif_toplam",
        "severity": "kritik",
        "aciklama": "Kasa bakiyesinin aktif toplamına oranı",
        "mevzuat": "VUK Md. 171"
    },
    {
        "kodu": "TF-01",
        "adi": "Ortaklardan Alacak/Sermaye",
        "esik": 0.25,
        "hesap_kodu": "131",
        "paylda_prefix": ["131"],
        "paydada": "sermaye",
        "severity": "kritik",
        "aciklama": "Ortaklardan alacakların sermayeye oranı",
        "mevzuat": "Kurumlar Vergisi Kanunu Md. 13"
    },
    {
        "kodu": "OS-01",
        "adi": "İlişkili Kişilere Borç/Özkaynak",
        "esik": 3.0,
        "hesap_kodu": "331",
        "paylda_prefix": ["331"],
        "paydada": "ozsermaye",
        "severity": "kritik",
        "aciklama": "Ortaklara borçların öz sermayeye oranı (örtülü sermaye)",
        "mevzuat": "KVK Md. 12"
    },
    {
        "kodu": "SA-01",
        "adi": "Alacak Tahsilat Süresi",
        "esik": 365,
        "hesap_kodu": "120",
        "paylda_prefix": ["120", "121"],
        "paydada": "ciro",
        "formula": "gun",
        "severity": "uyari",
        "aciklama": "Ticari alacakların ortalama tahsilat süresi",
        "mevzuat": "VDK 2025 Yönergesi"
    },
    {
        "kodu": "SD-01",
        "adi": "Stok Devir Süresi",
        "esik": 365,
        "hesap_kodu": "15",
        "paylda_prefix": ["15"],
        "paydada": "satilan_mal",
        "formula": "gun",
        "severity": "uyari",
        "aciklama": "Stokların ortalama devir süresi",
        "mevzuat": "VDK 2025 Yönergesi"
    },
    {
        "kodu": "KDV-01",
        "adi": "Devreden KDV / Satışlar",
        "esik": 0.18,
        "hesap_kodu": "190",
        "paylda_prefix": ["190"],
        "paydada": "ciro",
        "severity": "uyari",
        "aciklama": "Devreden KDV'nin satışlara oranı",
        "mevzuat": "KDV Kanunu Md. 29"
    },
]


# ============== HELPER FUNCTIONS ==============

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def calculate_mizan_summary(entries: List[Dict]) -> Dict[str, Any]:
    """Mizan hesaplarından özet hesapla"""

    toplam_borc = 0.0
    toplam_alacak = 0.0
    aktif_toplam = 0.0
    pasif_toplam = 0.0
    ozsermaye = 0.0
    yabanci_kaynak = 0.0
    gelir_toplam = 0.0
    gider_toplam = 0.0
    sermaye = 0.0
    ciro = 0.0
    satilan_mal = 0.0

    for entry in entries:
        kod = entry.get('hesap_kodu', '')
        borc = entry.get('borc_bakiye', 0) or 0
        alacak = entry.get('alacak_bakiye', 0) or 0

        toplam_borc += borc
        toplam_alacak += alacak

        # Aktif hesaplar (1xx, 2xx)
        if kod.startswith('1') or kod.startswith('2'):
            aktif_toplam += borc - alacak
        # Kısa vadeli yabancı kaynaklar (3xx)
        elif kod.startswith('3'):
            yabanci_kaynak += alacak - borc
        # Uzun vadeli yabancı kaynaklar (4xx)
        elif kod.startswith('4'):
            yabanci_kaynak += alacak - borc
        # Özkaynaklar (5xx)
        elif kod.startswith('5'):
            ozsermaye += alacak - borc
            if kod.startswith('500'):
                sermaye += alacak - borc
        # Gelirler (6xx)
        elif kod.startswith('6'):
            if kod.startswith('600'):
                ciro += alacak - borc
            elif kod.startswith('620') or kod.startswith('621'):
                satilan_mal += borc - alacak
            gelir_toplam += alacak - borc
        # Giderler (7xx)
        elif kod.startswith('7'):
            gider_toplam += borc - alacak

    pasif_toplam = ozsermaye + yabanci_kaynak
    net_kar = gelir_toplam - gider_toplam
    fark = abs(toplam_borc - toplam_alacak)
    dengeli = fark < 1.0  # 1 TL tolerans

    return {
        "hesap_sayisi": len(entries),
        "toplam_borc": round(toplam_borc, 2),
        "toplam_alacak": round(toplam_alacak, 2),
        "fark": round(fark, 2),
        "dengeli": dengeli,
        "aktif_toplam": round(aktif_toplam, 2),
        "pasif_toplam": round(pasif_toplam, 2),
        "ozsermaye": round(ozsermaye, 2),
        "yabanci_kaynak": round(yabanci_kaynak, 2),
        "gelir_toplam": round(gelir_toplam, 2),
        "gider_toplam": round(gider_toplam, 2),
        "net_kar": round(net_kar, 2),
        "sermaye": round(sermaye, 2),
        "ciro": round(ciro, 2),
        "satilan_mal": round(satilan_mal, 2),
    }


def calculate_vdk_risks(entries: List[Dict], summary: Dict) -> List[Dict]:
    """VDK risk kriterlerini hesapla"""

    risks = []

    # Hesap kodlarına göre toplamları al
    def get_total_by_prefix(prefixes: List[str], is_borc: bool = True) -> float:
        total = 0.0
        for entry in entries:
            kod = entry.get('hesap_kodu', '')
            for prefix in prefixes:
                if kod.startswith(prefix):
                    if is_borc:
                        total += (entry.get('borc_bakiye', 0) or 0)
                    else:
                        total += (entry.get('alacak_bakiye', 0) or 0)
                    break
        return total

    for kriter in VDK_CRITERIA:
        paylda_value = get_total_by_prefix(
            kriter["paylda_prefix"],
            is_borc=kriter["hesap_kodu"].startswith(('1', '2', '7'))
        )

        payda_key = kriter["paydada"]
        payda_value = summary.get(payda_key, 0)

        # Özel hesaplamalar
        if payda_value == 0:
            hesaplanan = 0
            durum = "eksik_veri"
        else:
            if kriter.get("formula") == "gun":
                # Gün hesaplama (365 * oran)
                hesaplanan = (paylda_value / payda_value) * 365
            else:
                hesaplanan = paylda_value / payda_value

            esik = kriter["esik"]
            if hesaplanan > esik:
                durum = "asim"
            else:
                durum = "normal"

        risks.append({
            "kriter_kodu": kriter["kodu"],
            "kriter_adi": kriter["adi"],
            "severity": kriter["severity"] if durum == "asim" else "bilgi",
            "hesaplanan_deger": round(hesaplanan, 4),
            "esik_deger": kriter["esik"],
            "durum": durum,
            "aciklama": kriter["aciklama"],
            "oneri": f"Bu oran {kriter['esik']} üzerinde olmamalı" if durum == "asim" else None,
            "mevzuat_ref": kriter.get("mevzuat")
        })

    return risks


def calculate_risk_score(vdk_risks: List[Dict]) -> tuple:
    """Toplam risk skoru hesapla"""

    kritik_count = sum(1 for r in vdk_risks if r["severity"] == "kritik" and r["durum"] == "asim")
    uyari_count = sum(1 for r in vdk_risks if r["severity"] == "uyari" and r["durum"] == "asim")

    # Skor: 0-100
    score = min(100, kritik_count * 25 + uyari_count * 10)

    if score >= 75:
        level = "kritik"
    elif score >= 50:
        level = "yuksek"
    elif score >= 25:
        level = "orta"
    else:
        level = "dusuk"

    return score, level


# ============== MAIN ENDPOINT ==============

@router.get("/{client_id}/{period}", response_model=DonemCompleteResponse)
async def get_donem_complete(
    client_id: str,
    period: str,
    smmm_id: str = Query(default="HKOZKAN"),
    include_accounts: bool = Query(default=True, description="Hesap listesini dahil et"),
    limit_accounts: int = Query(default=500, description="Maksimum hesap sayısı")
):
    """
    TEK ENDPOINT - TÜM DÖNEM VERİSİ

    Dashboard için gereken tüm veriyi tek bir response'da döndürür:
    - Meta bilgiler (dönem durumu, dosya sayısı)
    - Yüklenen dosyalar listesi
    - Mizan hesapları ve özet
    - VDK risk analizi
    - Mali oranlar

    Frontend artık localStorage kullanmayacak, her şey buradan gelecek.

    Örnek: GET /api/v2/donem/OZKAN_KIRTASIYE/2025-Q1?smmm_id=HKOZKAN
    """

    conn = get_db()
    cursor = conn.cursor()

    try:
        # 1. DOSYALARI ÇEK
        cursor.execute("""
            SELECT id, doc_type, original_filename, parse_status, size_bytes, created_at
            FROM document_uploads
            WHERE client_id = ? AND period_id = ? AND tenant_id = ? AND is_active = 1
            ORDER BY doc_type, created_at DESC
        """, (client_id, period, smmm_id))

        file_rows = cursor.fetchall()
        files = [
            DonemFileSummary(
                id=row["id"],
                doc_type=row["doc_type"],
                original_filename=row["original_filename"],
                parse_status=row["parse_status"] or "UNKNOWN",
                row_count=None,
                uploaded_at=row["created_at"] or ""
            )
            for row in file_rows
        ]

        # Dosya türlerine göre kontrol
        doc_types = set(f.doc_type for f in files)
        has_mizan = "MIZAN" in doc_types
        has_beyanname = "BEYANNAME" in doc_types
        has_banka = "BANKA" in doc_types

        # 2. MİZAN VERİSİNİ ÇEK
        cursor.execute("""
            SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            ORDER BY hesap_kodu
            LIMIT ?
        """, (client_id, period, limit_accounts))

        mizan_rows = cursor.fetchall()

        mizan_data = None
        analysis_data = None

        if mizan_rows:
            # Mizan hesaplarını dönüştür
            mizan_entries = [
                {
                    "hesap_kodu": row["hesap_kodu"],
                    "hesap_adi": row["hesap_adi"],
                    "borc_bakiye": row["borc_bakiye"] or 0,
                    "alacak_bakiye": row["alacak_bakiye"] or 0,
                }
                for row in mizan_rows
            ]

            # Özet hesapla
            summary = calculate_mizan_summary(mizan_entries)

            # VDK risk analizi
            vdk_risks = calculate_vdk_risks(mizan_entries, summary)
            risk_score, risk_level = calculate_risk_score(vdk_risks)

            mizan_data = {
                "summary": summary,
                "hesaplar": mizan_entries if include_accounts else [],
            }

            analysis_data = DonemAnalysis(
                vdk_risks=[VdkRiskItem(**r) for r in vdk_risks],
                risk_score=risk_score,
                risk_level=risk_level,
                oranlar={
                    "cari_oran": round(summary["aktif_toplam"] / max(summary["yabanci_kaynak"], 1), 2),
                    "likidite_oran": round((summary["aktif_toplam"] - summary.get("stoklar", 0)) / max(summary["yabanci_kaynak"], 1), 2),
                    "borc_ozkaynak": round(summary["yabanci_kaynak"] / max(summary["ozsermaye"], 1), 2),
                    "net_kar_marji": round(summary["net_kar"] / max(summary["ciro"], 1) * 100, 2),
                }
            )
            has_mizan = True

        # 3. STATUS BELİRLE
        if not files and not mizan_rows:
            status = "no_data"
            has_data = False
            message = "Bu dönem için veri yüklenmemiş"
        elif mizan_rows and files:
            status = "ready"
            has_data = True
            message = None
        elif files:
            status = "partial"
            has_data = True
            message = "Dosyalar yüklendi, mizan verisi bekleniyor"
        else:
            status = "partial"
            has_data = True
            message = "Mizan verisi var, dosya yüklemesi eksik"

        # 4. UPLOAD TARİHİNİ BUL
        uploaded_at = None
        if files:
            uploaded_at = min(f.uploaded_at for f in files if f.uploaded_at)

        # 5. RESPONSE OLUŞTUR
        meta = DonemMeta(
            smmm_id=smmm_id,
            client_id=client_id,
            period=period,
            status=status,
            has_mizan=has_mizan,
            has_beyanname=has_beyanname,
            has_banka=has_banka,
            file_count=len(files),
            uploaded_at=uploaded_at,
            analyzed_at=datetime.utcnow().isoformat() if mizan_data else None
        )

        return DonemCompleteResponse(
            ok=True,
            has_data=has_data,
            meta=meta,
            files=files,
            mizan=mizan_data,
            analysis=analysis_data,
            message=message
        )

    except Exception as e:
        logger.error(f"Dönem verisi yüklenirken hata: {e}")
        raise HTTPException(status_code=500, detail=f"Veri yükleme hatası: {str(e)}")
    finally:
        conn.close()


@router.delete("/{client_id}/{period}")
async def delete_donem_data(
    client_id: str,
    period: str,
    smmm_id: str = Query(default="HKOZKAN"),
    confirm: bool = Query(default=False, description="Silme işlemini onayla")
):
    """
    Dönem verisini sil.

    DİKKAT: Bu işlem geri alınamaz!
    confirm=true parametresi gereklidir.
    """

    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Silme işlemi için confirm=true parametresi gerekli"
        )

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Mizan verilerini sil
        cursor.execute("""
            DELETE FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period))
        mizan_deleted = cursor.rowcount

        # Dosya kayıtlarını pasife çek (soft delete)
        cursor.execute("""
            UPDATE document_uploads
            SET is_active = 0, updated_at = ?
            WHERE client_id = ? AND period_id = ? AND tenant_id = ?
        """, (datetime.utcnow().isoformat(), client_id, period, smmm_id))
        files_deleted = cursor.rowcount

        conn.commit()

        return {
            "ok": True,
            "message": f"Dönem verisi silindi",
            "deleted": {
                "mizan_entries": mizan_deleted,
                "files": files_deleted
            }
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Silme hatası: {str(e)}")
    finally:
        conn.close()


@router.get("/list/{smmm_id}")
async def list_donem_data(smmm_id: str = "HKOZKAN"):
    """
    SMMM'nin tüm müşteri/dönem kombinasyonlarını listele.

    Dashboard'un dönem seçici için kullanacağı endpoint.
    """

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Müşterileri al
        cursor.execute("""
            SELECT DISTINCT client_id, period_id,
                   COUNT(*) as file_count,
                   MAX(created_at) as last_upload
            FROM document_uploads
            WHERE tenant_id = ? AND is_active = 1
            GROUP BY client_id, period_id
            ORDER BY client_id, period_id DESC
        """, (smmm_id,))

        rows = cursor.fetchall()

        # Müşteri bazında grupla
        clients = {}
        for row in rows:
            client_id = row["client_id"]
            if client_id not in clients:
                clients[client_id] = []
            clients[client_id].append({
                "period": row["period_id"],
                "file_count": row["file_count"],
                "last_upload": row["last_upload"]
            })

        return {
            "smmm_id": smmm_id,
            "client_count": len(clients),
            "clients": clients
        }

    finally:
        conn.close()
