"""
Mevzuat Bridge Service
regwatch_events → mevzuat_refs aktarım servisi

Her event için:
- mevzuat_type tespiti (kanun/teblig/sirkular/genelge/ozelge)
- kurum eşleştirme (GIB/HMB/TBMM/TURMOB/SGK)
- trust_class ataması (Resmi Gazete=A, GIB=A, TURMOB=B, SGK=B)
- Duplicate kontrolü: src_code bazlı
"""

import json
import logging
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

# ─── Mevzuat tipi tespiti ──────────────────────────────────────────────

MEVZUAT_TYPE_PATTERNS = [
    (r'kanun|yasa|hüküm', 'kanun'),
    (r'tebliğ|teblig', 'teblig'),
    (r'sirküler|sirkular|sirkuler', 'sirkular'),
    (r'genelge', 'genelge'),
    (r'özelge|ozelge|mukteza', 'ozelge'),
    (r'yönetmelik|yonetmelik', 'yonetmelik'),
    (r'kanun hükmünde kararname|khk', 'khk'),
    (r'danıştay|danistay', 'danistay_karar'),
]

# ─── Kurum eşleştirme ──────────────────────────────────────────────────

SOURCE_TO_KURUM = {
    'gib': 'GIB',
    'resmigazete': 'HMB',
    'turmob': 'TURMOB',
    'sgk': 'SGK',
}

# ─── Trust class ataması ────────────────────────────────────────────────

SOURCE_TRUST_CLASS = {
    'resmigazete': 'A',
    'gib': 'A',
    'turmob': 'B',
    'sgk': 'B',
}


def detect_mevzuat_type(title: str) -> str:
    """Başlıktan mevzuat tipini tespit et"""
    title_lower = title.lower()

    for pattern, mevzuat_type in MEVZUAT_TYPE_PATTERNS:
        if re.search(pattern, title_lower):
            return mevzuat_type

    return 'diger'


def generate_src_code(event: dict) -> str:
    """Event'ten benzersiz src_code oluştur"""
    source = event.get('source', 'unknown')
    event_id = event.get('id', '')
    title_slug = re.sub(
        r'[^a-z0-9]', '_',
        event.get('title', '')[:50].lower()
    ).strip('_')

    return f"{source}_{event_id}_{title_slug}"


def extract_mevzuat_no(title: str) -> Optional[str]:
    """Başlıktan mevzuat numarası çıkar"""
    # "Seri No: 52" pattern
    match = re.search(r'[Ss]eri\s*[Nn]o\s*[:.]?\s*(\d+)', title)
    if match:
        return match.group(1)

    # "No: 2025/1" pattern
    match = re.search(r'[Nn]o\s*[:.]?\s*(\d{4}/\d+)', title)
    if match:
        return match.group(1)

    # "7524 Sayılı" pattern
    match = re.search(r'(\d{4,5})\s*[Ss]ayılı', title)
    if match:
        return match.group(1)

    return None


