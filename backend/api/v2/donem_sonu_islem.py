"""
LYNTOS API v2 - Dönem Sonu İşlemleri Endpoint'leri

3 temel dönem sonu işlemi:
1. Amortisman Hesaplama (VUK Md. 315/316)
2. Reeskont Hesaplama (VUK Md. 281/285)
3. Şüpheli Alacak Karşılığı (VUK Md. 323)

Mevzuat: VUK Md. 315/316, 281/285, 323, 288
TDHP: 250-255 MDV, 257 Birikmiş Amortisman, 121 Alacak Senetleri,
      321 Borç Senetleri, 120 Alıcılar, 654 Karşılık Giderleri
"""

from fastapi import APIRouter, Query, Depends
from utils.period_utils import get_period_db
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime
import sqlite3
import json
import logging

from middleware.auth import verify_token, check_client_access

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v2/donem-sonu-islem",
    tags=["donem-sonu-islem"]
)

DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"
CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "economic_rates.json"


def _get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _get_economic_rates() -> Dict:
    """economic_rates.json'dan faiz oranlarını oku"""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Ekonomik oranlar okunamadı: {e}")
        return {}


# ═══════════════════════════════════════════════════════════════
# 1. AMORTİSMAN HESAPLAMA - VUK Md. 315/316
# ═══════════════════════════════════════════════════════════════

# VUK amortisman oranları (ana grup bazında varsayılan)
# Gerçek uygulamada Maliye Bakanlığı'nın yayınladığı tablolar kullanılır
VUK_AMORTISMAN_ORANLARI = {
    "252": {"oran": 0.02, "omur": 50, "aciklama": "Binalar (50 yıl)"},
    "253": {"oran": 0.10, "omur": 10, "aciklama": "Tesis, Makine ve Cihazlar (10 yıl)"},
    "254": {"oran": 0.20, "omur": 5, "aciklama": "Taşıtlar (5 yıl)"},
    "255": {"oran": 0.20, "omur": 5, "aciklama": "Demirbaşlar (5 yıl)"},
}


