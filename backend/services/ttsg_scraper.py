"""
LYNTOS TTSG (Turkiye Ticaret Sicili Gazetesi) Scraper
Sprint T1 - Trade Registry Integration

Sources:
- https://www.ticaretsicil.gov.tr/
- https://www.ticaretsicil.gov.tr/sorgu_tsm.php

Follows same patterns as regwatch_scraper.py
"""

import hashlib
import json
import re
import uuid
import sys
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
import logging
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

# Request configuration
REQUEST_TIMEOUT = 30
REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 LYNTOS-TTSG/1.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
}


class TTSGScraper:
    """Turkiye Ticaret Sicili Gazetesi Scraper"""

    BASE_URL = "https://www.ticaretsicil.gov.tr"
    SEARCH_URL = f"{BASE_URL}/sorgu_tsm.php"

    # Degisiklik tipleri ve anahtar kelimeler
    CHANGE_TYPE_KEYWORDS = {
        "establishment": ["kurulus", "tescil", "yeni kayit"],
        "capital_increase": ["sermaye artirimi", "sermaye arttirimi", "sermayenin artirilmasi"],
        "capital_decrease": ["sermaye azaltimi", "sermayenin azaltilmasi"],
        "address_change": ["adres degisikligi", "merkez nakli", "merkez degisikligi"],
        "board_change": ["yonetim kurulu", "mudur", "temsil ve ilzam", "imza yetkisi"],
        "merger": ["birlesme", "devralma"],
        "demerger": ["bolunme", "kismi bolunme", "tam bolunme"],
        "type_change": ["tur degisikligi", "tur degistirme", "nevi degisikligi"],
        "liquidation_start": ["tasfiye", "tasfiyeye giris", "infisah"],
        "liquidation_end": ["tasfiye sonu", "terkin", "sicilden silinme"],
        "articles_amendment": ["ana sozlesme", "esas sozlesme", "tadil"],
        "share_transfer": ["hisse devri", "pay devri", "ortaklik payi"],
    }

    # Sirket tipi tespiti
    COMPANY_TYPE_PATTERNS = {
        "as": [r"anonim sirketi", r"a\.s\.", r"a\.s\."],
        "ltd": [r"limited sirketi", r"ltd\.", r"ltd\.sti\."],
        "sahis": [r"sahis", r"ticari isletme"],
        "koop": [r"kooperatif"],
        "komandit": [r"komandit"],
        "kollektif": [r"kollektif"],
    }

    def __init__(self, demo_mode: bool = False):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self.demo_mode = demo_mode
        self.session = requests.Session()
        self.session.headers.update(REQUEST_HEADERS)

    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a web page"""
        try:
            response = self.session.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'html.parser')
        except requests.RequestException as e:
            self.logger.error(f"Failed to fetch {url}: {e}")
            return None

    def content_hash(self, content: str) -> str:
        """Generate content hash for change detection"""
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def search_by_company_name(self, company_name: str) -> List[Dict]:
        """Search TTSG by company name"""
        if self.demo_mode:
            return self._demo_search_company(company_name)

        results = []

        try:
            response = self.session.get(
                f"{self.BASE_URL}/view/hizlierisim/unvansorgulama.php",
                params={"unvan": company_name, "tip": "unvan"},
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Parse result table
            rows = soup.select('table tr') or soup.select('.result-row')

            for row in rows[1:]:  # Skip header
                cols = row.select('td')
                if len(cols) >= 3:
                    results.append({
                        "company_name": cols[0].get_text(strip=True),
                        "registry_number": cols[1].get_text(strip=True) if len(cols) > 1 else None,
                        "registry_office": cols[2].get_text(strip=True) if len(cols) > 2 else None,
                        "source": "ttsg",
                        "scraped_at": datetime.utcnow().isoformat(),
                    })

            self.logger.info(f"TTSG search '{company_name}': {len(results)} results")

        except Exception as e:
            self.logger.error(f"TTSG search error: {e}")
            return self._demo_search_company(company_name)

        return results

    def _demo_search_company(self, company_name: str) -> List[Dict]:
        """Demo mode company search - TEMIZLENDI (SIFIR TOLERANS)"""
        # Demo mode devre disi - gercek veri sadece API'den alinmali
        return []

    def search_by_tax_number(self, tax_number: str) -> Optional[Dict]:
        """Search by tax number (via GIB verification)"""
        # GIB verification requires captcha - placeholder implementation
        return {
            "tax_number": tax_number,
            "verified": False,
            "status": "pending_manual_verification",
            "note": "GIB dogrulamasi manuel yapilmali veya API erisimi gerekli",
        }

    def get_daily_gazette(self, target_date: Optional[date] = None) -> List[Dict]:
        """Get daily TTSG announcements"""
        if target_date is None:
            target_date = date.today()

        if self.demo_mode:
            return self._demo_daily_gazette(target_date)

        results = []

        try:
            response = self.session.get(self.BASE_URL, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Find gazette links
            gazette_links = soup.select('a[href*="gazete"]') or soup.select('.gazette-link')

            for link in gazette_links[:10]:
                href = link.get('href', '')
                title = link.get_text(strip=True)

                results.append({
                    "title": title,
                    "url": f"{self.BASE_URL}{href}" if href.startswith('/') else href,
                    "date": target_date.isoformat(),
                    "source": "ttsg_daily",
                    "scraped_at": datetime.utcnow().isoformat(),
                })

            self.logger.info(f"TTSG daily {target_date}: {len(results)} items")

        except Exception as e:
            self.logger.error(f"TTSG daily gazette error: {e}")
            return self._demo_daily_gazette(target_date)

        return results

    def _demo_daily_gazette(self, target_date: date) -> List[Dict]:
        """Demo mode daily gazette"""
        return [
            {
                "title": f"Ticaret Sicili Gazetesi - {target_date.isoformat()}",
                "url": f"https://www.ticaretsicil.gov.tr/gazete/{target_date.isoformat()}",
                "date": target_date.isoformat(),
                "source": "ttsg_demo",
                "scraped_at": datetime.utcnow().isoformat(),
            }
        ]

    def search_by_city(self, city: str, change_type: Optional[str] = None) -> List[Dict]:
        """Search TTSG by city (for pilot region)"""
        if self.demo_mode:
            return self._demo_search_city(city, change_type)

        results = []

        try:
            search_query = city
            if change_type:
                keywords = self.CHANGE_TYPE_KEYWORDS.get(change_type, [])
                if keywords:
                    search_query = f"{city} {keywords[0]}"

            response = self.session.get(
                self.SEARCH_URL,
                params={"q": search_query},
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            items = soup.select('.search-result') or soup.select('table tr')

            for item in items[:50]:
                text = item.get_text(strip=True)

                detected_type = self._detect_change_type(text)

                results.append({
                    "city": city,
                    "content": text[:500],
                    "change_type": detected_type,
                    "source": "ttsg",
                    "scraped_at": datetime.utcnow().isoformat(),
                })

            self.logger.info(f"TTSG city search '{city}': {len(results)} results")

        except Exception as e:
            self.logger.error(f"TTSG city search error: {e}")
            return self._demo_search_city(city, change_type)

        return results

    def _demo_search_city(self, city: str, change_type: Optional[str] = None) -> List[Dict]:
        """Demo mode city search - TEMIZLENDI (SIFIR TOLERANS)"""
        # Demo mode devre disi - gercek veri sadece API'den alinmali
        return []

    def _detect_change_type(self, text: str) -> Optional[str]:
        """Detect change type from text content"""
        text_lower = text.lower()

        for change_type, keywords in self.CHANGE_TYPE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return change_type

        return None

    def _detect_company_type(self, text: str) -> Optional[str]:
        """Detect company type from text content"""
        text_lower = text.lower()

        for company_type, patterns in self.COMPANY_TYPE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return company_type

        return None

    def _extract_capital(self, text: str) -> Optional[Tuple[float, str]]:
        """Extract capital amount from text"""
        patterns = [
            r'(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(?:TL|Turk Lirasi)',
            r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:TRY|USD|EUR)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace('.', '').replace(',', '.')
                try:
                    amount = float(amount_str)
                    currency = "TRY"
                    if "USD" in text.upper():
                        currency = "USD"
                    elif "EUR" in text.upper():
                        currency = "EUR"
                    return (amount, currency)
                except ValueError:
                    pass

        return None

    def scrape_for_pilot_region(self, region: str = "Alanya") -> Dict[str, List[Dict]]:
        """Comprehensive scrape for pilot region"""
        results = {
            "new_companies": [],
            "capital_changes": [],
            "liquidations": [],
            "other_changes": [],
        }

        # Scrape new establishments
        establishments = self.search_by_city(region, "establishment")
        results["new_companies"] = establishments

        # Scrape capital changes
        capital_inc = self.search_by_city(region, "capital_increase")
        capital_dec = self.search_by_city(region, "capital_decrease")
        results["capital_changes"] = capital_inc + capital_dec

        # Scrape liquidations
        liquidations = self.search_by_city(region, "liquidation_start")
        results["liquidations"] = liquidations

        self.logger.info(f"Pilot region '{region}' scrape complete: "
                        f"{len(results['new_companies'])} new, "
                        f"{len(results['capital_changes'])} capital, "
                        f"{len(results['liquidations'])} liquidation")

        return results

    def save_company(self, company_data: Dict) -> Optional[str]:
        """Save company to database"""
        with get_connection() as conn:
            cursor = conn.cursor()

            # Check if already exists
            cursor.execute(
                "SELECT id FROM company_registry WHERE tax_number = ?",
                [company_data.get('tax_number')]
            )

            existing = cursor.fetchone()
            if existing:
                # Update existing
                cursor.execute("""
                    UPDATE company_registry
                    SET company_name = ?, current_capital = ?, status = ?,
                        last_verified_at = ?, updated_at = datetime('now')
                    WHERE tax_number = ?
                """, [
                    company_data.get('company_name'),
                    company_data.get('current_capital'),
                    company_data.get('status', 'active'),
                    datetime.utcnow().isoformat(),
                    company_data.get('tax_number')
                ])
                conn.commit()
                return existing[0]

            # Insert new
            company_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO company_registry
                (id, tax_number, trade_registry_number, company_name, company_type,
                 trade_registry_office, city, district, address, current_capital,
                 status, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                company_id,
                company_data.get('tax_number'),
                company_data.get('trade_registry_number'),
                company_data.get('company_name'),
                company_data.get('company_type'),
                company_data.get('trade_registry_office'),
                company_data.get('city'),
                company_data.get('district'),
                company_data.get('address'),
                company_data.get('current_capital'),
                company_data.get('status', 'active'),
                company_data.get('source', 'ttsg')
            ])
            conn.commit()

            self.logger.info(f"Saved company: {company_data.get('company_name')}")
            return company_id

    def save_change(self, change_data: Dict) -> str:
        """Save company change to database"""
        with get_connection() as conn:
            cursor = conn.cursor()

            change_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO company_changes
                (id, company_id, tax_number, change_type, change_description,
                 old_value, new_value, ttsg_issue, ttsg_date, ttsg_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                change_id,
                change_data.get('company_id'),
                change_data.get('tax_number'),
                change_data.get('change_type'),
                change_data.get('change_description'),
                change_data.get('old_value'),
                change_data.get('new_value'),
                change_data.get('ttsg_issue'),
                change_data.get('ttsg_date'),
                change_data.get('ttsg_url')
            ])
            conn.commit()

            self.logger.info(f"Saved change: {change_data.get('change_type')} for {change_data.get('tax_number')}")
            return change_id


class GIBVerifier:
    """GIB Tax Number Verifier (placeholder)"""

    GIB_URL = "https://ivd.gib.gov.tr/tvd_side/main.jsp"

    def verify_tax_number(self, tax_number: str) -> Dict:
        """Verify tax number with GIB (requires captcha)"""
        return {
            "tax_number": tax_number,
            "verified": False,
            "status": "pending_manual_verification",
            "note": "GIB dogrulamasi manuel yapilmali veya API erisimi gerekli",
        }


def run_ttsg_scraper(days: int = 7, demo_mode: bool = True) -> Dict:
    """Run TTSG scraper and return summary"""

    scraper = TTSGScraper(demo_mode=demo_mode)

    results = {
        "scraped_at": datetime.utcnow().isoformat() + 'Z',
        "demo_mode": demo_mode,
        "pilot_region": "Alanya",
        "daily_gazette": [],
        "pilot_results": {},
    }

    # Get daily gazette
    results["daily_gazette"] = scraper.get_daily_gazette()

    # Scrape pilot region
    results["pilot_results"] = scraper.scrape_for_pilot_region("Alanya")

    return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='TTSG Scraper')
    parser.add_argument('--demo', action='store_true', help='Run in demo mode', default=True)
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    result = run_ttsg_scraper(demo_mode=args.demo)
    print(json.dumps(result, indent=2, ensure_ascii=False))
