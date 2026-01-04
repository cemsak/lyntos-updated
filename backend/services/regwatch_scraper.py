"""
RegWatch Scraper
Monitors GİB, Resmi Gazete, TURMOB for mevzuat changes

NOTE: This is a DEMO scraper that simulates real scraping.
In production, replace with actual web scraping logic.
"""

import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)


class BaseScraper:
    """Base scraper class"""

    SOURCE_ID = "base"
    SOURCE_NAME = "Base"

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def scrape_last_n_days(self, days: int = 7) -> List[Dict]:
        """Scrape last N days for changes"""
        raise NotImplementedError

    def calculate_impact(self, title: str, content: str = "") -> List[str]:
        """Calculate which rules are impacted by this change"""

        impact_rules = []
        text = (title + " " + content).upper()

        # KDV related
        if any(kw in text for kw in ["KDV", "KATMA DEĞER", "KATMA DEGER"]):
            impact_rules.extend(["R-100", "R-101", "R-191"])

        # Kurumlar Vergisi
        if any(kw in text for kw in ["KURUMLAR", "KURUMLAR VERGİ", "KVK"]):
            impact_rules.extend(["R-KV1", "R-KV2", "R-KV3", "R-KV4", "R-KV5"])

        # Geçici Vergi
        if any(kw in text for kw in ["GEÇİCİ VERGİ", "GECICI VERGI"]):
            impact_rules.extend(["R-GV1", "R-GV2", "R-GV3"])

        # VUK / Defter Beyan
        if any(kw in text for kw in ["VUK", "DEFTER", "BEYAN"]):
            impact_rules.extend(["R-VUK", "R-100", "R-101", "R-102"])

        # Enflasyon / TMS
        if any(kw in text for kw in ["ENFLASYON", "TMS", "TFRS"]):
            impact_rules.append("R-TMS")

        # SGK
        if any(kw in text for kw in ["SGK", "SİGORTA", "SIGORTA", "PRİM", "PRIM"]):
            impact_rules.append("R-SGK")

        # VDK / Risk
        if any(kw in text for kw in ["VDK", "KASA", "ORTAKLAR"]):
            impact_rules.extend(["R-001", "R-002", "R-131"])

        return list(set(impact_rules))

    def content_hash(self, content: str) -> str:
        """Generate content hash for change detection"""
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def save_events(self, events: List[Dict]) -> int:
        """Save events to database, return count of new events"""

        saved_count = 0

        with get_connection() as conn:
            cursor = conn.cursor()

            for event in events:
                # Check if already exists (by hash)
                cursor.execute(
                    "SELECT id FROM regwatch_events WHERE content_hash = ?",
                    [event['content_hash']]
                )

                if cursor.fetchone():
                    self.logger.debug(f"Event already exists: {event['title'][:50]}...")
                    continue

                # Insert new event
                cursor.execute(
                    """
                    INSERT INTO regwatch_events
                    (event_type, source, title, canonical_url, content_hash,
                     published_date, impact_rules, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        event['event_type'],
                        event['source'],
                        event['title'],
                        event.get('canonical_url', ''),
                        event['content_hash'],
                        event.get('published_date', datetime.now().isoformat()[:10]),
                        json.dumps(event.get('impact_rules', [])),
                        'pending'
                    ]
                )
                saved_count += 1
                self.logger.info(f"New event saved: {event['title'][:50]}...")

            conn.commit()

        return saved_count


class GIBScraper(BaseScraper):
    """GİB Mevzuat Scraper"""

    SOURCE_ID = "gib"
    SOURCE_NAME = "GİB Mevzuat"
    BASE_URL = "https://www.gib.gov.tr/mevzuat-sirkulerler"

    def scrape_last_n_days(self, days: int = 7) -> List[Dict]:
        """
        Scrape GİB for last N days

        NOTE: This is a DEMO implementation.
        Real implementation would use requests + BeautifulSoup.
        """

        events = []
        self.logger.info(f"Scraping GİB for last {days} days (DEMO MODE)")

        # DEMO: Simulate finding a change
        # In production, this would be actual web scraping

        demo_changes = [
            {
                'title': 'KDV Genel Uygulama Tebliğinde Değişiklik Yapılmasına Dair Tebliğ (Seri No: 52)',
                'content': 'KDV iade süreleri ve belge düzeni hakkında değişiklikler',
                'url': 'https://www.gib.gov.tr/node/kdv_teblig_52',
                'type': 'amendment',
                'date': datetime.now().strftime('%Y-%m-%d')
            },
            {
                'title': 'Kurumlar Vergisi Kanunu Genel Tebliği (Seri No: 25)',
                'content': 'Ar-Ge indirimi hesaplama yönteminde değişiklik',
                'url': 'https://www.gib.gov.tr/node/kvk_teblig_25',
                'type': 'amendment',
                'date': (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
            }
        ]

        for change in demo_changes:
            content_for_hash = f"{change['title']}_{change['date']}"
            events.append({
                'event_type': change['type'],
                'source': self.SOURCE_ID,
                'title': change['title'],
                'canonical_url': change['url'],
                'content_hash': self.content_hash(content_for_hash),
                'published_date': change['date'],
                'impact_rules': self.calculate_impact(change['title'], change['content'])
            })

        # Save to database
        saved = self.save_events(events)
        self.logger.info(f"GİB scrape complete: {len(events)} found, {saved} new")

        return events


class ResmiGazeteScraper(BaseScraper):
    """Resmi Gazete Scraper"""

    SOURCE_ID = "resmigazete"
    SOURCE_NAME = "Resmi Gazete"
    BASE_URL = "https://www.resmigazete.gov.tr"

    def scrape_last_n_days(self, days: int = 7) -> List[Dict]:
        """Scrape Resmi Gazete (DEMO MODE)"""

        events = []
        self.logger.info(f"Scraping Resmi Gazete for last {days} days (DEMO MODE)")

        # DEMO: One simulated RG change
        demo_changes = [
            {
                'title': '7524 Sayılı Torba Kanun - Vergi ve SGK Düzenlemeleri',
                'content': 'Çeşitli vergi kanunlarında değişiklik yapılması',
                'url': 'https://www.resmigazete.gov.tr/eskiler/2026/01/20260102.htm',
                'type': 'new',
                'date': (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            }
        ]

        for change in demo_changes:
            content_for_hash = f"{change['title']}_{change['date']}_rg"
            events.append({
                'event_type': change['type'],
                'source': self.SOURCE_ID,
                'title': change['title'],
                'canonical_url': change['url'],
                'content_hash': self.content_hash(content_for_hash),
                'published_date': change['date'],
                'impact_rules': self.calculate_impact(change['title'], change['content'])
            })

        saved = self.save_events(events)
        self.logger.info(f"RG scrape complete: {len(events)} found, {saved} new")

        return events


class TURMOBScraper(BaseScraper):
    """TURMOB Sirküler Scraper"""

    SOURCE_ID = "turmob"
    SOURCE_NAME = "TURMOB Sirküler"
    BASE_URL = "https://www.turmob.org.tr"

    def scrape_last_n_days(self, days: int = 7) -> List[Dict]:
        """Scrape TURMOB (DEMO MODE)"""

        events = []
        self.logger.info(f"Scraping TURMOB for last {days} days (DEMO MODE)")

        # DEMO: TURMOB sirküler
        demo_changes = [
            {
                'title': 'TURMOB Mesleki Duyuru 2026/01 - E-Defter Uygulaması',
                'content': 'E-defter zorunluluğu kapsamının genişletilmesi',
                'url': 'https://www.turmob.org.tr/sirkuler/2026-01',
                'type': 'new',
                'date': datetime.now().strftime('%Y-%m-%d')
            }
        ]

        for change in demo_changes:
            content_for_hash = f"{change['title']}_{change['date']}_turmob"
            events.append({
                'event_type': change['type'],
                'source': self.SOURCE_ID,
                'title': change['title'],
                'canonical_url': change['url'],
                'content_hash': self.content_hash(content_for_hash),
                'published_date': change['date'],
                'impact_rules': self.calculate_impact(change['title'], change['content'])
            })

        saved = self.save_events(events)
        self.logger.info(f"TURMOB scrape complete: {len(events)} found, {saved} new")

        return events


def run_all_scrapers(days: int = 7) -> Dict:
    """Run all scrapers and return summary"""

    scrapers = [
        GIBScraper(),
        ResmiGazeteScraper(),
        TURMOBScraper()
    ]

    results = {
        'total_events': 0,
        'by_source': {},
        'scraped_at': datetime.utcnow().isoformat() + 'Z'
    }

    for scraper in scrapers:
        try:
            events = scraper.scrape_last_n_days(days)
            results['by_source'][scraper.SOURCE_ID] = len(events)
            results['total_events'] += len(events)
        except Exception as e:
            logger.error(f"Scraper {scraper.SOURCE_ID} failed: {e}", exc_info=True)
            results['by_source'][scraper.SOURCE_ID] = {'error': str(e)}

    return results


if __name__ == "__main__":
    # Test scrapers
    logging.basicConfig(level=logging.INFO)
    result = run_all_scrapers(7)
    print(json.dumps(result, indent=2))
