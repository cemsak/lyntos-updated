# -*- coding: utf-8 -*-
"""
LYNTOS Cross-Check Service - Tavsiye Mektubu 2 Implementasyonu
==============================================================

Yevmiye-Kebir-Mizan Kontrol Algoritması

4 Temel Kontrol (C1-C4):
- C1: Yevmiye toplam borç = toplam alacak (Fiş Dengesi)
- C2: Yevmiye hesap toplamları = Kebir hesap toplamları (Yevmiye↔Kebir Mutabakatı)
- C3: Kebir hesap toplamları = Mizan hesap toplamları (Kebir↔Mizan Mutabakatı)
- C4: Mizan toplam borç = toplam alacak (Mizan Dengesi)

Prensip: "Elma ile elmayı karşılaştır"
- Yevmiye ↔ Kebir: Hesap bazında borç/alacak TOPLAMI
- Kebir ↔ Mizan: Hesap bazında borç/alacak TOPLAMI (net bakiye değil!)

Author: Claude
Date: 2026-01-25
Version: 2.0 (Tavsiye Mektubu 2)
"""

import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS & DATA CLASSES
# =============================================================================

class CheckSeverity(Enum):
    """Kontrol sonucu önem derecesi"""
    OK = "OK"                    # Başarılı
    WARNING = "WARNING"          # Uyarı (küçük fark, tolerans içinde)
    ERROR = "ERROR"              # Hata (ciddi uyumsuzluk)
    CRITICAL = "CRITICAL"        # Kritik (temel muhasebe kuralı ihlali)


class CheckType(Enum):
    """Kontrol tipi"""
    C1_YEVMIYE_DENGE = "C1"      # Yevmiye iç denge
    C2_YEVMIYE_KEBIR = "C2"      # Yevmiye ↔ Kebir mutabakat
    C3_KEBIR_MIZAN = "C3"        # Kebir ↔ Mizan mutabakat
    C4_MIZAN_DENGE = "C4"        # Mizan iç denge


@dataclass
class CheckResult:
    """Tek bir kontrol sonucu"""
    check_type: CheckType
    check_name: str
    severity: CheckSeverity
    passed: bool
    message: str
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "check_type": self.check_type.value,
            "check_name": self.check_name,
            "severity": self.severity.value,
            "passed": self.passed,
            "message": self.message,
            "details": self.details
        }


@dataclass
class AccountComparison:
    """Hesap bazında karşılaştırma sonucu"""
    hesap_kodu: str
    hesap_adi: Optional[str]
    source_borc: float
    source_alacak: float
    target_borc: float
    target_alacak: float
    borc_fark: float
    alacak_fark: float
    durum: str  # OK, FARK_VAR, SADECE_KAYNAK, SADECE_HEDEF

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hesap_kodu": self.hesap_kodu,
            "hesap_adi": self.hesap_adi,
            "source_borc": round(self.source_borc, 2),
            "source_alacak": round(self.source_alacak, 2),
            "target_borc": round(self.target_borc, 2),
            "target_alacak": round(self.target_alacak, 2),
            "borc_fark": round(self.borc_fark, 2),
            "alacak_fark": round(self.alacak_fark, 2),
            "durum": self.durum
        }


@dataclass
class CrossCheckReport:
    """Tüm cross-check raporu"""
    client_id: str
    period_id: str
    generated_at: str

    # Denge kontrolleri (C1, C4)
    balance_checks: List[CheckResult] = field(default_factory=list)

    # Mutabakat kontrolleri (C2, C3)
    reconciliation_checks: List[CheckResult] = field(default_factory=list)

    # Hesap detayları
    yevmiye_kebir_details: List[AccountComparison] = field(default_factory=list)
    kebir_mizan_details: List[AccountComparison] = field(default_factory=list)

    # Özet
    total_checks: int = 0
    passed_checks: int = 0
    warning_checks: int = 0
    error_checks: int = 0
    critical_checks: int = 0

    overall_status: str = "UNKNOWN"  # PASS, WARNING, FAIL, CRITICAL

    def to_dict(self) -> Dict[str, Any]:
        return {
            "client_id": self.client_id,
            "period_id": self.period_id,
            "generated_at": self.generated_at,
            "balance_checks": [c.to_dict() for c in self.balance_checks],
            "reconciliation_checks": [c.to_dict() for c in self.reconciliation_checks],
            "yevmiye_kebir_details": [d.to_dict() for d in self.yevmiye_kebir_details],
            "kebir_mizan_details": [d.to_dict() for d in self.kebir_mizan_details],
            "summary": {
                "total_checks": self.total_checks,
                "passed_checks": self.passed_checks,
                "warning_checks": self.warning_checks,
                "error_checks": self.error_checks,
                "critical_checks": self.critical_checks,
                "overall_status": self.overall_status
            }
        }


# =============================================================================
# CROSS-CHECK SERVICE
# =============================================================================

