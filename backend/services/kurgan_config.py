"""
KURGAN Risk Calculator — Konfigürasyon & Sabitler

P-11: kurgan_calculator.py'den çıkarıldı (dosya bölme).
Senaryo tanımları, ağırlıklar, eşikler, puan etkileri ve ceza oranları.
"""

from typing import Dict


# =============================================================================
# KURGAN 16 SENARYO TANIMLARI
# =============================================================================

KURGAN_SENARYOLARI = {
    "KRG-01": {
        "ad": "Riskli Satıcıdan Alım",
        "risk": 85,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 359", "VUK 370", "KURGAN Rehberi"],
        "aciklama": "Kod-3/Kod-4 veya VTR düzenlenen satıcıdan alım yapılması"
    },
    "KRG-02": {
        "ad": "Zincirleme Riskli Alım",
        "risk": 75,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 359", "KDV Genel Uygulama Tebliği"],
        "aciklama": "Tedarik zincirinde 2. veya 3. kademe riskli mükellef"
    },
    "KRG-03": {
        "ad": "Mal/Hizmet Akışı Tutarsızlığı",
        "risk": 80,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 359", "VUK 3/B"],
        "aciklama": "NACE faaliyet kodu ile alım yapılan mal/hizmet uyumsuzluğu"
    },
    "KRG-04": {
        "ad": "Stok-Satış Uyumsuzluğu",
        "risk": 85,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 186", "VUK 257", "VUK 359"],
        "aciklama": "Satış tutarı > (Alış + Açılış Stoku), olası kayıtdışı satış"
    },
    "KRG-05": {
        "ad": "Sevk Belgesi Eksikliği",
        "risk": 70,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 230", "VUK 359"],
        "aciklama": "Yüksek tutarlı mal alımında sevk irsaliyesi/taşıma belgesi eksikliği"
    },
    "KRG-06": {
        "ad": "Ödeme Yöntemi Uyumsuzluğu",
        "risk": 75,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 232", "VUK 234", "VUK 359"],
        "aciklama": "7.000 TL üstü faturalarda banka ödeme kaydı eksikliği"
    },
    "KRG-07": {
        "ad": "Karşılıklı Ödeme Döngüsü",
        "risk": 80,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 359", "KVK 13"],
        "aciklama": "Aynı gün karşılıklı ödeme/tahsilat (Ciro dolandırıcılığı şüphesi)"
    },
    "KRG-08": {
        "ad": "Sektörel Kârlılık Anomalisi",
        "risk": 65,
        "aksiyon": "TAKIP",
        "sure": None,
        "mevzuat": ["VUK 134", "KVK 6"],
        "aciklama": "Brüt/Net kâr marjı sektör ortalamasının %25 altında"
    },
    "KRG-09": {
        "ad": "Beyan-Yaşam Standardı Uyumsuzluğu",
        "risk": 70,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 134", "GVK 30"],
        "aciklama": "Ortakların lüks tüketimi ile beyan edilen gelir uyumsuzluğu"
    },
    "KRG-10": {
        "ad": "KDV Beyan-Fatura Uyumsuzluğu",
        "risk": 85,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["KDVK 29", "VUK 341", "VUK 344"],
        "aciklama": "KDV beyanname matrahı ile e-Fatura/e-Arşiv toplamı arasında fark"
    },
    "KRG-11": {
        "ad": "Riskli KDV İade Talebi",
        "risk": 90,
        "aksiyon": "INCELEME",
        "sure": "Derhal",
        "mevzuat": ["KDVK 32", "KDV Genel Uygulama Tebliği"],
        "aciklama": "İade matrahında riskli satıcı veya yüksek yüklenilen KDV"
    },
    "KRG-12": {
        "ad": "Sahte Belge Şüphesi",
        "risk": 95,
        "aksiyon": "INCELEME",
        "sure": "Derhal",
        "mevzuat": ["VUK 359 (Kaçakçılık)", "VUK 341-344", "CMK"],
        "aciklama": "SMİYB düzenleyen/kullanan mükellef ile işlem - HAPİS CEZASI RİSKİ"
    },
    "KRG-13": {
        "ad": "Transfer Fiyatlandırması Riski",
        "risk": 80,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["KVK 12 (Örtülü Sermaye)", "KVK 13 (Transfer Fiyatlandırması)", "1 Seri No'lu TF Tebliği"],
        "aciklama": "İlişkili kişi işlemleri/Ciro > %25, ortaklara borç faizi eksikliği",
        "hesap_kodlari": ["131", "231", "331", "431"],
        "esik": 0.25
    },
    "KRG-14": {
        "ad": "Sürekli Zarar Beyanı",
        "risk": 70,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 134", "KVK 6", "TTK 376"],
        "aciklama": "3+ yıl üst üste zarar beyanı, teknik iflas riski"
    },
    "KRG-15": {
        "ad": "Düşük Vergi Yükü",
        "risk": 75,
        "aksiyon": "BILGI_ISTEME",
        "sure": "15 gün",
        "mevzuat": ["VUK 134", "KVK 6", "GVK 40-41"],
        "aciklama": "Efektif vergi yükü sektör ortalamasının %50'sinin altında"
    },
    "KRG-16": {
        "ad": "Ortak/Yönetici Risk Geçmişi",
        "risk": 80,
        "aksiyon": "IZAHA_DAVET",
        "sure": "30 gün",
        "mevzuat": ["VUK 359", "VUK 3/B", "KURGAN Rehberi"],
        "aciklama": "Ortağın başka şirketinde VTR veya sahte belge tespiti"
    },
}


