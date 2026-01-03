"""
RegWatch: Mevzuat Izleme Motoru

Kaynaklar:
- resmigazete.gov.tr (gunluk)
- gib.gov.tr/mevzuat (haftalik)
- mevzuat.gov.tr (haftalik)

Trust Score: 1.0
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
import hashlib
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class MevzuatChange:
    """Mevzuat degisikligi"""
    source: str  # "resmigazete", "gib", "mevzuat"
    title: str
    url: str
    published_date: str
    content_hash: str
    impact_rules: List[str]  # Etkilenen rule_id'ler
    change_type: str  # "new", "amendment", "repeal"
    trust_score: float = 1.0


class RegWatchEngine:
    """
    Mevzuat izleme motoru

    BOOTSTRAP MODE:
    Ilk calistirmada gercek scraping yapilmaz.
    Mock data ile sistem ayaga kalkar.
    Production'da real scraper devreye girer.
    """

    SOURCES = [
        {"id": "resmigazete", "name": "Resmi Gazete", "url": "resmigazete.gov.tr", "frequency": "daily"},
        {"id": "gib", "name": "GIB Mevzuat", "url": "gib.gov.tr/mevzuat", "frequency": "weekly"},
        {"id": "mevzuat", "name": "Mevzuat.gov.tr", "url": "mevzuat.gov.tr", "frequency": "weekly"},
        {"id": "turmob", "name": "TURMOB Sirkuler", "url": "turmob.org.tr", "frequency": "weekly"}
    ]

    def __init__(self, bootstrap_mode: bool = True):
        self.bootstrap_mode = bootstrap_mode
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def check_last_7_days(self) -> Dict:
        """Son 7 gunun degisikliklerini kontrol et"""

        if self.bootstrap_mode:
            return {
                "changes": 0,
                "status": "BOOTSTRAPPED",
                "message": "Sistem baslatma modunda. Mevzuat kaynaklari henuz taranmiyor.",
                "sources": [s["url"] for s in self.SOURCES],
                "last_check": datetime.utcnow().isoformat() + "Z",
                "items": []
            }

        # TODO: Real scraping (production)
        return {
            "changes": 0,
            "status": "ACTIVE",
            "items": [],
            "sources": [s["url"] for s in self.SOURCES],
            "last_check": datetime.utcnow().isoformat() + "Z"
        }

    def check_last_30_days(self) -> Dict:
        """Son 30 gunun degisikliklerini kontrol et"""

        if self.bootstrap_mode:
            return {
                "changes": 0,
                "status": "BOOTSTRAPPED",
                "impact_map": [],
                "items": []
            }

        return {
            "changes": 0,
            "status": "ACTIVE",
            "items": [],
            "impact_map": []
        }

    def get_sources(self) -> List[Dict]:
        """Izlenen kaynaklari dondur"""
        return self.SOURCES

    def _calculate_hash(self, content: str) -> str:
        """Icerik hash'i"""
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def _map_impact(self, change: MevzuatChange) -> List[str]:
        """
        Degisikligin hangi rule'lari etkiledigini belirle

        TODO: NLP/keyword matching
        """
        impact_rules = []

        title_upper = change.title.upper()

        # KDV ile ilgili
        if "KDV" in title_upper or "KATMA DEGER" in title_upper:
            impact_rules.extend(["R-KDV-01", "R-KDV-02", "R-401A"])

        # Kurumlar Vergisi
        if "KURUMLAR" in title_upper:
            impact_rules.extend(["R-KV-01", "R-501"])

        # Gecici Vergi
        if "GECICI VERGI" in title_upper:
            impact_rules.append("R-GV-01")

        # Enflasyon muhasebesi
        if "ENFLASYON" in title_upper or "TMS 29" in title_upper:
            impact_rules.append("R-ENFLASYON-01")

        return impact_rules


# Singleton instance
regwatch_engine = RegWatchEngine(bootstrap_mode=True)
