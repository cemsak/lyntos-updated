"""
LYNTOS API v2 - Complete Dönem Data Endpoint
Sprint: Architecture Refactor - Phase 1

TEK ENDPOINT - TÜM VERİ
Bu endpoint Dashboard'un ihtiyaç duyduğu TÜM veriyi tek bir response'da döndürür.
Frontend artık localStorage kullanmayacak, her şey buradan gelecek.

Kaynaklar:
1. mizan_entries tablosu (Database)
2. document_uploads tablosu (Yüklenen dosyalar - TEK KAYNAK)
3. Hesaplanan analizler (VDK risk, oranlar)

NOT: Disk fallback KALDIRILDI (2026-01-26)
     Tüm veri document_uploads tablosu üzerinden takip edilir.
     Bu sayede:
     - Test/demo verisi yanlışlıkla gösterilmez
     - Tüm giriş noktaları aynı kaynağı kullanır
     - Dedupe ve tracking tutarlı çalışır
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from pathlib import Path
from datetime import datetime
import sqlite3
import logging
import json
import csv

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/donem", tags=["donem-complete"])

DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"
DATA_DIR = Path(__file__).parent.parent.parent / "data"


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


class EDefterDurum(BaseModel):
    """E-Defter durum bilgisi - edefter_entries tablosundan"""
    has_yevmiye: bool = False
    has_kebir: bool = False
    has_yevmiye_berat: bool = False
    has_kebir_berat: bool = False
    has_defter_raporu: bool = False
    yevmiye_satir: int = 0
    kebir_satir: int = 0
    yevmiye_berat_satir: int = 0
    kebir_berat_satir: int = 0
    defter_tipi_list: List[str] = Field(default_factory=list)


class DonemCompleteResponse(BaseModel):
    """Tam dönem response - TEK ENDPOINT TÜM VERİ"""
    ok: bool = True
    has_data: bool = False
    meta: DonemMeta
    files: List[DonemFileSummary] = Field(default_factory=list)
    mizan: Optional[Dict[str, Any]] = None  # hesaplar + summary
    analysis: Optional[DonemAnalysis] = None
    edefter_durum: Optional[EDefterDurum] = None
    message: Optional[str] = None


# ============== VDK KRİTERLERİ ==============

VDK_CRITERIA = [
    {
        "kodu": "K-09",
        "adi": "Kasa/Aktif Toplam Oranı",
        "esik_uyari": 0.05,
        "esik_kritik": 0.15,
        "hesap_kodu": "100",
        "paylda_prefix": ["100"],
        "paydada": "aktif_toplam",
        "aciklama": "Kasa bakiyesinin aktif toplamına oranı",
        "mevzuat": "VUK Md. 171",
        "oneri_uyari": "Kasa bakiyesi aktif toplamın %5'ini aşmaktadır. Nakit yoğunluk incelenmelidir.",
        "oneri_kritik": "Kasa bakiyesi aktif toplamın %15'ini aşmaktadır. VDK denetiminde kasa sayımı istenecektir.",
    },
    {
        "kodu": "TF-01",
        "adi": "Ortaklardan Alacak/Sermaye",
        "esik_uyari": 0.10,
        "esik_kritik": 0.25,
        "hesap_kodu": "131",
        "paylda_prefix": ["131"],
        "paydada": "sermaye",
        "aciklama": "Ortaklardan alacakların sermayeye oranı",
        "mevzuat": "KVK Md. 13 (Transfer Fiyatlandırması)",
        "oneri_uyari": "Ortaklardan alacak sermayenin %10'unu aşmaktadır. Transfer fiyatlandırması incelenmelidir.",
        "oneri_kritik": "Ortaklardan alacak sermayenin %25'ini aşmaktadır. KVK 13 kapsamında emsal faiz hesaplanmalıdır.",
    },
    {
        "kodu": "OS-01",
        "adi": "İlişkili Kişilere Borç/Özkaynak (Örtülü Sermaye)",
        "esik_uyari": 1.5,
        "esik_kritik": 3.0,
        "hesap_kodu": "331",
        "paylda_prefix": ["331"],
        "paydada": "ozsermaye",
        "aciklama": "Ortaklara borçların öz sermayeye oranı (örtülü sermaye kontrolü)",
        "mevzuat": "KVK Md. 12",
        "oneri_uyari": "İlişkili kişi borcu öz sermayenin 1.5 katını aşmaktadır. Örtülü sermaye riski başlıyor.",
        "oneri_kritik": "İlişkili kişi borcu öz sermayenin 3 katını aşmaktadır. KVK 12 uyarınca örtülü sermaye oluşmuştur.",
    },
    {
        "kodu": "SA-01",
        "adi": "Alacak Tahsilat Süresi",
        "esik_uyari": 90,
        "esik_kritik": 365,
        "hesap_kodu": "120",
        "paylda_prefix": ["120", "121"],
        "paydada": "ciro",
        "formula": "gun",
        "aciklama": "Ticari alacakların ortalama tahsilat süresi",
        "mevzuat": "VDK Denetim Yönergesi",
        "oneri_uyari": "Tahsilat süresi 90 günü aşmaktadır. Alacak yaşlandırması gözden geçirilmelidir.",
        "oneri_kritik": "Tahsilat süresi 1 yılı aşmaktadır. Şüpheli alacak karşılığı değerlendirilmelidir (VUK 323).",
    },
    {
        "kodu": "SD-01",
        "adi": "Stok Devir Süresi",
        "esik_uyari": 120,
        "esik_kritik": 365,
        "hesap_kodu": "15",
        "paylda_prefix": ["15"],
        "paydada": "satilan_mal",
        "formula": "gun",
        "aciklama": "Stokların ortalama devir süresi",
        "mevzuat": "VDK Denetim Yönergesi",
        "oneri_uyari": "Stok devir süresi 120 günü aşmaktadır. Stok sayımı ve değerleme kontrol edilmelidir.",
        "oneri_kritik": "Stok devir süresi 1 yılı aşmaktadır. Fiktif stok veya değer düşüklüğü riski incelenmelidir.",
    },
    {
        "kodu": "KDV-01",
        "adi": "Devreden KDV / Satışlar",
        "esik_uyari": 0.10,
        "esik_kritik": 0.18,
        "hesap_kodu": "190",
        "paylda_prefix": ["190"],
        "paydada": "ciro",
        "aciklama": "Devreden KDV'nin satışlara oranı",
        "mevzuat": "KDVK Md. 29",
        "oneri_uyari": "Devreden KDV satışların %10'unu aşmaktadır. Yüksek KDV iade riski oluşabilir.",
        "oneri_kritik": "Devreden KDV satışların %18'ini aşmaktadır. SMİYB riski incelenmelidir.",
    },
]


# ============== HELPER FUNCTIONS ==============

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ============== HELPER: Disk fallback fonksiyonları KALDIRILDI ==============
# Tarih: 2026-01-26
# Sebep: Tüm veri document_uploads tablosu üzerinden takip edilecek
#        Disk'teki test/demo verisi yanlışlıkla gösterilmeyecek
# ==============================================================================


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

    # TDHP Gelir Tablosu kalemleri
    brut_satislar = 0.0       # 600 alacak
    satis_iadeleri = 0.0      # 610, 611 borç
    satis_maliyeti = 0.0      # 620, 621, 622 borç
    pazarlama_gideri = 0.0    # 631, 760 (yansıtılmışsa 631)
    genel_yonetim_gideri = 0.0  # 632, 770 (yansıtılmışsa 632)
    finansman_gideri = 0.0    # 660, 780 (yansıtılmışsa 660)
    diger_gelirler = 0.0      # 640-649 alacak
    diger_giderler = 0.0      # 654-659 borç
    tesvik_gelirleri = 0.0    # 602 alacak (SSK/teşvik)

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
        # Gelirler ve Giderler (6xx) - TDHP Gelir Tablosu düzeni
        elif kod.startswith('6'):
            if kod.startswith('600'):
                brut_satislar += alacak - borc
                ciro += alacak - borc
            elif kod.startswith('602'):
                tesvik_gelirleri += alacak - borc
            elif kod.startswith('610') or kod.startswith('611'):
                satis_iadeleri += borc - alacak
            elif kod.startswith('620') or kod.startswith('621') or kod.startswith('622'):
                satis_maliyeti += borc - alacak
                satilan_mal += borc - alacak
            elif kod.startswith('631'):
                pazarlama_gideri += borc - alacak
            elif kod.startswith('632'):
                genel_yonetim_gideri += borc - alacak
            elif kod.startswith('660'):
                finansman_gideri += borc - alacak
            elif kod[:3] >= '640' and kod[:3] <= '649':
                diger_gelirler += alacak - borc
            elif kod[:3] >= '654' and kod[:3] <= '659':
                diger_giderler += borc - alacak
            # Genel gelir/gider toplamları
            gelir_toplam += alacak - borc
        # Giderler (7xx) - maliyet yansıtma hesapları
        elif kod.startswith('7'):
            gider_toplam += borc - alacak

    pasif_toplam = ozsermaye + yabanci_kaynak

    # ═══════════════════════════════════════════════════════════════
    # NET KAR HESAPLAMASI - TDHP Gelir Tablosu Düzeni
    # ═══════════════════════════════════════════════════════════════
    # Brüt Satışlar = 600 alacak - 610 borç - 611 borç
    net_satislar = brut_satislar - satis_iadeleri + tesvik_gelirleri
    # Brüt Kâr = Net Satışlar - Satılan Malın Maliyeti (620+621+622)
    brut_kar = net_satislar - satis_maliyeti
    # Faaliyet Kârı = Brüt Kâr - Pazarlama - Genel Yönetim - Finansman
    faaliyet_kari = brut_kar - pazarlama_gideri - genel_yonetim_gideri - finansman_gideri
    # Diğer Faaliyetler = 640-649 gelir - 654-659 gider
    diger_faaliyetler = diger_gelirler - diger_giderler
    # Vergi Öncesi Kâr
    vergi_oncesi_kar = faaliyet_kari + diger_faaliyetler
    # Tahmini Kurumlar Vergisi (%25)
    tahmini_kv = max(vergi_oncesi_kar * 0.25, 0)
    # Net Kâr
    net_kar = vergi_oncesi_kar - tahmini_kv

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
        # TDHP Gelir Tablosu detayları
        "brut_satislar": round(brut_satislar, 2),
        "satis_iadeleri": round(satis_iadeleri, 2),
        "tesvik_gelirleri": round(tesvik_gelirleri, 2),
        "net_satislar": round(net_satislar, 2),
        "satis_maliyeti": round(satis_maliyeti, 2),
        "brut_kar": round(brut_kar, 2),
        "pazarlama_gideri": round(pazarlama_gideri, 2),
        "genel_yonetim_gideri": round(genel_yonetim_gideri, 2),
        "finansman_gideri": round(finansman_gideri, 2),
        "faaliyet_kari": round(faaliyet_kari, 2),
        "diger_gelirler": round(diger_gelirler, 2),
        "diger_giderler": round(diger_giderler, 2),
        "vergi_oncesi_kar": round(vergi_oncesi_kar, 2),
        "tahmini_kv": round(tahmini_kv, 2),
    }


def calculate_vdk_risks(entries: List[Dict], summary: Dict) -> List[Dict]:
    """
    VDK risk kriterlerini hesapla - İki seviyeli eşik sistemi.

    Her kriter için uyarı ve kritik eşik değerleri vardır:
    - Uyarı: SMMM'nin dikkat etmesi gereken seviye
    - Kritik: VDK denetiminde sorun yaratacak seviye
    """

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

        # Hesaplama
        if payda_value == 0:
            hesaplanan = 0
            durum = "eksik_veri"
            severity = "bilgi"
            oneri = None
        else:
            if kriter.get("formula") == "gun":
                hesaplanan = (paylda_value / payda_value) * 365
            else:
                hesaplanan = paylda_value / payda_value

            esik_kritik = kriter["esik_kritik"]
            esik_uyari = kriter["esik_uyari"]

            if hesaplanan > esik_kritik:
                durum = "asim"
                severity = "kritik"
                oneri = kriter.get("oneri_kritik")
            elif hesaplanan > esik_uyari:
                durum = "asim"
                severity = "uyari"
                oneri = kriter.get("oneri_uyari")
            else:
                durum = "normal"
                severity = "bilgi"
                oneri = None

        risks.append({
            "kriter_kodu": kriter["kodu"],
            "kriter_adi": kriter["adi"],
            "severity": severity,
            "hesaplanan_deger": round(hesaplanan, 4),
            "esik_deger": kriter["esik_kritik"],
            "esik_uyari": kriter.get("esik_uyari", 0),
            "esik_kritik": kriter.get("esik_kritik", 0),
            "durum": durum,
            "aciklama": kriter["aciklama"],
            "oneri": oneri,
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

        # Dosya türlerine göre kontrol (SADECE document_uploads tablosundan)
        doc_types = set(f.doc_type for f in files)
        has_mizan = "MIZAN" in doc_types
        has_beyanname = "BEYANNAME" in doc_types
        has_banka = "BANKA" in doc_types
        has_tahakkuk = "TAHAKKUK" in doc_types
        has_edefter = "EDEFTER_YEVMIYE" in doc_types or "EDEFTER_KEBIR" in doc_types or "EDEFTER_BERAT" in doc_types

        # E-DEFTER DURUM: edefter_entries tablosundan defter tipi kontrolü
        edefter_durum_data = None
        try:
            cursor.execute("""
                SELECT defter_tipi, COUNT(*) as satir_sayisi
                FROM edefter_entries
                WHERE client_id = ? AND period_id = ?
                GROUP BY defter_tipi
            """, (client_id, period))
            edefter_rows = cursor.fetchall()
            defter_map = {row["defter_tipi"]: row["satir_sayisi"] for row in edefter_rows}

            if defter_map:
                edefter_durum_data = EDefterDurum(
                    has_yevmiye="Y" in defter_map,
                    has_kebir="K" in defter_map,
                    has_yevmiye_berat="YB" in defter_map,
                    has_kebir_berat="KB" in defter_map,
                    has_defter_raporu="DR" in defter_map,
                    yevmiye_satir=defter_map.get("Y", 0),
                    kebir_satir=defter_map.get("K", 0),
                    yevmiye_berat_satir=defter_map.get("YB", 0),
                    kebir_berat_satir=defter_map.get("KB", 0),
                    defter_tipi_list=list(defter_map.keys()),
                )
                # E-defter varsa doc_types'a da ekle (belge durumu için)
                if defter_map.get("Y"):
                    has_edefter = True
        except Exception as edefter_err:
            logger.warning(f"E-Defter durum sorgusu hatası (görmezden gelindi): {edefter_err}")

        # NOT: Disk fallback KALDIRILDI (2026-01-26)
        # Tüm veri document_uploads tablosu üzerinden takip edilir
        # Test/demo verisi yanlışlıkla gösterilmez

        # 2. MİZAN VERİSİNİ ÇEK - SADECE Database'den
        # TÜM kayıtları çek (özet ve VDK analizi için hepsi gerekli)
        cursor.execute("""
            SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            ORDER BY hesap_kodu
        """, (client_id, period))

        mizan_rows = cursor.fetchall()

        mizan_data = None
        analysis_data = None

        # NOT: Disk fallback KALDIRILDI (2026-01-26)
        # Mizan verisi SADECE mizan_entries tablosundan okunur
        # Bu tablo document_uploads üzerinden yüklenen dosyalardan beslenir

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

            # Özet hesapla (TÜM hesaplar dahil - 6xx gelir/gider hesapları için şart)
            summary = calculate_mizan_summary(mizan_entries)

            # VDK risk analizi (TÜM hesaplar dahil)
            vdk_risks = calculate_vdk_risks(mizan_entries, summary)
            risk_score, risk_level = calculate_risk_score(vdk_risks)

            # Hesap listesini limitle (özet ve analiz zaten tüm veriden hesaplandı)
            hesaplar_limited = mizan_entries[:limit_accounts] if include_accounts else []

            mizan_data = {
                "summary": summary,
                "hesaplar": hesaplar_limited,
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
            edefter_durum=edefter_durum_data,
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
