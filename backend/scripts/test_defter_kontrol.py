#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tavsiye Mektubu 2 - Defter Kontrol Test Script
==============================================

Bu script cross_check_service.py'yi doğrudan test eder.
"""

import sys
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.cross_check_service import CrossCheckService

DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"


def test_defter_kontrol():
    """Test all C1-C4 checks"""
    print("=" * 70)
    print("TAVSİYE MEKTUBU 2 - DEFTER KONTROL TESTİ")
    print("=" * 70)

    # Test parametreleri - gerçek verilerinize göre ayarlayın
    client_id = "OZKAN_KIRTASIYE"
    period_id = "2025_Q1"

    print(f"\nTest Parametreleri:")
    print(f"  Client ID: {client_id}")
    print(f"  Period ID: {period_id}")
    print(f"  DB Path: {DB_PATH}")

    if not DB_PATH.exists():
        print(f"\n❌ HATA: Database bulunamadı: {DB_PATH}")
        return

    service = CrossCheckService(DB_PATH)

    print("\n" + "-" * 70)
    print("FULL CROSS-CHECK RAPORU")
    print("-" * 70)

    try:
        report = service.run_full_cross_check(client_id, period_id)

        print(f"\n📊 GENEL DURUM: {report.overall_status}")
        print(f"   Toplam Kontrol: {report.total_checks}")
        print(f"   Başarılı: {report.passed_checks}")
        print(f"   Uyarı: {report.warning_checks}")
        print(f"   Hata: {report.error_checks}")
        print(f"   Kritik: {report.critical_checks}")

        print("\n" + "-" * 70)
        print("DENGE KONTROLLERİ (C1, C4)")
        print("-" * 70)

        for check in report.balance_checks:
            emoji = "✅" if check.passed else "❌"
            print(f"\n{emoji} {check.check_type.value}: {check.check_name}")
            print(f"   Durum: {check.severity.value}")
            print(f"   Mesaj: {check.message}")
            if 'toplam_borc' in check.details:
                print(f"   Toplam Borç: {check.details['toplam_borc']:,.2f} TL")
                print(f"   Toplam Alacak: {check.details['toplam_alacak']:,.2f} TL")
                print(f"   Fark: {check.details['fark']:,.2f} TL")

        print("\n" + "-" * 70)
        print("MUTABAKAT KONTROLLERİ (C2, C3)")
        print("-" * 70)

        for check in report.reconciliation_checks:
            emoji = "✅" if check.passed else "❌"
            print(f"\n{emoji} {check.check_type.value}: {check.check_name}")
            print(f"   Durum: {check.severity.value}")
            print(f"   Mesaj: {check.message}")
            if 'toplam_hesap' in check.details:
                print(f"   Toplam Hesap: {check.details['toplam_hesap']}")
                print(f"   Eşit Hesap: {check.details.get('esit_hesap', 'N/A')}")
                print(f"   Farklı Hesap: {check.details.get('farkli_hesap', 'N/A')}")
                print(f"   Toplam Fark: {check.details.get('toplam_fark', 0):,.2f} TL")

        # Detaylı farkları göster
        if report.yevmiye_kebir_details:
            diffs = [d for d in report.yevmiye_kebir_details if d.durum != "OK"]
            if diffs:
                print(f"\n📋 YEVMİYE-KEBİR FARKLARI (ilk 5):")
                for d in diffs[:5]:
                    print(f"   {d.hesap_kodu}: Borç fark={d.borc_fark:,.2f}, Alacak fark={d.alacak_fark:,.2f} ({d.durum})")

        if report.kebir_mizan_details:
            diffs = [d for d in report.kebir_mizan_details if d.durum != "OK"]
            if diffs:
                print(f"\n📋 KEBİR-MİZAN FARKLARI (ilk 5):")
                for d in diffs[:5]:
                    print(f"   {d.hesap_kodu}: Borç fark={d.borc_fark:,.2f}, Alacak fark={d.alacak_fark:,.2f} ({d.durum})")

        print("\n" + "=" * 70)
        print(f"TEST TAMAMLANDI - GENEL SONUÇ: {report.overall_status}")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ HATA: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_defter_kontrol()
