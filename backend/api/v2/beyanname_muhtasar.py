"""
LYNTOS API v2 - Muhtasar Beyanname Risk Kontrol Endpoint

Muhtasar beyanname verilerini beyanname_entries tablosundan çeker,
Mizan ile çapraz kontrol yapar ve risk sinyalleri üretir.

Mevzuat: GVK Md. 94 (stopaj), 193 SK, 5510 SK (SGK prim)
TDHP: 335 Personele Borçlar, 360 Ödenecek Vergi, 361 SGK Primleri
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from middleware.auth import verify_token, check_client_access
from utils.period_utils import get_period_db
from pydantic import BaseModel
from typing import List, Optional
import logging

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/beyanname", tags=["beyanname-muhtasar-risk"])


# ─── Response Models ───────────────────────────────────────────────

class RiskSignal(BaseModel):
    """Muhtasar risk sinyali"""
    kod: str
    baslik: str
    aciklama: str
    severity: str  # "bilgi" | "uyari" | "kritik"
    mevzuat_ref: Optional[str] = None
    mizan_degeri: Optional[float] = None
    beyanname_degeri: Optional[float] = None
    fark: Optional[float] = None
    fark_yuzde: Optional[float] = None


class MuhtasarBeyanname(BaseModel):
    id: int
    period_id: str
    donem_yil: Optional[int] = None
    donem_ay: Optional[int] = None
    matrah_toplam: float
    hesaplanan_vergi: float
    odenecek_vergi: float
    source_file: Optional[str] = None


class CaprazKontrol(BaseModel):
    """Mizan-Muhtasar çapraz kontrol sonucu"""
    kontrol_adi: str
    mizan_hesap: str
    mizan_degeri: float
    beyanname_degeri: float
    fark: float
    fark_yuzde: Optional[float] = None
    tolerans_icinde: bool
    aciklama: str
    mevzuat_ref: str


class DonemKarsilastirma(BaseModel):
    """Dönemler arası karşılaştırma"""
    ay: int
    odenecek: float
    onceki_ay_odenecek: Optional[float] = None
    degisim_yuzde: Optional[float] = None
    aciklama: str


class MuhtasarOzet(BaseModel):
    toplam_vergi: float
    toplam_odenecek: float
    donem_sayisi: int
    aylik_ortalama: float


class MuhtasarRiskResponse(BaseModel):
    beyannameler: List[MuhtasarBeyanname]
    ozet: MuhtasarOzet
    risk_sinyalleri: List[RiskSignal]
    capraz_kontroller: List[CaprazKontrol]
    donem_karsilastirma: List[DonemKarsilastirma]


# ─── Helper Functions ──────────────────────────────────────────────

def _get_mizan_toplam(conn, client_id: str, period_id: str, hesap_prefix: str) -> dict:
    """Mizan'dan belirli hesap grubu toplam hareketlerini çek"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            COALESCE(SUM(borc_toplam), 0),
            COALESCE(SUM(alacak_toplam), 0),
            COALESCE(SUM(borc_bakiye), 0),
            COALESCE(SUM(alacak_bakiye), 0)
        FROM mizan_entries
        WHERE client_id = ? AND period_id = ? AND hesap_kodu LIKE ?
    """, [client_id, period_id, hesap_prefix + '%'])
    row = cursor.fetchone()
    return {
        "borc_toplam": row[0],
        "alacak_toplam": row[1],
        "borc_bakiye": row[2],
        "alacak_bakiye": row[3]
    }


def _muhtasar_capraz_kontrol(
    conn, client_id: str, period_id: str,
    beyannameler: List[MuhtasarBeyanname]
) -> tuple:
    """Mizan-Muhtasar çapraz kontrol"""
    kontroller = []
    sinyaller = []

    toplam_odenecek = sum(b.odenecek_vergi for b in beyannameler)

    # 1) Mizan 335 (Personele Borçlar) alacak bakiye vs Muhtasar toplam
    #    335 alacak bakiye = brüt ücret + SGK işveren payı toplamı
    #    Muhtasar ödenecek ≈ 335 alacak * stopaj oranı (yaklaşık %15-20)
    mizan_335 = _get_mizan_toplam(conn, client_id, period_id, "335")
    personel_borc = mizan_335["alacak_bakiye"]

    if personel_borc > 0 and toplam_odenecek > 0:
        # Stopaj oranı tahmini: ödenecek / brüt ücret
        tahmini_oran = toplam_odenecek / personel_borc if personel_borc > 0 else 0

        kontroller.append(CaprazKontrol(
            kontrol_adi="Personel Stopajı Oranı Kontrolü",
            mizan_hesap="335 (Personele Borçlar)",
            mizan_degeri=round(personel_borc, 2),
            beyanname_degeri=round(toplam_odenecek, 2),
            fark=round(personel_borc - toplam_odenecek, 2),
            fark_yuzde=round(tahmini_oran * 100, 2),
            tolerans_icinde=True,  # Bilgi amaçlı
            aciklama=(
                f"Mizan 335 personel borçları ({personel_borc:,.2f} TL) üzerinden "
                f"efektif stopaj oranı %{tahmini_oran * 100:.1f}. "
                f"Normal aralık: %10-20 (GVK Md. 94 gelir vergisi dilimi)."
            ),
            mevzuat_ref="GVK Md. 94 - Vergi kesintisi"
        ))

        # Anormal oran kontrolü
        if tahmini_oran < 0.005 or tahmini_oran > 0.35:
            sinyaller.append(RiskSignal(
                kod="MHT-OR-01",
                baslik="Anormal Stopaj Oranı",
                aciklama=(
                    f"Efektif stopaj oranı %{tahmini_oran * 100:.1f}. "
                    f"Normal aralık: %1-25. Matrah tespiti veya oran uygulaması "
                    f"kontrol edilmeli."
                ),
                severity="uyari",
                mevzuat_ref="GVK Md. 94, Md. 103",
                mizan_degeri=round(personel_borc, 2),
                beyanname_degeri=round(toplam_odenecek, 2),
                fark_yuzde=round(tahmini_oran * 100, 2)
            ))

    # 2) Mizan 360 (Ödenecek Vergi ve Fonlar) kontrolü
    mizan_360 = _get_mizan_toplam(conn, client_id, period_id, "360")
    odenecek_vergi_bakiye = mizan_360["alacak_bakiye"]

    if odenecek_vergi_bakiye > 0:
        kontroller.append(CaprazKontrol(
            kontrol_adi="Ödenecek Vergi Bakiyesi Kontrolü",
            mizan_hesap="360 (Ödenecek Vergi ve Fonlar)",
            mizan_degeri=round(odenecek_vergi_bakiye, 2),
            beyanname_degeri=round(toplam_odenecek, 2),
            fark=round(odenecek_vergi_bakiye - toplam_odenecek, 2),
            tolerans_icinde=True,  # 360 tüm vergileri içerir
            aciklama=(
                f"Mizan 360 ödenecek vergi bakiyesi ({odenecek_vergi_bakiye:,.2f} TL). "
                f"Bu hesap sadece muhtasar değil tüm vergi borçlarını içerir."
            ),
            mevzuat_ref="VUK Md. 344 - Vergi ziyaı"
        ))

    # 3) Mizan 361 (Ödenecek SGK Primleri) kontrolü
    mizan_361 = _get_mizan_toplam(conn, client_id, period_id, "361")
    sgk_bakiye = mizan_361["alacak_bakiye"]

    if sgk_bakiye > 0 and personel_borc > 0:
        # SGK oranı: işçi + işveren ≈ %37.5
        sgk_oran = sgk_bakiye / personel_borc if personel_borc > 0 else 0

        kontroller.append(CaprazKontrol(
            kontrol_adi="SGK Prim Oranı Kontrolü",
            mizan_hesap="361 (Ödenecek SGK Primleri)",
            mizan_degeri=round(sgk_bakiye, 2),
            beyanname_degeri=round(personel_borc, 2),
            fark=round(sgk_bakiye - (personel_borc * 0.375), 2),
            fark_yuzde=round(sgk_oran * 100, 2),
            tolerans_icinde=0.20 <= sgk_oran <= 0.50 if sgk_oran > 0 else True,
            aciklama=(
                f"SGK prim oranı: %{sgk_oran * 100:.1f} "
                f"(beklenen: %20-50, işçi+işveren payı)."
            ),
            mevzuat_ref="5510 SK Md. 81 - Prim oranları"
        ))

        if sgk_oran > 0 and (sgk_oran < 0.15 or sgk_oran > 0.55):
            sinyaller.append(RiskSignal(
                kod="MHT-SGK-01",
                baslik="Anormal SGK Prim Oranı",
                aciklama=(
                    f"SGK/personel oranı %{sgk_oran * 100:.1f}. "
                    f"Normal aralık: %20-50. Teşvik uygulaması veya "
                    f"prim hesaplama hatası olabilir."
                ),
                severity="uyari",
                mevzuat_ref="5510 SK Md. 81",
                mizan_degeri=round(sgk_bakiye, 2),
                beyanname_degeri=round(personel_borc, 2),
                fark_yuzde=round(sgk_oran * 100, 2)
            ))

    return kontroller, sinyaller


def _donem_karsilastirma(beyannameler: List[MuhtasarBeyanname]) -> tuple:
    """Dönemler arası karşılaştırma ve tutarlılık"""
    karsilastirmalar = []
    sinyaller = []

    for i, b in enumerate(beyannameler):
        ay = b.donem_ay or 0
        if i == 0:
            karsilastirmalar.append(DonemKarsilastirma(
                ay=ay,
                odenecek=b.odenecek_vergi,
                aciklama=f"Ay {ay}: İlk dönem - karşılaştırma yok"
            ))
        else:
            onceki = beyannameler[i - 1]
            onceki_odenecek = onceki.odenecek_vergi
            degisim = 0.0
            if onceki_odenecek > 0:
                degisim = ((b.odenecek_vergi - onceki_odenecek) / onceki_odenecek) * 100

            aciklama = f"Ay {ay}: Önceki aya göre %{degisim:+.1f} değişim"
            if abs(degisim) > 50:
                aciklama += " (yüksek dalgalanma)"

            karsilastirmalar.append(DonemKarsilastirma(
                ay=ay,
                odenecek=b.odenecek_vergi,
                onceki_ay_odenecek=onceki_odenecek,
                degisim_yuzde=round(degisim, 2),
                aciklama=aciklama
            ))

            # Yüksek dalgalanma sinyali
            if abs(degisim) > 100:
                sinyaller.append(RiskSignal(
                    kod="MHT-DLG-01",
                    baslik="Yüksek Muhtasar Dalgalanması",
                    aciklama=(
                        f"Ay {onceki.donem_ay or 0} → Ay {ay}: "
                        f"Ödenecek vergi %{degisim:+.0f} değişti "
                        f"({onceki_odenecek:,.2f} → {b.odenecek_vergi:,.2f} TL). "
                        f"Personel sayısı veya ücret değişikliği kontrol edilmeli."
                    ),
                    severity="uyari",
                    mevzuat_ref="GVK Md. 94",
                    mizan_degeri=onceki_odenecek,
                    beyanname_degeri=b.odenecek_vergi,
                    fark=round(b.odenecek_vergi - onceki_odenecek, 2),
                    fark_yuzde=round(degisim, 2)
                ))

    return karsilastirmalar, sinyaller


# ─── Endpoint ──────────────────────────────────────────────────────

@router.get("/muhtasar", response_model=MuhtasarRiskResponse)
async def get_muhtasar_risk_kontrol(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token)
):
    """
    Muhtasar Beyanname Risk Kontrol

    - Beyanname verilerini beyanname_entries'den çeker
    - Stopaj-personel borcu çapraz kontrolü (335 vs muhtasar)
    - SGK prim oranı kontrolü (361 vs 335)
    - Dönemler arası tutarlılık (dalgalanma tespiti)
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Muhtasar beyannamelerini çek
            cursor.execute("""
                SELECT
                    id, period_id, donem_yil, donem_ay,
                    COALESCE(matrah_toplam, 0) as matrah_toplam,
                    COALESCE(hesaplanan_vergi, 0) as hesaplanan_vergi,
                    COALESCE(odenecek_vergi, 0) as odenecek_vergi,
                    source_file
                FROM beyanname_entries
                WHERE client_id = ? AND period_id = ? AND beyanname_tipi = 'MUHTASAR'
                ORDER BY donem_ay
            """, [client_id, period_id])

            beyannameler = []
            for row in cursor.fetchall():
                beyannameler.append(MuhtasarBeyanname(
                    id=row[0],
                    period_id=row[1] or '',
                    donem_yil=row[2],
                    donem_ay=row[3],
                    matrah_toplam=row[4] or 0,
                    hesaplanan_vergi=row[5] or 0,
                    odenecek_vergi=row[6] or 0,
                    source_file=row[7]
                ))

            # Özet hesapla
            toplam_vergi = sum(b.hesaplanan_vergi for b in beyannameler)
            toplam_odenecek = sum(b.odenecek_vergi for b in beyannameler)
            donem_sayisi = len(beyannameler)
            aylik_ortalama = toplam_odenecek / donem_sayisi if donem_sayisi > 0 else 0

            ozet = MuhtasarOzet(
                toplam_vergi=toplam_vergi,
                toplam_odenecek=toplam_odenecek,
                donem_sayisi=donem_sayisi,
                aylik_ortalama=round(aylik_ortalama, 2)
            )

            # Risk analizleri
            risk_sinyalleri: List[RiskSignal] = []

            # 1) Çapraz kontrol
            capraz_kontroller, capraz_sinyalleri = _muhtasar_capraz_kontrol(
                conn, client_id, period_id, beyannameler
            )
            risk_sinyalleri.extend(capraz_sinyalleri)

            # 2) Dönem karşılaştırma
            donem_karsilastirma, donem_sinyalleri = _donem_karsilastirma(beyannameler)
            risk_sinyalleri.extend(donem_sinyalleri)

            # 3) Matrah sıfır ama ödenecek var kontrolü
            for b in beyannameler:
                if b.matrah_toplam == 0 and b.odenecek_vergi > 0:
                    risk_sinyalleri.append(RiskSignal(
                        kod="MHT-MTR-01",
                        baslik="Matrah Sıfır - Ödenecek Vergi Var",
                        aciklama=(
                            f"Ay {b.donem_ay or 0}: Matrah toplamı 0 TL ancak "
                            f"ödenecek vergi {b.odenecek_vergi:,.2f} TL. "
                            f"PDF parse hatası olabilir veya beyanname yapısı kontrol edilmeli."
                        ),
                        severity="uyari",
                        mevzuat_ref="GVK Md. 94",
                        beyanname_degeri=b.odenecek_vergi
                    ))

            # 4) Beyanname yoksa bilgi sinyali
            if len(beyannameler) == 0:
                risk_sinyalleri.append(RiskSignal(
                    kod="MHT-VER-01",
                    baslik="Muhtasar Beyanname Verisi Yok",
                    aciklama=(
                        f"{period_id} dönemi için muhtasar beyanname verisi bulunamadı. "
                        f"Beyanname PDF'leri yüklenmediyse veri yükleme yapılmalıdır."
                    ),
                    severity="bilgi",
                    mevzuat_ref="GVK Md. 98 - Beyanname verme"
                ))

            # Olumlu sinyal
            sorunlu = sum(1 for s in risk_sinyalleri if s.severity in ("uyari", "kritik"))
            if len(beyannameler) > 0 and sorunlu == 0:
                risk_sinyalleri.insert(0, RiskSignal(
                    kod="MHT-OK-01",
                    baslik="Muhtasar Kontroller Başarılı",
                    aciklama=(
                        f"{donem_sayisi} dönem muhtasar beyannamesi kontrol edildi. "
                        f"Belirgin risk sinyali tespit edilmedi."
                    ),
                    severity="bilgi"
                ))

            return MuhtasarRiskResponse(
                beyannameler=beyannameler,
                ozet=ozet,
                risk_sinyalleri=risk_sinyalleri,
                capraz_kontroller=capraz_kontroller,
                donem_karsilastirma=donem_karsilastirma
            )

    except Exception as e:
        logger.error(f"Muhtasar risk kontrol hatası: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/muhtasar/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "beyanname-muhtasar-risk-v2"}
