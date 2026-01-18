"""
LYNTOS Cross-Check Tests
Tests for cross-check validation rules
"""

import pytest


class TestCrossCheck:
    """Tests for cross-check functionality"""

    def test_mizan_denklik_pass(self, db_connection):
        """Should pass when mizan is balanced (borc = alacak)"""
        cursor = db_connection.cursor()

        tenant_id = "test-tenant-balanced"
        client_id = "test-client"
        period_id = "2024-Q4"

        # Insert balanced entries
        entries = [
            ("100", "Kasa", 0, 0, 50000, 0),
            ("320", "Saticilar", 0, 0, 0, 50000),
        ]

        for hesap_kodu, hesap_adi, borc_t, alacak_t, borc_b, alacak_b in entries:
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
                    hesap_kodu,
                    hesap_adi,
                    borc_t,
                    alacak_t,
                    borc_b,
                    alacak_b,
                ),
            )

        db_connection.commit()

        # Check balance
        cursor.execute(
            """
            SELECT
                SUM(borc_bakiye) as toplam_borc,
                SUM(alacak_bakiye) as toplam_alacak
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """,
            (tenant_id, client_id, period_id),
        )

        row = cursor.fetchone()
        difference = abs(row["toplam_borc"] - row["toplam_alacak"])

        assert difference < 0.01  # Within tolerance

    def test_mizan_denklik_fail(self, db_connection):
        """Should fail when mizan is not balanced"""
        cursor = db_connection.cursor()

        tenant_id = "test-tenant-unbalanced"
        client_id = "test-client"
        period_id = "2024-Q4"

        # Insert unbalanced entries
        entries = [
            ("100", "Kasa", 0, 0, 50000, 0),
            ("320", "Saticilar", 0, 0, 0, 30000),  # Difference: 20000
        ]

        for hesap_kodu, hesap_adi, borc_t, alacak_t, borc_b, alacak_b in entries:
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
                    hesap_kodu,
                    hesap_adi,
                    borc_t,
                    alacak_t,
                    borc_b,
                    alacak_b,
                ),
            )

        db_connection.commit()

        # Check balance
        cursor.execute(
            """
            SELECT
                SUM(borc_bakiye) as toplam_borc,
                SUM(alacak_bakiye) as toplam_alacak
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """,
            (tenant_id, client_id, period_id),
        )

        row = cursor.fetchone()
        difference = abs(row["toplam_borc"] - row["toplam_alacak"])

        assert difference > 0.01  # Should fail - not balanced

    def test_mizan_vs_kdv_match(self, db_connection, sample_mizan_data, sample_kdv_data):
        """Should match mizan 391 with KDV beyanname hesaplanan_kdv"""
        cursor = db_connection.cursor()

        tenant_id = "test-tenant-kdv-match"
        client_id = "test-client"
        period_id = "2024-Q4"

        # Insert mizan data
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

        # Insert KDV beyanname data
        cursor.execute(
            """
            INSERT INTO kdv_beyanname_data (
                tenant_id, client_id, period_id,
                matrah, hesaplanan_kdv, indirilecek_kdv, odenecek_kdv, devreden_kdv
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                tenant_id,
                client_id,
                period_id,
                sample_kdv_data["matrah"],
                sample_kdv_data["hesaplanan_kdv"],
                sample_kdv_data["indirilecek_kdv"],
                sample_kdv_data["odenecek_kdv"],
                sample_kdv_data["devreden_kdv"],
            ),
        )

        db_connection.commit()

        # Get mizan 391 value
        cursor.execute(
            """
            SELECT SUM(alacak_bakiye) - SUM(borc_bakiye) as kdv_391_bakiye
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
            AND hesap_kodu LIKE '391%'
        """,
            (tenant_id, client_id, period_id),
        )

        mizan_row = cursor.fetchone()
        mizan_kdv = mizan_row["kdv_391_bakiye"] or 0

        # Get KDV beyanname value
        cursor.execute(
            """
            SELECT hesaplanan_kdv
            FROM kdv_beyanname_data
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """,
            (tenant_id, client_id, period_id),
        )

        kdv_row = cursor.fetchone()
        beyanname_kdv = kdv_row["hesaplanan_kdv"]

        # Compare
        difference = abs(mizan_kdv - beyanname_kdv)

        # Both should be 18000 from sample data
        assert mizan_kdv == 18000
        assert beyanname_kdv == 18000
        assert difference < 0.01

    def test_mizan_vs_banka(self, db_connection, sample_banka_data):
        """Should compare mizan 102 with bank totals"""
        cursor = db_connection.cursor()

        tenant_id = "test-tenant-banka"
        client_id = "test-client"
        period_id = "2024-Q4"

        # Calculate expected bank total
        expected_banka_total = sum(b["donem_sonu_bakiye"] for b in sample_banka_data)

        # Insert mizan entry for 102 with matching value
        cursor.execute(
            """
            INSERT INTO mizan_entries (
                tenant_id, client_id, period_id,
                hesap_kodu, hesap_adi,
                borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
            ) VALUES (?, ?, ?, '102', 'Bankalar', ?, 0, ?, 0)
        """,
            (tenant_id, client_id, period_id, expected_banka_total, expected_banka_total),
        )

        # Insert bank data
        for banka in sample_banka_data:
            cursor.execute(
                """
                INSERT INTO banka_bakiye_data (
                    tenant_id, client_id, period_id,
                    banka_adi, hesap_no, donem_basi_bakiye, donem_sonu_bakiye
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    tenant_id,
                    client_id,
                    period_id,
                    banka["banka_adi"],
                    banka["hesap_no"],
                    banka["donem_basi_bakiye"],
                    banka["donem_sonu_bakiye"],
                ),
            )

        db_connection.commit()

        # Get mizan 102 value
        cursor.execute(
            """
            SELECT SUM(borc_bakiye) - SUM(alacak_bakiye) as banka_bakiye
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
            AND hesap_kodu LIKE '102%'
        """,
            (tenant_id, client_id, period_id),
        )

        mizan_banka = cursor.fetchone()["banka_bakiye"] or 0

        # Get bank totals
        cursor.execute(
            """
            SELECT SUM(donem_sonu_bakiye) as toplam_banka
            FROM banka_bakiye_data
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """,
            (tenant_id, client_id, period_id),
        )

        bank_total = cursor.fetchone()["toplam_banka"] or 0

        # They should match
        difference = abs(mizan_banka - bank_total)
        assert difference < 0.01

    def test_no_data_returns_no_data_status(self, db_connection):
        """Should return no_data status when no mizan exists"""
        cursor = db_connection.cursor()

        # Query non-existent data
        cursor.execute(
            """
            SELECT COUNT(*) as cnt FROM mizan_entries
            WHERE tenant_id = 'nonexistent' AND client_id = 'nonexistent'
        """
        )

        count = cursor.fetchone()["cnt"]
        assert count == 0