class CrossCheckService:
    """
    Yevmiye-Kebir-Mizan Cross-Check Servisi

    Tavsiye Mektubu 2 implementasyonu:
    - 4 temel kontrol (C1-C4)
    - Tolerans bazlı karşılaştırma
    - Detaylı hata raporlama
    """

    # Tolerans değerleri (kuruş cinsinden)
    TOLERANCE_EXACT = 0.01      # Tam eşitlik
    TOLERANCE_MINOR = 1.00      # Küçük fark (yuvarlama)
    TOLERANCE_WARNING = 100.00  # Uyarı seviyesi

    def __init__(self, db_path: Path):
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        """Database bağlantısı al"""
        conn = sqlite3.connect(str(self.db_path), timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    # =========================================================================
    # C1: YEVMİYE DENGE KONTROLÜ
    # =========================================================================

    def check_c1_yevmiye_balance(
        self,
        conn: sqlite3.Connection,
        client_id: str,
        period_id: str
    ) -> Tuple[CheckResult, Dict[str, Any]]:
        """
        C1: Yevmiye Defter Dengesi

        Her yevmiye fişinde ve toplamda: Borç = Alacak

        Muhasebe Kuralı: Çift taraflı kayıt sistemi gereği,
        her işlemin borç ve alacak tarafı eşit olmalıdır.
        """
        cursor = conn.cursor()

        # Toplam borç/alacak
        cursor.execute("""
            SELECT
                COALESCE(SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END), 0) as toplam_borc,
                COALESCE(SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END), 0) as toplam_alacak,
                COUNT(DISTINCT fis_no) as fis_sayisi,
                COUNT(*) as satir_sayisi
            FROM edefter_entries
            WHERE client_id = ? AND period_id = ? AND defter_tipi = 'Y'
        """, (client_id, period_id))

        row = cursor.fetchone()
        toplam_borc = row['toplam_borc'] or 0
        toplam_alacak = row['toplam_alacak'] or 0
        fis_sayisi = row['fis_sayisi'] or 0
        satir_sayisi = row['satir_sayisi'] or 0

        fark = abs(toplam_borc - toplam_alacak)

        # Dengesiz fişleri bul
        cursor.execute("""
            SELECT
                fis_no,
                SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END) as fis_borc,
                SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END) as fis_alacak
            FROM edefter_entries
            WHERE client_id = ? AND period_id = ? AND defter_tipi = 'Y'
            GROUP BY fis_no
            HAVING ABS(fis_borc - fis_alacak) > ?
        """, (client_id, period_id, self.TOLERANCE_EXACT))

        dengesiz_fisler = [
            {
                "fis_no": r['fis_no'],
                "borc": round(r['fis_borc'], 2),
                "alacak": round(r['fis_alacak'], 2),
                "fark": round(abs(r['fis_borc'] - r['fis_alacak']), 2)
            }
            for r in cursor.fetchall()
        ]

        # Sonuç değerlendirme
        details = {
            "toplam_borc": round(toplam_borc, 2),
            "toplam_alacak": round(toplam_alacak, 2),
            "fark": round(fark, 2),
            "fis_sayisi": fis_sayisi,
            "satir_sayisi": satir_sayisi,
            "dengesiz_fis_sayisi": len(dengesiz_fisler),
            "dengesiz_fisler": dengesiz_fisler[:10]  # İlk 10 dengesiz fiş
        }

        if fark < self.TOLERANCE_EXACT:
            severity = CheckSeverity.OK
            passed = True
            message = f"Yevmiye dengeli: {fis_sayisi} fiş, {satir_sayisi} satır"
        elif fark < self.TOLERANCE_WARNING:
            severity = CheckSeverity.WARNING
            passed = True
            message = f"Yevmiye küçük fark var: {round(fark, 2)} TL ({len(dengesiz_fisler)} dengesiz fiş)"
        else:
            severity = CheckSeverity.CRITICAL
            passed = False
            message = f"Yevmiye DENGESİZ: {round(fark, 2)} TL fark ({len(dengesiz_fisler)} dengesiz fiş)"

        return CheckResult(
            check_type=CheckType.C1_YEVMIYE_DENGE,
            check_name="Yevmiye Defter Dengesi",
            severity=severity,
            passed=passed,
            message=message,
            details=details
        ), details

    # =========================================================================
    # C2: YEVMİYE ↔ KEBİR MUTABAKAT
    # =========================================================================

    def check_c2_yevmiye_kebir(
        self,
        conn: sqlite3.Connection,
        client_id: str,
        period_id: str
    ) -> Tuple[CheckResult, List[AccountComparison]]:
        """
        C2: Yevmiye ↔ Kebir Mutabakatı

        Karşılaştırma: Hesap bazında BORÇ TOPLAMI ve ALACAK TOPLAMI

        Muhasebe Kuralı: Yevmiye'deki her hesabın toplam borç/alacak tutarı,
        Kebir'deki aynı hesabın toplam borç/alacak tutarına eşit olmalıdır.

        NOT: NET BAKİYE DEĞİL! Borç ve alacak ayrı ayrı karşılaştırılır.
        """
        cursor = conn.cursor()

        # Yevmiye'den hesap bazlı toplamlar
        cursor.execute("""
            SELECT
                COALESCE(alt_hesap_kodu, hesap_kodu) as hesap_kodu,
                MAX(COALESCE(alt_hesap_adi, hesap_adi)) as hesap_adi,
                COALESCE(SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END), 0) as borc,
                COALESCE(SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END), 0) as alacak
            FROM edefter_entries
            WHERE client_id = ? AND period_id = ? AND defter_tipi = 'Y'
            GROUP BY COALESCE(alt_hesap_kodu, hesap_kodu)
        """, (client_id, period_id))

        yevmiye_hesaplar = {}
        for row in cursor.fetchall():
            yevmiye_hesaplar[row['hesap_kodu']] = {
                'hesap_adi': row['hesap_adi'],
                'borc': row['borc'] or 0,
                'alacak': row['alacak'] or 0
            }

        # Kebir'den hesap bazlı toplamlar
        cursor.execute("""
            SELECT
                COALESCE(alt_hesap_kodu, hesap_kodu) as hesap_kodu,
                MAX(COALESCE(alt_hesap_adi, hesap_adi)) as hesap_adi,
                COALESCE(SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END), 0) as borc,
                COALESCE(SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END), 0) as alacak
            FROM edefter_entries
            WHERE client_id = ? AND period_id = ? AND defter_tipi = 'K'
            GROUP BY COALESCE(alt_hesap_kodu, hesap_kodu)
        """, (client_id, period_id))

        kebir_hesaplar = {}
        for row in cursor.fetchall():
            kebir_hesaplar[row['hesap_kodu']] = {
                'hesap_adi': row['hesap_adi'],
                'borc': row['borc'] or 0,
                'alacak': row['alacak'] or 0
            }

        # Karşılaştırma
        tum_hesaplar = set(yevmiye_hesaplar.keys()) | set(kebir_hesaplar.keys())
        comparisons = []

        farkli_count = 0
        sadece_yevmiye = 0
        sadece_kebir = 0
        toplam_borc_fark = 0
        toplam_alacak_fark = 0

        for hesap_kodu in sorted(tum_hesaplar):
            yev = yevmiye_hesaplar.get(hesap_kodu)
            keb = kebir_hesaplar.get(hesap_kodu)

            if yev and keb:
                borc_fark = yev['borc'] - keb['borc']
                alacak_fark = yev['alacak'] - keb['alacak']

                if abs(borc_fark) < self.TOLERANCE_EXACT and abs(alacak_fark) < self.TOLERANCE_EXACT:
                    durum = "OK"
                else:
                    durum = "FARK_VAR"
                    farkli_count += 1
                    toplam_borc_fark += abs(borc_fark)
                    toplam_alacak_fark += abs(alacak_fark)

                comparisons.append(AccountComparison(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=yev['hesap_adi'] or keb['hesap_adi'],
                    source_borc=yev['borc'],
                    source_alacak=yev['alacak'],
                    target_borc=keb['borc'],
                    target_alacak=keb['alacak'],
                    borc_fark=borc_fark,
                    alacak_fark=alacak_fark,
                    durum=durum
                ))

            elif yev and not keb:
                sadece_yevmiye += 1
                toplam_borc_fark += yev['borc']
                toplam_alacak_fark += yev['alacak']
                comparisons.append(AccountComparison(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=yev['hesap_adi'],
                    source_borc=yev['borc'],
                    source_alacak=yev['alacak'],
                    target_borc=0,
                    target_alacak=0,
                    borc_fark=yev['borc'],
                    alacak_fark=yev['alacak'],
                    durum="SADECE_YEVMIYE"
                ))

            else:  # keb and not yev
                sadece_kebir += 1
                toplam_borc_fark += keb['borc']
                toplam_alacak_fark += keb['alacak']
                comparisons.append(AccountComparison(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=keb['hesap_adi'],
                    source_borc=0,
                    source_alacak=0,
                    target_borc=keb['borc'],
                    target_alacak=keb['alacak'],
                    borc_fark=-keb['borc'],
                    alacak_fark=-keb['alacak'],
                    durum="SADECE_KEBIR"
                ))

        # Sonuç değerlendirme
        toplam_fark = toplam_borc_fark + toplam_alacak_fark
        esit_count = len(tum_hesaplar) - farkli_count - sadece_yevmiye - sadece_kebir

        details = {
            "toplam_hesap": len(tum_hesaplar),
            "esit_hesap": esit_count,
            "farkli_hesap": farkli_count,
            "sadece_yevmiye": sadece_yevmiye,
            "sadece_kebir": sadece_kebir,
            "toplam_borc_fark": round(toplam_borc_fark, 2),
            "toplam_alacak_fark": round(toplam_alacak_fark, 2),
            "toplam_fark": round(toplam_fark, 2)
        }

        if toplam_fark < self.TOLERANCE_EXACT:
            severity = CheckSeverity.OK
            passed = True
            message = f"Yevmiye-Kebir mutabık: {esit_count}/{len(tum_hesaplar)} hesap"
        elif toplam_fark < self.TOLERANCE_WARNING:
            severity = CheckSeverity.WARNING
            passed = True
            message = f"Yevmiye-Kebir küçük fark: {round(toplam_fark, 2)} TL ({farkli_count} hesapta)"
        else:
            severity = CheckSeverity.ERROR
            passed = False
            message = f"Yevmiye-Kebir UYUMSUZ: {round(toplam_fark, 2)} TL fark ({farkli_count + sadece_yevmiye + sadece_kebir} hesapta)"

        result = CheckResult(
            check_type=CheckType.C2_YEVMIYE_KEBIR,
            check_name="Yevmiye-Kebir Mutabakatı",
            severity=severity,
            passed=passed,
            message=message,
            details=details
        )

        return result, comparisons

    # =========================================================================
    # C3: KEBİR ↔ MİZAN MUTABAKAT
    # =========================================================================

    def check_c3_kebir_mizan(
        self,
        conn: sqlite3.Connection,
        client_id: str,
        period_id: str
    ) -> Tuple[CheckResult, List[AccountComparison]]:
        """
        C3: Kebir ↔ Mizan Mutabakatı

        Karşılaştırma: Hesap bazında BORÇ TOPLAMI ve ALACAK TOPLAMI

        Muhasebe Kuralı: Kebir'deki her hesabın toplam borç/alacak tutarı,
        Mizan'daki aynı hesabın borç/alacak toplamına eşit olmalıdır.

        DİKKAT:
        1. borc_toplam/alacak_toplam kullanılmalı (bakiye DEĞİL!)
        2. Mizan'da çok seviyeli hesaplar var - sadece YAPRAK HESAPLAR karşılaştırılmalı
        3. Dönem uyuşmazlığı kontrolü yapılmalı
        """
        cursor = conn.cursor()

        # === DÖNEM UYUŞMAZLIĞI KONTROLÜ ===
        # Kebir'in kapsadığı ayları bul
        cursor.execute("""
            SELECT DISTINCT substr(tarih, 1, 7) as ay
            FROM edefter_entries
            WHERE client_id = ? AND period_id = ? AND defter_tipi = 'K'
            ORDER BY ay
        """, (client_id, period_id))
        kebir_aylar = [r['ay'] for r in cursor.fetchall()]

        # Kebir aylık toplamları
        cursor.execute("""
            SELECT
                substr(tarih, 1, 7) as ay,
                SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END) as borc
            FROM edefter_entries
            WHERE client_id = ? AND period_id = ? AND defter_tipi = 'K'
            GROUP BY substr(tarih, 1, 7)
            ORDER BY ay
        """, (client_id, period_id))
        kebir_aylik = {r['ay']: r['borc'] for r in cursor.fetchall()}

        # Kebir'den hesap bazlı toplamlar
        cursor.execute("""
            SELECT
                COALESCE(alt_hesap_kodu, hesap_kodu) as hesap_kodu,
                MAX(COALESCE(alt_hesap_adi, hesap_adi)) as hesap_adi,
                COALESCE(SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END), 0) as borc,
                COALESCE(SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END), 0) as alacak
            FROM edefter_entries
            WHERE client_id = ? AND period_id = ? AND defter_tipi = 'K'
            GROUP BY COALESCE(alt_hesap_kodu, hesap_kodu)
        """, (client_id, period_id))

        kebir_hesaplar = {}
        for row in cursor.fetchall():
            kebir_hesaplar[row['hesap_kodu']] = {
                'hesap_adi': row['hesap_adi'],
                'borc': row['borc'] or 0,
                'alacak': row['alacak'] or 0
            }

        # Mizan'dan hesap bazlı TOPLAMLAR (SADECE YAPRAK HESAPLAR)
        # DİKKAT: borc_toplam/alacak_toplam kullanılmalı, bakiye DEĞİL!
        # Bakiye = dönem sonu net, Toplam = dönem içi tüm hareketler
        cursor.execute("""
            SELECT
                m.hesap_kodu,
                m.hesap_adi,
                COALESCE(m.borc_toplam, 0) as borc,
                COALESCE(m.alacak_toplam, 0) as alacak
            FROM mizan_entries m
            WHERE m.client_id = ? AND m.period_id = ?
            AND m.hesap_kodu != 'GENEL TOPLAM'
            AND m.hesap_kodu NOT LIKE '%::%'
            AND NOT EXISTS (
                -- Sadece yaprak hesaplar: alt hesabı olmayanlar
                SELECT 1 FROM mizan_entries sub
                WHERE sub.client_id = m.client_id
                AND sub.period_id = m.period_id
                AND sub.hesap_kodu LIKE m.hesap_kodu || '.%'
            )
        """, (client_id, period_id))

        mizan_hesaplar = {}
        for row in cursor.fetchall():
            mizan_hesaplar[row['hesap_kodu']] = {
                'hesap_adi': row['hesap_adi'],
                'borc': row['borc'] or 0,
                'alacak': row['alacak'] or 0
            }

        # Karşılaştırma
        tum_hesaplar = set(kebir_hesaplar.keys()) | set(mizan_hesaplar.keys())
        comparisons = []

        farkli_count = 0
        sadece_kebir = 0
        sadece_mizan = 0
        toplam_borc_fark = 0
        toplam_alacak_fark = 0

        for hesap_kodu in sorted(tum_hesaplar):
            keb = kebir_hesaplar.get(hesap_kodu)
            miz = mizan_hesaplar.get(hesap_kodu)

            if keb and miz:
                borc_fark = keb['borc'] - miz['borc']
                alacak_fark = keb['alacak'] - miz['alacak']

                if abs(borc_fark) < self.TOLERANCE_EXACT and abs(alacak_fark) < self.TOLERANCE_EXACT:
                    durum = "OK"
                else:
                    durum = "FARK_VAR"
                    farkli_count += 1
                    toplam_borc_fark += abs(borc_fark)
                    toplam_alacak_fark += abs(alacak_fark)

                comparisons.append(AccountComparison(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=keb['hesap_adi'] or miz['hesap_adi'],
                    source_borc=keb['borc'],
                    source_alacak=keb['alacak'],
                    target_borc=miz['borc'],
                    target_alacak=miz['alacak'],
                    borc_fark=borc_fark,
                    alacak_fark=alacak_fark,
                    durum=durum
                ))

            elif keb and not miz:
                sadece_kebir += 1
                toplam_borc_fark += keb['borc']
                toplam_alacak_fark += keb['alacak']
                comparisons.append(AccountComparison(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=keb['hesap_adi'],
                    source_borc=keb['borc'],
                    source_alacak=keb['alacak'],
                    target_borc=0,
                    target_alacak=0,
                    borc_fark=keb['borc'],
                    alacak_fark=keb['alacak'],
                    durum="SADECE_KEBIR"
                ))

            else:  # miz and not keb
                sadece_mizan += 1
                toplam_borc_fark += miz['borc']
                toplam_alacak_fark += miz['alacak']
                comparisons.append(AccountComparison(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=miz['hesap_adi'],
                    source_borc=0,
                    source_alacak=0,
                    target_borc=miz['borc'],
                    target_alacak=miz['alacak'],
                    borc_fark=-miz['borc'],
                    alacak_fark=-miz['alacak'],
                    durum="SADECE_MIZAN"
                ))

        # Sonuç değerlendirme
        toplam_fark = toplam_borc_fark + toplam_alacak_fark
        esit_count = len(tum_hesaplar) - farkli_count - sadece_kebir - sadece_mizan

        # Kebir ve Mizan genel toplamları (dönem karşılaştırması için)
        kebir_toplam_borc = sum(h['borc'] for h in kebir_hesaplar.values())
        kebir_toplam_alacak = sum(h['alacak'] for h in kebir_hesaplar.values())
        mizan_toplam_borc = sum(h['borc'] for h in mizan_hesaplar.values())
        mizan_toplam_alacak = sum(h['alacak'] for h in mizan_hesaplar.values())

        # Dönem uyuşmazlığı analizi
        genel_borc_fark = kebir_toplam_borc - mizan_toplam_borc
        donem_uyumsuzluk = None

        # Eğer genel fark büyükse ve Kebir aylık verileriyle eşleşiyorsa
        # muhtemelen Mizan farklı bir dönem içeriyor
        if abs(genel_borc_fark) > 1000:  # 1000 TL üzeri fark varsa kontrol et
            for ay, aylik_borc in kebir_aylik.items():
                # Fark bir aya yakınsa, o ay Mizan'da eksik olabilir
                if abs(abs(genel_borc_fark) - aylik_borc) / max(aylik_borc, 1) < 0.05:
                    donem_uyumsuzluk = {
                        "tur": "EKSIK_AY",
                        "muhtemel_eksik_ay": ay,
                        "ay_tutari": round(aylik_borc, 2),
                        "fark": round(genel_borc_fark, 2),
                        "aciklama": f"Mizan'da {ay} ayı eksik olabilir (fark: {genel_borc_fark:,.2f} TL ≈ {ay} borç toplamı: {aylik_borc:,.2f} TL)"
                    }
                    break

        details = {
            "toplam_hesap": len(tum_hesaplar),
            "esit_hesap": esit_count,
            "farkli_hesap": farkli_count,
            "sadece_kebir": sadece_kebir,
            "sadece_mizan": sadece_mizan,
            "toplam_borc_fark": round(toplam_borc_fark, 2),
            "toplam_alacak_fark": round(toplam_alacak_fark, 2),
            "toplam_fark": round(toplam_fark, 2),
            # Yeni: Genel toplamlar ve dönem bilgisi
            "kebir_toplam_borc": round(kebir_toplam_borc, 2),
            "kebir_toplam_alacak": round(kebir_toplam_alacak, 2),
            "mizan_toplam_borc": round(mizan_toplam_borc, 2),
            "mizan_toplam_alacak": round(mizan_toplam_alacak, 2),
            "kebir_aylar": kebir_aylar,
            "kebir_aylik_borc": {k: round(v, 2) for k, v in kebir_aylik.items()},
            "donem_uyumsuzluk": donem_uyumsuzluk
        }

        # Mesaj oluştur
        if toplam_fark < self.TOLERANCE_EXACT:
            severity = CheckSeverity.OK
            passed = True
            message = f"Kebir-Mizan mutabık: {esit_count}/{len(tum_hesaplar)} hesap"
        elif toplam_fark < self.TOLERANCE_WARNING:
            severity = CheckSeverity.WARNING
            passed = True
            message = f"Kebir-Mizan küçük fark: {round(toplam_fark, 2)} TL ({farkli_count} hesapta)"
        elif donem_uyumsuzluk:
            # Dönem uyuşmazlığı tespit edildi
            severity = CheckSeverity.WARNING
            passed = False
            message = f"Kebir-Mizan DÖNEM UYUŞMAZLIĞI: {donem_uyumsuzluk['aciklama']}"
        else:
            severity = CheckSeverity.ERROR
            passed = False
            message = f"Kebir-Mizan UYUMSUZ: {round(toplam_fark, 2)} TL fark ({farkli_count + sadece_kebir + sadece_mizan} hesapta)"

        result = CheckResult(
            check_type=CheckType.C3_KEBIR_MIZAN,
            check_name="Kebir-Mizan Mutabakatı",
            severity=severity,
            passed=passed,
            message=message,
            details=details
        )

        return result, comparisons

    # =========================================================================
    # C4: MİZAN DENGE KONTROLÜ
    # =========================================================================

    def check_c4_mizan_balance(
        self,
        conn: sqlite3.Connection,
        client_id: str,
        period_id: str
    ) -> Tuple[CheckResult, Dict[str, Any]]:
        """
        C4: Mizan Defter Dengesi

        Toplam Borç Bakiyesi = Toplam Alacak Bakiyesi

        Muhasebe Kuralı: Mizan, tüm hesapların dönem sonu bakiyelerini içerir.
        Çift taraflı kayıt sistemi gereği toplam borç ve alacak eşit olmalıdır.

        DİKKAT: Sadece YAPRAK HESAPLAR sayılmalı (çift sayımı önlemek için).
        """
        cursor = conn.cursor()

        # Sadece yaprak hesapların toplamı
        cursor.execute("""
            SELECT
                COALESCE(SUM(borc_bakiye), 0) as toplam_borc,
                COALESCE(SUM(alacak_bakiye), 0) as toplam_alacak,
                COUNT(*) as hesap_sayisi
            FROM mizan_entries m
            WHERE m.client_id = ? AND m.period_id = ?
            AND m.hesap_kodu != 'GENEL TOPLAM'
            AND m.hesap_kodu NOT LIKE '%::%'
            AND NOT EXISTS (
                -- Sadece yaprak hesaplar
                SELECT 1 FROM mizan_entries sub
                WHERE sub.client_id = m.client_id
                AND sub.period_id = m.period_id
                AND sub.hesap_kodu LIKE m.hesap_kodu || '.%'
            )
        """, (client_id, period_id))

        row = cursor.fetchone()
        toplam_borc = row['toplam_borc'] or 0
        toplam_alacak = row['toplam_alacak'] or 0
        hesap_sayisi = row['hesap_sayisi'] or 0

        fark = abs(toplam_borc - toplam_alacak)

        details = {
            "toplam_borc": round(toplam_borc, 2),
            "toplam_alacak": round(toplam_alacak, 2),
            "fark": round(fark, 2),
            "hesap_sayisi": hesap_sayisi
        }

        if fark < self.TOLERANCE_EXACT:
            severity = CheckSeverity.OK
            passed = True
            message = f"Mizan dengeli: {hesap_sayisi} hesap"
        elif fark < self.TOLERANCE_WARNING:
            severity = CheckSeverity.WARNING
            passed = True
            message = f"Mizan küçük fark var: {round(fark, 2)} TL"
        else:
            severity = CheckSeverity.CRITICAL
            passed = False
            message = f"Mizan DENGESİZ: {round(fark, 2)} TL fark"

        return CheckResult(
            check_type=CheckType.C4_MIZAN_DENGE,
            check_name="Mizan Defter Dengesi",
            severity=severity,
            passed=passed,
            message=message,
            details=details
        ), details

    # =========================================================================
    # FULL CROSS-CHECK
    # =========================================================================

    def run_full_cross_check(
        self,
        client_id: str,
        period_id: str
    ) -> CrossCheckReport:
        """
        Tüm cross-check kontrollerini çalıştır

        Sıralama:
        1. C1: Yevmiye Denge (self-check)
        2. C2: Yevmiye ↔ Kebir (cross-check)
        3. C3: Kebir ↔ Mizan (cross-check)
        4. C4: Mizan Denge (self-check)

        Returns:
            CrossCheckReport: Tüm kontrol sonuçları ve detaylar
        """
        # Dönem formatını normalize et: 2025-Q1 → 2025_Q1 (DB formatı)
        period_id = period_id.replace('-', '_').upper()
        logger.info(f"Cross-check başlatılıyor: {client_id}/{period_id}")

        report = CrossCheckReport(
            client_id=client_id,
            period_id=period_id,
            generated_at=datetime.utcnow().isoformat()
        )

        # Veri var mı kontrol et — yoksa NO_DATA döndür
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as cnt FROM mizan_entries WHERE client_id = ? AND period_id = ?", (client_id, period_id))
            mizan_cnt = cursor.fetchone()['cnt']
            cursor.execute("SELECT COUNT(*) as cnt FROM journal_entries WHERE client_id = ? AND period_id = ?", (client_id, period_id))
            yevmiye_cnt = cursor.fetchone()['cnt']
            cursor.execute("SELECT COUNT(*) as cnt FROM ledger_entries WHERE client_id = ? AND period_id = ?", (client_id, period_id))
            kebir_cnt = cursor.fetchone()['cnt']
            conn.close()

            if mizan_cnt == 0 and yevmiye_cnt == 0 and kebir_cnt == 0:
                logger.info(f"[CrossCheck] Veri bulunamadı: {client_id}/{period_id} — NO_DATA döndürülüyor")
                report.overall_status = "NO_DATA"
                return report
        except Exception as e:
            logger.warning(f"[CrossCheck] Veri kontrol hatası: {e}")

        try:
            conn = self._get_connection()

            # C1: Yevmiye Denge
            c1_result, c1_details = self.check_c1_yevmiye_balance(conn, client_id, period_id)
            report.balance_checks.append(c1_result)

            # C2: Yevmiye ↔ Kebir
            c2_result, c2_comparisons = self.check_c2_yevmiye_kebir(conn, client_id, period_id)
            report.reconciliation_checks.append(c2_result)
            report.yevmiye_kebir_details = c2_comparisons

            # C3: Kebir ↔ Mizan
            c3_result, c3_comparisons = self.check_c3_kebir_mizan(conn, client_id, period_id)
            report.reconciliation_checks.append(c3_result)
            report.kebir_mizan_details = c3_comparisons

            # C4: Mizan Denge
            c4_result, c4_details = self.check_c4_mizan_balance(conn, client_id, period_id)
            report.balance_checks.append(c4_result)

            conn.close()

            # Özet hesapla
            all_checks = report.balance_checks + report.reconciliation_checks
            report.total_checks = len(all_checks)
            report.passed_checks = sum(1 for c in all_checks if c.passed)
            report.warning_checks = sum(1 for c in all_checks if c.severity == CheckSeverity.WARNING)
            report.error_checks = sum(1 for c in all_checks if c.severity == CheckSeverity.ERROR)
            report.critical_checks = sum(1 for c in all_checks if c.severity == CheckSeverity.CRITICAL)

            # Overall status
            if report.critical_checks > 0:
                report.overall_status = "CRITICAL"
            elif report.error_checks > 0:
                report.overall_status = "FAIL"
            elif report.warning_checks > 0:
                report.overall_status = "WARNING"
            else:
                report.overall_status = "PASS"

            logger.info(f"Cross-check tamamlandı: {report.overall_status} ({report.passed_checks}/{report.total_checks})")

        except Exception as e:
            logger.error(f"Cross-check hatası: {e}")
            raise

        return report

    # =========================================================================
    # INDIVIDUAL CHECK METHODS (for API)
    # =========================================================================

    def run_balance_checks(self, client_id: str, period_id: str) -> List[CheckResult]:
        """Sadece denge kontrollerini çalıştır (C1, C4)"""
        conn = self._get_connection()

        results = []
        c1_result, _ = self.check_c1_yevmiye_balance(conn, client_id, period_id)
        results.append(c1_result)

        c4_result, _ = self.check_c4_mizan_balance(conn, client_id, period_id)
        results.append(c4_result)

        conn.close()
        return results

    def run_reconciliation_checks(self, client_id: str, period_id: str) -> List[CheckResult]:
        """Sadece mutabakat kontrollerini çalıştır (C2, C3)"""
        conn = self._get_connection()

        results = []
        c2_result, _ = self.check_c2_yevmiye_kebir(conn, client_id, period_id)
        results.append(c2_result)

        c3_result, _ = self.check_c3_kebir_mizan(conn, client_id, period_id)
        results.append(c3_result)

        conn.close()
        return results

    # =========================================================================
    # C3 İYİLEŞTİRİLMİŞ: AÇILIŞ BAKİYESİ DAHİL
    # =========================================================================

    def check_c3_kebir_mizan_with_opening(
        self,
        conn: sqlite3.Connection,
        client_id: str,
        period_id: str,
        fiscal_year: int = None
    ) -> Tuple[CheckResult, List[AccountComparison], Dict[str, Any]]:
        """
        C3 İyileştirilmiş: Kebir ↔ Mizan Mutabakatı (Açılış Bakiyesi Dahil)

        Formül:
        Mizan Borç = Dönem Başı Bakiye + Dönem İçi Hareketler (Kebir)

        Eğer açılış bakiyesi yüklenmişse, bu değerler Kebir toplamına eklenir
        ve Mizan ile karşılaştırılır.
        """
        cursor = conn.cursor()

        # Açılış bakiyelerini al
        opening_balances = {}
        has_opening_balance = False

        cursor.execute("""
            SELECT hesap_kodu, borc_bakiye, alacak_bakiye
            FROM opening_balances
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period_id))

        for row in cursor.fetchall():
            opening_balances[row['hesap_kodu']] = {
                'borc': row['borc_bakiye'] or 0,
                'alacak': row['alacak_bakiye'] or 0
            }

        has_opening_balance = len(opening_balances) > 0

        # Açılış bakiyesi özeti
        cursor.execute("""
            SELECT status, toplam_hesap_sayisi, toplam_borc, toplam_alacak
            FROM opening_balance_summary
            WHERE client_id = ? AND period_id = ?
            ORDER BY fiscal_year DESC LIMIT 1
        """, (client_id, period_id))

        opening_summary_row = cursor.fetchone()
        opening_summary = None
        if opening_summary_row:
            opening_summary = {
                'status': opening_summary_row['status'],
                'hesap_sayisi': opening_summary_row['toplam_hesap_sayisi'],
                'toplam_borc': opening_summary_row['toplam_borc'],
                'toplam_alacak': opening_summary_row['toplam_alacak']
            }

        # Kebir'den hesap bazlı toplamlar
        cursor.execute("""
            SELECT
                COALESCE(alt_hesap_kodu, hesap_kodu) as hesap_kodu,
                MAX(COALESCE(alt_hesap_adi, hesap_adi)) as hesap_adi,
                COALESCE(SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END), 0) as borc,
                COALESCE(SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END), 0) as alacak
            FROM edefter_entries
            WHERE client_id = ? AND period_id = ? AND defter_tipi = 'K'
            GROUP BY COALESCE(alt_hesap_kodu, hesap_kodu)
        """, (client_id, period_id))

        kebir_hesaplar = {}
        for row in cursor.fetchall():
            hesap_kodu = row['hesap_kodu']
            kebir_borc = row['borc'] or 0
            kebir_alacak = row['alacak'] or 0

            # Açılış bakiyesini ekle
            if hesap_kodu in opening_balances:
                acilis = opening_balances[hesap_kodu]
                kebir_borc += acilis['borc']
                kebir_alacak += acilis['alacak']

            kebir_hesaplar[hesap_kodu] = {
                'hesap_adi': row['hesap_adi'],
                'borc': kebir_borc,
                'alacak': kebir_alacak
            }

        # Kebir'de olmayan ama açılış bakiyesinde olan hesapları ekle
        for hesap_kodu, acilis in opening_balances.items():
            if hesap_kodu not in kebir_hesaplar:
                kebir_hesaplar[hesap_kodu] = {
                    'hesap_adi': '',
                    'borc': acilis['borc'],
                    'alacak': acilis['alacak']
                }

        # Mizan'dan hesap bazlı TOPLAMLAR
        cursor.execute("""
            SELECT
                m.hesap_kodu,
                m.hesap_adi,
                COALESCE(m.borc_toplam, 0) as borc,
                COALESCE(m.alacak_toplam, 0) as alacak
            FROM mizan_entries m
            WHERE m.client_id = ? AND m.period_id = ?
            AND m.hesap_kodu != 'GENEL TOPLAM'
            AND m.hesap_kodu NOT LIKE '%::%'
            AND NOT EXISTS (
                SELECT 1 FROM mizan_entries sub
                WHERE sub.client_id = m.client_id
                AND sub.period_id = m.period_id
                AND sub.hesap_kodu LIKE m.hesap_kodu || '.%'
            )
        """, (client_id, period_id))

        mizan_hesaplar = {}
        for row in cursor.fetchall():
            mizan_hesaplar[row['hesap_kodu']] = {
                'hesap_adi': row['hesap_adi'],
                'borc': row['borc'] or 0,
                'alacak': row['alacak'] or 0
            }

        # Karşılaştırma
        tum_hesaplar = set(kebir_hesaplar.keys()) | set(mizan_hesaplar.keys())
        comparisons = []

        farkli_count = 0
        sadece_kebir = 0
        sadece_mizan = 0
        toplam_borc_fark = 0
        toplam_alacak_fark = 0

        for hesap_kodu in sorted(tum_hesaplar):
            keb = kebir_hesaplar.get(hesap_kodu)
            miz = mizan_hesaplar.get(hesap_kodu)

            if keb and miz:
                borc_fark = keb['borc'] - miz['borc']
                alacak_fark = keb['alacak'] - miz['alacak']

                if abs(borc_fark) < self.TOLERANCE_EXACT and abs(alacak_fark) < self.TOLERANCE_EXACT:
                    durum = "OK"
                else:
                    durum = "FARK_VAR"
                    farkli_count += 1
                    toplam_borc_fark += abs(borc_fark)
                    toplam_alacak_fark += abs(alacak_fark)

                comparisons.append(AccountComparison(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=keb['hesap_adi'] or miz['hesap_adi'],
                    source_borc=keb['borc'],
                    source_alacak=keb['alacak'],
                    target_borc=miz['borc'],
                    target_alacak=miz['alacak'],
                    borc_fark=borc_fark,
                    alacak_fark=alacak_fark,
                    durum=durum
                ))

            elif keb and not miz:
                sadece_kebir += 1
                toplam_borc_fark += keb['borc']
                toplam_alacak_fark += keb['alacak']
                comparisons.append(AccountComparison(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=keb['hesap_adi'],
                    source_borc=keb['borc'],
                    source_alacak=keb['alacak'],
                    target_borc=0,
                    target_alacak=0,
                    borc_fark=keb['borc'],
                    alacak_fark=keb['alacak'],
                    durum="SADECE_KEBIR"
                ))

            else:  # miz and not keb
                sadece_mizan += 1
                toplam_borc_fark += miz['borc']
                toplam_alacak_fark += miz['alacak']
                comparisons.append(AccountComparison(
                    hesap_kodu=hesap_kodu,
                    hesap_adi=miz['hesap_adi'],
                    source_borc=0,
                    source_alacak=0,
                    target_borc=miz['borc'],
                    target_alacak=miz['alacak'],
                    borc_fark=-miz['borc'],
                    alacak_fark=-miz['alacak'],
                    durum="SADECE_MIZAN"
                ))

        # Sonuç değerlendirme
        toplam_fark = toplam_borc_fark + toplam_alacak_fark
        esit_count = len(tum_hesaplar) - farkli_count - sadece_kebir - sadece_mizan

        details = {
            "toplam_hesap": len(tum_hesaplar),
            "esit_hesap": esit_count,
            "farkli_hesap": farkli_count,
            "sadece_kebir": sadece_kebir,
            "sadece_mizan": sadece_mizan,
            "toplam_borc_fark": round(toplam_borc_fark, 2),
            "toplam_alacak_fark": round(toplam_alacak_fark, 2),
            "toplam_fark": round(toplam_fark, 2),
            # Açılış bakiyesi bilgisi
            "has_opening_balance": has_opening_balance,
            "opening_balance_accounts": len(opening_balances),
            "opening_summary": opening_summary
        }

        # Mesaj oluştur
        acilis_notu = " (açılış bakiyesi dahil)" if has_opening_balance else " (AÇILIŞ BAKİYESİ EKSİK!)"

        if toplam_fark < self.TOLERANCE_EXACT:
            severity = CheckSeverity.OK
            passed = True
            message = f"Kebir-Mizan mutabık: {esit_count}/{len(tum_hesaplar)} hesap{acilis_notu}"
        elif toplam_fark < self.TOLERANCE_WARNING:
            severity = CheckSeverity.WARNING
            passed = True
            message = f"Kebir-Mizan küçük fark: {round(toplam_fark, 2)} TL{acilis_notu}"
        elif not has_opening_balance and toplam_fark > 10000:
            # Açılış bakiyesi yoksa ve büyük fark varsa, muhtemelen bu yüzdendir
            severity = CheckSeverity.WARNING
            passed = False
            message = f"Kebir-Mizan fark: {round(toplam_fark, 2)} TL - AÇILIŞ BAKİYESİ YÜKLENMELİ!"
        else:
            severity = CheckSeverity.ERROR
            passed = False
            message = f"Kebir-Mizan UYUMSUZ: {round(toplam_fark, 2)} TL{acilis_notu}"

        result = CheckResult(
            check_type=CheckType.C3_KEBIR_MIZAN,
            check_name="Kebir-Mizan Mutabakatı (Açılış Dahil)",
            severity=severity,
            passed=passed,
            message=message,
            details=details
        )

        return result, comparisons, {
            'has_opening_balance': has_opening_balance,
            'opening_summary': opening_summary
        }

    def get_opening_balance_status(self, client_id: str, period_id: str) -> Dict[str, Any]:
        """Açılış bakiyesi durumunu kontrol et"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT status, toplam_hesap_sayisi, toplam_borc, toplam_alacak, is_balanced, upload_date
            FROM opening_balance_summary
            WHERE client_id = ? AND period_id = ?
            ORDER BY fiscal_year DESC LIMIT 1
        """, (client_id, period_id))

        row = cursor.fetchone()
        conn.close()

        if not row:
            return {
                'has_opening_balance': False,
                'status': 'missing',
                'message': 'Açılış bakiyesi yüklenmedi'
            }

        return {
            'has_opening_balance': True,
            'status': row['status'],
            'hesap_sayisi': row['toplam_hesap_sayisi'],
            'toplam_borc': row['toplam_borc'],
            'toplam_alacak': row['toplam_alacak'],
            'is_balanced': bool(row['is_balanced']),
            'upload_date': row['upload_date'],
            'message': 'Açılış bakiyesi yüklendi'
        }
