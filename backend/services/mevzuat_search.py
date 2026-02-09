"""
LYNTOS Mevzuat Search Service - PENCERE 5
Özelge ve Mevzuat Arama Servisi

Features:
- Full-text search on mevzuat content
- Filtering by type, kurum, date range
- Rule linkage discovery
- Keyword highlighting

Phase 2 will add:
- Vector embeddings (Chroma)
- Semantic similarity search
- Question answering
"""

import sqlite3
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from database.db import get_connection
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MevzuatSearchResult:
    """Arama sonucu"""
    id: int
    src_code: str
    mevzuat_type: str  # kanun, khk, teblig, sirkular, genelge, ozelge, danistay_karar, yonetmelik
    mevzuat_no: Optional[str]
    madde: Optional[str]
    fikra: Optional[str]
    baslik: str
    kisa_aciklama: Optional[str]
    kurum: str
    yururluk_tarih: Optional[str]
    canonical_url: Optional[str]
    trust_class: str  # A, B, C, D
    affected_rules: List[str]
    kapsam_etiketleri: List[str]
    relevance_score: float = 0.0
    highlights: List[str] = None

    def __post_init__(self):
        if self.highlights is None:
            self.highlights = []


@dataclass
class SearchFilters:
    """Arama filtreleri"""
    query: str = ""
    mevzuat_types: List[str] = None  # Filter by type
    kurumlar: List[str] = None  # Filter by organization
    yururluk_from: Optional[str] = None  # Date range start
    yururluk_to: Optional[str] = None  # Date range end
    only_active: bool = True
    affected_rule_id: Optional[str] = None  # Find mevzuat affecting specific rule
    kapsam_etiketi: Optional[str] = None  # Topic tag
    limit: int = 50
    offset: int = 0

    def __post_init__(self):
        if self.mevzuat_types is None:
            self.mevzuat_types = []
        if self.kurumlar is None:
            self.kurumlar = []


# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

MEVZUAT_TYPES = {
    'kanun': 'Kanun',
    'khk': 'Kanun Hükmünde Kararname',
    'teblig': 'Tebliğ',
    'sirkular': 'Sirküler',
    'genelge': 'Genelge',
    'ozelge': 'Özelge',
    'danistay_karar': 'Danıştay Kararı',
    'yonetmelik': 'Yönetmelik'
}

KURUMLAR = {
    'GIB': 'Gelir İdaresi Başkanlığı',
    'HMB': 'Hazine ve Maliye Bakanlığı',
    'TBMM': 'Türkiye Büyük Millet Meclisi',
    'RG': 'Resmi Gazete',
    'DANISTAY': 'Danıştay',
    'TURMOB': 'TÜRMOB'
}

# Turkish stopwords for query cleaning
TURKISH_STOPWORDS = {
    've', 'veya', 'ile', 'için', 'bu', 'şu', 'o', 'bir', 'de', 'da', 'mi', 'mu',
    'mı', 'ne', 'ki', 'gibi', 'kadar', 'daha', 'en', 'çok', 'az', 'her', 'hiç',
    'ama', 'ancak', 'fakat', 'eğer', 'şayet', 'nasıl', 'neden', 'niçin', 'niye'
}


