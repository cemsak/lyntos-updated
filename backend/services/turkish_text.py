# -*- coding: utf-8 -*-
"""
Türkçe Metin Yardımcıları

SMMM/YMM yazılımı için Türkçe karakter ve metin desteği.
Tüm metinler bu modülden alınmalı, hardcoded string kullanılmamalı.

Kullanım:
    from turkish_text import TR
    mesaj = TR.KURGAN.KRG_07_GECTI
"""

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class KurganMessages:
    """KURGAN 16 senaryo mesajları"""

    # KRG-01: Riskli Satıcı
    KRG_01_TETIKLENDI = "GİB riskli mükellef listesinde tedarikçi tespit edildi"
    KRG_01_GECTI = "GİB riskli mükellef listesiyle karşılaştırıldı. Riskli tedarikçi tespit edilmedi."
    KRG_01_VERI_YOK = "GİB riskli mükellef listesi kontrolü için tedarikçi verisi gerekli."

    # KRG-02: Zincirleme Riskli Alım
    KRG_02_TETIKLENDI = "Zincirleme riskli alım tespit edildi"
    KRG_02_GECTI = "Zincirleme riskli alım kontrolü yapıldı. Risk tespit edilmedi."
    KRG_02_VERI_YOK = "Zincirleme riskli alım kontrolü için tedarikçi zinciri verisi gerekli."

    # KRG-03: Mal/Hizmet Akışı Tutarsızlığı
    KRG_03_TETIKLENDI = "Fatura ve stok girişleri arasında tutarsızlık tespit edildi"
    KRG_03_GECTI = "Fatura-stok eşlemesi yapıldı. Kabul edilebilir aralıkta."
    KRG_03_VERI_YOK = "Mal/hizmet akışı kontrolü için fatura ve stok verisi gerekli."

    # KRG-04: Stok-Satış Uyumsuzluğu
    KRG_04_TETIKLENDI = "Stok bakiyesi satış maliyetinin 2 katını aşıyor"
    KRG_04_GECTI = "Stok/SMM oranı normal aralıkta."
    KRG_04_VERI_YOK = "Stok-satış uyumu kontrolü için SMM (620) verisi gerekli."

    # KRG-05: Sevk Belgesi Eksikliği
    KRG_05_TETIKLENDI = "Fatura-irsaliye eşleşme oranı düşük"
    KRG_05_GECTI = "Fatura-irsaliye eşleşme oranı yeterli."
    KRG_05_VERI_YOK = "Sevk belgesi kontrolü için fatura ve irsaliye verileri gerekli."

    # KRG-06: Ödeme Yöntemi Uyumsuzluğu
    KRG_06_TETIKLENDI = "7.000 TL üstü nakit ödeme tespit edildi"
    KRG_06_GECTI = "7.000 TL üstü nakit ödeme tespit edilmedi."
    KRG_06_VERI_YOK = "Ödeme yöntemi kontrolü için kasa/banka verisi gerekli."

    # KRG-07: Karşılıklı Ödeme Döngüsü
    KRG_07_TETIKLENDI = "Karşılıklı ödeme döngüsü tespit edildi"
    KRG_07_GECTI = "Karşılıklı ödeme döngüsü için cari hesap analizi yapıldı. Risk tespit edilmedi."
    KRG_07_VERI_YOK = "Karşılıklı ödeme döngüsü kontrolü için cari hesap verisi gerekli."

    # KRG-08: Sektörel Kârlılık Anomalisi
    KRG_08_TETIKLENDI = "Kâr marjı sektör ortalamasının çok altında"
    KRG_08_GECTI = "Kâr marjı sektör ortalaması ile uyumlu."
    KRG_08_VERI_YOK = "Sektörel kârlılık kontrolü için kâr marjı ve sektör verisi gerekli."

    # KRG-09: Beyan-Yaşam Standardı Uyumsuzluğu
    KRG_09_TETIKLENDI = "Yaşam standardı beyan gelirinin çok üzerinde"
    KRG_09_GECTI = "Beyan-yaşam standardı uyumu kontrol edildi."
    KRG_09_VERI_YOK = "Beyan-yaşam standardı kontrolü için ortak/yönetici kişisel verileri gerekli."

    # KRG-10: KDV Beyan-Fatura Uyumsuzluğu
    KRG_10_TETIKLENDI = "E-fatura ve muhasebe kayıtları arasında ciddi fark"
    KRG_10_GECTI = "KDV beyan-fatura kontrolü yapıldı. Ciddi fark tespit edilmedi."
    KRG_10_VERI_YOK = "KDV beyan-fatura kontrolü için e-fatura verisi gerekli."

    # KRG-11: Riskli KDV İade Talebi
    KRG_11_TETIKLENDI = "Yüksek KDV iade talebi tespit edildi"
    KRG_11_GECTI = "KDV iade talebi makul seviyede."
    KRG_11_VERI_YOK = "Bu dönemde KDV iade talebi yapılmamış."

    # KRG-12: Sahte Belge Şüphesi
    KRG_12_TETIKLENDI = "Sahte belge riski tespit edildi"
    KRG_12_GECTI = "Sahte belge göstergeleri kontrol edildi. Anlamlı risk tespit edilmedi."
    KRG_12_VERI_YOK = "Sahte belge kontrolü için belge analiz verisi gerekli."

    # KRG-13: Transfer Fiyatlandırması Riski
    KRG_13_TETIKLENDI = "Yüksek ilişkili kişi işlem oranı"
    KRG_13_GECTI = "İlişkili kişi işlem oranı makul seviyede."
    KRG_13_VERI_YOK = "Transfer fiyatlandırması kontrolü için ilişkili kişi işlem verisi gerekli."

    # KRG-14: Sürekli Zarar Beyanı
    KRG_14_TETIKLENDI = "Ardışık dönemlerde zarar beyanı"
    KRG_14_GECTI_KARLI = "Son dönemlerde zarar beyanı yok. Şirket kârlı."
    KRG_14_GECTI_ESIK_ALTI = "Zarar dönem sayısı 3 dönem eşiğinin altında."
    KRG_14_VERI_YOK = "Sürekli zarar kontrolü için dönemsel beyanname verisi gerekli."

    # KRG-15: Düşük Vergi Yükü
    KRG_15_TETIKLENDI = "Vergi yükü sektör ortalamasının çok altında"
    KRG_15_GECTI = "Vergi yükü sektör ortalamasıyla uyumlu."
    KRG_15_VERI_YOK = "Vergi yükü kontrolü için ciro verisi gerekli."

    # KRG-16: Ortak/Yönetici Risk Geçmişi
    KRG_16_TETIKLENDI = "GİB riskli listesinde ortak/yönetici tespit edildi"
    KRG_16_GECTI = "Ortak/yönetici GİB riskli listesi kontrolü yapıldı. Riskli kişi yok."
    KRG_16_VERI_YOK = "Ortak/yönetici risk kontrolü için sicil verisi gerekli."


