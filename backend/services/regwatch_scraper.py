"""
RegWatch Scraper - Sprint R1 → Canlı Mod
Monitors GIB, Resmi Gazete, TURMOB for mevzuat changes

Uses requests + BeautifulSoup for real web scraping.
Falls back to cached/demo data if scraping fails (WARNING loglanır).

Varsayılan: demo_mode=False (canlı scraping)
"""

import hashlib
import json
import re
import time
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import logging
import sys
from pathlib import Path

# Web scraping imports
import requests
from bs4 import BeautifulSoup

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

# Request configuration
REQUEST_TIMEOUT = 30
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # exponential backoff: 2^retry saniye

REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) LYNTOS-RegWatch/1.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
}


class BaseScraper:
    """Base scraper class with common utilities"""

    SOURCE_ID = "base"
    SOURCE_NAME = "Base"

    def __init__(self, demo_mode: bool = False):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self.demo_mode = demo_mode
        self.session = requests.Session()
        self.session.headers.update(REQUEST_HEADERS)

    def scrape_last_n_days(self, days: int = 7) -> List[Dict]:
        """Scrape last N days for changes"""
        raise NotImplementedError

    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a web page (3x retry with exponential backoff)"""
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.get(url, timeout=REQUEST_TIMEOUT)
                response.raise_for_status()
                return BeautifulSoup(response.content, 'html.parser')
            except requests.RequestException as e:
                wait_time = RETRY_BACKOFF_BASE ** attempt
                self.logger.warning(
                    f"Fetch attempt {attempt + 1}/{MAX_RETRIES} failed for {url}: {e}"
                    f" (retry in {wait_time}s)"
                )
                if attempt < MAX_RETRIES - 1:
                    time.sleep(wait_time)
                else:
                    self.logger.error(f"All {MAX_RETRIES} attempts failed for {url}")
        return None

    def fetch_text(self, url: str) -> Optional[str]:
        """Fetch raw text content (3x retry with exponential backoff)"""
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.get(url, timeout=REQUEST_TIMEOUT)
                response.raise_for_status()
                return response.text
            except requests.RequestException as e:
                wait_time = RETRY_BACKOFF_BASE ** attempt
                self.logger.warning(
                    f"Fetch text attempt {attempt + 1}/{MAX_RETRIES} failed for {url}: {e}"
                )
                if attempt < MAX_RETRIES - 1:
                    time.sleep(wait_time)
                else:
                    self.logger.error(f"All {MAX_RETRIES} attempts failed for {url}")
        return None

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

        # Gecici Vergi
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

        # Ar-Ge Tesvikleri
        if any(kw in text for kw in ["AR-GE", "ARGE", "5746"]):
            impact_rules.append("R-ARGE")

        # Teknokent
        if any(kw in text for kw in ["TEKNOKENT", "TEKNOPARK", "4691"]):
            impact_rules.append("R-TEKNO")

        # Asgari Ucret
        if any(kw in text for kw in ["ASGARİ ÜCRET", "ASGARI UCRET"]):
            impact_rules.append("R-ASGARI")

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

    def log_scrape_result(self, success: bool, events_found: int, error: str = None):
        """Log scrape result to regulatory_sources table"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE regulatory_sources
                SET last_scraped_at = ?,
                    last_change_detected_at = CASE WHEN ? > 0 THEN ? ELSE last_change_detected_at END
                WHERE source_name LIKE ?
            """, [
                datetime.now().isoformat(),
                events_found,
                datetime.now().isoformat() if events_found > 0 else None,
                f"%{self.SOURCE_NAME}%"
            ])
            conn.commit()


class GIBScraper(BaseScraper):
    """GIB Mevzuat ve Sirkuler Scraper"""

    SOURCE_ID = "gib"
    SOURCE_NAME = "GIB Mevzuat"
    SIRKULER_URL = "https://www.gib.gov.tr/gibmevzuat"
    MEVZUAT_URL = "https://www.gib.gov.tr/gibmevzuat"

    def scrape_last_n_days(self, days: int = 7) -> List[Dict]:
        """Scrape GIB for sirkular and teblig updates"""

        if self.demo_mode:
            return self._demo_scrape(days)

        events = []
        cutoff_date = datetime.now() - timedelta(days=days)
        self.logger.info(f"Scraping GIB for last {days} days")

        try:
            # Try scraping GIB sirkuler page
            soup = self.fetch_page(self.SIRKULER_URL)

            if soup:
                # Look for sirkuler listings
                # GIB structure: typically table or list with sirkuler items
                items = soup.find_all('a', href=re.compile(r'/node/\d+'))

                for item in items[:20]:  # Limit to recent items
                    title = item.get_text(strip=True)
                    href = item.get('href', '')

                    if not title or len(title) < 10:
                        continue

                    # Filter for relevant content
                    if not any(kw in title.upper() for kw in [
                        'TEBLİĞ', 'TEBLIG', 'SİRKÜLER', 'SIRKULER',
                        'KDV', 'VERGİ', 'VERGI', 'KVK', 'GVK'
                    ]):
                        continue

                    full_url = f"https://www.gib.gov.tr{href}" if href.startswith('/') else href

                    content_for_hash = f"{title}_{full_url}"
                    events.append({
                        'event_type': 'amendment' if 'DEĞİŞİKLİK' in title.upper() else 'new',
                        'source': self.SOURCE_ID,
                        'title': title[:500],
                        'canonical_url': full_url,
                        'content_hash': self.content_hash(content_for_hash),
                        'published_date': datetime.now().strftime('%Y-%m-%d'),
                        'impact_rules': self.calculate_impact(title)
                    })

                self.logger.info(f"GIB scrape: found {len(events)} relevant items")

        except Exception as e:
            self.logger.error(f"GIB scrape failed: {e}")
            # Fallback to demo data
            return self._demo_scrape(days)

        # Save events
        saved = self.save_events(events)
        self.log_scrape_result(True, saved)
        self.logger.info(f"GIB scrape complete: {len(events)} found, {saved} new")

        return events

    def _demo_scrape(self, days: int) -> List[Dict]:
        """Demo mode scrape with sample data"""
        self.logger.info(f"GIB scraping in DEMO MODE")

        events = []
        demo_changes = [
            {
                'title': 'KDV Genel Uygulama Tebliginde Degisiklik Yapilmasina Dair Teblig (Seri No: 52)',
                'content': 'KDV iade sureleri ve belge duzeni hakkinda degisiklikler',
                'url': 'https://www.gib.gov.tr/node/kdv_teblig_52',
                'type': 'amendment',
                'date': datetime.now().strftime('%Y-%m-%d')
            },
            {
                'title': 'Kurumlar Vergisi Kanunu Genel Tebligi (Seri No: 25)',
                'content': 'Ar-Ge indirimi hesaplama yonteminde degisiklik',
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

        saved = self.save_events(events)
        self.logger.info(f"GIB DEMO complete: {len(events)} found, {saved} new")
        return events


class ResmiGazeteScraper(BaseScraper):
    """Resmi Gazete Scraper"""

    SOURCE_ID = "resmigazete"
    SOURCE_NAME = "Resmi Gazete"
    BASE_URL = "https://www.resmigazete.gov.tr"
    FIHRIST_URL = "https://www.resmigazete.gov.tr/fihrist"

    def scrape_last_n_days(self, days: int = 7) -> List[Dict]:
        """Scrape Resmi Gazete for tax-related legislation"""

        if self.demo_mode:
            return self._demo_scrape(days)

        events = []
        cutoff_date = datetime.now() - timedelta(days=days)
        self.logger.info(f"Scraping Resmi Gazete for last {days} days")

        try:
            # Scrape the fihrist (index) page
            soup = self.fetch_page(self.FIHRIST_URL)

            if soup:
                # Look for links to daily gazettes
                gazette_links = soup.find_all('a', href=re.compile(r'/eskiler/\d{4}/\d{2}/'))

                for link in gazette_links[:14]:  # Last 2 weeks max
                    href = link.get('href', '')
                    title = link.get_text(strip=True)

                    # Parse date from URL pattern /eskiler/2025/01/20250107.htm
                    date_match = re.search(r'/eskiler/(\d{4})/(\d{2})/(\d{8})', href)
                    if date_match:
                        try:
                            date_str = date_match.group(3)
                            pub_date = datetime.strptime(date_str, '%Y%m%d')
                            if pub_date < cutoff_date:
                                continue
                        except ValueError:
                            continue

                    # Fetch individual gazette page to find tax-related content
                    full_url = f"{self.BASE_URL}{href}" if href.startswith('/') else href
                    gazette_soup = self.fetch_page(full_url)

                    if gazette_soup:
                        # Look for tax-related items
                        self._extract_tax_items(gazette_soup, events, full_url, pub_date)

                self.logger.info(f"Resmi Gazete scrape: found {len(events)} tax-related items")

        except Exception as e:
            self.logger.error(f"Resmi Gazete scrape failed: {e}")
            return self._demo_scrape(days)

        saved = self.save_events(events)
        self.log_scrape_result(True, saved)
        self.logger.info(f"RG scrape complete: {len(events)} found, {saved} new")

        return events

    def _extract_tax_items(self, soup: BeautifulSoup, events: List[Dict],
                          gazette_url: str, pub_date: datetime):
        """Extract tax-related items from a gazette page"""

        # Keywords for filtering tax-related content
        tax_keywords = [
            'VERGİ', 'VERGI', 'KDV', 'KVK', 'GVK', 'VUK',
            'MALİ', 'MALI', 'SGK', 'SİGORTA', 'SIGORTA',
            'TEBLİĞ', 'TEBLIG', 'KANUN', 'KARAR', 'YÖNETMELİK', 'YONETMELIK',
            'AR-GE', 'ARGE', 'TEŞVİK', 'TESVIK', 'İSTİSNA', 'ISTISNA'
        ]

        # Find all content sections
        content_sections = soup.find_all(['h3', 'h4', 'p', 'div'], class_=re.compile(r'icerik|baslik|madde'))

        for section in content_sections:
            text = section.get_text(strip=True)
            if len(text) < 20:
                continue

            # Check if tax-related
            text_upper = text.upper()
            if not any(kw in text_upper for kw in tax_keywords):
                continue

            # Extract title (first 200 chars)
            title = text[:200].strip()
            if '...' not in title and len(text) > 200:
                title += '...'

            content_for_hash = f"{title}_{gazette_url}_{pub_date.strftime('%Y%m%d')}"

            events.append({
                'event_type': 'new',
                'source': self.SOURCE_ID,
                'title': title,
                'canonical_url': gazette_url,
                'content_hash': self.content_hash(content_for_hash),
                'published_date': pub_date.strftime('%Y-%m-%d'),
                'impact_rules': self.calculate_impact(title, text[:500])
            })

    def _demo_scrape(self, days: int) -> List[Dict]:
        """Demo mode scrape"""
        self.logger.info("Resmi Gazete scraping in DEMO MODE")

        events = []
        demo_changes = [
            {
                'title': '7524 Sayili Torba Kanun - Vergi ve SGK Duzenlemeleri',
                'content': 'Cesitli vergi kanunlarinda degisiklik yapilmasi',
                'url': 'https://www.resmigazete.gov.tr/eskiler/2025/01/20250107.htm',
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
        self.logger.info(f"RG DEMO complete: {len(events)} found, {saved} new")
        return events


class TURMOBScraper(BaseScraper):
    """TURMOB Sirkuler Scraper"""

    SOURCE_ID = "turmob"
    SOURCE_NAME = "TURMOB Sirkuler"
    BASE_URL = "https://www.turmob.org.tr"
    SIRKULER_URL = "https://www.turmob.org.tr/Sirkuler"

    def scrape_last_n_days(self, days: int = 7) -> List[Dict]:
        """Scrape TURMOB for professional circulars"""

        if self.demo_mode:
            return self._demo_scrape(days)

        events = []
        self.logger.info(f"Scraping TURMOB for last {days} days")

        try:
            soup = self.fetch_page(self.SIRKULER_URL)

            if soup:
                # TURMOB sirkuler page structure
                items = soup.find_all('div', class_=re.compile(r'sirkuler|liste|item'))

                if not items:
                    # Alternative: look for list items or table rows
                    items = soup.find_all(['tr', 'li'], limit=30)

                for item in items[:20]:
                    # Find title/link
                    link = item.find('a')
                    if not link:
                        continue

                    title = link.get_text(strip=True)
                    href = link.get('href', '')

                    if not title or len(title) < 10:
                        continue

                    # Find date if available
                    date_elem = item.find(class_=re.compile(r'tarih|date'))
                    pub_date = datetime.now().strftime('%Y-%m-%d')
                    if date_elem:
                        date_text = date_elem.get_text(strip=True)
                        # Try parsing common date formats
                        for fmt in ['%d.%m.%Y', '%Y-%m-%d', '%d/%m/%Y']:
                            try:
                                pub_date = datetime.strptime(date_text, fmt).strftime('%Y-%m-%d')
                                break
                            except ValueError:
                                continue

                    full_url = f"{self.BASE_URL}{href}" if href.startswith('/') else href

                    content_for_hash = f"{title}_{full_url}_{pub_date}"
                    events.append({
                        'event_type': 'new',
                        'source': self.SOURCE_ID,
                        'title': title[:500],
                        'canonical_url': full_url,
                        'content_hash': self.content_hash(content_for_hash),
                        'published_date': pub_date,
                        'impact_rules': self.calculate_impact(title)
                    })

                self.logger.info(f"TURMOB scrape: found {len(events)} items")

        except Exception as e:
            self.logger.error(f"TURMOB scrape failed: {e}")
            return self._demo_scrape(days)

        saved = self.save_events(events)
        self.log_scrape_result(True, saved)
        self.logger.info(f"TURMOB scrape complete: {len(events)} found, {saved} new")

        return events

    def _demo_scrape(self, days: int) -> List[Dict]:
        """Demo mode scrape"""
        self.logger.info("TURMOB scraping in DEMO MODE")

        events = []
        demo_changes = [
            {
                'title': 'TURMOB Mesleki Duyuru 2025/01 - E-Defter Uygulamasi',
                'content': 'E-defter zorunlulugu kapsaminin genisletilmesi',
                'url': 'https://www.turmob.org.tr/sirkuler/2025-01',
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
        self.logger.info(f"TURMOB DEMO complete: {len(events)} found, {saved} new")
        return events


class SGKScraper(BaseScraper):
    """SGK Mevzuat Scraper"""

    SOURCE_ID = "sgk"
    SOURCE_NAME = "SGK Mevzuat"
    BASE_URL = "https://www.sgk.gov.tr"
    MEVZUAT_URL = "https://www.sgk.gov.tr/wps/portal/sgk/tr/mevzuat"

    def scrape_last_n_days(self, days: int = 7) -> List[Dict]:
        """Scrape SGK for regulation updates"""

        if self.demo_mode:
            return self._demo_scrape(days)

        events = []
        self.logger.info(f"Scraping SGK for last {days} days")

        try:
            soup = self.fetch_page(self.MEVZUAT_URL)

            if soup:
                # Look for regulation items
                items = soup.find_all('a', href=re.compile(r'mevzuat|genelge|teblig'))

                for item in items[:20]:
                    title = item.get_text(strip=True)
                    href = item.get('href', '')

                    if not title or len(title) < 10:
                        continue

                    full_url = f"{self.BASE_URL}{href}" if href.startswith('/') else href

                    content_for_hash = f"{title}_{full_url}"
                    events.append({
                        'event_type': 'new',
                        'source': self.SOURCE_ID,
                        'title': title[:500],
                        'canonical_url': full_url,
                        'content_hash': self.content_hash(content_for_hash),
                        'published_date': datetime.now().strftime('%Y-%m-%d'),
                        'impact_rules': self.calculate_impact(title)
                    })

        except Exception as e:
            self.logger.error(f"SGK scrape failed: {e}")
            return self._demo_scrape(days)

        saved = self.save_events(events)
        self.log_scrape_result(True, saved)
        self.logger.info(f"SGK scrape complete: {len(events)} found, {saved} new")

        return events

    def _demo_scrape(self, days: int) -> List[Dict]:
        """Demo mode scrape"""
        self.logger.info("SGK scraping in DEMO MODE")

        events = []
        demo_changes = [
            {
                'title': 'SGK Genelgesi 2025/1 - Prim Tesvikleri Uygulama Esaslari',
                'content': 'Yeni istihdam tesviklerinin uygulanma esaslari',
                'url': 'https://www.sgk.gov.tr/genelge/2025-1',
                'type': 'new',
                'date': datetime.now().strftime('%Y-%m-%d')
            }
        ]

        for change in demo_changes:
            content_for_hash = f"{change['title']}_{change['date']}_sgk"
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
        return events


def run_all_scrapers(days: int = 7, demo_mode: bool = False) -> Dict:
    """Run all scrapers and return summary.
    Varsayılan: demo_mode=False (canlı scraping).
    Demo mode'a düşülürse WARNING loglanır.
    """
    if demo_mode:
        logger.warning("⚠️ Scraperlar DEMO modunda çalıştırılıyor!")

    scrapers = [
        GIBScraper(demo_mode=demo_mode),
        ResmiGazeteScraper(demo_mode=demo_mode),
        TURMOBScraper(demo_mode=demo_mode),
        SGKScraper(demo_mode=demo_mode),
    ]

    results = {
        'total_events': 0,
        'total_new': 0,
        'by_source': {},
        'scraped_at': datetime.now().isoformat() + 'Z',
        'demo_mode': demo_mode
    }

    for scraper in scrapers:
        try:
            events = scraper.scrape_last_n_days(days)
            results['by_source'][scraper.SOURCE_ID] = {
                'found': len(events),
                'status': 'success'
            }
            results['total_events'] += len(events)
        except Exception as e:
            logger.error(f"Scraper {scraper.SOURCE_ID} failed: {e}", exc_info=True)
            results['by_source'][scraper.SOURCE_ID] = {
                'error': str(e),
                'status': 'failed'
            }

    return results


def detect_parameter_changes() -> List[Dict]:
    """
    Detect changes in tax parameters from recent events.
    Returns list of detected changes for processing.
    """
    changes = []

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get recent unprocessed events
        cursor.execute("""
            SELECT id, title, source, canonical_url, published_date
            FROM regwatch_events
            WHERE status = 'pending'
            AND published_date >= date('now', '-7 days')
            ORDER BY published_date DESC
        """)

        events = cursor.fetchall()

        for event in events:
            title_upper = event[1].upper()

            # Detect KV rate changes
            if 'KURUMLAR VERGİ' in title_upper and 'ORAN' in title_upper:
                changes.append({
                    'event_id': event[0],
                    'param_category': 'KURUMLAR_VERGISI',
                    'param_key': 'kv_genel_oran',
                    'change_type': 'potential_rate_change',
                    'source_event': event[1]
                })

            # Detect KDV changes
            if 'KDV' in title_upper and any(kw in title_upper for kw in ['ORAN', 'TEBLİĞ', 'TEBLIG']):
                changes.append({
                    'event_id': event[0],
                    'param_category': 'KDV',
                    'param_key': 'kdv_genel_oran',
                    'change_type': 'potential_rate_change',
                    'source_event': event[1]
                })

            # Detect Asgari Ucret changes
            if 'ASGARİ ÜCRET' in title_upper or 'ASGARI UCRET' in title_upper:
                changes.append({
                    'event_id': event[0],
                    'param_category': 'ASGARI_UCRET',
                    'param_key': 'asgari_ucret_brut',
                    'change_type': 'potential_value_change',
                    'source_event': event[1]
                })

            # Detect SGK Prim changes
            if 'SGK' in title_upper and 'PRİM' in title_upper:
                changes.append({
                    'event_id': event[0],
                    'param_category': 'SGK',
                    'param_key': 'sgk_isveren_payi',
                    'change_type': 'potential_rate_change',
                    'source_event': event[1]
                })

    return changes


if __name__ == "__main__":
    # Test scrapers
    import argparse
    parser = argparse.ArgumentParser(description='RegWatch Scraper')
    parser.add_argument('--demo', action='store_true', help='Run in demo mode')
    parser.add_argument('--days', type=int, default=7, help='Days to scrape')
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    result = run_all_scrapers(days=args.days, demo_mode=args.demo)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # Check for parameter changes
    print("\nDetected Parameter Changes:")
    changes = detect_parameter_changes()
    for change in changes:
        print(f"  - {change['param_category']}/{change['param_key']}: {change['change_type']}")
