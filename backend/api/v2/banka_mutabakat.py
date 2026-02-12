"""
LYNTOS API v2 - Banka Mutabakat Endpoint
Mizan 102 hesapları ile banka bakiyelerini karşılaştırır.

MAXİM DÜZELTME: Doğru dönem sonu bakiye hesaplama
- MAX(id) yerine TARİH bazlı sıralama
- DD.MM.YYYY formatını YYYYMMDD'ye çevirerek doğru sıralama
- Eksik banka verisi için uyarı
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from utils.period_utils import get_period_db
from pydantic import BaseModel
from typing import List, Optional
import logging

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from middleware.auth import verify_token, check_client_access
from database.db import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/banka", tags=["banka-mutabakat"])


class MutabakatSatir(BaseModel):
    hesap_kodu: str
    hesap_adi: Optional[str]
    banka_adi: Optional[str]
    mizan_bakiye: float
    banka_bakiye: float
    fark: float
    fark_yuzde: float  # Yüzdesel fark
    durum: str  # OK, UYARI, FARK
    aciklama: Optional[str]  # Fark açıklaması


class MutabakatOzet(BaseModel):
    toplam_hesap: int
    esit_hesap: int
    farkli_hesap: int


class MutabakatResponse(BaseModel):
    mutabakat: List[MutabakatSatir]
    ozet: MutabakatOzet
    toplam_fark: float


def tarih_to_sortable(tarih: str) -> str:
    """DD.MM.YYYY formatını YYYYMMDD'ye çevirir"""
    if not tarih or len(tarih) < 10:
        return "00000000"
    try:
        parts = tarih.split('.')
        if len(parts) == 3:
            return f"{parts[2]}{parts[1]}{parts[0]}"
    except (ValueError, IndexError, AttributeError):
        pass
    return "00000000"