# ═══════════════════════════════════════════════════════════════════════════════
# SEARCH SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class MevzuatSearchService:
    """
    Mevzuat arama servisi.

    Phase 1: Full-text SQL search
    Phase 2: Vector embeddings with Chroma
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        logger.info("[MevzuatSearch] Service initialized")

    # ───────────────────────────────────────────────────────────────────────────
    # QUERY PROCESSING
    # ───────────────────────────────────────────────────────────────────────────

    def _clean_query(self, query: str) -> str:
        """Sorgu temizleme ve normalizasyon"""
        # Lowercase
        q = query.lower().strip()

        # Remove extra whitespace
        q = re.sub(r'\s+', ' ', q)

        # Remove special characters but keep Turkish letters
        q = re.sub(r'[^\w\sğüşıöçĞÜŞİÖÇ]', ' ', q)

        return q

    def _extract_keywords(self, query: str) -> List[str]:
        """Anahtar kelimeleri çıkar"""
        cleaned = self._clean_query(query)
        words = cleaned.split()

        # Remove stopwords and short words
        keywords = [
            w for w in words
            if len(w) > 2 and w not in TURKISH_STOPWORDS
        ]

        return keywords

    def _build_search_conditions(
        self,
        keywords: List[str],
        filters: SearchFilters
    ) -> Tuple[str, List]:
        """SQL WHERE koşullarını oluştur"""
        conditions = []
        params = []

        # Keyword search (OR across multiple fields)
        if keywords:
            keyword_conditions = []
            for kw in keywords:
                keyword_conditions.append("""
                    (baslik LIKE ? OR
                     kisa_aciklama LIKE ? OR
                     tam_metin LIKE ? OR
                     mevzuat_no LIKE ?)
                """)
                pattern = f'%{kw}%'
                params.extend([pattern, pattern, pattern, pattern])

            conditions.append(f"({' OR '.join(keyword_conditions)})")

        # Type filter
        if filters.mevzuat_types:
            placeholders = ','.join(['?' for _ in filters.mevzuat_types])
            conditions.append(f"mevzuat_type IN ({placeholders})")
            params.extend(filters.mevzuat_types)

        # Kurum filter
        if filters.kurumlar:
            placeholders = ','.join(['?' for _ in filters.kurumlar])
            conditions.append(f"kurum IN ({placeholders})")
            params.extend(filters.kurumlar)

        # Date range
        if filters.yururluk_from:
            conditions.append("yururluk_tarih >= ?")
            params.append(filters.yururluk_from)

        if filters.yururluk_to:
            conditions.append("yururluk_tarih <= ?")
            params.append(filters.yururluk_to)

        # Active only
        if filters.only_active:
            conditions.append("is_active = 1")

        # Affected rule
        if filters.affected_rule_id:
            conditions.append("affected_rules LIKE ?")
            params.append(f'%{filters.affected_rule_id}%')

        # Kapsam etiketi
        if filters.kapsam_etiketi:
            conditions.append("kapsam_etiketleri LIKE ?")
            params.append(f'%{filters.kapsam_etiketi}%')

        where_clause = " AND ".join(conditions) if conditions else "1=1"
        return where_clause, params

    def _calculate_relevance(
        self,
        row: sqlite3.Row,
        keywords: List[str]
    ) -> float:
        """Alaka düzeyi hesapla (0-1)"""
        if not keywords:
            return 0.5

        score = 0.0

        baslik = (row['baslik'] or '').lower()
        aciklama = (row['kisa_aciklama'] or '').lower()
        metin = (row['tam_metin'] or '').lower()

        for kw in keywords:
            kw_lower = kw.lower()

            # Title match (highest weight)
            if kw_lower in baslik:
                score += 0.4

            # Description match
            if kw_lower in aciklama:
                score += 0.3

            # Content match
            if kw_lower in metin:
                score += 0.2

        # Trust class bonus
        trust = row['trust_class']
        if trust == 'A':
            score *= 1.2
        elif trust == 'B':
            score *= 1.1

        # Normalize to 0-1
        return min(1.0, score / len(keywords))

    def _extract_highlights(
        self,
        row: sqlite3.Row,
        keywords: List[str],
        max_highlights: int = 3
    ) -> List[str]:
        """Eşleşen metin parçalarını çıkar"""
        highlights = []

        text = row['tam_metin'] or row['kisa_aciklama'] or ''
        if not text or not keywords:
            return highlights

        # Find sentences containing keywords
        sentences = re.split(r'[.!?]\s+', text)

        for sentence in sentences:
            sentence_lower = sentence.lower()
            for kw in keywords:
                if kw.lower() in sentence_lower and len(sentence) > 20:
                    # Truncate long sentences
                    if len(sentence) > 200:
                        # Find keyword position and extract context
                        pos = sentence_lower.find(kw.lower())
                        start = max(0, pos - 80)
                        end = min(len(sentence), pos + 120)
                        excerpt = ('...' if start > 0 else '') + sentence[start:end] + ('...' if end < len(sentence) else '')
                        highlights.append(excerpt)
                    else:
                        highlights.append(sentence)
                    break

            if len(highlights) >= max_highlights:
                break

        return highlights

    # ───────────────────────────────────────────────────────────────────────────
    # PUBLIC METHODS
    # ───────────────────────────────────────────────────────────────────────────

    def _normalize_turkish(self, text: str) -> str:
        """Türkçe karakterleri normalize et (arama için)"""
        if not text:
            return text
        tr_map = str.maketrans('ıİğĞüÜşŞöÖçÇ', 'iIgGuUsSoOcC')
        return text.translate(tr_map)

    def _parse_row(self, row: sqlite3.Row) -> MevzuatSearchResult:
        """Veritabanı satırını MevzuatSearchResult'a dönüştür"""
        import json
        affected_rules = []
        kapsam_etiketleri = []
        try:
            if row['affected_rules']:
                affected_rules = json.loads(row['affected_rules'])
        except Exception:
            pass
        try:
            if row['kapsam_etiketleri']:
                kapsam_etiketleri = json.loads(row['kapsam_etiketleri'])
        except Exception:
            pass

        return MevzuatSearchResult(
            id=row['id'],
            src_code=row['src_code'],
            mevzuat_type=row['mevzuat_type'],
            mevzuat_no=row['mevzuat_no'],
            madde=row['madde'],
            fikra=row['fikra'],
            baslik=row['baslik'],
            kisa_aciklama=row['kisa_aciklama'],
            kurum=row['kurum'],
            yururluk_tarih=row['yururluk_tarih'],
            canonical_url=row['canonical_url'],
            trust_class=row['trust_class'],
            affected_rules=affected_rules,
            kapsam_etiketleri=kapsam_etiketleri,
        )

    def search(self, filters: SearchFilters) -> Tuple[List[MevzuatSearchResult], int]:
        """
        Mevzuat ara — FTS5 destekli.
        """
        keywords = self._extract_keywords(filters.query) if filters.query else []

        with get_connection() as conn:
            cursor = conn.cursor()

            # FTS5 ile arama (keyword varsa)
            if keywords:
                fts_terms = ' OR '.join(
                    f'"{self._normalize_turkish(kw)}"' for kw in keywords
                )
                # FTS5 MATCH ile rowid'leri bul, sonra ana tabloya join
                filter_parts = []
                filter_params: list = []

                if filters.mevzuat_types:
                    ph = ','.join(['?' for _ in filters.mevzuat_types])
                    filter_parts.append(f"m.mevzuat_type IN ({ph})")
                    filter_params.extend(filters.mevzuat_types)
                if filters.kurumlar:
                    ph = ','.join(['?' for _ in filters.kurumlar])
                    filter_parts.append(f"m.kurum IN ({ph})")
                    filter_params.extend(filters.kurumlar)
                if filters.only_active:
                    filter_parts.append("m.is_active = 1")

                extra_where = (" AND " + " AND ".join(filter_parts)) if filter_parts else ""

                count_sql = f"""
                    SELECT COUNT(*) FROM mevzuat_refs m
                    JOIN mevzuat_refs_fts f ON m.rowid = f.rowid
                    WHERE mevzuat_refs_fts MATCH ?{extra_where}
                """
                cursor.execute(count_sql, [fts_terms] + filter_params)
                total = cursor.fetchone()[0]

                sql = f"""
                    SELECT m.id, m.src_code, m.mevzuat_type, m.mevzuat_no,
                           m.madde, m.fikra, m.baslik, m.kisa_aciklama,
                           m.tam_metin, m.kurum, m.yururluk_tarih,
                           m.canonical_url, m.trust_class,
                           m.affected_rules, m.kapsam_etiketleri,
                           rank AS fts_rank
                    FROM mevzuat_refs m
                    JOIN mevzuat_refs_fts f ON m.rowid = f.rowid
                    WHERE mevzuat_refs_fts MATCH ?{extra_where}
                    ORDER BY rank
                    LIMIT ? OFFSET ?
                """
                cursor.execute(
                    sql,
                    [fts_terms] + filter_params + [filters.limit, filters.offset]
                )
            else:
                # Filtre-only arama (keyword yok)
                where_clause, params = self._build_search_conditions([], filters)
                count_sql = f"SELECT COUNT(*) FROM mevzuat_refs WHERE {where_clause}"
                cursor.execute(count_sql, params)
                total = cursor.fetchone()[0]

                sql = f"""
                    SELECT id, src_code, mevzuat_type, mevzuat_no, madde, fikra,
                           baslik, kisa_aciklama, tam_metin, kurum,
                           yururluk_tarih, canonical_url, trust_class,
                           affected_rules, kapsam_etiketleri
                    FROM mevzuat_refs
                    WHERE {where_clause}
                    ORDER BY
                        CASE trust_class WHEN 'A' THEN 1 WHEN 'B' THEN 2 ELSE 3 END,
                        yururluk_tarih DESC
                    LIMIT ? OFFSET ?
                """
                params.extend([filters.limit, filters.offset])
                cursor.execute(sql, params)

            results = []
            for row in cursor.fetchall():
                result = self._parse_row(row)
                result.relevance_score = self._calculate_relevance(row, keywords)
                result.highlights = self._extract_highlights(row, keywords)
                results.append(result)

            return results, total

    def get_type_list(
        self,
        mevzuat_type: str,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[MevzuatSearchResult], int]:
        """Belirli türdeki tüm mevzuatları sayfalı getir (StatCard tıklaması)."""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM mevzuat_refs WHERE mevzuat_type = ? AND is_active = 1",
                (mevzuat_type,)
            )
            total = cursor.fetchone()[0]

            cursor.execute("""
                SELECT id, src_code, mevzuat_type, mevzuat_no, madde, fikra,
                       baslik, kisa_aciklama, tam_metin, kurum,
                       yururluk_tarih, canonical_url, trust_class,
                       affected_rules, kapsam_etiketleri
                FROM mevzuat_refs
                WHERE mevzuat_type = ? AND is_active = 1
                ORDER BY baslik
                LIMIT ? OFFSET ?
            """, (mevzuat_type, limit, offset))

            results = [self._parse_row(row) for row in cursor.fetchall()]
            return results, total

    def get_by_id(self, mevzuat_id: int) -> Optional[Dict]:
        """
        ID ile mevzuat getir.
        """
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM mevzuat_refs WHERE id = ?
            """, (mevzuat_id,))
            row = cursor.fetchone()

            if not row:
                return None

            return dict(row)

    def get_by_src_code(self, src_code: str) -> Optional[Dict]:
        """
        SRC kodu ile mevzuat getir.
        """
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM mevzuat_refs WHERE src_code = ?
            """, (src_code,))
            row = cursor.fetchone()

            if not row:
                return None

            return dict(row)

    def get_linked_rules(self, mevzuat_id: int) -> List[Dict]:
        """
        Mevzuata bağlı kuralları getir.
        """
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT r.*, rml.link_type, rml.notes as link_notes
                FROM rules r
                JOIN rule_mevzuat_link rml ON r.rule_id = rml.rule_id
                WHERE rml.mevzuat_id = ?
                ORDER BY rml.link_type, r.priority
            """, (mevzuat_id,))

            return [dict(row) for row in cursor.fetchall()]

    def get_statistics(self) -> Dict:
        """
        Mevzuat istatistikleri.
        """
        with get_connection() as conn:
            cursor = conn.cursor()

            # Count by type
            cursor.execute("""
                SELECT mevzuat_type, COUNT(*) as count
                FROM mevzuat_refs
                WHERE is_active = 1
                GROUP BY mevzuat_type
            """)
            by_type = {row['mevzuat_type']: row['count'] for row in cursor.fetchall()}

            # Count by kurum
            cursor.execute("""
                SELECT kurum, COUNT(*) as count
                FROM mevzuat_refs
                WHERE is_active = 1
                GROUP BY kurum
            """)
            by_kurum = {row['kurum']: row['count'] for row in cursor.fetchall()}

            # Count by trust class
            cursor.execute("""
                SELECT trust_class, COUNT(*) as count
                FROM mevzuat_refs
                WHERE is_active = 1
                GROUP BY trust_class
            """)
            by_trust = {row['trust_class']: row['count'] for row in cursor.fetchall()}

            # Total counts
            cursor.execute("SELECT COUNT(*) FROM mevzuat_refs WHERE is_active = 1")
            total_active = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM mevzuat_refs")
            total_all = cursor.fetchone()[0]

            return {
                'total_active': total_active,
                'total_all': total_all,
                'by_type': by_type,
                'by_kurum': by_kurum,
                'by_trust_class': by_trust,
                'type_labels': MEVZUAT_TYPES,
                'kurum_labels': KURUMLAR,
                'generated_at': datetime.now().isoformat()
            }

    def get_recent(self, limit: int = 10) -> List[Dict]:
        """
        Son eklenen mevzuatları getir (tam veri ile).
        """
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, src_code, mevzuat_type, mevzuat_no, madde, fikra,
                       baslik, kisa_aciklama, kurum,
                       yururluk_tarih, canonical_url, trust_class,
                       affected_rules, kapsam_etiketleri, created_at
                FROM mevzuat_refs
                WHERE is_active = 1
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))

            return [dict(row) for row in cursor.fetchall()]

    def get_by_rule(self, rule_id: str) -> List[Dict]:
        """
        Bir kurala bağlı tüm mevzuatları getir.
        """
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT m.*, rml.link_type, rml.notes as link_notes
                FROM mevzuat_refs m
                JOIN rule_mevzuat_link rml ON m.id = rml.mevzuat_id
                WHERE rml.rule_id = ?
                ORDER BY rml.link_type, m.yururluk_tarih DESC
            """, (rule_id,))

            return [dict(row) for row in cursor.fetchall()]


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON ACCESSOR
# ═══════════════════════════════════════════════════════════════════════════════

def get_mevzuat_search_service() -> MevzuatSearchService:
    """Get singleton instance of MevzuatSearchService"""
    return MevzuatSearchService()
