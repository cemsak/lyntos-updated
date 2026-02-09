"""
VUK Mükerrer Madde 298/Ç - Sürekli Yeniden Değerleme Motoru

Amortismana tabi iktisadi kıymetlerin (ATİK) Yİ-ÜFE bazlı yeniden
değerlemesi. VUK Geçici 37 ile 2025-2027 arası enflasyon düzeltmesi
askıya alındığından, yeniden değerleme pratik araçtır.

Muhasebe kaydı:
  Borç: 25x (MDV artış)         / Alacak: 522 MDV Yeniden Değerleme Artışları
  Borç: 522 (amortisman artışı) / Alacak: 257 Birikmiş Amortisman

Mevzuat: VUK Mük. 298/Ç, VUK Geçici 37
TDHP: 250-255 MDV, 257 Birikmiş Amortisman, 522 MDV Yeniden Değerleme Artışları
"""

from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime
import sqlite3
import json
import logging

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"
CONFIG_PATH = Path(__file__).parent.parent / "config" / "economic_rates.json"

# MDV hesap grupları (TDHP)
MDV_GRUPLARI = {
    "250": "Arazi ve Arsalar",
    "251": "Yeraltı ve Yerüstü Düzenleri",
    "252": "Binalar",
    "253": "Tesis, Makine ve Cihazlar",
    "254": "Taşıtlar",
    "255": "Demirbaşlar",
}

# 250 Arazi amortismana tabi DEĞİLDİR (VUK Md. 313)
AMORTISMANA_TABI_OLMAYAN = {"250"}


def _get_yiufe_endeks() -> Dict[str, float]:
    """
    economic_rates.json'dan Yİ-ÜFE endeks verilerini oku.

    Returns:
        Dict: dönem -> endeks değeri (örn. {"2024-12": 2832.15, "2025-03": 2958.74})
    """
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        yiufe_raw = data.get("yiufe_endeks", {})
        # Sadece numerik dönem anahtarlarını al
        return {
            k: float(v) for k, v in yiufe_raw.items()
            if k not in ("kaynak", "not") and isinstance(v, (int, float))
        }
    except Exception as e:
        logger.error(f"Yİ-ÜFE endeks verisi okunamadı: {e}")
        return {}


def _get_katsayi(period_id: str) -> Optional[Tuple[float, float, float]]:
    """
    Dönem için Yİ-ÜFE katsayısını hesapla.

    2025-Q1 için: 2025-03 / 2024-12

    Returns:
        Tuple: (baslangic_endeks, bitis_endeks, katsayi) veya None
    """
    endeksler = _get_yiufe_endeks()
    if not endeksler:
        return None

    # Dönem formatı: 2025-Q1 → bitiş: 2025-03, başlangıç: 2024-12
    # Dönem formatı: 2025-01 → bitiş: 2025-01, başlangıç: 2024-12
    year = period_id[:4]
    suffix = period_id[5:]

    if suffix.startswith("Q"):
        quarter = int(suffix[1])
        bitis_ay = quarter * 3
        bitis_key = f"{year}-{bitis_ay:02d}"
        if quarter == 1:
            baslangic_key = f"{int(year) - 1}-12"
        else:
            baslangic_ay = (quarter - 1) * 3
            baslangic_key = f"{year}-{baslangic_ay:02d}"
    else:
        # Aylık dönem
        ay = int(suffix)
        bitis_key = f"{year}-{ay:02d}"
        if ay == 1:
            baslangic_key = f"{int(year) - 1}-12"
        else:
            baslangic_key = f"{year}-{ay - 1:02d}"

    baslangic = endeksler.get(baslangic_key)
    bitis = endeksler.get(bitis_key)

    if baslangic is None or bitis is None:
        logger.warning(
            f"Yİ-ÜFE endeks eksik: başlangıç={baslangic_key}({baslangic}), "
            f"bitiş={bitis_key}({bitis})"
        )
        return None

    if baslangic <= 0:
        logger.error(f"Yİ-ÜFE başlangıç endeksi sıfır veya negatif: {baslangic}")
        return None

    katsayi = bitis / baslangic
    return (baslangic, bitis, katsayi)