@router.get("/amortisman/hesapla")
async def hesapla_amortisman(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token),
):
    """
    VUK Md. 315/316 - Amortisman Hesaplama

    Mizandaki MDV (250-255) ve Birikmiş Amortisman (257) bakiyelerinden
    dönem amortisman tutarını hesaplar. Normal amortisman yöntemi kullanılır.

    NOT: 250 (Arazi/Arsalar) amortismana tabi değildir.
    NOT: Q1 dönemi için yıllık amortismanın 3/12'si hesaplanır.
    """
    await check_client_access(user, client_id)
    conn = _get_db()
    try:
        cursor = conn.cursor()

        # MDV hesapları (250-255, 257 hariç)
        cursor.execute("""
            SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            AND hesap_kodu LIKE '25%'
            ORDER BY hesap_kodu
        """, (client_id, period_id))

        rows = cursor.fetchall()
        if not rows:
            return {
                "ok": False,
                "reason_tr": "Mizanda MDV hesabı bulunamadı",
                "mdv_listesi": [],
                "toplam_amortisman": 0,
                "yeni_donem_amortisman": 0,
            }

        # MDV ve amortisman ayır
        mdv_bakiyeleri = {}  # grup -> toplam
        amort_bakiyeleri = {}  # grup -> toplam

        for row in rows:
            kod = row["hesap_kodu"]
            borc = row["borc_bakiye"] or 0
            alacak = row["alacak_bakiye"] or 0

            if kod.startswith("257"):
                # Birikmiş amortisman - ana grubunu bul
                # 257.101 → 252, 257.90.08 → 254
                alt = kod[4:]  # .101, .90.08, .2024.01 vb.
                if alt.startswith("90") or alt.startswith(".90"):
                    grup = "254"  # Taşıtlar
                elif alt.startswith("10"):
                    grup = "252"  # Binalar
                else:
                    # Yıl bazlı alt kodlar (255.2024.01 → 257.2024.01)
                    grup = "255"  # Varsayılan demirbaş
                amort_bakiyeleri[grup] = amort_bakiyeleri.get(grup, 0) + alacak
            elif kod.startswith("250"):
                continue  # Arazi amortismana tabi değil
            else:
                grup = kod[:3]
                mdv_bakiyeleri[grup] = mdv_bakiyeleri.get(grup, 0) + borc

        # Dönem çarpanı (Q1 = 3/12 = 0.25)
        donem_carpani = 1.0
        if "Q1" in period_id:
            donem_carpani = 3 / 12
        elif "Q2" in period_id:
            donem_carpani = 6 / 12
        elif "Q3" in period_id:
            donem_carpani = 9 / 12

        # Amortisman hesapla
        mdv_listesi = []
        toplam_yillik = 0
        toplam_donem = 0

        for grup, mdv_toplam in mdv_bakiyeleri.items():
            oran_bilgi = VUK_AMORTISMAN_ORANLARI.get(grup)
            if not oran_bilgi:
                continue

            amort_toplam = amort_bakiyeleri.get(grup, 0)
            net_defter = mdv_toplam - amort_toplam

            # Tamamen amorti edilmiş mi?
            if net_defter <= 0:
                mdv_listesi.append({
                    "grup": grup,
                    "grup_adi": oran_bilgi["aciklama"],
                    "mdv_bakiye": round(mdv_toplam, 2),
                    "birikmis_amortisman": round(amort_toplam, 2),
                    "net_defter_degeri": 0,
                    "yillik_amortisman": 0,
                    "donem_amortisman": 0,
                    "not": "Tamamen amorti edilmiş",
                })
                continue

            yillik = mdv_toplam * oran_bilgi["oran"]
            # Yıllık amortisman net defter değerini aşamaz
            yillik = min(yillik, net_defter)
            donem = yillik * donem_carpani

            toplam_yillik += yillik
            toplam_donem += donem

            mdv_listesi.append({
                "grup": grup,
                "grup_adi": oran_bilgi["aciklama"],
                "mdv_bakiye": round(mdv_toplam, 2),
                "birikmis_amortisman": round(amort_toplam, 2),
                "net_defter_degeri": round(net_defter, 2),
                "amortisman_orani": oran_bilgi["oran"],
                "faydali_omur": oran_bilgi["omur"],
                "yillik_amortisman": round(yillik, 2),
                "donem_amortisman": round(donem, 2),
            })

        return {
            "ok": True,
            "client_id": client_id,
            "donem": period_id,
            "donem_carpani": donem_carpani,
            "mdv_listesi": mdv_listesi,
            "toplam_amortisman": round(toplam_donem, 2),
            "yillik_amortisman": round(toplam_yillik, 2),
            "muhasebe_kaydi": {
                "aciklama": f"{period_id} Dönemi Amortisman Gideri",
                "borc_hesap": "760/770 Amortisman Giderleri (ilgili fonksiyona göre)",
                "borc_tutar": round(toplam_donem, 2),
                "alacak_hesap": "257 Birikmiş Amortismanlar",
                "alacak_tutar": round(toplam_donem, 2),
                "mevzuat_ref": "VUK Md. 315 (Normal Amortisman), VUK Md. 316 (Azalan Bakiyeler)"
            } if toplam_donem > 0 else None,
            "mevzuat": "VUK Md. 315/316",
            "computed_at": datetime.utcnow().isoformat() + "Z",
        }

    except Exception as e:
        logger.error(f"Amortisman hesaplama hatası: {e}")
        return {
            "ok": False,
            "reason_tr": f"Amortisman hesaplanamadı: {str(e)}",
            "mdv_listesi": [],
            "toplam_amortisman": 0,
            "yillik_amortisman": 0,
        }
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════
# 2. REESKONT HESAPLAMA - VUK Md. 281/285
# ═══════════════════════════════════════════════════════════════

