"""
Feed Service
Manages feed items for LYNTOS cockpit - NOW USES DATABASE
LYNTOS Anayasa: Evidence-gated, Explainability Contract

V2 Refactor: Persistent storage in feed_items table
V2.1: Auto-generate feed from mizan analysis if database empty
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import uuid
import json
import logging

from database.db import get_connection
from schemas.feed import (
    FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction,
    FeedCategory, FeedSeverity, EvidenceStatus, ActionStatus
)

logger = logging.getLogger(__name__)

# Data directory for Luca exports
DATA_DIR = Path(__file__).parent.parent.parent / "data"


class FeedService:
    """
    Feed Service - manages feed items with DATABASE persistence

    V2: All data stored in feed_items table (no more in-memory loss)
    """

    def add_item(
        self,
        tenant_id: str,
        client_id: str,
        period_id: str,
        item_type: str,
        title: str,
        message: str = None,
        severity: str = "INFO",
        metadata: dict = None
    ) -> int:
        """
        Add a feed item to the database

        Args:
            tenant_id: SMMM identifier
            client_id: Client identifier
            period_id: Period (e.g., "2025-Q2")
            item_type: Type of item ('risk', 'alert', 'info', 'upload', 'system')
            title: Title of the feed item
            message: Optional detailed message
            severity: Severity level ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')
            metadata: Optional JSON metadata

        Returns:
            ID of inserted item
        """
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO feed_items (tenant_id, client_id, period_id, type, title, message, severity, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id,
                client_id,
                period_id,
                item_type,
                title,
                message,
                severity,
                json.dumps(metadata) if metadata else None
            ))
            conn.commit()
            item_id = cursor.lastrowid
            logger.info(f"[FeedService] Added item {item_id}: {title} ({severity})")
            return item_id

    def get_feed(
        self,
        client_id: str,
        period_id: str,
        tenant_id: str = None,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get feed items for a specific client/period

        Args:
            client_id: Client identifier
            period_id: Period (e.g., "2025-Q2")
            tenant_id: Optional SMMM filter
            unread_only: If True, only return unread items
            limit: Max items to return

        Returns:
            List of feed item dicts
        """
        with get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT id, tenant_id, client_id, period_id, type, title, message,
                       severity, is_read, metadata, created_at
                FROM feed_items
                WHERE client_id = ? AND period_id = ?
            """
            params = [client_id, period_id]

            if tenant_id:
                query += " AND tenant_id = ?"
                params.append(tenant_id)

            if unread_only:
                query += " AND is_read = 0"

            # Order by severity (CRITICAL first) then by created_at (newest first)
            query += """
                ORDER BY
                    CASE severity
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'MEDIUM' THEN 3
                        WHEN 'LOW' THEN 4
                        ELSE 5
                    END,
                    created_at DESC
                LIMIT ?
            """
            params.append(limit)

            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [dict(row) for row in rows]

    def mark_as_read(self, item_id: int) -> bool:
        """Mark a feed item as read"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE feed_items SET is_read = 1 WHERE id = ?", (item_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_unread_count(self, client_id: str, period_id: str) -> int:
        """Get count of unread items for a client/period"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM feed_items
                WHERE client_id = ? AND period_id = ? AND is_read = 0
            """, (client_id, period_id))
            return cursor.fetchone()[0]

    # ═══════════════════════════════════════════════════════════════════════════
    # AUTO-GENERATE FEED FROM MIZAN DATA
    # Disk verilerinden (mizan.csv) otomatik feed item'ları üret
    # ═══════════════════════════════════════════════════════════════════════════

    def _get_client_folder_name(self, client_id: str) -> Optional[str]:
        """Get disk folder name for client (from clients.folder_name column)"""
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT folder_name FROM clients WHERE id = ?", (client_id,))
                row = cursor.fetchone()
                if row and row["folder_name"]:
                    return row["folder_name"]
        except Exception as e:
            logger.warning(f"folder_name alınamadı: {e}")
        return None

    def _generate_feed_from_mizan(
        self,
        smmm_id: str,
        client_id: str,
        period: str
    ) -> List[FeedItem]:
        """
        Generate feed items from mizan data on disk
        Used when database has no items - provides real-time analysis
        """
        feed_items = []

        # Get disk folder name from database (maps client_id -> folder_name)
        folder_name = self._get_client_folder_name(client_id)
        disk_client_id = folder_name if folder_name else client_id

        # Find mizan file
        luca_dir = DATA_DIR / "luca" / smmm_id / disk_client_id

        if not luca_dir.exists():
            # Fallback: try client_id directly
            luca_dir = DATA_DIR / "luca" / smmm_id / client_id
            if not luca_dir.exists():
                logger.info(f"[FeedService] No data dir for {smmm_id}/{disk_client_id} or {client_id}")
                return feed_items

        # Find period folder (handles variations like "2025-Q1__SMOKETEST...")
        period_dir = None
        for folder in luca_dir.iterdir():
            if folder.is_dir() and folder.name.startswith(period):
                period_dir = folder
                break

        if not period_dir:
            logger.info(f"[FeedService] No period folder for {period}")
            return feed_items

        mizan_path = period_dir / "mizan.csv"
        if not mizan_path.exists():
            logger.info(f"[FeedService] No mizan.csv in {period_dir}")
            return feed_items

        logger.info(f"[FeedService] Generating feed from {mizan_path}")

        # Parse mizan and analyze
        try:
            import csv
            with open(mizan_path, 'r', encoding='utf-8-sig') as f:
                # Detect delimiter (could be comma or semicolon)
                first_line = f.readline()
                f.seek(0)
                delimiter = ';' if ';' in first_line else ','
                reader = csv.DictReader(f, delimiter=delimiter)
                rows = list(reader)

            if not rows:
                return feed_items

            # Calculate totals for VDK analysis
            def get_float(row, *keys):
                for key in keys:
                    if key in row:
                        try:
                            val = str(row[key]).replace('.', '').replace(',', '.').strip()
                            return float(val) if val else 0.0
                        except:
                            pass
                return 0.0

            # Mizan hesap analizleri
            kasa_bakiye = 0.0
            alicilar = 0.0
            stoklar = 0.0
            ortaklardan_alacak = 0.0
            toplam_aktif = 0.0
            ozsermaye = 0.0
            satislar = 0.0

            for row in rows:
                kod = str(row.get('HESAP KODU', row.get('hesap_kodu', ''))).strip()
                borc = get_float(row, 'BORÇ BAKİYESİ', 'BAKİYE BORÇ', 'borc', 'bakiye_borc')
                alacak = get_float(row, 'ALACAK BAKİYESİ', 'BAKİYE ALACAK', 'alacak', 'bakiye_alacak')
                bakiye = borc - alacak

                if kod.startswith('100'):
                    kasa_bakiye += bakiye
                elif kod.startswith('120'):
                    alicilar += bakiye
                elif kod.startswith('15'):
                    stoklar += bakiye
                elif kod.startswith('131'):
                    ortaklardan_alacak += bakiye
                elif kod.startswith('1') or kod.startswith('2'):
                    toplam_aktif += abs(bakiye)
                elif kod.startswith('5'):
                    ozsermaye += abs(alacak - borc)
                elif kod.startswith('600'):
                    satislar += abs(alacak - borc)

            item_id = 1

            # ═══ VDK K-09: Kasa/Aktif Oranı ═══
            if toplam_aktif > 0:
                kasa_orani = (abs(kasa_bakiye) / toplam_aktif) * 100
                if kasa_orani > 15:  # Kritik eşik
                    feed_items.append(FeedItem(
                        id=f"VDK-K09-{item_id}",
                        title=f"Kasa/Aktif Oranı Kritik: %{kasa_orani:.1f}",
                        summary=f"Kasa bakiyesi ({kasa_bakiye:,.0f} TL) aktif toplamının %{kasa_orani:.1f}'i. VDK K-09 kriteri aşıldı.",
                        why="VUK 227 - Yüksek kasa bakiyesi kayıt dışı gelir şüphesi oluşturur",
                        severity=FeedSeverity.CRITICAL,
                        category=FeedCategory.VDK,
                        score=90,
                        scope=FeedScope(smmm_id=smmm_id, client_id=client_id, period=period),
                        impact=FeedImpact(amount_try=kasa_bakiye, pct=kasa_orani, points=90),
                        evidence_refs=[EvidenceRef(
                            ref_id=f"EVID-KASA-{item_id}",
                            source_type="mizan",
                            description=f"100 Kasa hesabı bakiyesi: {kasa_bakiye:,.0f} TL",
                            status=EvidenceStatus.AVAILABLE,
                            file_path=str(mizan_path),
                            account_code="100",
                            document_date=None,
                            metadata={"kasa_orani": kasa_orani}
                        )],
                        actions=[FeedAction(
                            action_id=f"ACT-K09-{item_id}",
                            description="Kasa sayım tutanağı düzenleyin, fazla bakiyeyi bankaya aktarın",
                            responsible="SMMM",
                            deadline=None,
                            status=ActionStatus.PENDING,
                            priority=1,
                            related_evidence=[f"EVID-KASA-{item_id}"]
                        )]
                    ))
                    item_id += 1
                elif kasa_orani > 5:  # Uyarı eşiği
                    feed_items.append(FeedItem(
                        id=f"VDK-K09-{item_id}",
                        title=f"Kasa/Aktif Oranı Yüksek: %{kasa_orani:.1f}",
                        summary=f"Kasa bakiyesi takip edilmeli. VDK K-09 uyarı eşiğine yakın.",
                        why="VUK 227 - Kasa bakiyesi aktif oranına göre yüksek",
                        severity=FeedSeverity.HIGH,
                        category=FeedCategory.VDK,
                        score=70,
                        scope=FeedScope(smmm_id=smmm_id, client_id=client_id, period=period),
                        impact=FeedImpact(amount_try=kasa_bakiye, pct=kasa_orani, points=70),
                        evidence_refs=[],
                        actions=[]
                    ))
                    item_id += 1

            # ═══ Negatif Kasa ═══
            if kasa_bakiye < 0:
                feed_items.append(FeedItem(
                    id=f"VDK-NEG-KASA-{item_id}",
                    title=f"Negatif Kasa Bakiyesi: {kasa_bakiye:,.0f} TL",
                    summary="Kasa hesabı negatif bakiye veremez. Kayıt hatası veya belgesiz ödeme olabilir.",
                    why="VUK 227 - Kasa hesabı hiçbir zaman negatif olamaz",
                    severity=FeedSeverity.CRITICAL,
                    category=FeedCategory.VDK,
                    score=95,
                    scope=FeedScope(smmm_id=smmm_id, client_id=client_id, period=period),
                    impact=FeedImpact(amount_try=abs(kasa_bakiye), pct=None, points=95),
                    evidence_refs=[],
                    actions=[]
                ))
                item_id += 1

            # ═══ Ortaklardan Alacak (TF-01) ═══
            if ozsermaye > 0 and ortaklardan_alacak > 0:
                ortak_orani = (ortaklardan_alacak / ozsermaye) * 100
                if ortak_orani > 25:
                    feed_items.append(FeedItem(
                        id=f"VDK-TF01-{item_id}",
                        title=f"Ortaklardan Alacak/Sermaye: %{ortak_orani:.1f}",
                        summary=f"Ortaklardan alacak ({ortaklardan_alacak:,.0f} TL) örtülü kazanç dağıtımı riski taşıyor.",
                        why="KVK 13 (Transfer Fiyatlandırması), TTK 358 (Borçlanma Yasağı)",
                        severity=FeedSeverity.CRITICAL if ortak_orani > 50 else FeedSeverity.HIGH,
                        category=FeedCategory.VDK,
                        score=85 if ortak_orani > 50 else 70,
                        scope=FeedScope(smmm_id=smmm_id, client_id=client_id, period=period),
                        impact=FeedImpact(amount_try=ortaklardan_alacak, pct=ortak_orani, points=85),
                        evidence_refs=[],
                        actions=[]
                    ))
                    item_id += 1

            # ═══ Mizan Denge Kontrolü ═══
            toplam_borc = sum(get_float(r, 'BORÇ BAKİYESİ', 'BAKİYE BORÇ', 'borc') for r in rows)
            toplam_alacak = sum(get_float(r, 'ALACAK BAKİYESİ', 'BAKİYE ALACAK', 'alacak') for r in rows)
            fark = abs(toplam_borc - toplam_alacak)

            if fark > 1:  # 1 TL'den fazla fark
                feed_items.append(FeedItem(
                    id=f"MIZAN-DENGE-{item_id}",
                    title=f"Mizan Dengesi Bozuk: {fark:,.0f} TL fark",
                    summary=f"Toplam borç ({toplam_borc:,.0f}) ve alacak ({toplam_alacak:,.0f}) eşit değil.",
                    why="Tek Düzen Hesap Planı - Mizan dengeli olmalı",
                    severity=FeedSeverity.CRITICAL,
                    category=FeedCategory.BEYAN,
                    score=95,
                    scope=FeedScope(smmm_id=smmm_id, client_id=client_id, period=period),
                    impact=FeedImpact(amount_try=fark, pct=None, points=95),
                    evidence_refs=[],
                    actions=[]
                ))
                item_id += 1

            # ═══ Dönem bilgi kartı ═══
            hesap_sayisi = len([r for r in rows if r.get('HESAP KODU', r.get('hesap_kodu', ''))])
            feed_items.append(FeedItem(
                id=f"INFO-MIZAN-{item_id}",
                title=f"Mizan Yüklendi: {hesap_sayisi} hesap",
                summary=f"{period} dönemi için mizan verisi analiz edildi.",
                why="Dönem verisi hazır",
                severity=FeedSeverity.INFO,
                category=FeedCategory.BELGE,
                score=10,
                scope=FeedScope(smmm_id=smmm_id, client_id=client_id, period=period),
                impact=FeedImpact(amount_try=0, pct=None, points=10),
                evidence_refs=[],
                actions=[]
            ))

            logger.info(f"[FeedService] Generated {len(feed_items)} feed items from mizan")

        except Exception as e:
            logger.error(f"[FeedService] Error parsing mizan: {e}")

        return feed_items

    # Legacy compatibility methods for existing code

    def get_feed_items(
        self,
        smmm_id: str,
        client_id: str,
        period: str,
        severity_filter: Optional[List[FeedSeverity]] = None,
        category_filter: Optional[List[FeedCategory]] = None
    ) -> List[FeedItem]:
        """
        Returns FeedItem objects - first from DB, then auto-generate from mizan if empty
        """
        items = self.get_feed(client_id, period, tenant_id=smmm_id)

        # If no items in DB, try to generate from mizan data
        if not items:
            logger.info(f"[FeedService] No DB items, generating from mizan for {smmm_id}/{client_id}/{period}")
            return self._generate_feed_from_mizan(smmm_id, client_id, period)

        # Convert DB rows to FeedItem objects
        feed_items = []
        for row in items:
            try:
                # Map severity string to enum
                severity_map = {
                    'CRITICAL': FeedSeverity.CRITICAL,
                    'HIGH': FeedSeverity.HIGH,
                    'MEDIUM': FeedSeverity.MEDIUM,
                    'LOW': FeedSeverity.LOW,
                    'INFO': FeedSeverity.INFO
                }
                severity = severity_map.get(row.get('severity', 'INFO'), FeedSeverity.INFO)

                # Filter by severity if specified
                if severity_filter and severity not in severity_filter:
                    continue

                # Create EvidenceRef from row data
                evidence_ref = EvidenceRef(
                    ref_id=f"EVID-{row['id']}",
                    source_type="mizan",
                    description=row.get('message', '') or row['title'],
                    status=EvidenceStatus.AVAILABLE,
                    file_path=None,
                    account_code=None,
                    document_date=None,
                    metadata={}
                )

                # Create FeedAction
                action = FeedAction(
                    action_id=f"ACT-{row['id']}",
                    description="Kontrol et ve degerlendir",
                    responsible="SMMM",
                    deadline=None,
                    status=ActionStatus.PENDING,
                    priority=1 if severity in [FeedSeverity.CRITICAL, FeedSeverity.HIGH] else 2,
                    related_evidence=[f"EVID-{row['id']}"]
                )

                # Create FeedItem
                feed_item = FeedItem(
                    id=str(row['id']),
                    title=row['title'],
                    summary=row.get('message', '') or '',
                    why=f"VDK Analiz - {row.get('type', 'risk')}",
                    severity=severity,
                    category=FeedCategory.VDK,  # Default category for analysis results
                    score=70 if severity == FeedSeverity.HIGH else 50,
                    scope=FeedScope(
                        smmm_id=row.get('tenant_id', smmm_id),
                        client_id=row['client_id'],
                        period=row['period_id']
                    ),
                    impact=FeedImpact(
                        amount_try=0.0,
                        pct=None,
                        points=None
                    ),
                    evidence_refs=[evidence_ref],
                    actions=[action]
                )
                feed_items.append(feed_item)
            except Exception as e:
                logger.warning(f"[FeedService] Error converting row to FeedItem: {e}")
                continue

        return feed_items

    def get_critical_and_high(
        self,
        smmm_id: str,
        client_id: str,
        period: str
    ) -> List[FeedItem]:
        """Get only CRITICAL and HIGH severity items - used for Evidence Bundle"""
        return self.get_feed_items(
            smmm_id=smmm_id,
            client_id=client_id,
            period=period,
            severity_filter=[FeedSeverity.CRITICAL, FeedSeverity.HIGH]
        )

    def add_feed_item(self, item: FeedItem) -> FeedItem:
        """Legacy method - adds a FeedItem to database"""
        self.add_item(
            tenant_id=item.scope.smmm_id,
            client_id=item.scope.client_id,
            period_id=item.scope.period,
            item_type='risk' if item.severity in [FeedSeverity.CRITICAL, FeedSeverity.HIGH] else 'info',
            title=item.title,
            message=item.subtitle,
            severity=item.severity.value if hasattr(item.severity, 'value') else str(item.severity),
            metadata={'score': item.score, 'category': str(item.category)}
        )
        return item


# Singleton
_feed_service: Optional[FeedService] = None


def get_feed_service() -> FeedService:
    global _feed_service
    if _feed_service is None:
        _feed_service = FeedService()
    return _feed_service