class TestCrossCheckTolerance:
    """Tests for tolerance-based comparisons"""

    def test_small_difference_within_tolerance(self, db_connection):
        """Should pass for small differences within tolerance"""
        cursor = db_connection.cursor()

        tenant_id = "test-tolerance"
        client_id = "test-client"
        period_id = "2024-Q4"

        # Insert slightly unbalanced entries (within 0.01 tolerance)
        cursor.execute(
            """
            INSERT INTO mizan_entries (
                tenant_id, client_id, period_id,
                hesap_kodu, hesap_adi,
                borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
            ) VALUES
            (?, ?, ?, '100', 'Kasa', 0, 0, 50000.005, 0),
            (?, ?, ?, '320', 'Saticilar', 0, 0, 0, 50000.000)
        """,
            (tenant_id, client_id, period_id, tenant_id, client_id, period_id),
        )

        db_connection.commit()

        cursor.execute(
            """
            SELECT
                SUM(borc_bakiye) as toplam_borc,
                SUM(alacak_bakiye) as toplam_alacak
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """,
            (tenant_id, client_id, period_id),
        )

        row = cursor.fetchone()
        difference = abs(row["toplam_borc"] - row["toplam_alacak"])

        # Should be within tolerance
        assert difference < 0.01

    def test_percentage_tolerance(self, db_connection):
        """Should pass for differences within percentage tolerance"""
        cursor = db_connection.cursor()

        tenant_id = "test-percent-tolerance"
        client_id = "test-client"
        period_id = "2024-Q4"

        # Insert entries where difference is within 1%
        # 100000 borc vs 99500 alacak = 0.5% difference
        cursor.execute(
            """
            INSERT INTO mizan_entries (
                tenant_id, client_id, period_id,
                hesap_kodu, hesap_adi,
                borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
            ) VALUES
            (?, ?, ?, '100', 'Kasa', 0, 0, 100000, 0),
            (?, ?, ?, '320', 'Saticilar', 0, 0, 0, 99500)
        """,
            (tenant_id, client_id, period_id, tenant_id, client_id, period_id),
        )

        db_connection.commit()

        cursor.execute(
            """
            SELECT
                SUM(borc_bakiye) as toplam_borc,
                SUM(alacak_bakiye) as toplam_alacak
            FROM mizan_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        """,
            (tenant_id, client_id, period_id),
        )

        row = cursor.fetchone()
        total = max(row["toplam_borc"], row["toplam_alacak"])
        difference = abs(row["toplam_borc"] - row["toplam_alacak"])
        percent_diff = (difference / total) * 100 if total > 0 else 0

        # Should be within 1% tolerance
        assert percent_diff < 1.0