@router.get("/reeskont/hesapla")
async def hesapla_reeskont(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token),
):
    """
    VUK Md. 281/285 - Reeskont Hesaplama

    Alacak senetleri (121) ve borç senetleri (321) üzerinden
    reeskont (iskonto) tutarını hesaplar.

    Formül: reeskont = senet_tutarı × reeskont_faizi × (kalan_gün / 365)
    Reeskont faizi: TCMB politika faizi (economic_rates.json'dan)

    NOT: Gerçek senet vadesi bilinmediğinden, dönem sonu bakiyesi üzerinden
    kalan gün tahmini yapılır. Kesin hesaplama için senet vadesi gereklidir.
    """
    await check_client_access(user, client_id)
    rates = _get_economic_rates()
    reeskont_faizi = rates.get("faiz_oranlari", {}).get("reeskont_faizi", 0.55)

    conn = _get_db()
    try:
        cursor = conn.cursor()

        # 121 Alacak Senetleri ve 321 Borç Senetleri
        cursor.execute("""
            SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            AND (hesap_kodu LIKE '121%' OR hesap_kodu LIKE '321%')
            ORDER BY hesap_kodu
        """, (client_id, period_id))

        rows = cursor.fetchall()

        alacak_senet_toplam = 0.0
        borc_senet_toplam = 0.0
        senet_detay = []

        for row in rows:
            kod = row["hesap_kodu"]
            adi = row["hesap_adi"] or ""
            borc = row["borc_bakiye"] or 0
            alacak = row["alacak_bakiye"] or 0

            if kod.startswith("121"):
                bakiye = borc  # Alacak senetleri borç bakiye verir
                alacak_senet_toplam += bakiye
                senet_detay.append({
                    "hesap_kodu": kod,
                    "hesap_adi": adi,
                    "bakiye": round(bakiye, 2),
                    "tip": "alacak_senedi",
                })
            elif kod.startswith("321"):
                bakiye = alacak  # Borç senetleri alacak bakiye verir
                borc_senet_toplam += bakiye
                senet_detay.append({
                    "hesap_kodu": kod,
                    "hesap_adi": adi,
                    "bakiye": round(bakiye, 2),
                    "tip": "borc_senedi",
                })

        # Kalan gün tahmini: dönem sonu itibariyle ortalama 90 gün
        # Gerçek hesaplama için her senedin vadesi bilinmelidir
        tahmini_kalan_gun = 90

        # Reeskont hesaplama
        alacak_reeskont = alacak_senet_toplam * reeskont_faizi * (tahmini_kalan_gun / 365)
        borc_reeskont = borc_senet_toplam * reeskont_faizi * (tahmini_kalan_gun / 365)
        net_gelir_etkisi = borc_reeskont - alacak_reeskont

        senet_var = alacak_senet_toplam > 0 or borc_senet_toplam > 0

        return {
            "ok": True,
            "client_id": client_id,
            "donem": period_id,
            "reeskont_faizi": reeskont_faizi,
            "tahmini_kalan_gun": tahmini_kalan_gun,
            "senet_detay": senet_detay,
            "alacak_senet_toplam": round(alacak_senet_toplam, 2),
            "borc_senet_toplam": round(borc_senet_toplam, 2),
            "alacak_reeskont": round(alacak_reeskont, 2),
            "borc_reeskont": round(borc_reeskont, 2),
            "net_gelir_etkisi": round(net_gelir_etkisi, 2),
            "senet_mevcut": senet_var,
            "muhasebe_kaydi": [
                {
                    "aciklama": "Alacak Senetleri Reeskontu",
                    "borc_hesap": "657 Reeskont Faiz Giderleri",
                    "borc_tutar": round(alacak_reeskont, 2),
                    "alacak_hesap": "122 Alacak Senetleri Reeskontu (-)",
                    "alacak_tutar": round(alacak_reeskont, 2),
                    "mevzuat_ref": "VUK Md. 281",
                } if alacak_reeskont > 0 else None,
                {
                    "aciklama": "Borç Senetleri Reeskontu",
                    "borc_hesap": "322 Borç Senetleri Reeskontu (-)",
                    "borc_tutar": round(borc_reeskont, 2),
                    "alacak_hesap": "647 Reeskont Faiz Gelirleri",
                    "alacak_tutar": round(borc_reeskont, 2),
                    "mevzuat_ref": "VUK Md. 285",
                } if borc_reeskont > 0 else None,
            ],
            "onemli_not": (
                "Reeskont hesaplaması senet vadesi bilinmediğinden tahmini "
                f"{tahmini_kalan_gun} gün üzerinden yapılmıştır. "
                "Kesin hesaplama için her senedin vade tarihinin girilmesi gerekir."
            ) if senet_var else "Mizanda alacak/borç senedi bulunamadı.",
            "mevzuat": "VUK Md. 281 (Alacak) / VUK Md. 285 (Borç)",
            "computed_at": datetime.utcnow().isoformat() + "Z",
        }

    except Exception as e:
        logger.error(f"Reeskont hesaplama hatası: {e}")
        return {
            "ok": False,
            "reason_tr": f"Reeskont hesaplanamadı: {str(e)}",
            "alacak_reeskont": 0,
            "borc_reeskont": 0,
            "net_gelir_etkisi": 0,
        }
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════
# 3. ŞÜPHELİ ALACAK KARŞILIĞI - VUK Md. 323
# ═══════════════════════════════════════════════════════════════

