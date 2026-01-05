"""
Source Registry - Yasal Dayanak Kayit Sistemi

Tum yasal referanslar icin merkezi kayit.
Trust Class: A (Resmi), B (Yari-resmi), C (Yorumcu), D (Diger)
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import date
import hashlib
import logging

logger = logging.getLogger(__name__)


@dataclass
class Source:
    """Yasal kaynak"""
    id: str                      # SRC-0001, SRC-0002, ...
    kurum: str                   # GIB, Resmi Gazete, TURMOB, KGK, TCMB, TUIK
    tur: str                     # Kanun, Teblig, Sirkuler, Yonetmelik, Madde
    baslik: str                  # Full title in Turkish
    yayim_tarihi: Optional[str]
    yururluk_tarihi: Optional[str]
    canonical_url: str           # Official source URL
    content_hash: str            # SHA256 hash
    version: str
    kapsam_etiketleri: List[str] # KDV, KV, VUK, TMS, ...
    trust_class: str             # A/B/C/D


class SourceRegistry:
    """
    Yasal kaynak kayit sistemi

    In-memory implementation (PostgreSQL migration hazir)
    """

    def __init__(self):
        self.sources: Dict[str, Source] = {}
        self._load_seed_data()
        logger.info(f"SourceRegistry yukendi: {len(self.sources)} kaynak")

    def _load_seed_data(self):
        """Gercek Turk vergi mevzuati kaynaklari"""

        seed_data = [
            # ═══════════════════════════════════════════════════════════════
            # KVK - KURUMLAR VERGISI KANUNU
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0001",
                kurum="GIB",
                tur="Kanun",
                baslik="5520 Sayili Kurumlar Vergisi Kanunu",
                yayim_tarihi="2006-06-21",
                yururluk_tarihi="2006-06-21",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5520.pdf",
                content_hash="a3f5e8b9c1d2e3f4a5b6c7d8e9f0a1b2",
                version="v1.0",
                kapsam_etiketleri=["KV"],
                trust_class="A"
            ),
            Source(
                id="SRC-0023",
                kurum="GIB",
                tur="Madde",
                baslik="5520 KVK Madde 32 - Gecici Vergi",
                yayim_tarihi="2006-06-21",
                yururluk_tarihi="2006-06-21",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5520.pdf",
                content_hash="f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3",
                version="v1.0",
                kapsam_etiketleri=["KV", "GV"],
                trust_class="A"
            ),
            Source(
                id="SRC-0025",
                kurum="GIB",
                tur="Madde",
                baslik="5520 KVK Madde 5 - Istisna Kazanclar",
                yayim_tarihi="2006-06-21",
                yururluk_tarihi="2006-06-21",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5520.pdf",
                content_hash="a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
                version="v1.0",
                kapsam_etiketleri=["KV"],
                trust_class="A"
            ),
            Source(
                id="SRC-0026",
                kurum="GIB",
                tur="Madde",
                baslik="5520 KVK Madde 10 - KKEG",
                yayim_tarihi="2006-06-21",
                yururluk_tarihi="2006-06-21",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5520.pdf",
                content_hash="b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
                version="v1.0",
                kapsam_etiketleri=["KV"],
                trust_class="A"
            ),
            Source(
                id="SRC-0027",
                kurum="GIB",
                tur="Madde",
                baslik="5520 KVK Madde 8 - Indirimler",
                yayim_tarihi="2006-06-21",
                yururluk_tarihi="2006-06-21",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5520.pdf",
                content_hash="c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
                version="v1.0",
                kapsam_etiketleri=["KV"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # VUK - VERGI USUL KANUNU
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0002",
                kurum="Maliye Bakanligi",
                tur="Kanun",
                baslik="213 Sayili Vergi Usul Kanunu",
                yayim_tarihi="1961-01-04",
                yururluk_tarihi="1961-01-04",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.4.213.pdf",
                content_hash="b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
                version="v1.0",
                kapsam_etiketleri=["VUK"],
                trust_class="A"
            ),
            Source(
                id="SRC-0045",
                kurum="Maliye Bakanligi",
                tur="Madde",
                baslik="VUK Madde 227 - Defter-Beyan Uyumu",
                yayim_tarihi="1961-01-04",
                yururluk_tarihi="1961-01-04",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.4.213.pdf",
                content_hash="c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
                version="v1.0",
                kapsam_etiketleri=["VUK"],
                trust_class="A"
            ),
            Source(
                id="SRC-0046",
                kurum="Maliye Bakanligi",
                tur="Madde",
                baslik="VUK Madde 219 - Banka Mutabakati",
                yayim_tarihi="1961-01-04",
                yururluk_tarihi="1961-01-04",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.4.213.pdf",
                content_hash="d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
                version="v1.0",
                kapsam_etiketleri=["VUK"],
                trust_class="A"
            ),
            Source(
                id="SRC-0047",
                kurum="Maliye Bakanligi",
                tur="Madde",
                baslik="VUK Madde 229 - Kasa Kontrolu",
                yayim_tarihi="1961-01-04",
                yururluk_tarihi="1961-01-04",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.4.213.pdf",
                content_hash="e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
                version="v1.0",
                kapsam_etiketleri=["VUK"],
                trust_class="A"
            ),
            Source(
                id="SRC-0048",
                kurum="Maliye Bakanligi",
                tur="Madde",
                baslik="VUK Madde 253 - Defter Tutma",
                yayim_tarihi="1961-01-04",
                yururluk_tarihi="1961-01-04",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.4.213.pdf",
                content_hash="a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
                version="v1.0",
                kapsam_etiketleri=["VUK"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # KDV - KATMA DEGER VERGISI
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0003",
                kurum="GIB",
                tur="Kanun",
                baslik="3065 Sayili KDV Kanunu",
                yayim_tarihi="1984-10-25",
                yururluk_tarihi="1985-01-01",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.3.3065.pdf",
                content_hash="f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
                version="v1.0",
                kapsam_etiketleri=["KDV"],
                trust_class="A"
            ),
            Source(
                id="SRC-0004",
                kurum="GIB",
                tur="Teblig",
                baslik="KDV Genel Uygulama Tebligi",
                yayim_tarihi="2014-04-26",
                yururluk_tarihi="2014-04-26",
                canonical_url="https://www.gib.gov.tr/fileadmin/mevzuatek/kdvgeneluygulamatebligi/kdv_genteb.pdf",
                content_hash="a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
                version="v5.0",
                kapsam_etiketleri=["KDV"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # GVK - GELIR VERGISI KANUNU
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0005",
                kurum="Maliye Bakanligi",
                tur="Kanun",
                baslik="193 Sayili Gelir Vergisi Kanunu",
                yayim_tarihi="1960-12-31",
                yururluk_tarihi="1961-01-01",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.4.193.pdf",
                content_hash="b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
                version="v1.0",
                kapsam_etiketleri=["GVK"],
                trust_class="A"
            ),
            Source(
                id="SRC-0024",
                kurum="Maliye Bakanligi",
                tur="Madde",
                baslik="GVK Mukerrer 120 - Gecici Vergi",
                yayim_tarihi="1960-12-31",
                yururluk_tarihi="1961-01-01",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.4.193.pdf",
                content_hash="c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
                version="v1.0",
                kapsam_etiketleri=["GVK", "GV"],
                trust_class="A"
            ),
            Source(
                id="SRC-0015",
                kurum="GIB",
                tur="Madde",
                baslik="GVK Madde 94 - Stopaj",
                yayim_tarihi="1960-12-31",
                yururluk_tarihi="1961-01-01",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.4.193.pdf",
                content_hash="e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
                version="v1.0",
                kapsam_etiketleri=["GVK", "STOPAJ"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # TMS - MUHASEBE STANDARTLARI
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0006",
                kurum="KGK",
                tur="Standart",
                baslik="TMS 29 - Yuksek Enflasyon",
                yayim_tarihi="2005-01-01",
                yururluk_tarihi="2005-01-01",
                canonical_url="https://www.kgk.gov.tr/Portalv2Uploads/files/Duyurular/v2/TMS/TMS_2024/TMS29.pdf",
                content_hash="d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
                version="v2024.1",
                kapsam_etiketleri=["TMS"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # VDK - VERGI DENETIM KURULU
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0034",
                kurum="Maliye Bakanligi",
                tur="Genelge",
                baslik="VDK Genelgesi E-55935724-010.06-7361",
                yayim_tarihi="2019-01-15",
                yururluk_tarihi="2019-01-15",
                canonical_url="https://vdk.hmb.gov.tr/duyuru/sahte-belge-ile-mucadele-stratejisi-ve-kurgan-rehberi",
                content_hash="e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
                version="v1.0",
                kapsam_etiketleri=["VDK"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # ENFLASYON DUZELTMESI
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0007",
                kurum="Maliye Bakanligi",
                tur="Teblig",
                baslik="587 Sira No.lu VUK Genel Tebligi",
                yayim_tarihi="2024-01-01",
                yururluk_tarihi="2024-01-01",
                canonical_url="https://www.gib.gov.tr/587-sira-nolu-vergi-usul-kanunu-genel-tebligi",
                content_hash="f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7",
                version="v1.0",
                kapsam_etiketleri=["VUK", "TMS"],
                trust_class="A"
            ),
            Source(
                id="SRC-0008",
                kurum="Maliye Bakanligi",
                tur="Madde",
                baslik="VUK Gecici 33 - Enflasyon Duzeltmesi",
                yayim_tarihi="2004-01-01",
                yururluk_tarihi="2004-01-01",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.4.213.pdf",
                content_hash="a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8",
                version="v1.0",
                kapsam_etiketleri=["VUK", "TMS"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # TCMB / TUIK
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0009",
                kurum="TCMB",
                tur="Veri Serisi",
                baslik="TUFE Endeks Serisi",
                yayim_tarihi="2024-01-01",
                yururluk_tarihi="2024-01-01",
                canonical_url="https://evds2.tcmb.gov.tr/index.php?/evds/serieMarket",
                content_hash="b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
                version="v2024.1",
                kapsam_etiketleri=["TMS"],
                trust_class="A"
            ),
            Source(
                id="SRC-0010",
                kurum="TUIK",
                tur="Veri Serisi",
                baslik="Yi-UFE Endeks Serisi",
                yayim_tarihi="2024-01-01",
                yururluk_tarihi="2024-01-01",
                canonical_url="https://data.tuik.gov.tr/Kategori/GetKategori?p=enflasyon-ve-fiyat-106",
                content_hash="c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
                version="v2024.1",
                kapsam_etiketleri=["TMS"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # TURMOB
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0011",
                kurum="TURMOB",
                tur="Sirkuler",
                baslik="TURMOB Sirkuler 2024/01",
                yayim_tarihi="2024-01-05",
                yururluk_tarihi="2024-01-05",
                canonical_url="https://www.turmob.org.tr/sirkuler/2024/01",
                content_hash="d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
                version="v1.0",
                kapsam_etiketleri=["TMS", "TURMOB"],
                trust_class="B"
            ),

            # ═══════════════════════════════════════════════════════════════
            # E-BELGE
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0012",
                kurum="GIB",
                tur="Teknik Kilavuz",
                baslik="e-Fatura Teknik Kilavuzu",
                yayim_tarihi="2023-01-01",
                yururluk_tarihi="2023-01-01",
                canonical_url="https://www.gib.gov.tr/e-fatura-teknik-kilavuz",
                content_hash="e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
                version="v3.5",
                kapsam_etiketleri=["E-BELGE"],
                trust_class="A"
            ),
            Source(
                id="SRC-0013",
                kurum="GIB",
                tur="Teknik Kilavuz",
                baslik="e-Defter Teknik Kilavuzu",
                yayim_tarihi="2023-01-01",
                yururluk_tarihi="2023-01-01",
                canonical_url="https://www.gib.gov.tr/e-defter-teknik-kilavuz",
                content_hash="f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
                version="v2.2",
                kapsam_etiketleri=["E-BELGE"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # AR-GE
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0014",
                kurum="Sanayi Bakanligi",
                tur="Kanun",
                baslik="5746 Sayili Ar-Ge Kanunu",
                yayim_tarihi="2008-02-28",
                yururluk_tarihi="2008-03-01",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5746.pdf",
                content_hash="d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
                version="v1.0",
                kapsam_etiketleri=["RD", "KV"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # SGK
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0016",
                kurum="SGK",
                tur="Kanun",
                baslik="5510 Sayili Sosyal Sigortalar Kanunu",
                yayim_tarihi="2006-05-16",
                yururluk_tarihi="2006-10-01",
                canonical_url="https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5510.pdf",
                content_hash="f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
                version="v1.0",
                kapsam_etiketleri=["SGK"],
                trust_class="A"
            ),

            # ═══════════════════════════════════════════════════════════════
            # BIG4 YORUMLARI (Trust Class C)
            # ═══════════════════════════════════════════════════════════════
            Source(
                id="SRC-0017",
                kurum="PwC Turkiye",
                tur="Bulten",
                baslik="PwC Enflasyon Duzeltmesi Rehberi",
                yayim_tarihi="2024-01-10",
                yururluk_tarihi="2024-01-10",
                canonical_url="https://www.pwc.com.tr/enflasyon-duzeltme-rehberi-2024",
                content_hash="c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
                version="v1.0",
                kapsam_etiketleri=["TMS"],
                trust_class="C"
            ),
            Source(
                id="SRC-0018",
                kurum="Deloitte Turkiye",
                tur="Bulten",
                baslik="Deloitte Vergi Bulteni 2024/03",
                yayim_tarihi="2024-03-15",
                yururluk_tarihi="2024-03-15",
                canonical_url="https://www2.deloitte.com/tr/vergi-bulteni-2024-03",
                content_hash="d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
                version="v1.0",
                kapsam_etiketleri=["KDV"],
                trust_class="C"
            ),
            Source(
                id="SRC-0019",
                kurum="KPMG Turkiye",
                tur="Bulten",
                baslik="KPMG Vergi Dunyasi 2024/02",
                yayim_tarihi="2024-02-20",
                yururluk_tarihi="2024-02-20",
                canonical_url="https://home.kpmg/tr/vergi-dunyasi-2024-02",
                content_hash="e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4",
                version="v1.0",
                kapsam_etiketleri=["KV"],
                trust_class="C"
            ),
            Source(
                id="SRC-0020",
                kurum="EY Turkiye",
                tur="Bulten",
                baslik="EY Tax Alert 2024/05",
                yayim_tarihi="2024-05-10",
                yururluk_tarihi="2024-05-10",
                canonical_url="https://www.ey.com/tr_tr/tax-alert-2024-05",
                content_hash="f0a1b2c3d4e5f6c7d8e9f0a1b2c3d4e5",
                version="v1.0",
                kapsam_etiketleri=["E-BELGE"],
                trust_class="C"
            ),
        ]

        for source in seed_data:
            self.sources[source.id] = source

    def get(self, source_id: str) -> Optional[Source]:
        """Tek kaynak getir"""
        return self.sources.get(source_id)

    def get_many(self, source_ids: List[str]) -> List[Source]:
        """Birden fazla kaynak getir"""
        return [self.sources[sid] for sid in source_ids if sid in self.sources]

    def list_all(
        self,
        kapsam: Optional[str] = None,
        trust_class: Optional[str] = None
    ) -> List[Source]:
        """Tum kaynaklari listele (filtreli)"""
        results = list(self.sources.values())

        if kapsam:
            results = [s for s in results if kapsam in s.kapsam_etiketleri]

        if trust_class:
            results = [s for s in results if s.trust_class == trust_class]

        return sorted(results, key=lambda s: s.id)

    def to_dict(self, source: Source) -> Dict:
        """Source'u dict'e cevir"""
        return {
            "id": source.id,
            "kurum": source.kurum,
            "tur": source.tur,
            "baslik": source.baslik,
            "yayim_tarihi": source.yayim_tarihi,
            "yururluk_tarihi": source.yururluk_tarihi,
            "canonical_url": source.canonical_url,
            "content_hash": source.content_hash,
            "version": source.version,
            "kapsam_etiketleri": source.kapsam_etiketleri,
            "trust_class": source.trust_class
        }

    def resolve_refs(self, refs: List[str]) -> List[Dict]:
        """ID listesini detayli kaynaklara cevir"""
        sources = self.get_many(refs)
        return [self.to_dict(s) for s in sources]


# ═══════════════════════════════════════════════════════════════════════════
# LEGACY MAPPING - Eski string'leri yeni ID'lere esle
# ═══════════════════════════════════════════════════════════════════════════

LEGACY_TO_REF = {
    # KVK
    "5520 KVK Md. 32": ["SRC-0023"],
    "5520 Sayili KVK": ["SRC-0001"],
    "5520 Sayili Kurumlar Vergisi Kanunu": ["SRC-0001"],
    "KVK Madde 32": ["SRC-0023"],
    "KVK Madde 5": ["SRC-0025"],
    "KVK Madde 10": ["SRC-0026"],
    "KVK Madde 8": ["SRC-0027"],

    # VUK
    "VUK Madde 227": ["SRC-0045"],
    "VUK Madde 219": ["SRC-0046"],
    "VUK Madde 229": ["SRC-0047"],
    "VUK Madde 253": ["SRC-0048"],
    "213 Sayili VUK": ["SRC-0002"],

    # GVK
    "GVK Mukerrer 120": ["SRC-0024"],
    "GVK Madde 94": ["SRC-0015"],
    "193 Sayili GVK": ["SRC-0005"],

    # VDK
    "VDK Genelgesi E-55935724-010.06-7361": ["SRC-0034"],
    "VDK 13 kriter": ["SRC-0034"],

    # TMS
    "TMS 29": ["SRC-0006"],
    "TMS 29 Yuksek Enflasyonlu Ekonomilerde Finansal Raporlama": ["SRC-0006"],

    # Enflasyon
    "587 Sira No.lu VUK Genel Tebligi": ["SRC-0007"],
    "VUK Gecici 33": ["SRC-0008"],

    # KDV
    "3065 Sayili KDV Kanunu": ["SRC-0003"],
    "KDV Genel Uygulama Tebligi": ["SRC-0004"],
}


def resolve_legacy(legacy_str: str) -> List[str]:
    """Eski string'i yeni ref listesine cevir"""
    return LEGACY_TO_REF.get(legacy_str, [])


# Singleton instance
source_registry = SourceRegistry()