def _get_mdv_bakiyeleri(client_id: str, period_id: str) -> List[Dict]:
    """
    Mizandan MDV (25x) ve Birikmiş Amortisman (257) bakiyelerini çek.

    Her MDV kalemi için eşleşen 257 amortisman kaydını bul.
    """
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # MDV hesapları (250-255, 257 hariç)
        cursor.execute("""
            SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            AND (hesap_kodu LIKE '25%')
            ORDER BY hesap_kodu
        """, (client_id, period_id))

        rows = cursor.fetchall()

        mdv_items = {}
        amort_items = {}

        for row in rows:
            kod = row["hesap_kodu"]
            adi = row["hesap_adi"] or ""
            borc = row["borc_bakiye"] or 0
            alacak = row["alacak_bakiye"] or 0

            if kod.startswith("257"):
                # Birikmiş amortisman (alacak bakiyesi)
                amort_items[kod] = {
                    "hesap_kodu": kod,
                    "hesap_adi": adi,
                    "bakiye": alacak,  # 257 alacak bakiye verir
                }
            else:
                # MDV (borç bakiyesi)
                if borc > 0:
                    mdv_items[kod] = {
                        "hesap_kodu": kod,
                        "hesap_adi": adi,
                        "bakiye": borc,
                    }

        return _eslestir_mdv_amortisman(mdv_items, amort_items)

    except Exception as e:
        logger.error(f"MDV bakiyeleri çekilemedi: {e}")
        return []
    finally:
        conn.close()


def _eslestir_mdv_amortisman(
    mdv_items: Dict, amort_items: Dict
) -> List[Dict]:
    """
    MDV kalemlerini ilgili 257 amortisman kayıtlarıyla eşleştir.

    Eşleştirme mantığı:
    - 252.101 → 257.101
    - 254.05 → 257.90.05 (taşıt) veya 257.05
    - 255.2024.01 → 257.2024.01
    """
    result = []

    for mdv_kod, mdv_data in mdv_items.items():
        # Ana grup kodunu bul (ilk 3 hane)
        grup = mdv_kod[:3]

        # Arazi amortismana tabi değil
        if grup in AMORTISMANA_TABI_OLMAYAN:
            result.append({
                **mdv_data,
                "grup": grup,
                "grup_adi": MDV_GRUPLARI.get(grup, "Diğer"),
                "amortisman_bakiye": 0,
                "net_defter_degeri": mdv_data["bakiye"],
                "amortismana_tabi": False,
                "aciklama": "VUK Md. 313 - Arazi amortismana tabi değildir",
            })
            continue

        # 257 eşleşmesi: aynı alt kod ile dene
        alt_kod = mdv_kod[len(grup):]  # .101, .05, .2024.01 vb.
        amort_kod_denemeler = [
            f"257{alt_kod}",
            f"257.90{alt_kod}" if grup == "254" else None,  # Taşıtlar
        ]

        amortisman = 0
        for deneme in amort_kod_denemeler:
            if deneme and deneme in amort_items:
                amortisman = amort_items[deneme]["bakiye"]
                break

        result.append({
            **mdv_data,
            "grup": grup,
            "grup_adi": MDV_GRUPLARI.get(grup, "Diğer"),
            "amortisman_bakiye": round(amortisman, 2),
            "net_defter_degeri": round(mdv_data["bakiye"] - amortisman, 2),
            "amortismana_tabi": True,
            "aciklama": None,
        })

    return result