def sync_events_to_mevzuat() -> Dict:
    """
    regwatch_events tablosundaki approved event'leri
    mevzuat_refs tablosuna aktar.

    Pending event'ler de aktarılır (auto-approve mantığı ile).
    """
    result = {
        'status': 'success',
        'synced': 0,
        'skipped_duplicate': 0,
        'skipped_error': 0,
        'synced_at': datetime.now().isoformat() + 'Z',
    }

    with get_connection() as conn:
        cursor = conn.cursor()

        # Henüz mevzuat_refs'e aktarılmamış event'leri al
        # source_id NULL ise henüz aktarılmamış demektir
        cursor.execute("""
            SELECT id, event_type, source, title, canonical_url,
                   content_hash, published_date, impact_rules
            FROM regwatch_events
            WHERE source_id IS NULL
            AND status IN ('pending', 'approved')
            ORDER BY published_date DESC
            LIMIT 200
        """)

        events = cursor.fetchall()
        logger.info(f"Mevzuat bridge: {len(events)} event aktarılacak")

        for event in events:
            event_dict = {
                'id': event[0],
                'event_type': event[1],
                'source': event[2],
                'title': event[3],
                'canonical_url': event[4],
                'content_hash': event[5],
                'published_date': event[6],
                'impact_rules': event[7],
            }

            try:
                src_code = generate_src_code(event_dict)

                # Duplicate kontrolü
                cursor.execute(
                    "SELECT id FROM mevzuat_refs WHERE src_code = ?",
                    [src_code]
                )
                if cursor.fetchone():
                    result['skipped_duplicate'] += 1
                    # Event'i işlenmiş olarak işaretle
                    cursor.execute(
                        "UPDATE regwatch_events SET source_id = ? WHERE id = ?",
                        [f"dup_{src_code}", event_dict['id']]
                    )
                    continue

                # Mevzuat tipi tespit et
                mevzuat_type = detect_mevzuat_type(event_dict['title'])
                kurum = SOURCE_TO_KURUM.get(event_dict['source'], 'DİĞER')
                trust_class = SOURCE_TRUST_CLASS.get(
                    event_dict['source'], 'C'
                )
                mevzuat_no = extract_mevzuat_no(event_dict['title'])

                # Impact rules parse
                try:
                    affected_rules = event_dict.get('impact_rules', '[]')
                    if isinstance(affected_rules, str):
                        affected_rules_list = json.loads(affected_rules)
                    else:
                        affected_rules_list = affected_rules or []
                except (json.JSONDecodeError, TypeError):
                    affected_rules_list = []

                # Mevzuat ref ID
                ref_id = str(uuid.uuid4())[:8]

                # mevzuat_refs'e ekle
                cursor.execute(
                    """
                    INSERT INTO mevzuat_refs
                    (id, src_code, mevzuat_type, mevzuat_no, baslik,
                     kisa_aciklama, resmi_gazete_tarih, canonical_url,
                     content_hash, kurum, affected_rules, trust_class,
                     is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    [
                        ref_id,
                        src_code,
                        mevzuat_type,
                        mevzuat_no,
                        event_dict['title'][:500],
                        f"Kaynak: {kurum} - {event_dict.get('published_date', '')}",
                        event_dict.get('published_date'),
                        event_dict.get('canonical_url', ''),
                        event_dict.get('content_hash', ''),
                        kurum,
                        json.dumps(affected_rules_list),
                        trust_class,
                        datetime.now().isoformat(),
                        datetime.now().isoformat(),
                    ]
                )

                # Event'i işlenmiş olarak işaretle
                cursor.execute(
                    "UPDATE regwatch_events SET source_id = ? WHERE id = ?",
                    [ref_id, event_dict['id']]
                )

                result['synced'] += 1
                logger.info(
                    f"Mevzuat ref oluşturuldu: {ref_id} - "
                    f"{event_dict['title'][:50]}..."
                )

            except Exception as e:
                logger.error(
                    f"Event aktarım hatası (id={event_dict['id']}): {e}"
                )
                result['skipped_error'] += 1

        conn.commit()

    logger.info(
        f"Mevzuat bridge tamamlandı: {result['synced']} aktarıldı, "
        f"{result['skipped_duplicate']} duplicate, "
        f"{result['skipped_error']} hata"
    )

    return result


def get_bridge_stats() -> Dict:
    """Bridge istatistikleri"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Toplam mevzuat_refs
        cursor.execute("SELECT COUNT(*) FROM mevzuat_refs WHERE is_active = 1")
        total_refs = cursor.fetchone()[0]

        # Aktarılmamış event sayısı
        cursor.execute(
            "SELECT COUNT(*) FROM regwatch_events WHERE source_id IS NULL"
        )
        pending_sync = cursor.fetchone()[0]

        # Tip bazlı dağılım
        cursor.execute("""
            SELECT mevzuat_type, COUNT(*)
            FROM mevzuat_refs
            WHERE is_active = 1
            GROUP BY mevzuat_type
        """)
        by_type = dict(cursor.fetchall())

        # Kurum bazlı dağılım
        cursor.execute("""
            SELECT kurum, COUNT(*)
            FROM mevzuat_refs
            WHERE is_active = 1
            GROUP BY kurum
        """)
        by_kurum = dict(cursor.fetchall())

        return {
            'total_refs': total_refs,
            'pending_sync': pending_sync,
            'by_type': by_type,
            'by_kurum': by_kurum,
        }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    print("Mevzuat Bridge - Event'leri mevzuat_refs'e aktarıyor...")
    result = sync_events_to_mevzuat()
    print(json.dumps(result, indent=2, ensure_ascii=False))

    print("\nBridge İstatistikleri:")
    stats = get_bridge_stats()
    print(json.dumps(stats, indent=2, ensure_ascii=False))