@router.get("/karsilik/hesapla")
async def hesapla_karsilik(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token),
):
    """
    VUK Md. 323 - Şüpheli Alacak Karşılığı Hesaplama

    Alıcılar (120) hesabındaki bakiyeleri yaşlandırma analizi ile
    değerlendirerek şüpheli alacak karşılığı hesaplar.

    VUK 323 koşulları:
    - Dava veya icra safhasında olan alacaklar
    - Protesto edilmiş veya noter kanalıyla ihtar yapılmış alacaklar

    NOT: Yaşlandırma analizi için işlem tarihi bilinmediğinden, bakiye
    büyüklüğü ve hesap hareketliliği üzerinden risk tespiti yapılır.
    """
    await check_client_access(user, client_id)
    conn = _get_db()
    try:
        cursor = conn.cursor()

        # 120 Alıcılar
        cursor.execute("""
            SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            AND hesap_kodu LIKE '120%'
            AND borc_bakiye > 0
            ORDER BY borc_bakiye DESC
        """, (client_id, period_id))

        alici_rows = cursor.fetchall()

        # 128/129 Şüpheli Alacaklar ve Karşılıkları (mevcut)
        cursor.execute("""
            SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            AND (hesap_kodu LIKE '128%' OR hesap_kodu LIKE '129%')
        """, (client_id, period_id))

        supheli_rows = cursor.fetchall()

        # 654 Karşılık Giderleri
        cursor.execute("""
            SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            AND hesap_kodu LIKE '654%'
        """, (client_id, period_id))

        karsilik_rows = cursor.fetchall()

        # Hesapla
        toplam_alacak = 0.0
        yuksek_risk = []
        orta_risk = []
        dusuk_risk = []

        # 600 hesabından ciro bilgisi al (orantılama için)
        cursor.execute("""
            SELECT SUM(alacak_bakiye - borc_bakiye) as ciro
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            AND hesap_kodu LIKE '600%'
        """, (client_id, period_id))
        ciro_row = cursor.fetchone()
        ciro = ciro_row["ciro"] if ciro_row and ciro_row["ciro"] else 0

        for row in alici_rows:
            kod = row["hesap_kodu"]
            adi = row["hesap_adi"] or ""
            bakiye = row["borc_bakiye"] or 0
            toplam_alacak += bakiye

            # Risk sınıflandırması (bakiye büyüklüğü ve ciroya oranı)
            ciro_orani = (bakiye / ciro * 100) if ciro > 0 else 0

            if bakiye > 100000 or ciro_orani > 5:
                yuksek_risk.append({
                    "hesap_kodu": kod,
                    "hesap_adi": adi,
                    "bakiye": round(bakiye, 2),
                    "ciro_orani": round(ciro_orani, 2),
                    "risk": "yuksek",
                    "aciklama": "Yüksek bakiyeli alacak - yaşlandırma kontrolü gerekli",
                })
            elif bakiye > 50000 or ciro_orani > 2:
                orta_risk.append({
                    "hesap_kodu": kod,
                    "hesap_adi": adi,
                    "bakiye": round(bakiye, 2),
                    "ciro_orani": round(ciro_orani, 2),
                    "risk": "orta",
                })
            else:
                dusuk_risk.append({
                    "hesap_kodu": kod,
                    "hesap_adi": adi,
                    "bakiye": round(bakiye, 2),
                    "ciro_orani": round(ciro_orani, 2),
                    "risk": "dusuk",
                })

        # Mevcut karşılık
        mevcut_128 = sum((r["borc_bakiye"] or 0) for r in supheli_rows if r["hesap_kodu"].startswith("128"))
        mevcut_129 = sum((r["alacak_bakiye"] or 0) for r in supheli_rows if r["hesap_kodu"].startswith("129"))
        mevcut_654 = sum((r["borc_bakiye"] or 0) for r in karsilik_rows)

        # Olması gereken karşılık tahmini
        # Yüksek riskli alacakların %50'si (hukuki süreç bilinmeden tam oran verilemez)
        olmasi_gereken = sum(a["bakiye"] for a in yuksek_risk) * 0.50

        ek_karsilik = max(olmasi_gereken - mevcut_129, 0)

        return {
            "ok": True,
            "client_id": client_id,
            "donem": period_id,
            "toplam_alacak": round(toplam_alacak, 2),
            "alici_sayisi": len(alici_rows),
            "risk_dagilimi": {
                "yuksek": len(yuksek_risk),
                "orta": len(orta_risk),
                "dusuk": len(dusuk_risk),
            },
            "yuksek_riskli_alacaklar": yuksek_risk,
            "mevcut_karsilik": {
                "128_supheli_alacak": round(mevcut_128, 2),
                "129_karsilik": round(mevcut_129, 2),
                "654_karsilik_gideri": round(mevcut_654, 2),
            },
            "olmasi_gereken": round(olmasi_gereken, 2),
            "ek_karsilik_gerekli": round(ek_karsilik, 2),
            "muhasebe_kaydi": {
                "aciklama": "Şüpheli Alacak Karşılığı Ayrılması",
                "borc_hesap": "654 Karşılık Giderleri",
                "borc_tutar": round(ek_karsilik, 2),
                "alacak_hesap": "129 Şüpheli Ticari Alacak Karşılığı (-)",
                "alacak_tutar": round(ek_karsilik, 2),
                "mevzuat_ref": "VUK Md. 323",
            } if ek_karsilik > 0 else None,
            "onemli_not": (
                "Bu hesaplama bakiye büyüklüğü üzerinden yapılmış tahmini bir değerdir. "
                "VUK Md. 323 kapsamında kesin karşılık ayrılabilmesi için alacakların "
                "dava/icra safhasında olması veya noter ihtar yapılmış olması gerekir. "
                "Detaylı yaşlandırma analizi için müşteriden cari hesap ekstreleri istenmelidir."
            ),
            "mevzuat": "VUK Md. 323 (Şüpheli Alacaklar), VUK Md. 288 (Borç Karşılıkları)",
            "computed_at": datetime.utcnow().isoformat() + "Z",
        }

    except Exception as e:
        logger.error(f"Karşılık hesaplama hatası: {e}")
        return {
            "ok": False,
            "reason_tr": f"Karşılık hesaplanamadı: {str(e)}",
            "mevcut_karsilik": None,
            "olmasi_gereken": 0,
            "ek_karsilik_gerekli": 0,
        }
    finally:
        conn.close()
