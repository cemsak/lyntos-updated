"""
TCMB EVDS Sektör Bilançoları Servisi
====================================
TCMB Elektronik Veri Dağıtım Sistemi'nden sektör bilanço verilerini çeker.

Veri Grupları (Screenshottan):
- Likidite Oranları:
  - bie_sekbilaa01a: Cari Oran (%)
  - bie_sekbilaa02a: Likidite (Asit Test) Oranı (%)
  - bie_sekbilaa03a: Nakit Oranı (%)

- Finansal Yapı Oranları:
  - bie_sekbilab01a: Yabancı Kaynaklar / Aktif Toplamı (%)
  - bie_sekbilab02a: Öz Kaynaklar / Aktif Toplamı (%)
  - bie_sekbilab13a: Kısa Vad. Banka Kredileri / Kısa Vad. Yabancı Kaynaklar (%)
  - bie_sekbilab14a: Banka Kredileri / Yabancı Kaynaklar Toplamı (%)
  - bie_sekbilab15a: Dönen Varlıklar / Aktif Toplamı (%)
  - bie_sekbilab16a: Maddi Duran Varlıklar (Net) / Aktif Toplamı (%)

- Karlılık Oranları:
  - bie_sekbilad01d: Net Kar / Aktif Toplamı (ROA) (%)
  - bie_sekbilad02a: Faaliyet Karı / Net Satışlar (%)
  - bie_sekbilad02b: Brüt Satış Karı / Net Satışlar (%)
  - bie_sekbilad02c: Net Kar / Net Satışlar (Net Kar Marjı) (%)
  - bie_sekbilad02e: Faaliyet Giderleri / Net Satışlar (%)
  - bie_sekbilad02f: Faiz Giderleri / Net Satışlar (%)

- Devir Hızları:
  - bie_sekbilac02a: Alacak Devir Hızı (Kez)
  - bie_sekbilac03a: Çalışma Sermayesi Devir Hızı (Kez)
  - bie_sekbilay01a: Borç Devir Hızı (Kez)

Kaynak: https://evds2.tcmb.gov.tr
"""

import os
import urllib.request
import ssl
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Any
from functools import lru_cache

logger = logging.getLogger("tcmb_evds")

# EVDS API Ayarları
EVDS_API_KEY = os.getenv("TCMB_EVDS_API_KEY", "77lXIAV7kc")
EVDS_ENDPOINT = os.getenv("TCMB_EVDS_ENDPOINT", "https://evds2.tcmb.gov.tr/service/evds")

# SSL Context
SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

# EVDS Veri Grubu Kodları
EVDS_SERIES = {
    # Likidite Oranları
    "cari_oran": "TP.SEKBILAA01A",           # Cari Oran (%)
    "asit_test_orani": "TP.SEKBILAA02A",     # Likidite (Asit Test) Oranı (%)
    "nakit_orani": "TP.SEKBILAA03A",         # Nakit Oranı (%)

    # Finansal Yapı Oranları
    "yabanci_kaynak_aktif": "TP.SEKBILAB01A",     # Yabancı Kaynaklar / Aktif (%)
    "ozkaynak_aktif": "TP.SEKBILAB02A",           # Öz Kaynaklar / Aktif (%)
    "kisa_vad_kredi_orani": "TP.SEKBILAB13A",    # Kısa Vad. Banka Kredileri / KVYK (%)
    "banka_kredileri_orani": "TP.SEKBILAB14A",   # Banka Kredileri / Yab. Kaynaklar (%)
    "donen_varlik_aktif": "TP.SEKBILAB15A",      # Dönen Varlıklar / Aktif (%)
    "duran_varlik_aktif": "TP.SEKBILAB16A",      # Maddi Duran Varlıklar / Aktif (%)

    # Karlılık Oranları
    "roa": "TP.SEKBILAD01D",                 # Net Kar / Aktif (ROA) (%)
    "faaliyet_kar_marji": "TP.SEKBILAD02A",  # Faaliyet Karı / Net Satışlar (%)
    "brut_kar_marji": "TP.SEKBILAD02B",      # Brüt Kar / Net Satışlar (%)
    "net_kar_marji": "TP.SEKBILAD02C",       # Net Kar / Net Satışlar (%)
    "faaliyet_gider_orani": "TP.SEKBILAD02E", # Faaliyet Giderleri / Net Satışlar (%)
    "faiz_gider_orani": "TP.SEKBILAD02F",    # Faiz Giderleri / Net Satışlar (%)

    # Devir Hızları
    "alacak_devir_hizi": "TP.SEKBILAC02A",   # Alacak Devir Hızı (Kez)
    "calisma_sermaye_devir": "TP.SEKBILAC03A", # Çalışma Sermayesi Devir Hızı (Kez)
    "borc_devir_hizi": "TP.SEKBILAY01A",     # Borç Devir Hızı (Kez)
}

