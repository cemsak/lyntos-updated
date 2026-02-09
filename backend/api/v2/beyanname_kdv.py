"""
LYNTOS API v2 - KDV Beyanname Risk Kontrol Endpoint

Beyanname verilerini beyanname_entries tablosundan çeker,
Mizan ile çapraz kontrol yapar ve risk sinyalleri üretir.

Mevzuat: KDVK Md. 29 (indirim), KDVK Md. 33 (indirilemeyenler)
TDHP: 191 İndirilecek KDV, 391 Hesaplanan KDV, 600 Yurt İçi Satışlar

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

router = APIRouter(prefix="/api/v2/beyanname", tags=["beyanname-kdv-risk"])


# ─── Response Models ───────────────────────────────────────────────

class RiskSignal(BaseModel):
    """Beyanname risk sinyali"""
    kod: str
    baslik: str
    aciklama: str
    severity: str  # "bilgi" | "uyari" | "kritik"
    mevzuat_ref: Optional[str] = None
    mizan_degeri: Optional[float] = None
    beyanname_degeri: Optional[float] = None
    fark: Optional[float] = None
    fark_yuzde: Optional[float] = None


class KDVBeyanname(BaseModel):
    id: int
    donem_yil: Optional[int] = None
    donem_ay: Optional[int] = None
    period_id: str
    matrah: float
    hesaplanan_kdv: float
    indirilecek_kdv: float
    odenecek_kdv: float
    devreden_kdv: float
    source_file: Optional[str] = None
    beyanname_tarihi: Optional[str] = None


class FormulDogrulama(BaseModel):
    """KDVK Md. 29 formül doğrulama"""
    ay: int
    hesaplanan: float
    indirilecek: float
    beklenen_odenecek: float
    gercek_odenecek: float
    beklenen_devreden: float
    gercek_devreden: float
    formul_tutarli: bool
    aciklama: str


class CaprazKontrol(BaseModel):
    """Mizan-Beyanname çapraz kontrol sonucu"""
    kontrol_adi: str
    mizan_hesap: str
    mizan_degeri: float
    beyanname_degeri: float
    fark: float
    fark_yuzde: Optional[float] = None
    tolerans_icinde: bool
    aciklama: str
    mevzuat_ref: str


class KDVOzet(BaseModel):
    toplam_matrah: float
    toplam_hesaplanan_kdv: float
    toplam_indirilecek_kdv: float
    son_devreden_kdv: float
    donem_sayisi: int


class KDVRiskResponse(BaseModel):
    beyannameler: List[KDVBeyanname]
    ozet: KDVOzet
    risk_sinyalleri: List[RiskSignal]
    formul_dogrulama: List[FormulDogrulama]
    capraz_kontroller: List[CaprazKontrol]


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


def _kdv_formul_dogrula(beyannameler: List[KDVBeyanname]) -> List[FormulDogrulama]:
    """
    KDVK Md. 29 formül doğrulama:
    ödenecek = hesaplanan - indirilecek (devreden varsa ödenecek=0)
    """
    sonuclar = []
    onceki_devreden = 0.0

    for b in beyannameler:
        ay = b.donem_ay or 0
        # KDVK Md. 29: Ödenecek = Hesaplanan - İndirilecek
        # Eğer indirilecek > hesaplanan → devreden KDV oluşur, ödenecek = 0
        net = b.hesaplanan_kdv - b.indirilecek_kdv

        if net >= 0:
            beklenen_odenecek = net
            beklenen_devreden = 0.0
        else:
            beklenen_odenecek = 0.0
            beklenen_devreden = abs(net)

        # Tolerans: 1 TL (yuvarlama farkları)
        odenecek_tutarli = abs(beklenen_odenecek - b.odenecek_kdv) < 1.0
        devreden_tutarli = abs(beklenen_devreden - b.devreden_kdv) < 1.0
        formul_tutarli = odenecek_tutarli and devreden_tutarli

        if formul_tutarli:
            aciklama = f"Ay {ay}: Formül tutarlı (KDVK Md. 29)"
        else:
            farklar = []
            if not odenecek_tutarli:
                farklar.append(
                    f"ödenecek fark: {abs(beklenen_odenecek - b.odenecek_kdv):,.2f} TL"
                )
            if not devreden_tutarli:
                farklar.append(
                    f"devreden fark: {abs(beklenen_devreden - b.devreden_kdv):,.2f} TL"
                )
            aciklama = f"Ay {ay}: Formül tutarsız - {', '.join(farklar)}"

        sonuclar.append(FormulDogrulama(
            ay=ay,
            hesaplanan=b.hesaplanan_kdv,
            indirilecek=b.indirilecek_kdv,
            beklenen_odenecek=beklenen_odenecek,
            gercek_odenecek=b.odenecek_kdv,
            beklenen_devreden=beklenen_devreden,
            gercek_devreden=b.devreden_kdv,
            formul_tutarli=formul_tutarli,
            aciklama=aciklama
        ))

        onceki_devreden = b.devreden_kdv

    return sonuclar


def _devreden_tutarlilik_kontrol(beyannameler: List[KDVBeyanname]) -> List[RiskSignal]:
    """Dönemler arası devreden KDV tutarlılığı kontrolü"""
    sinyaller = []
    for i in range(1, len(beyannameler)):
        onceki = beyannameler[i - 1]
        simdiki = beyannameler[i]

        # Önceki ayın devreden KDV'si, sonraki ayda indirilecek'e dahil olmalı
        # Tam eşleşme beklenemez ama büyük farklar sorunlu
        onceki_devreden = onceki.devreden_kdv
        simdiki_indirilecek = simdiki.indirilecek_kdv

        if onceki_devreden > 0 and simdiki_indirilecek > 0:
            # Devreden, indirilecek'in bir parçası olmalı
            if onceki_devreden > simdiki_indirilecek:
                fark = onceki_devreden - simdiki_indirilecek
                sinyaller.append(RiskSignal(
                    kod="KDV-DEV-01",
                    baslik="Devreden KDV Tutarsızlığı",
                    aciklama=(
                        f"Ay {onceki.donem_ay or 0} devreden KDV ({onceki_devreden:,.2f} TL) "
                        f"Ay {simdiki.donem_ay or 0} indirilecek KDV'den ({simdiki_indirilecek:,.2f} TL) "
                        f"büyük. {fark:,.2f} TL fark var."
                    ),
                    severity="uyari",
                    mevzuat_ref="KDVK Md. 29 - İndirim",
                    mizan_degeri=onceki_devreden,
                    beyanname_degeri=simdiki_indirilecek,
                    fark=fark
                ))

    return sinyaller


def _capraz_kontrol_yap(
    conn, client_id: str, period_id: str,
    beyannameler: List[KDVBeyanname]
) -> tuple:
    """Mizan-Beyanname çapraz kontrol"""
    kontroller = []
    sinyaller = []

    # 1) Mizan 600 alacak_toplam vs KDV beyanname matrah toplamı
    mizan_600 = _get_mizan_toplam(conn, client_id, period_id, "600")
    mizan_601 = _get_mizan_toplam(conn, client_id, period_id, "601")
    # Net satış: 600 alacak (brüt) - 600 borç (iade)
    mizan_satis = (mizan_600["alacak_toplam"] - mizan_600["borc_toplam"]
                   + mizan_601["alacak_toplam"] - mizan_601["borc_toplam"])
    beyanname_matrah = sum(b.matrah for b in beyannameler)

    if beyanname_matrah > 0:
        fark = mizan_satis - beyanname_matrah
        fark_yuzde = (fark / beyanname_matrah) * 100 if beyanname_matrah != 0 else 0
        # %5 tolerans veya 10.000 TL
        tolerans = max(beyanname_matrah * 0.05, 10_000)
        tolerans_icinde = abs(fark) <= tolerans

        kontroller.append(CaprazKontrol(
            kontrol_adi="Satış Matrahı Kontrolü",
            mizan_hesap="600+601 (Yurt İçi/Dışı Satışlar)",
            mizan_degeri=round(mizan_satis, 2),
            beyanname_degeri=round(beyanname_matrah, 2),
            fark=round(fark, 2),
            fark_yuzde=round(fark_yuzde, 2),
            tolerans_icinde=tolerans_icinde,
            aciklama=(
                f"Mizan satış toplamı ile KDV beyanname matrah toplamı karşılaştırması. "
                f"Not: Mizan toplam dönem hareketini, beyanname ise beyan edilen matrahı gösterir. "
                f"KDV'siz satışlar (kitap vb.) matrah dışı kalabilir."
            ),
            mevzuat_ref="KDVK Md. 1 - Verginin konusu"
        ))

        if not tolerans_icinde:
            severity = "kritik" if abs(fark_yuzde) > 20 else "uyari"
            sinyaller.append(RiskSignal(
                kod="KDV-CK-01",
                baslik="Satış-Matrah Uyumsuzluğu",
                aciklama=(
                    f"Mizan 600+601 satış toplamı ({mizan_satis:,.2f} TL) ile "
                    f"KDV beyanname matrah toplamı ({beyanname_matrah:,.2f} TL) arasında "
                    f"%{abs(fark_yuzde):.1f} fark var. "
                    f"KDV'siz satışlar, iade/iskontolar bu farkı açıklayabilir."
                ),
                severity=severity,
                mevzuat_ref="KDVK Md. 1, VUK Md. 171",
                mizan_degeri=round(mizan_satis, 2),
                beyanname_degeri=round(beyanname_matrah, 2),
                fark=round(fark, 2),
                fark_yuzde=round(fark_yuzde, 2)
            ))

    # 2) Mizan 391 alacak_toplam vs Beyanname hesaplanan KDV
    mizan_391 = _get_mizan_toplam(conn, client_id, period_id, "391")
    mizan_hesaplanan = mizan_391["alacak_toplam"]
    beyanname_hesaplanan = sum(b.hesaplanan_kdv for b in beyannameler)

    if beyanname_hesaplanan > 0:
        fark = mizan_hesaplanan - beyanname_hesaplanan
        fark_yuzde = (fark / beyanname_hesaplanan) * 100 if beyanname_hesaplanan != 0 else 0
        tolerans = max(beyanname_hesaplanan * 0.02, 100)
        tolerans_icinde = abs(fark) <= tolerans

        kontroller.append(CaprazKontrol(
            kontrol_adi="Hesaplanan KDV Kontrolü",
            mizan_hesap="391 (Hesaplanan KDV)",
            mizan_degeri=round(mizan_hesaplanan, 2),
            beyanname_degeri=round(beyanname_hesaplanan, 2),
            fark=round(fark, 2),
            fark_yuzde=round(fark_yuzde, 2),
            tolerans_icinde=tolerans_icinde,
            aciklama=(
                f"Mizan 391 Hesaplanan KDV toplam hareketi ile "
                f"beyanname hesaplanan KDV toplamı karşılaştırması."
            ),
            mevzuat_ref="KDVK Md. 29 - İndirim mekanizması"
        ))

        if not tolerans_icinde:
            severity = "kritik" if abs(fark_yuzde) > 10 else "uyari"
            sinyaller.append(RiskSignal(
                kod="KDV-CK-02",
                baslik="Hesaplanan KDV Uyumsuzluğu",
                aciklama=(
                    f"Mizan 391 hesaplanan KDV ({mizan_hesaplanan:,.2f} TL) ile "
                    f"beyanname hesaplanan KDV ({beyanname_hesaplanan:,.2f} TL) arasında "
                    f"%{abs(fark_yuzde):.1f} fark tespit edildi."
                ),
                severity=severity,
                mevzuat_ref="KDVK Md. 29",
                mizan_degeri=round(mizan_hesaplanan, 2),
                beyanname_degeri=round(beyanname_hesaplanan, 2),
                fark=round(fark, 2),
                fark_yuzde=round(fark_yuzde, 2)
            ))

    # 3) Mizan 191 borç_toplam vs Beyanname indirilecek KDV
    mizan_191 = _get_mizan_toplam(conn, client_id, period_id, "191")
    mizan_indirilecek = mizan_191["borc_toplam"]
    beyanname_indirilecek = sum(b.indirilecek_kdv for b in beyannameler)

    if beyanname_indirilecek > 0:
        fark = mizan_indirilecek - beyanname_indirilecek
        fark_yuzde = (fark / beyanname_indirilecek) * 100 if beyanname_indirilecek != 0 else 0
        tolerans = max(beyanname_indirilecek * 0.05, 10_000)
        tolerans_icinde = abs(fark) <= tolerans

        kontroller.append(CaprazKontrol(
            kontrol_adi="İndirilecek KDV Kontrolü",
            mizan_hesap="191 (İndirilecek KDV)",
            mizan_degeri=round(mizan_indirilecek, 2),
            beyanname_degeri=round(beyanname_indirilecek, 2),
            fark=round(fark, 2),
            fark_yuzde=round(fark_yuzde, 2),
            tolerans_icinde=tolerans_icinde,
            aciklama=(
                f"Mizan 191 İndirilecek KDV borç toplamı ile beyanname indirilecek KDV "
                f"toplamı karşılaştırması. Devreden KDV farkı yaratabilir."
            ),
            mevzuat_ref="KDVK Md. 29, Md. 33"
        ))

        if not tolerans_icinde:
            severity = "kritik" if abs(fark_yuzde) > 20 else "uyari"
            sinyaller.append(RiskSignal(
                kod="KDV-CK-03",
                baslik="İndirilecek KDV Uyumsuzluğu",
                aciklama=(
                    f"Mizan 191 indirilecek KDV ({mizan_indirilecek:,.2f} TL) ile "
                    f"beyanname indirilecek KDV ({beyanname_indirilecek:,.2f} TL) arasında "
                    f"%{abs(fark_yuzde):.1f} fark. Devreden KDV dahil mi kontrol edilmeli."
                ),
                severity=severity,
                mevzuat_ref="KDVK Md. 29, Md. 33",
                mizan_degeri=round(mizan_indirilecek, 2),
                beyanname_degeri=round(beyanname_indirilecek, 2),
                fark=round(fark, 2),
                fark_yuzde=round(fark_yuzde, 2)
            ))

    # 4) Matrah-Oran uyumu: toplam matrah * ortalama KDV oranı ≈ hesaplanan KDV
    if beyanname_matrah > 0 and beyanname_hesaplanan > 0:
        efektif_oran = beyanname_hesaplanan / beyanname_matrah
        # Beklenen oran aralığı: %1 (düşük oranlı) - %20 (tam oran)
        if efektif_oran < 0.01 or efektif_oran > 0.25:
            sinyaller.append(RiskSignal(
                kod="KDV-OR-01",
                baslik="Anormal KDV Oranı",
                aciklama=(
                    f"Efektif KDV oranı %{efektif_oran * 100:.1f} olarak hesaplandı. "
                    f"Normal aralık: %1-%20. Matrah veya hesaplanan KDV tutarı kontrol edilmeli."
                ),
                severity="uyari",
                mevzuat_ref="KDVK Md. 28 - Oran",
                beyanname_degeri=round(efektif_oran * 100, 2)
            ))

        kontroller.append(CaprazKontrol(
            kontrol_adi="Efektif KDV Oranı Kontrolü",
            mizan_hesap="Matrah/Hesaplanan",
            mizan_degeri=round(efektif_oran * 100, 2),
            beyanname_degeri=20.0,  # Genel KDV oranı
            fark=round((efektif_oran * 100) - 20.0, 2),
            fark_yuzde=None,
            tolerans_icinde=True,  # Bilgi amaçlı
            aciklama=(
                f"Efektif KDV oranı: %{efektif_oran * 100:.1f}. "
                f"Düşük oran KDV'siz veya indirimli oranlı satışları gösterir."
            ),
            mevzuat_ref="KDVK Md. 28"
        ))

    return kontroller, sinyaller


# ─── Endpoint ──────────────────────────────────────────────────────

@router.get("/kdv", response_model=KDVRiskResponse)
async def get_kdv_risk_kontrol(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem ID (örn: 2025-Q1)"),
    tenant_id: str = Query("default", description="Tenant ID")
):
    """
    KDV Beyanname Risk Kontrol

    - Beyanname verilerini beyanname_entries'den çeker
    - KDV formül doğrulama (KDVK Md. 29)
    - Mizan-Beyanname çapraz kontrol (600 vs matrah, 391 vs hesaplanan, 191 vs indirilecek)
    - Dönemler arası devreden tutarlılığı
    - Efektif KDV oran kontrolü
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # KDV beyannamelerini beyanname_entries'den çek
            cursor.execute("""
                SELECT
                    id, period_id, donem_yil, donem_ay,
                    COALESCE(matrah_toplam, 0) as matrah,
                    COALESCE(hesaplanan_vergi, 0) as hesaplanan_kdv,
                    COALESCE(indirimler_toplam, 0) as indirilecek_kdv,
                    COALESCE(odenecek_vergi, 0) as odenecek_kdv,
                    COALESCE(devreden_kdv, 0) as devreden_kdv,
                    source_file,
                    onay_zamani
                FROM beyanname_entries
                WHERE client_id = ? AND period_id = ? AND beyanname_tipi = 'KDV'
                ORDER BY donem_ay
            """, [client_id, period_id])

            beyannameler = []
            for row in cursor.fetchall():
                beyannameler.append(KDVBeyanname(
                    id=row[0],
                    period_id=row[1] or '',
                    donem_yil=row[2],
                    donem_ay=row[3],
                    matrah=row[4] or 0,
                    hesaplanan_kdv=row[5] or 0,
                    indirilecek_kdv=row[6] or 0,
                    odenecek_kdv=row[7] or 0,
                    devreden_kdv=row[8] or 0,
                    source_file=row[9],
                    beyanname_tarihi=row[10]
                ))

            # Özet hesapla
            toplam_matrah = sum(b.matrah for b in beyannameler)
            toplam_hesaplanan = sum(b.hesaplanan_kdv for b in beyannameler)
            toplam_indirilecek = sum(b.indirilecek_kdv for b in beyannameler)
            son_devreden = beyannameler[-1].devreden_kdv if beyannameler else 0

            ozet = KDVOzet(
                toplam_matrah=toplam_matrah,
                toplam_hesaplanan_kdv=toplam_hesaplanan,
                toplam_indirilecek_kdv=toplam_indirilecek,
                son_devreden_kdv=son_devreden,
                donem_sayisi=len(beyannameler)
            )

            # Risk analizleri
            risk_sinyalleri: List[RiskSignal] = []

            # 1) KDV formül doğrulama
            formul_dogrulama = _kdv_formul_dogrula(beyannameler)
            tutarsiz_sayisi = sum(1 for f in formul_dogrulama if not f.formul_tutarli)
            if tutarsiz_sayisi > 0:
                risk_sinyalleri.append(RiskSignal(
                    kod="KDV-FRM-01",
                    baslik="KDV Formül Tutarsızlığı",
                    aciklama=(
                        f"{tutarsiz_sayisi}/{len(formul_dogrulama)} dönemde "
                        f"KDV formülü (ödenecek = hesaplanan - indirilecek) tutarsız."
                    ),
                    severity="uyari",
                    mevzuat_ref="KDVK Md. 29"
                ))

            # 2) Devreden KDV tutarlılığı
            devreden_sinyalleri = _devreden_tutarlilik_kontrol(beyannameler)
            risk_sinyalleri.extend(devreden_sinyalleri)

            # 3) Çapraz kontrol
            capraz_kontroller, capraz_sinyalleri = _capraz_kontrol_yap(
                conn, client_id, period_id, beyannameler
            )
            risk_sinyalleri.extend(capraz_sinyalleri)

            # 4) Beyanname yoksa bilgi sinyali
            if len(beyannameler) == 0:
                risk_sinyalleri.append(RiskSignal(
                    kod="KDV-VER-01",
                    baslik="KDV Beyanname Verisi Yok",
                    aciklama=(
                        f"{period_id} dönemi için KDV beyanname verisi bulunamadı. "
                        f"Beyanname PDF'leri yüklenmediyse veri yükleme yapılmalıdır."
                    ),
                    severity="bilgi",
                    mevzuat_ref="KDVK Md. 40 - Beyanname verme"
                ))

            # Tüm kontroller geçtiyse olumlu sinyal
            gecen_kontrol = sum(1 for k in capraz_kontroller if k.tolerans_icinde)
            toplam_kontrol = len(capraz_kontroller)
            if toplam_kontrol > 0 and gecen_kontrol == toplam_kontrol:
                risk_sinyalleri.insert(0, RiskSignal(
                    kod="KDV-OK-01",
                    baslik="Tüm Çapraz Kontroller Başarılı",
                    aciklama=(
                        f"{gecen_kontrol}/{toplam_kontrol} çapraz kontrol tolerans "
                        f"dahilinde. Mizan-Beyanname uyumu sağlanmış."
                    ),
                    severity="bilgi"
                ))

            return KDVRiskResponse(
                beyannameler=beyannameler,
                ozet=ozet,
                risk_sinyalleri=risk_sinyalleri,
                formul_dogrulama=formul_dogrulama,
                capraz_kontroller=capraz_kontroller
            )

    except Exception as e:
        logger.error(f"KDV risk kontrol hatası: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kdv/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "beyanname-kdv-risk-v2"}