@router.get("/mutabakat", response_model=MutabakatResponse)
async def get_banka_mutabakat(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token),
):
    """
    Banka - Mizan mutabakatını hesapla.

    Mizan'daki 102.xx hesaplarını banka dönem sonu bakiyeleri ile karşılaştırır.

    DÜZELTME: Tarih bazlı sıralama ile doğru dönem sonu bakiye hesaplanır.
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # 1. Mizan'dan 102 hesaplarını al (102.xx formatında, ana hesap hariç)
            cursor.execute("""
                SELECT
                    hesap_kodu,
                    hesap_adi,
                    COALESCE(borc_toplam, 0) - COALESCE(alacak_toplam, 0) as mizan_bakiye
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ?
                AND hesap_kodu LIKE '102.%'
                ORDER BY hesap_kodu
            """, [client_id, period_id])

            mizan_hesaplar = {}
            for row in cursor.fetchall():
                mizan_hesaplar[row[0]] = {
                    'hesap_adi': row[1],
                    'mizan_bakiye': row[2] or 0
                }

            # 2. Banka dönem sonu bakiyelerini al - TARİH BAZLI SIRALAMA
            # DD.MM.YYYY formatını YYYYMMDD'ye çevirerek sırala
            # MAXİM DÜZELTME v2: Mükerrer kayıtlar olabilir,
            # önce en son tarihi bul, sonra o tarihteki EN KÜÇÜK ID'yi al
            # (CSV yukarıdan aşağı import edildiği için ilk kayıt = gün sonu bakiye)
            banka_bakiyeler = {}

            for hesap_kodu in mizan_hesaplar.keys():
                # Önce en son tarihi bul
                cursor.execute("""
                    SELECT MAX(substr(tarih, 7, 4) || substr(tarih, 4, 2) || substr(tarih, 1, 2))
                    FROM bank_transactions
                    WHERE client_id = ? AND period_id = ? AND hesap_kodu = ?
                """, [client_id, period_id, hesap_kodu])

                max_tarih_row = cursor.fetchone()
                if not max_tarih_row or not max_tarih_row[0]:
                    continue

                max_tarih_sortable = max_tarih_row[0]  # YYYYMMDD formatında

                # Şimdi bu tarihteki EN KÜÇÜK id'li kaydı al (gün sonu bakiye)
                cursor.execute("""
                    SELECT
                        hesap_kodu,
                        banka_adi,
                        bakiye as son_bakiye,
                        tarih
                    FROM bank_transactions
                    WHERE client_id = ? AND period_id = ? AND hesap_kodu = ?
                    AND substr(tarih, 7, 4) || substr(tarih, 4, 2) || substr(tarih, 1, 2) = ?
                    ORDER BY id ASC
                    LIMIT 1
                """, [client_id, period_id, hesap_kodu, max_tarih_sortable])

                row = cursor.fetchone()
                if row:
                    # MAXİM DÜZELTME v3: Banka adı NULL ise Mizan'dan hesap adını kullan
                    banka_adi = row[1]
                    if not banka_adi or banka_adi == 'None':
                        # Mizan'daki hesap adından banka adını çıkar
                        mizan_hesap_adi = mizan_hesaplar.get(hesap_kodu, {}).get('hesap_adi', '')
                        if mizan_hesap_adi:
                            # "ZİRAATBANK 55976192-5004 NOLU HESAP" -> "ZİRAATBANK"
                            banka_adi = mizan_hesap_adi.split()[0] if mizan_hesap_adi else 'Bilinmeyen'
                        else:
                            banka_adi = 'Bilinmeyen'

                    banka_bakiyeler[hesap_kodu] = {
                        'banka_adi': banka_adi,
                        'banka_bakiye': row[2] or 0,
                        'son_tarih': row[3]
                    }

            # 3. Mutabakat tablosu oluştur
            mutabakat = []
            toplam_fark = 0
            esit_count = 0
            farkli_count = 0

            for hesap_kodu in sorted(mizan_hesaplar.keys()):
                mizan_data = mizan_hesaplar[hesap_kodu]
                banka_data = banka_bakiyeler.get(hesap_kodu)

                mizan_bakiye = mizan_data['mizan_bakiye']

                if banka_data:
                    banka_bakiye = banka_data['banka_bakiye']
                    banka_adi = banka_data['banka_adi']
                    fark = mizan_bakiye - banka_bakiye

                    # Yüzdesel fark
                    if mizan_bakiye != 0:
                        fark_yuzde = abs(fark) / abs(mizan_bakiye) * 100
                    else:
                        fark_yuzde = 100 if banka_bakiye != 0 else 0

                    # Durum belirleme
                    if abs(fark) < 1:  # 1 TL tolerans
                        durum = 'OK'
                        esit_count += 1
                        aciklama = None
                    elif fark_yuzde < 5:
                        durum = 'UYARI'
                        farkli_count += 1
                        aciklama = f"Küçük fark: %{fark_yuzde:.1f}"
                    else:
                        durum = 'FARK'
                        farkli_count += 1
                        aciklama = f"Büyük fark: %{fark_yuzde:.1f} - Kontrol gerekli"
                else:
                    # Banka verisi yok
                    banka_bakiye = 0
                    banka_adi = None
                    fark = mizan_bakiye
                    fark_yuzde = 100
                    durum = 'FARK'
                    farkli_count += 1
                    aciklama = "⚠️ Banka ekstresi yüklenmemiş"

                toplam_fark += abs(fark)

                mutabakat.append(MutabakatSatir(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=mizan_data['hesap_adi'],
                    banka_adi=banka_adi,
                    mizan_bakiye=mizan_bakiye,
                    banka_bakiye=banka_bakiye,
                    fark=fark,
                    fark_yuzde=round(fark_yuzde, 1),
                    durum=durum,
                    aciklama=aciklama
                ))

            ozet = MutabakatOzet(
                toplam_hesap=len(mutabakat),
                esit_hesap=esit_count,
                farkli_hesap=farkli_count
            )

            return MutabakatResponse(
                mutabakat=mutabakat,
                ozet=ozet,
                toplam_fark=round(toplam_fark, 2)
            )

    except Exception as e:
        logger.error(f"Banka mutabakat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mutabakat/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "banka-mutabakat-v2"}