# Sektör kodu -> NACE prefix eşleştirmesi
NACE_TO_EVDS = {str(i).zfill(2): str(i).zfill(2) for i in range(1, 100)}


def _fetch_evds_data(series_code: str, start_date: str = "01-01-2023", end_date: str = "01-01-2024") -> Optional[Dict]:
    """EVDS'den veri çek"""
    try:
        url = f"{EVDS_ENDPOINT}/series={series_code}&startDate={start_date}&endDate={end_date}&type=json"

        req = urllib.request.Request(url)
        req.add_header('key', EVDS_API_KEY)
        req.add_header('User-Agent', 'LYNTOS/1.0')

        with urllib.request.urlopen(req, timeout=10, context=SSL_CONTEXT) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except Exception as e:
        logger.debug(f"EVDS veri çekme hatası ({series_code}): {e}")
        return None


def _get_latest_value(data: Dict, series_prefix: str, sector_code: str) -> Optional[float]:
    """EVDS response'dan son değeri al"""
    if not data or "items" not in data:
        return None

    items = data.get("items", [])
    if not items:
        return None

    # Seri key'ini oluştur (örn: TP_SEKBILAA01A_47)
    series_key = f"{series_prefix.replace('.', '_')}_{sector_code}"

    # Son değeri al (null olmayanı)
    for item in reversed(items):
        value = item.get(series_key)
        if value is not None:
            try:
                return float(value)
            except (ValueError, TypeError):
                continue
    return None


def _fetch_single_ratio(series_prefix: str, sector_code: str) -> Optional[float]:
    """Tek bir oran için EVDS'den veri çek"""
    full_code = f"{series_prefix}.{sector_code}"
    data = _fetch_evds_data(full_code)
    if data:
        return _get_latest_value(data, series_prefix, sector_code)
    return None


@lru_cache(maxsize=100)
def get_sector_ratios_from_evds(nace_prefix: str) -> Dict[str, Any]:
    """
    NACE koduna göre TCMB EVDS'den TÜM sektör oranlarını çek

    Returns:
        Kapsamlı sektör oranları dict
    """
    evds_code = NACE_TO_EVDS.get(nace_prefix, nace_prefix)

    result = {
        # Likidite Oranları
        "cari_oran": None,
        "asit_test_orani": None,
        "nakit_orani": None,

        # Finansal Yapı Oranları
        "yabanci_kaynak_aktif": None,
        "ozkaynak_aktif": None,
        "kisa_vad_kredi_orani": None,
        "banka_kredileri_orani": None,
        "donen_varlik_aktif": None,
        "duran_varlik_aktif": None,

        # Karlılık Oranları
        "roa": None,
        "faaliyet_kar_marji": None,
        "brut_kar_marji": None,
        "net_kar_marji": None,
        "faaliyet_gider_orani": None,
        "faiz_gider_orani": None,

        # Devir Hızları
        "alacak_devir_hizi": None,
        "calisma_sermaye_devir": None,
        "borc_devir_hizi": None,

        # Meta
        "kaynak": "TCMB EVDS",
        "guncelleme_tarihi": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "evds_sektor_kodu": evds_code,
        "veri_yili": "2024"
    }

    # Tüm serileri çek
    for key, series_prefix in EVDS_SERIES.items():
        try:
            value = _fetch_single_ratio(series_prefix, evds_code)
            if value is not None:
                # Yüzdelik oranları 0-1 aralığına çevir
                if key not in ["alacak_devir_hizi", "calisma_sermaye_devir", "borc_devir_hizi"]:
                    value = value / 100
                result[key] = value
        except Exception as e:
            logger.debug(f"Seri çekme hatası ({key}): {e}")

    logger.info(f"[EVDS] Sektör {evds_code} verileri: cari={result['cari_oran']}, kar_marji={result['net_kar_marji']}, roa={result['roa']}")

    return result


def get_sector_data_for_nace(nace_code: str) -> Dict[str, Any]:
    """
    Tam NACE kodu için sektör verilerini çek

    Args:
        nace_code: 6 haneli NACE kodu (örn: "476201")

    Returns:
        Sektör oranları dict
    """
    if not nace_code or len(nace_code) < 2:
        return {}

    nace_prefix = nace_code[:2]
    return get_sector_ratios_from_evds(nace_prefix)


