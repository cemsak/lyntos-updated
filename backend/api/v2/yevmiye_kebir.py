"""
LYNTOS API v2 - Defter Cross-Check Endpoint

Muhasebe tekniğine uygun cross-check:
1. Denge Kontrolü: Her defter kendi içinde dengeli mi? (Borç = Alacak)
2. Kebir vs Mizan: Hesap bazında net bakiye karşılaştırması

edefter_entries tablosu E-Defter XML'den parse edilmiş doğru veriyi içerir.
mizan_entries tablosu dönem sonu bakiyelerini içerir.

NO AUTH REQUIRED - Frontend'den doğrudan erişilebilir.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import logging

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/yevmiye-kebir", tags=["yevmiye-kebir"])


# =============================================================================
# MODELS
# =============================================================================

class DengeKontrol(BaseModel):
    """Bir defterin kendi içinde denge durumu"""
    defter: str  # Yevmiye, Kebir, Mizan
    toplam_borc: float
    toplam_alacak: float
    fark: float
    dengeli: bool


class HesapKarsilastirma(BaseModel):
    """Kebir vs Mizan hesap bazında karşılaştırma"""
    hesap_kodu: str
    hesap_adi: Optional[str]
    kebir_borc: float
    kebir_alacak: float
    kebir_net: float
    mizan_borc: float
    mizan_alacak: float
    mizan_net: float
    fark: float
    durum: str  # OK, FARK VAR, SADECE_KEBIR, SADECE_MIZAN


class CrossCheckOzet(BaseModel):
    """Cross-check özet bilgileri"""
    toplam_hesap: int
    esit_hesap: int
    farkli_hesap: int
    sadece_kebir: int
    sadece_mizan: int
    toplam_fark: float


class CrossCheckResponse(BaseModel):
    """Ana cross-check response"""
    denge_kontrol: List[DengeKontrol]
    hesap_karsilastirma: List[HesapKarsilastirma]
    ozet: CrossCheckOzet


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/cross-check", response_model=CrossCheckResponse)
async def get_cross_check(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem ID (örn: 2025-Q1)"),
    tenant_id: str = Query("default", description="Tenant ID")
):
    """
    Muhasebe Defter Cross-Check

    1. DENGE KONTROLÜ:
       - Yevmiye: Borç = Alacak olmalı
       - Kebir: Borç = Alacak olmalı
       - Mizan: Borç = Alacak olmalı

    2. KEBİR vs MİZAN KARŞILAŞTIRMASI:
       - Her hesap için net bakiye (Borç - Alacak) karşılaştırması
       - Kebir'den alt_hesap_kodu kullanılır (detaylı hesap kodu)
       - Farklar tespit edilir

    Muhasebe kuralı: Kebir dönem içi hareketlerin toplamı,
    Mizan ise dönem sonu bakiyelerdir. Net bakiyeler eşleşmelidir.
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # =================================================================
            # 1. DENGE KONTROLÜ
            # =================================================================
            denge_kontroller = []

            # Yevmiye dengesi
            cursor.execute("""
                SELECT
                    COALESCE(SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END), 0) as borc,
                    COALESCE(SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END), 0) as alacak
                FROM edefter_entries
                WHERE client_id = ? AND period_id = ? AND defter_tipi = 'Y'
            """, [client_id, period_id])
            row = cursor.fetchone()
            yev_borc, yev_alacak = row[0] or 0, row[1] or 0
            yev_fark = abs(yev_borc - yev_alacak)
            denge_kontroller.append(DengeKontrol(
                defter="Yevmiye",
                toplam_borc=round(yev_borc, 2),
                toplam_alacak=round(yev_alacak, 2),
                fark=round(yev_fark, 2),
                dengeli=yev_fark < 0.01
            ))

            # Kebir dengesi
            cursor.execute("""
                SELECT
                    COALESCE(SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END), 0) as borc,
                    COALESCE(SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END), 0) as alacak
                FROM edefter_entries
                WHERE client_id = ? AND period_id = ? AND defter_tipi = 'K'
            """, [client_id, period_id])
            row = cursor.fetchone()
            keb_borc, keb_alacak = row[0] or 0, row[1] or 0
            keb_fark = abs(keb_borc - keb_alacak)
            denge_kontroller.append(DengeKontrol(
                defter="Kebir",
                toplam_borc=round(keb_borc, 2),
                toplam_alacak=round(keb_alacak, 2),
                fark=round(keb_fark, 2),
                dengeli=keb_fark < 0.01
            ))

            # Mizan dengesi
            # NOT: Mizan Excel'inde çok seviyeli hesaplar var (100 → 100.01 → 100.01.001)
            # Çift sayımı önlemek için SADECE YAPRAK HESAPLARI kullan
            # (alt hesabı olmayan en detaylı hesaplar)
            cursor.execute("""
                SELECT
                    COALESCE(SUM(borc_bakiye), 0) as borc,
                    COALESCE(SUM(alacak_bakiye), 0) as alacak
                FROM mizan_entries m
                WHERE m.client_id = ? AND m.period_id = ?
                AND m.hesap_kodu != 'GENEL TOPLAM'
                AND m.hesap_kodu NOT LIKE '%::%'
                AND NOT EXISTS (
                    -- Sadece yaprak hesaplar: alt hesabı olmayanlar
                    SELECT 1 FROM mizan_entries sub
                    WHERE sub.client_id = m.client_id
                    AND sub.period_id = m.period_id
                    AND sub.hesap_kodu LIKE m.hesap_kodu || '.%'
                )
            """, [client_id, period_id])
            row = cursor.fetchone()
            miz_borc, miz_alacak = row[0] or 0, row[1] or 0
            miz_fark = abs(miz_borc - miz_alacak)
            denge_kontroller.append(DengeKontrol(
                defter="Mizan",
                toplam_borc=round(miz_borc, 2),
                toplam_alacak=round(miz_alacak, 2),
                fark=round(miz_fark, 2),
                dengeli=miz_fark < 0.01
            ))

            # =================================================================
            # 2. KEBİR vs MİZAN KARŞILAŞTIRMASI
            # =================================================================

            # Kebir'den hesap bazlı toplamlar (alt_hesap_kodu kullanarak)
            cursor.execute("""
                SELECT
                    COALESCE(alt_hesap_kodu, hesap_kodu) as hesap_kodu,
                    MAX(COALESCE(alt_hesap_adi, hesap_adi)) as hesap_adi,
                    COALESCE(SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END), 0) as borc,
                    COALESCE(SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END), 0) as alacak
                FROM edefter_entries
                WHERE client_id = ? AND period_id = ? AND defter_tipi = 'K'
                GROUP BY COALESCE(alt_hesap_kodu, hesap_kodu)
            """, [client_id, period_id])

            kebir_hesaplar = {}
            for row in cursor.fetchall():
                kebir_hesaplar[row[0]] = {
                    'hesap_adi': row[1],
                    'borc': row[2] or 0,
                    'alacak': row[3] or 0,
                    'net': (row[2] or 0) - (row[3] or 0)
                }

            # Mizan'dan hesap bazlı bakiyeler
            # NOT: Sadece yaprak hesapları kullan (çift sayımı önlemek için)
            cursor.execute("""
                SELECT
                    m.hesap_kodu,
                    m.hesap_adi,
                    COALESCE(m.borc_bakiye, 0) as borc,
                    COALESCE(m.alacak_bakiye, 0) as alacak
                FROM mizan_entries m
                WHERE m.client_id = ? AND m.period_id = ?
                AND m.hesap_kodu != 'GENEL TOPLAM'
                AND m.hesap_kodu NOT LIKE '%::%'
                AND NOT EXISTS (
                    -- Sadece yaprak hesaplar: alt hesabı olmayanlar
                    SELECT 1 FROM mizan_entries sub
                    WHERE sub.client_id = m.client_id
                    AND sub.period_id = m.period_id
                    AND sub.hesap_kodu LIKE m.hesap_kodu || '.%'
                )
            """, [client_id, period_id])

            mizan_hesaplar = {}
            for row in cursor.fetchall():
                mizan_hesaplar[row[0]] = {
                    'hesap_adi': row[1],
                    'borc': row[2] or 0,
                    'alacak': row[3] or 0,
                    'net': (row[2] or 0) - (row[3] or 0)
                }

            # Tüm hesapları birleştir
            tum_hesaplar = set(kebir_hesaplar.keys()) | set(mizan_hesaplar.keys())

            hesap_karsilastirma = []
            esit_count = 0
            farkli_count = 0
            sadece_kebir_count = 0
            sadece_mizan_count = 0
            toplam_fark = 0

            for hesap_kodu in sorted(tum_hesaplar):
                keb = kebir_hesaplar.get(hesap_kodu)
                miz = mizan_hesaplar.get(hesap_kodu)

                if keb and miz:
                    # Her ikisinde de var
                    fark = keb['net'] - miz['net']
                    if abs(fark) < 0.01:
                        durum = 'OK'
                        esit_count += 1
                    else:
                        durum = 'FARK VAR'
                        farkli_count += 1
                        toplam_fark += abs(fark)

                    hesap_karsilastirma.append(HesapKarsilastirma(
                        hesap_kodu=hesap_kodu,
                        hesap_adi=keb['hesap_adi'] or miz['hesap_adi'],
                        kebir_borc=round(keb['borc'], 2),
                        kebir_alacak=round(keb['alacak'], 2),
                        kebir_net=round(keb['net'], 2),
                        mizan_borc=round(miz['borc'], 2),
                        mizan_alacak=round(miz['alacak'], 2),
                        mizan_net=round(miz['net'], 2),
                        fark=round(fark, 2),
                        durum=durum
                    ))

                elif keb and not miz:
                    # Sadece Kebir'de var
                    sadece_kebir_count += 1
                    toplam_fark += abs(keb['net'])
                    hesap_karsilastirma.append(HesapKarsilastirma(
                        hesap_kodu=hesap_kodu,
                        hesap_adi=keb['hesap_adi'],
                        kebir_borc=round(keb['borc'], 2),
                        kebir_alacak=round(keb['alacak'], 2),
                        kebir_net=round(keb['net'], 2),
                        mizan_borc=0,
                        mizan_alacak=0,
                        mizan_net=0,
                        fark=round(keb['net'], 2),
                        durum='SADECE_KEBIR'
                    ))

                else:
                    # Sadece Mizan'da var
                    sadece_mizan_count += 1
                    toplam_fark += abs(miz['net'])
                    hesap_karsilastirma.append(HesapKarsilastirma(
                        hesap_kodu=hesap_kodu,
                        hesap_adi=miz['hesap_adi'],
                        kebir_borc=0,
                        kebir_alacak=0,
                        kebir_net=0,
                        mizan_borc=round(miz['borc'], 2),
                        mizan_alacak=round(miz['alacak'], 2),
                        mizan_net=round(miz['net'], 2),
                        fark=round(-miz['net'], 2),
                        durum='SADECE_MIZAN'
                    ))

            # Özet
            ozet = CrossCheckOzet(
                toplam_hesap=len(tum_hesaplar),
                esit_hesap=esit_count,
                farkli_hesap=farkli_count,
                sadece_kebir=sadece_kebir_count,
                sadece_mizan=sadece_mizan_count,
                toplam_fark=round(toplam_fark, 2)
            )

            return CrossCheckResponse(
                denge_kontrol=denge_kontroller,
                hesap_karsilastirma=hesap_karsilastirma,
                ozet=ozet
            )

    except Exception as e:
        logger.error(f"Cross-check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cross-check/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "yevmiye-kebir-v2"}
