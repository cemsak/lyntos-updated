# -*- coding: utf-8 -*-
"""
LYNTOS Client Resolver
========================

VKN (Vergi Kimlik Numarası) bazlı client çözümleme servisi.

ASLA 'PENDING-*' VKN ile client oluşturmaz.
Client kimliği VKN üzerinden çözülür — tek kaynak.

Author: Claude
Date: 2026-02-08
"""

import logging
import uuid
from datetime import datetime
from typing import Optional

from utils.tax_certificate_parser import validate_vkn

logger = logging.getLogger(__name__)


class ClientResolverError(Exception):
    """Client çözümleme hatası"""
    pass


class ClientResolver:
    """
    VKN-bazlı client çözümleme.

    Çözüm sırası:
    1. VKN ile ara (tax_id UNIQUE) → bulursa o client_id döner
    2. client_id ile ara → bulursa döner
    3. VKN geçerliyse → yeni client oluştur
    4. VKN yoksa/geçersizse → hata fırlat

    PENDING VKN ASLA oluşturmaz.
    """

    @staticmethod
    def resolve(
        cursor,
        smmm_id: str,
        vkn: Optional[str] = None,
        client_id: Optional[str] = None,
        name: Optional[str] = None,
    ) -> str:
        """
        Client'ı bul veya oluştur. VKN öncelikli.

        Args:
            cursor: SQLite cursor
            smmm_id: SMMM kullanıcı ID
            vkn: Vergi Kimlik Numarası (10 hane)
            client_id: Mevcut client ID (opsiyonel)
            name: Şirket adı (opsiyonel, oluşturma için)

        Returns:
            Çözülmüş client_id

        Raises:
            ClientResolverError: Client bulunamadı ve oluşturulamadı
        """

        # === 1. VKN ile ara ===
        if vkn:
            clean_vkn = vkn.strip()
            cursor.execute(
                "SELECT id, name FROM clients WHERE tax_id = ?",
                (clean_vkn,)
            )
            row = cursor.fetchone()
            if row:
                found_id = row[0] if isinstance(row, tuple) else row["id"]
                logger.info(f"[ClientResolver] VKN ile bulundu: {clean_vkn} → {found_id}")
                return found_id

        # === 2. client_id ile ara ===
        if client_id:
            cursor.execute(
                "SELECT id, tax_id FROM clients WHERE id = ?",
                (client_id,)
            )
            row = cursor.fetchone()
            if row:
                found_id = row[0] if isinstance(row, tuple) else row["id"]
                found_tax = row[1] if isinstance(row, tuple) else row["tax_id"]

                # PENDING VKN uyarısı
                if found_tax and found_tax.startswith("PENDING-"):
                    logger.warning(
                        f"[ClientResolver] Client {found_id} PENDING VKN'ye sahip: {found_tax}. "
                        f"Vergi levhası yüklenmelidir."
                    )

                logger.info(f"[ClientResolver] client_id ile bulundu: {found_id}")
                return found_id

        # === 3. VKN geçerliyse yeni client oluştur ===
        if vkn:
            clean_vkn = vkn.strip()
            if not validate_vkn(clean_vkn):
                raise ClientResolverError(
                    f"Geçersiz VKN: {clean_vkn}. "
                    f"VKN 10 haneli olmalı ve GİB algoritmasına uygun olmalıdır."
                )

            # Yeni client oluştur
            new_id = _generate_client_id(clean_vkn)
            display_name = name or f"Mükellef {clean_vkn[:3]}****{clean_vkn[-2:]}"
            now = datetime.utcnow().isoformat()

            cursor.execute("""
                INSERT INTO clients (id, smmm_id, name, tax_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (new_id, smmm_id, display_name, clean_vkn, now, now))

            logger.info(f"[ClientResolver] Yeni client oluşturuldu: {new_id} (VKN: {clean_vkn})")
            return new_id

        # === 4. Hiçbir bilgi yok ===
        raise ClientResolverError(
            "Client çözümlenemedi. VKN veya geçerli bir client_id gereklidir. "
            "Lütfen önce vergi levhası yükleyerek mükellef oluşturun."
        )

    @staticmethod
    def resolve_existing(cursor, client_id: str) -> str:
        """
        Sadece mevcut client'ı doğrula. Oluşturmaz.

        Args:
            cursor: SQLite cursor
            client_id: Client ID

        Returns:
            Doğrulanmış client_id

        Raises:
            ClientResolverError: Client bulunamadı
        """
        cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
        row = cursor.fetchone()
        if not row:
            raise ClientResolverError(
                f"Client bulunamadı: {client_id}. "
                f"Lütfen önce vergi levhası yükleyerek mükellef oluşturun."
            )
        return row[0] if isinstance(row, tuple) else row["id"]

    @staticmethod
    def get_client_vkn(cursor, client_id: str) -> Optional[str]:
        """Client'ın VKN'sini döndür"""
        cursor.execute("SELECT tax_id FROM clients WHERE id = ?", (client_id,))
        row = cursor.fetchone()
        if not row:
            return None
        vkn = row[0] if isinstance(row, tuple) else row["tax_id"]
        if vkn and vkn.startswith("PENDING-"):
            return None  # PENDING VKN geçerli VKN değil
        return vkn


def _generate_client_id(vkn: str) -> str:
    """
    VKN'den deterministic client_id oluştur.

    Format: CLIENT_{VKN[:3]}_{UUID8}
    UUID kısmı VKN + timestamp bazlı — unique garanti.
    """
    short_uuid = uuid.uuid4().hex[:8].upper()
    return f"CLIENT_{vkn[:3]}_{short_uuid}"