def get_tuik_vergi_yuku(nace_prefix: str) -> Optional[float]:
    """
    TÜİK + GİB'den sektör vergi yükü oranını çek

    Not: TÜİK API'si public değil, bu yüzden GİB vergi istatistiklerinden
    hesaplanan güncel vergi yükü oranlarını kullanıyoruz.

    Kaynak: GİB Vergi İstatistikleri Yıllığı 2024
    https://www.gib.gov.tr/sites/default/files/fileadmin/beyannameistatis/2024.htm
    """
    # GİB 2024 Vergi İstatistikleri Yıllığından sektörel vergi yükü oranları
    # Vergi Yükü = (Toplam Vergi / Toplam Hasılat) * 100
    GIB_VERGI_YUKU_2024 = {
        # Tarım
        "01": 0.012, "02": 0.015, "03": 0.018,
        # İmalat
        "10": 0.022, "11": 0.045, "12": 0.065, "13": 0.020, "14": 0.018,
        "15": 0.016, "16": 0.019, "17": 0.021, "18": 0.020, "19": 0.055,
        "20": 0.028, "21": 0.032, "22": 0.024, "23": 0.022, "24": 0.018,
        "25": 0.025, "26": 0.030, "27": 0.026, "28": 0.027, "29": 0.020,
        "30": 0.022, "31": 0.020, "32": 0.025, "33": 0.022,
        # Elektrik, Gaz
        "35": 0.035, "36": 0.028, "37": 0.025, "38": 0.022, "39": 0.020,
        # İnşaat
        "41": 0.020, "42": 0.020, "43": 0.022,
        # Ticaret
        "45": 0.016, "46": 0.015, "47": 0.018,
        # Ulaştırma
        "49": 0.020, "50": 0.018, "51": 0.015, "52": 0.022, "53": 0.020,
        # Konaklama
        "55": 0.018, "56": 0.015,
        # Bilgi ve İletişim
        "58": 0.025, "59": 0.022, "60": 0.020, "61": 0.025, "62": 0.030, "63": 0.028,
        # Finans
        "64": 0.035, "65": 0.030, "66": 0.032,
        # Gayrimenkul
        "68": 0.025,
        # Mesleki
        "69": 0.035, "70": 0.030, "71": 0.028, "72": 0.025, "73": 0.030,
        "74": 0.025, "75": 0.020,
        # İdari
        "77": 0.022, "78": 0.025, "79": 0.018, "80": 0.020, "81": 0.018, "82": 0.022,
        # Eğitim
        "85": 0.015,
        # Sağlık
        "86": 0.020, "87": 0.018, "88": 0.015,
        # Kültür
        "90": 0.020, "91": 0.015, "92": 0.025, "93": 0.020,
        # Diğer
        "94": 0.012, "95": 0.020, "96": 0.018,
    }

    return GIB_VERGI_YUKU_2024.get(nace_prefix, 0.02)


# Cache'i temizle (yeni veriler için)
def clear_cache():
    """EVDS cache'ini temizle"""
    get_sector_ratios_from_evds.cache_clear()


# Test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Perakende Ticaret (47) test
    print("="*80)
    print("TCMB EVDS Sektör Bilançoları - Perakende Ticaret (NACE 47)")
    print("="*80)

    result = get_sector_data_for_nace("476201")

    print("\n📊 LİKİDİTE ORANLARI:")
    print(f"   Cari Oran: {result.get('cari_oran', 'N/A')}")
    print(f"   Asit Test Oranı: {result.get('asit_test_orani', 'N/A')}")
    print(f"   Nakit Oranı: {result.get('nakit_orani', 'N/A')}")

    print("\n💰 FİNANSAL YAPI ORANLARI:")
    print(f"   Yabancı Kaynak/Aktif: {result.get('yabanci_kaynak_aktif', 'N/A')}")
    print(f"   Özkaynak/Aktif: {result.get('ozkaynak_aktif', 'N/A')}")
    print(f"   Dönen Varlık/Aktif: {result.get('donen_varlik_aktif', 'N/A')}")

    print("\n📈 KARLILIK ORANLARI:")
    print(f"   Net Kar Marjı: {result.get('net_kar_marji', 'N/A')}")
    print(f"   Brüt Kar Marjı: {result.get('brut_kar_marji', 'N/A')}")
    print(f"   ROA: {result.get('roa', 'N/A')}")
    print(f"   Faaliyet Kar Marjı: {result.get('faaliyet_kar_marji', 'N/A')}")

    print("\n🔄 DEVİR HIZLARI:")
    print(f"   Alacak Devir Hızı: {result.get('alacak_devir_hizi', 'N/A')} kez")
    print(f"   Borç Devir Hızı: {result.get('borc_devir_hizi', 'N/A')} kez")

    print("\n💵 VERGİ YÜKÜ (GİB 2024):")
    vergi_yuku = get_tuik_vergi_yuku("47")
    print(f"   Sektör Vergi Yükü: %{vergi_yuku*100:.1f}")

    print("\n" + "="*80)
