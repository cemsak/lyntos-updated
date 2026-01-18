"""
LYNTOS Mizan Sync Tests
Tests for mizan data storage and retrieval
"""

import pytest


class TestMizanSync:
    """Tests for mizan sync functionality"""

    def test_sync_empty_entries(self, db_connection):
        """Should handle empty database gracefully"""
        cursor = db_connection.cursor()

        # Count entries
        cursor.execute("SELECT COUNT(*) as cnt FROM mizan_entries")
        count = cursor.fetchone()["cnt"]

        assert count == 0

    def test_sync_valid_entries(self, db_connection, sample_mizan_data):
        """Should sync valid mizan entries"""
        cursor = db_connection.cursor()

        tenant_id = "test-tenant"
        client_id = "test-client"
        period_id = "2024-Q4"

        for entry in sample_mizan_data:
            cursor.execute(
                """
                INSERT INTO mizan_entries (
                    tenant_id, client_id, period_id,
                    hesap_kodu, hesap_adi,
                    borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    tenant_id,
                    client_id,
                    period_id,
                    entry["hesap_kodu"],
                    entry["hesap_adi"],
                    entry["borc_toplam"],
                    entry["alacak_toplam"],
                    entry["borc_bakiye"],
                    entry["alacak_bakiye"],
                ),
            )

        db_connection.commit()

        # Verify count
        cursor.execute(
            "SELECT COUNT(*) as cnt FROM mizan_entries WHERE tenant_id = ?",
            (tenant_id,),
        )
        count = cursor.fetchone()["cnt"]

        assert count == len(sample_mizan_data)

    def test_mizan_balance_totals(self, db_connection, sample_mizan_data):
        """Should calculate correct totals"""
        cursor = db_connection.cursor()

        tenant_id = "test-tenant-totals"
        client_id = "test-client"
        period_id = "2024-Q4"

        # Insert sample data
        for entry in sample_mizan_data:
            cursor.execute(
                """
                INSERT INTO mizan_entries (
                    tenant_id, client_id, period_id,
                    hesap_kodu, hesap_adi,
                    borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    tenant_id,
                    client_id,
                    period_id,
                    entry["hesap_kodu"],
                    entry["hesap_adi"],
                    entry["borc_toplam"],
                    entry["alacak_toplam"],
                    entry["borc_bakiye"],
                    entry["alacak_bakiye"],
                ),
            )

        db_connection.commit()

        # Get totals
        cursor.execute(
            """
            SELECT
                SUM(borc_toplam) as toplam_borc,
                SUM(alacak_toplam) as toplam_alacak,
                SUM(borc_bakiye) as borc_bakiye_toplam,
                SUM(alacak_bakiye) as alacak_bakiye_toplam
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """,
            (tenant_id, client_id, period_id),
        )

        row = cursor.fetchone()

        # Calculate expected totals from sample data
        expected_borc_toplam = sum(e["borc_toplam"] for e in sample_mizan_data)
        expected_alacak_toplam = sum(e["alacak_toplam"] for e in sample_mizan_data)
        expected_borc_bakiye = sum(e["borc_bakiye"] for e in sample_mizan_data)
        expected_alacak_bakiye = sum(e["alacak_bakiye"] for e in sample_mizan_data)

        assert row["toplam_borc"] == expected_borc_toplam
        assert row["toplam_alacak"] == expected_alacak_toplam
        assert row["borc_bakiye_toplam"] == expected_borc_bakiye
        assert row["alacak_bakiye_toplam"] == expected_alacak_bakiye

    def test_hesap_391_kdv(self, db_connection, sample_mizan_data):
        """Should correctly identify 391 KDV hesabi"""
        cursor = db_connection.cursor()

        tenant_id = "test-tenant-kdv"
        client_id = "test-client"
        period_id = "2024-Q4"

        # Insert sample data
        for entry in sample_mizan_data:
            cursor.execute(
                """
                INSERT INTO mizan_entries (
                    tenant_id, client_id, period_id,
                    hesap_kodu, hesap_adi,
                    borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    tenant_id,
                    client_id,
                    period_id,
                    entry["hesap_kodu"],
                    entry["hesap_adi"],
                    entry["borc_toplam"],
                    entry["alacak_toplam"],
                    entry["borc_bakiye"],
                    entry["alacak_bakiye"],
                ),
            )

        db_connection.commit()

        # Get 391 hesap
        cursor.execute(
            """
            SELECT alacak_bakiye - borc_bakiye as kdv_bakiye
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
            AND hesap_kodu LIKE '391%'
        """,
            (tenant_id, client_id, period_id),
        )

        row = cursor.fetchone()

        assert row is not None
        assert row["kdv_bakiye"] == 18000  # From sample data

    def test_unique_constraint(self, db_connection):
        """Should enforce unique constraint on hesap_kodu per period"""
        cursor = db_connection.cursor()

        tenant_id = "test-tenant-unique"
        client_id = "test-client"
        period_id = "2024-Q4"

        # First insert should succeed
        cursor.execute(
            """
            INSERT INTO mizan_entries (
                tenant_id, client_id, period_id,
                hesap_kodu, hesap_adi,
                borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
            ) VALUES (?, ?, ?, '100', 'Kasa', 1000, 500, 500, 0)
        """,
            (tenant_id, client_id, period_id),
        )
        db_connection.commit()

        # Second insert with same hesap_kodu should fail
        with pytest.raises(Exception):
            cursor.execute(
                """
                INSERT INTO mizan_entries (
                    tenant_id, client_id, period_id,
                    hesap_kodu, hesap_adi,
                    borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
                ) VALUES (?, ?, ?, '100', 'Kasa', 2000, 1000, 1000, 0)
            """,
                (tenant_id, client_id, period_id),
            )
            db_connection.commit()

    def test_different_periods_allowed(self, db_connection):
        """Should allow same hesap_kodu in different periods"""
        cursor = db_connection.cursor()

        tenant_id = "test-tenant-periods"
        client_id = "test-client"

        # Insert for Q3
        cursor.execute(
            """
            INSERT INTO mizan_entries (
                tenant_id, client_id, period_id,
                hesap_kodu, hesap_adi,
                borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
            ) VALUES (?, ?, '2024-Q3', '100', 'Kasa', 1000, 500, 500, 0)
        """,
            (tenant_id, client_id),
        )

        # Insert for Q4
        cursor.execute(
            """
            INSERT INTO mizan_entries (
                tenant_id, client_id, period_id,
                hesap_kodu, hesap_adi,
                borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
            ) VALUES (?, ?, '2024-Q4', '100', 'Kasa', 2000, 1000, 1000, 0)
        """,
            (tenant_id, client_id),
        )

        db_connection.commit()

        # Both should exist
        cursor.execute(
            """
            SELECT COUNT(*) as cnt FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND hesap_kodu = '100'
        """,
            (tenant_id, client_id),
        )

        assert cursor.fetchone()["cnt"] == 2
