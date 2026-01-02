"""
KURGAN Services Test
"""

import sys
from dataclasses import asdict

from kurgan_calculator import KurganCalculator
from data_quality_service import DataQualityService

# Test data - gercekci senaryo
test_portfolio = {
    "ciro": 1000000,
    "kar_zarar": -50000,
    "toplam_vergi_beyani": 5000,
    "zarar_donem_sayisi": 3,  # Surekli zarar!
    "devreden_kdv": 200000,
    "sektor_devreden_kdv_ortalama": 100000,
    "gecmis_inceleme": False,
    "smiyb_gecmisi": False,
    "ortak_gecmisi_temiz": True,
    "client_name": "OZKAN_KIRTASIYE",
    "period": "2025-Q2",
    "smmm_name": "HKOZKAN",
    "banka_data": {
        "mevduat_tutari": 5000,  # Cok dusuk!
        "kredi_tutari": 300000,
        "dbs_kullanimi": False
    },
    "kdv_data": {
        "devreden_kdv": 200000
    },
    "inflation_data": {
        "fixed_asset_register.csv": None,  # Eksik!
        "stock_movement.csv": None,  # Eksik!
        "equity_breakdown.csv": True  # Mevcut
    }
}


def test_kurgan_calculator():
    """KURGAN Calculator testi"""
    print("=" * 80)
    print("KURGAN Calculator Test")
    print("=" * 80)

    calculator = KurganCalculator()

    # Normal senaryo
    result = calculator.calculate(
        portfolio_data=test_portfolio,
        banka_data=test_portfolio.get("banka_data")
    )

    print(f"\nRisk Skoru: {result.score}/100")
    print(f"Risk Seviyesi: {result.risk_level}")

    print(f"\nUyarilar ({len(result.warnings)}):")
    for warning in result.warnings:
        print(f"  - {warning}")

    print(f"\nYapilacaklar ({len(result.action_items)}):")
    for action in result.action_items:
        print(f"  - {action}")

    print(f"\nKriter Skorlari:")
    for k, v in result.criteria_scores.items():
        print(f"  {k}: {v}")

    # Assertions
    assert 0 <= result.score <= 100, f"Score out of range: {result.score}"
    assert result.risk_level in ["Dusuk", "Orta", "Yuksek", "KRITIK"], f"Invalid risk level: {result.risk_level}"
    assert isinstance(result.warnings, list), "Warnings should be a list"
    assert isinstance(result.action_items, list), "Action items should be a list"

    print("\n[OK] KURGAN Calculator testi basarili!")
    return result


def test_data_quality_service(kurgan_result):
    """Data Quality Service testi"""
    print("\n" + "=" * 80)
    print("Data Quality Service Test")
    print("=" * 80)

    dq_service = DataQualityService()

    report = dq_service.generate_report(
        portfolio_data=test_portfolio,
        kurgan_result=asdict(kurgan_result)
    )

    print(f"\nCompleteness Score: {report.completeness_score}%")
    print(f"Errors: {report.total_errors}")
    print(f"Warnings: {report.total_warnings}")

    print(f"\nAksiyonlar ({len(report.actions)}):")
    for action in report.actions:
        print(f"\n  [{action['severity']}] {action['title']}")
        print(f"  -> {action['action']}")
        if action.get('kurgan_impact'):
            print(f"  KURGAN Etkisi: {action['kurgan_impact']}")

    # Assertions
    assert 0 <= report.completeness_score <= 100, f"Completeness out of range: {report.completeness_score}"
    assert isinstance(report.actions, list), "Actions should be a list"
    assert report.total_errors >= 0, "Errors should be non-negative"
    assert report.total_warnings >= 0, "Warnings should be non-negative"

    print("\n[OK] Data Quality Service testi basarili!")
    return report


def test_edge_cases():
    """Edge case testleri"""
    print("\n" + "=" * 80)
    print("Edge Case Tests")
    print("=" * 80)

    calculator = KurganCalculator()
    dq_service = DataQualityService()

    # Empty portfolio
    try:
        calculator.calculate(portfolio_data={})
        print("  [OK] Empty portfolio handled")
    except Exception as e:
        print(f"  [OK] Empty portfolio raised expected error: {type(e).__name__}")

    # Minimal portfolio
    minimal = {"ciro": 100000}
    result = calculator.calculate(portfolio_data=minimal)
    assert result.score >= 0, "Minimal portfolio should produce valid score"
    print(f"  [OK] Minimal portfolio: score={result.score}")

    # High risk portfolio
    high_risk = {
        "ciro": 1000000,
        "zarar_donem_sayisi": 5,
        "devreden_kdv": 500000,
        "sektor_devreden_kdv_ortalama": 100000,
        "toplam_vergi_beyani": 1000,
        "smiyb_gecmisi": True,
        "ortak_gecmisi_temiz": False,
        "banka_data": {
            "mevduat_tutari": 100,  # Very low - triggers fiktif_odeme_riski
            "dbs_kullanimi": False
        }
    }
    result = calculator.calculate(
        portfolio_data=high_risk,
        banka_data=high_risk.get("banka_data")
    )
    # Score ~35 = KRITIK (vergiye_uyum:-20, gecmis:-15, ortak:-10, odeme:-20)
    assert result.risk_level in ["KRITIK", "Yuksek"], f"High risk portfolio should be KRITIK/Yuksek, got {result.risk_level}"
    print(f"  [OK] High risk portfolio: score={result.score}, level={result.risk_level}")

    # Low risk portfolio
    low_risk = {
        "ciro": 1000000,
        "zarar_donem_sayisi": 0,
        "devreden_kdv": 50000,
        "sektor_devreden_kdv_ortalama": 100000,
        "toplam_vergi_beyani": 50000,
        "smiyb_gecmisi": False,
        "ortak_gecmisi_temiz": True,
        "banka_data": {
            "mevduat_tutari": 100000,
            "dbs_kullanimi": True
        }
    }
    result = calculator.calculate(
        portfolio_data=low_risk,
        banka_data=low_risk.get("banka_data")
    )
    assert result.risk_level == "Dusuk", f"Low risk portfolio should be Dusuk, got {result.risk_level}"
    print(f"  [OK] Low risk portfolio: score={result.score}, level={result.risk_level}")

    print("\n[OK] Tum edge case testleri basarili!")


def main():
    """Ana test fonksiyonu"""
    print("\n" + "=" * 80)
    print("LYNTOS KURGAN Services - Test Suite")
    print("=" * 80)

    try:
        # Test 1: KURGAN Calculator
        kurgan_result = test_kurgan_calculator()

        # Test 2: Data Quality Service
        dq_report = test_data_quality_service(kurgan_result)

        # Test 3: Edge cases
        test_edge_cases()

        print("\n" + "=" * 80)
        print("TUM TESTLER BASARILI!")
        print("=" * 80)
        return 0

    except AssertionError as e:
        print(f"\n[FAIL] Assertion error: {e}")
        return 1
    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
