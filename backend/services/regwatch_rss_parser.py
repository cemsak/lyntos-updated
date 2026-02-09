"""
RegWatch RSS Parser - TURMOB RSS Feed'lerini parse eder
Mevzuat haberlerini ve sirkülerleri otomatik takip eder.

Kaynaklar:
- TURMOB Haberler: https://www.turmob.org.tr/Haberler/Rss
- TURMOB Mevzuat: https://www.turmob.org.tr/Mevzuat/Rss
"""

import hashlib
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

# Feedparser opsiyonel - yoksa uyarı ver
try:
    import feedparser
    FEEDPARSER_AVAILABLE = True
except ImportError:
    FEEDPARSER_AVAILABLE = False
    logger.warning("feedparser kurulu değil. RSS parsing devre dışı.")

# RSS Feed kaynakları
RSS_FEEDS = [
    {
        'id': 'turmob_haberler',
        'name': 'TURMOB Haberler',
        'url': 'https://www.turmob.org.tr/Haberler/Rss',
        'source': 'turmob',
        'trust_class': 'B',
    },
    {
        'id': 'turmob_mevzuat',
        'name': 'TURMOB Mevzuat',
        'url': 'https://www.turmob.org.tr/Mevzuat/Rss',
        'source': 'turmob',
        'trust_class': 'B',
    },
]

# Vergi/mevzuat anahtar kelimeleri - ilgisiz haberleri filtrelemek için
TAX_KEYWORDS = [
    'vergi', 'kdv', 'kvk', 'gvk', 'vuk', 'sgk', 'prim',
    'beyanname', 'tebliğ', 'teblig', 'sirküler', 'genelge',
    'oran', 'istisna', 'muafiyet', 'indirim', 'tevkifat',
    'stopaj', 'damga', 'harç', 'kurumlar', 'gelir',
    'enflasyon', 'düzeltme', 'e-defter', 'e-fatura',
    'asgari ücret', 'kıdem', 'ihbar', 'ar-ge', 'teknopark',
    'teşvik', 'yatırım', 'ihracat', 'ithalat', 'gümrük',
    'maliye', 'hazine', 'resmi gazete', 'kanun',
    'smmm', 'ymm', 'mali müşavir', 'denetim',
    'sermaye', 'şirket', 'ticaret', 'ttk', 'tasfiye',
]


def content_hash(content: str) -> str:
    """İçerik hash'i oluştur (duplicate önleme)"""
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def is_tax_related(title: str, summary: str = '') -> bool:
    """Haberin vergi/mevzuat ile ilgili olup olmadığını kontrol et"""
    text = (title + ' ' + summary).lower()
    return any(kw in text for kw in TAX_KEYWORDS)


def calculate_impact_rules(title: str, summary: str = '') -> List[str]:
    """Etkilenen kuralları belirle"""
    impact_rules = []
    text = (title + ' ' + summary).upper()

    if any(kw in text for kw in ['KDV', 'KATMA DEĞER']):
        impact_rules.extend(['R-100', 'R-101', 'R-191'])
    if any(kw in text for kw in ['KURUMLAR', 'KVK']):
        impact_rules.extend(['R-KV1', 'R-KV2'])
    if any(kw in text for kw in ['GEÇİCİ VERGİ']):
        impact_rules.extend(['R-GV1', 'R-GV2'])
    if any(kw in text for kw in ['SGK', 'SİGORTA', 'PRİM']):
        impact_rules.append('R-SGK')
    if any(kw in text for kw in ['AR-GE', 'ARGE', '5746']):
        impact_rules.append('R-ARGE')
    if any(kw in text for kw in ['TEKNOKENT', 'TEKNOPARK']):
        impact_rules.append('R-TEKNO')
    if any(kw in text for kw in ['ASGARİ ÜCRET']):
        impact_rules.append('R-ASGARI')
    if any(kw in text for kw in ['VUK', 'DEFTER', 'BEYAN']):
        impact_rules.extend(['R-VUK', 'R-100'])
    if any(kw in text for kw in ['ENFLASYON', 'TMS', 'TFRS']):
        impact_rules.append('R-TMS')

    return list(set(impact_rules))