@dataclass(frozen=True)
class HesapKontrolMessages:
    """Hesap kontrol mesajları"""

    # Likidite
    KASA_SISKINLIK = "Kasa bakiyesi aktif toplamın %{oran:.1f}'ü"
    KASA_ADAT = "Kasa bakiyesi için adat faizi hesaplanmalı"
    BANKA_NORMAL = "Banka hesapları normal"

    # Ortaklar
    ORTAK_ALACAK = "Ortaklardan alacak sermayenin %{oran:.1f}'ü"
    ORTAK_ADAT = "131 hesap için emsal faiz faturası kesilmeli"
    ORTULU_SERMAYE = "331 hesap örtülü sermaye limitini aşıyor"

    # KDV
    DEVREDEN_KDV = "KDV {ay} aydır devretmekte"
    KDV_NORMAL = "KDV durumu normal"

    # Stok
    STOK_DEVIR = "Stok devir hızı {gun} gün (yüksek)"
    STOK_NORMAL = "Stok devir hızı normal"

    # Genel
    NORMAL = "Kontrol sonucu normal"
    UYARI = "Dikkat gerektiren durum tespit edildi"
    KRITIK = "Kritik risk tespit edildi - acil aksiyon gerekli"


@dataclass(frozen=True)
class UIMessages:
    """UI metinleri"""

    # Risk Seviyesi
    RISK_DUSUK = "Düşük Risk"
    RISK_ORTA = "Orta Risk"
    RISK_YUKSEK = "Yüksek Risk"
    RISK_KRITIK = "Kritik Risk"

    # Durum
    DURUM_NORMAL = "Normal"
    DURUM_UYARI = "Uyarı"
    DURUM_KRITIK = "Kritik"

    # Aksiyon
    AKSIYON_TAKIP = "Takip"
    AKSIYON_BILGI = "Bilgi İsteme"
    AKSIYON_IZAH = "İzaha Davet"
    AKSIYON_INCELEME = "İnceleme"

    # Veri Durumu
    VERI_YUKLENDI = "Veri yüklendi"
    VERI_BEKLENIYOR = "Veri bekleniyor"
    VERI_EKSIK = "Veri eksik"

    # Kontrol
    KONTROL_EDILDI = "Kontrol edildi"
    KONTROL_BEKLENIYOR = "Kontrol bekleniyor"


@dataclass(frozen=True)
class TurkishText:
    """Ana Türkçe metin sınıfı"""

    KURGAN: KurganMessages = KurganMessages()
    HESAP: HesapKontrolMessages = HesapKontrolMessages()
    UI: UIMessages = UIMessages()

    # Genel uyarılar
    UYARI_TAHMINI = "Bu tutarlar tahmini olup, gerçek inceleme sonuçları farklı olabilir."
    UYARI_SMMM = "Bu bilgiler SMMM/YMM mesleki değerlendirmesi için hazırlanmıştır."

    # Mevzuat referansları
    VUK_134 = "VUK 134"
    VUK_257 = "VUK 257"
    VUK_359 = "VUK 359"
    KVK_11 = "KVK 11"
    KVK_12 = "KVK 12"
    KVK_13 = "KVK 13"
    GVK_40 = "GVK 40"


# Singleton instance
TR = TurkishText()


def format_currency(value: float, decimals: int = 0) -> str:
    """Türkçe para formatı: 1.234.567,89 TL"""
    if decimals > 0:
        formatted = f"{value:,.{decimals}f}"
    else:
        formatted = f"{value:,.0f}"
    # Amerikan formatından Türk formatına çevir
    formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{formatted} TL"


def format_percentage(value: float, decimals: int = 1) -> str:
    """Türkçe yüzde formatı: %12,5"""
    formatted = f"{value * 100:.{decimals}f}".replace(".", ",")
    return f"%{formatted}"


def format_number(value: float, decimals: int = 0) -> str:
    """Türkçe sayı formatı: 1.234.567,89"""
    if decimals > 0:
        formatted = f"{value:,.{decimals}f}"
    else:
        formatted = f"{value:,.0f}"
    return formatted.replace(",", "X").replace(".", ",").replace("X", ".")