def hesapla_yeniden_degerleme(
    client_id: str,
    period_id: str
) -> Dict:
    """
    VUK Mük. 298/Ç Sürekli Yeniden Değerleme hesaplaması.

    Adımlar:
    1. Yİ-ÜFE katsayısı hesapla
    2. MDV ve 257 bakiyelerini çek
    3. Her kalem için yeniden değerleme artışı hesapla
    4. Muhasebe kaydı öner (522 hesap)

    Returns:
        Dict: Yeniden değerleme sonucu
    """
    # ═══════════════════════════════════════════════════════════════
    # 1. Yİ-ÜFE KATSAYI KONTROLÜ
    # ═══════════════════════════════════════════════════════════════
    katsayi_result = _get_katsayi(period_id)
    if katsayi_result is None:
        return {
            "ok": False,
            "reason_tr": "Yİ-ÜFE endeks verisi eksik. TÜİK resmi verileri yüklenmelidir.",
            "missing_data": ["yiufe_endeks"],
            "required_actions": [
                "economic_rates.json dosyasına ilgili dönem Yİ-ÜFE endekslerini girin",
                "Kaynak: TÜİK Yİ-ÜFE (2003=100 bazlı)"
            ],
            "mdv_listesi": None,
            "toplam": None,
            "muhasebe_kaydi": None,
        }

    baslangic_endeks, bitis_endeks, katsayi = katsayi_result

    # ═══════════════════════════════════════════════════════════════
    # 2. MDV BAKİYELERİ
    # ═══════════════════════════════════════════════════════════════
    mdv_kalemleri = _get_mdv_bakiyeleri(client_id, period_id)
    if not mdv_kalemleri:
        return {
            "ok": False,
            "reason_tr": "Mizanda MDV (25x) hesabı bulunamadı",
            "missing_data": ["mdv_bakiyeleri"],
            "required_actions": ["Dönem mizan verisinde 250-255 hesap bakiyeleri olmalıdır"],
            "mdv_listesi": None,
            "toplam": None,
            "muhasebe_kaydi": None,
        }

    # ═══════════════════════════════════════════════════════════════
    # 3. YENİDEN DEĞERLEME HESAPLAMASI
    # ═══════════════════════════════════════════════════════════════
    toplam_mdv_artis = 0.0
    toplam_amort_artis = 0.0
    degerlemeler = []

    for kalem in mdv_kalemleri:
        if not kalem["amortismana_tabi"]:
            degerlemeler.append({
                **kalem,
                "mdv_artis": 0,
                "amortisman_artis": 0,
                "net_artis": 0,
                "degerleme_notu": "Amortismana tabi değil (VUK Md. 313)",
            })
            continue

        mdv_bakiye = kalem["bakiye"]
        amort_bakiye = kalem["amortisman_bakiye"]

        # Yeniden değerleme artışı: bakiye * (katsayı - 1)
        mdv_artis = mdv_bakiye * (katsayi - 1)
        amort_artis = amort_bakiye * (katsayi - 1)
        net_artis = mdv_artis - amort_artis

        toplam_mdv_artis += mdv_artis
        toplam_amort_artis += amort_artis

        degerlemeler.append({
            **kalem,
            "mdv_artis": round(mdv_artis, 2),
            "amortisman_artis": round(amort_artis, 2),
            "net_artis": round(net_artis, 2),
            "degerleme_notu": None,
        })

    toplam_net_artis = toplam_mdv_artis - toplam_amort_artis

    # ═══════════════════════════════════════════════════════════════
    # 4. MUHASEBE KAYDI ÖNERİSİ
    # ═══════════════════════════════════════════════════════════════
    muhasebe_kayitlari = []

    if toplam_mdv_artis > 0:
        muhasebe_kayitlari.append({
            "aciklama": "MDV Yeniden Değerleme Artışı",
            "borc_hesap": "25x (ilgili MDV hesapları)",
            "borc_tutar": round(toplam_mdv_artis, 2),
            "alacak_hesap": "522 MDV Yeniden Değerleme Artışları",
            "alacak_tutar": round(toplam_mdv_artis, 2),
            "mevzuat_ref": "VUK Mük. 298/Ç",
        })

    if toplam_amort_artis > 0:
        muhasebe_kayitlari.append({
            "aciklama": "Birikmiş Amortisman Yeniden Değerleme Artışı",
            "borc_hesap": "522 MDV Yeniden Değerleme Artışları",
            "borc_tutar": round(toplam_amort_artis, 2),
            "alacak_hesap": "257 Birikmiş Amortismanlar",
            "alacak_tutar": round(toplam_amort_artis, 2),
            "mevzuat_ref": "VUK Mük. 298/Ç",
        })

    # ═══════════════════════════════════════════════════════════════
    # 5. GRUP BAZLI ÖZET
    # ═══════════════════════════════════════════════════════════════
    grup_ozet = {}
    for d in degerlemeler:
        grup = d["grup"]
        if grup not in grup_ozet:
            grup_ozet[grup] = {
                "grup_kodu": grup,
                "grup_adi": d["grup_adi"],
                "kalem_sayisi": 0,
                "toplam_mdv": 0,
                "toplam_amortisman": 0,
                "toplam_net_defter": 0,
                "toplam_mdv_artis": 0,
                "toplam_amort_artis": 0,
                "toplam_net_artis": 0,
            }
        g = grup_ozet[grup]
        g["kalem_sayisi"] += 1
        g["toplam_mdv"] += d["bakiye"]
        g["toplam_amortisman"] += d["amortisman_bakiye"]
        g["toplam_net_defter"] += d["net_defter_degeri"]
        g["toplam_mdv_artis"] += d.get("mdv_artis", 0)
        g["toplam_amort_artis"] += d.get("amortisman_artis", 0)
        g["toplam_net_artis"] += d.get("net_artis", 0)

    # Yuvarla
    for g in grup_ozet.values():
        for k in ("toplam_mdv", "toplam_amortisman", "toplam_net_defter",
                   "toplam_mdv_artis", "toplam_amort_artis", "toplam_net_artis"):
            g[k] = round(g[k], 2)

    return {
        "ok": True,
        "donem": period_id,
        "client_id": client_id,
        "yiufe": {
            "baslangic_endeks": baslangic_endeks,
            "bitis_endeks": bitis_endeks,
            "katsayi": round(katsayi, 6),
            "artis_orani_yuzde": round((katsayi - 1) * 100, 2),
        },
        "mdv_listesi": degerlemeler,
        "grup_ozet": list(grup_ozet.values()),
        "toplam": {
            "mdv_toplam": round(sum(d["bakiye"] for d in degerlemeler), 2),
            "amortisman_toplam": round(sum(d["amortisman_bakiye"] for d in degerlemeler), 2),
            "net_defter_toplam": round(sum(d["net_defter_degeri"] for d in degerlemeler), 2),
            "mdv_artis_toplam": round(toplam_mdv_artis, 2),
            "amortisman_artis_toplam": round(toplam_amort_artis, 2),
            "net_artis_toplam": round(toplam_net_artis, 2),
            "kalem_sayisi": len(degerlemeler),
        },
        "muhasebe_kaydi": muhasebe_kayitlari,
        "mevzuat": {
            "dayanak": "VUK Mükerrer Madde 298/Ç",
            "kapsam": "Amortismana tabi iktisadi kıymetler (ATİK)",
            "endeks": "Yİ-ÜFE (Yurt İçi Üretici Fiyat Endeksi)",
            "hedef_hesap": "522 MDV Yeniden Değerleme Artışları",
            "onemli_not": (
                "VUK Geçici 37 ile 2025-2027 arası enflasyon düzeltmesi askıdadır. "
                "Bu dönemler için VUK Mük. 298/Ç kapsamında yeniden değerleme uygulanabilir."
            ),
        },
        "analysis": {
            "expert": {
                "method": "VUK Mük. 298/Ç Sürekli Yeniden Değerleme",
                "legal_basis_refs": ["VUK-MUK-298-C", "VUK-GECICI-37"],
                "evidence_refs": [
                    f"mizan_entries:{client_id}:{period_id}:25x",
                    f"mizan_entries:{client_id}:{period_id}:257",
                ],
                "trust_score": 1.0,
                "computed_at": datetime.utcnow().isoformat() + "Z",
            }
        },
    }