def parse_rss_date(entry: dict) -> str:
    """RSS entry'sinden tarih parse et"""
    # feedparser'ın parsed date'i
    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        try:
            dt = datetime(*entry.published_parsed[:6])
            return dt.strftime('%Y-%m-%d')
        except Exception:
            pass

    if hasattr(entry, 'updated_parsed') and entry.updated_parsed:
        try:
            dt = datetime(*entry.updated_parsed[:6])
            return dt.strftime('%Y-%m-%d')
        except Exception:
            pass

    return datetime.now().strftime('%Y-%m-%d')


def parse_single_feed(feed_config: dict) -> List[Dict]:
    """Tek bir RSS feed'i parse et"""
    if not FEEDPARSER_AVAILABLE:
        logger.warning("feedparser kurulu değil, RSS parsing atlanıyor")
        return []

    events = []
    feed_id = feed_config['id']
    feed_url = feed_config['url']
    source = feed_config['source']

    logger.info(f"RSS parsing: {feed_config['name']} ({feed_url})")

    try:
        feed = feedparser.parse(feed_url)

        if feed.bozo:
            logger.warning(
                f"RSS feed parse uyarısı ({feed_id}): {feed.bozo_exception}"
            )

        for entry in feed.entries[:50]:  # Son 50 entry
            title = getattr(entry, 'title', '').strip()
            summary = getattr(entry, 'summary', '').strip()
            link = getattr(entry, 'link', '')
            pub_date = parse_rss_date(entry)

            if not title or len(title) < 10:
                continue

            # Vergi/mevzuat ile ilgili mi kontrol et
            if not is_tax_related(title, summary):
                continue

            # Duplicate kontrolü için hash
            hash_input = f"{title}_{link}_{pub_date}"
            c_hash = content_hash(hash_input)

            events.append({
                'event_type': 'new',
                'source': source,
                'title': title[:500],
                'canonical_url': link,
                'content_hash': c_hash,
                'published_date': pub_date,
                'impact_rules': calculate_impact_rules(title, summary),
                'rss_feed': feed_id,
            })

        logger.info(
            f"RSS parse tamamlandı ({feed_id}): "
            f"{len(feed.entries)} entry, {len(events)} ilgili"
        )

    except Exception as e:
        logger.error(f"RSS parse hatası ({feed_id}): {e}")

    return events


def save_rss_events(events: List[Dict]) -> int:
    """RSS event'lerini veritabanına kaydet"""
    saved_count = 0

    with get_connection() as conn:
        cursor = conn.cursor()

        for event in events:
            # Duplicate kontrolü
            cursor.execute(
                "SELECT id FROM regwatch_events WHERE content_hash = ?",
                [event['content_hash']]
            )
            if cursor.fetchone():
                continue

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
            logger.info(f"RSS event kaydedildi: {event['title'][:60]}...")

        conn.commit()

    return saved_count


def parse_all_rss_feeds() -> Dict:
    """Tüm RSS feed'lerini parse et ve kaydet"""
    if not FEEDPARSER_AVAILABLE:
        logger.warning("feedparser kurulu değil, tüm RSS parsing atlanıyor")
        return {
            'status': 'skipped',
            'reason': 'feedparser not installed',
            'total_events': 0,
            'total_saved': 0,
        }

    all_events = []
    results = {
        'status': 'success',
        'total_events': 0,
        'total_saved': 0,
        'feeds': {},
        'parsed_at': datetime.now().isoformat() + 'Z',
    }

    for feed_config in RSS_FEEDS:
        try:
            events = parse_single_feed(feed_config)
            saved = save_rss_events(events)

            results['feeds'][feed_config['id']] = {
                'name': feed_config['name'],
                'found': len(events),
                'saved': saved,
                'status': 'success',
            }
            results['total_events'] += len(events)
            results['total_saved'] += saved
            all_events.extend(events)

        except Exception as e:
            logger.error(f"Feed hatası ({feed_config['id']}): {e}")
            results['feeds'][feed_config['id']] = {
                'name': feed_config['name'],
                'error': str(e),
                'status': 'failed',
            }

    logger.info(
        f"RSS parse tamamlandı: {results['total_events']} bulundu, "
        f"{results['total_saved']} yeni kaydedildi"
    )

    return results


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    result = parse_all_rss_feeds()
    print(json.dumps(result, indent=2, ensure_ascii=False))