# =============================================================================
# CALCULATOR CONSTANTS
# =============================================================================

WEIGHTS: Dict[str, int] = {
    "vergiye_uyum": 25,
    "odeme_seffafligi": 20,
    "sevkiyat": 10,
    "e_imza_uyumu": 10,
    "gecmis_inceleme": 15,
    "ortak_gecmisi": 10,
    "diger": 10
}

# Hesap esikleri
ESIKLER = {
    # LIKIDITE
    "100_siskinlik_uyari": 0.05,      # %5
    "100_siskinlik_kritik": 0.15,     # %15
    # ORTAKLAR
    "131_sermaye_uyari": 0.10,        # %10
    "131_sermaye_kritik": 0.30,       # %30
    "331_ortulu_katsayi": 3.0,        # 3x ozkaynak
    # KDV
    "190_devreden_ay": 36,            # 36 ay
    # TICARI
    "120_yaslandirma_uyari": 90,      # 90 gun
    "120_yaslandirma_kritik": 180,    # 180 gun
    "320_yaslandirma_uyari": 90,      # 90 gun
    # STOK
    "153_devir_uyari": 180,           # 180 gun
    # DURAN VARLIK
    "dogrudan_gider_haddi_2026": 12000,  # 12.000 TL
}

# Aksiyon bazında tahmini puan etkisi (düşüş)
PUAN_ETKISI = {
    "kasa_sayim": -12,
    "kasa_adat": -15,
    "adat_faizi": -18,
    "ortulu_sermaye_kkeg": -10,
    "banka_kmh": -8,
    "ttk_376_bildirim": -5,
    "stok_sayim": -10,
    "sgk_mutabakat": -8,
    "kdv_beyan_kontrol": -12,
    "default": -5,
}

# Vergi ceza oranları — VUK madde 112 gecikme faizi
CEZA_ORANLARI = {
    "vergi_ziyai_cezasi": 0.50,     # %50 VZC
    "gecikme_faizi_aylik": 0.018,   # %1.8 aylık (VUK 112)
    "kurumlar_vergisi": 0.25,       # %25 KV oranı
    "kdv_orani": 0.20,              # %20 KDV oranı
}
