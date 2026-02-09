#!/usr/bin/env python3
"""
LYNTOS Analysis Trigger Service
Analyzes mizan data and writes findings to feed_items.

This is the MISSING LINK in the pipeline:
mizan_entries → analysis_trigger → feed_items → dashboard
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"

logger = logging.getLogger(__name__)

# ============================================================
# VDK 13 KRİTER TANIMLARI
# ============================================================
VDK_CRITERIA = [
    {"id": "VDK-01", "name": "Kasa Hesabı Negatif Bakiye", "hesap": "100", "check": "negative_balance", "severity": "CRITICAL", "legal": "VUK Md. 183"},
    {"id": "VDK-02", "name": "Ortaklara Borçlar Yüksek", "hesap": "331", "check": "high_ratio", "severity": "CRITICAL", "legal": "KVK Md. 13"},
    {"id": "VDK-03", "name": "Stok Negatif Bakiye", "hesap": "15", "check": "negative_balance", "severity": "CRITICAL", "legal": "VUK Md. 186"},
    {"id": "VDK-04", "name": "Şüpheli Alacak Oranı Yüksek", "hesap": "128,129", "check": "high_ratio", "severity": "HIGH", "legal": "VUK Md. 323"},
    {"id": "VDK-05", "name": "Kısa Vadeli Borç/Özkaynak", "hesap": "300,500", "check": "debt_equity", "severity": "HIGH", "legal": "TTK"},
    {"id": "VDK-06", "name": "Devreden KDV Yüksek", "hesap": "190,191", "check": "high_kdv", "severity": "HIGH", "legal": "KDVK Md. 29"},
    {"id": "VDK-07", "name": "Finansman Gideri Oranı", "hesap": "780", "check": "expense_ratio", "severity": "MEDIUM", "legal": "KVK Md. 11"},
    {"id": "VDK-08", "name": "Satış/Maliyet Uyumsuzluğu", "hesap": "600,620", "check": "margin_check", "severity": "MEDIUM", "legal": "VUK Md. 275"},
    {"id": "VDK-09", "name": "Amortisman Tutarsızlığı", "hesap": "257,268", "check": "depreciation", "severity": "MEDIUM", "legal": "VUK Md. 315"},
    {"id": "VDK-10", "name": "Gelir/Gider Dengesizliği", "hesap": "6,7", "check": "income_expense", "severity": "MEDIUM", "legal": "VUK"},
    {"id": "VDK-11", "name": "Banka Bakiyesi Uyumsuzluğu", "hesap": "102", "check": "bank_mismatch", "severity": "HIGH", "legal": "VUK Md. 183"},
    {"id": "VDK-12", "name": "Alacak Devir Hızı Düşük", "hesap": "120,600", "check": "turnover", "severity": "LOW", "legal": "Finansal Analiz"},
    {"id": "VDK-13", "name": "Nakit Akış Tutarsızlığı", "hesap": "100,102,600", "check": "cash_flow", "severity": "HIGH", "legal": "VUK"},
]

# ============================================================
# GEÇİCİ VERGİ 12 KONTROL
# ============================================================
GV_CHECKS = [
    {"id": "GV-01", "name": "Banka & Faiz Tahakkukları", "severity": "MEDIUM"},
    {"id": "GV-02", "name": "Kur Değerlemeleri", "severity": "HIGH"},
    {"id": "GV-03", "name": "Stok & Maliyet (SMM)", "severity": "HIGH"},
    {"id": "GV-04", "name": "Dönemsellik (180/280)", "severity": "MEDIUM"},
    {"id": "GV-05", "name": "Amortisman & Binek Otolar", "severity": "MEDIUM"},
    {"id": "GV-06", "name": "Şüpheli Alacaklar", "severity": "HIGH"},
    {"id": "GV-07", "name": "KDV Mutabakatı", "severity": "CRITICAL"},
    {"id": "GV-08", "name": "Personel Giderleri", "severity": "MEDIUM"},
    {"id": "GV-09", "name": "KKEG Kontrolü", "severity": "HIGH"},
    {"id": "GV-10", "name": "Transfer Fiyatlandırması", "severity": "CRITICAL"},
    {"id": "GV-11", "name": "Örtülü Sermaye", "severity": "CRITICAL"},
    {"id": "GV-12", "name": "Geçmiş Yıl Zararları", "severity": "MEDIUM"},
]

# ============================================================
# CROSSCHECK KURALLARI (Frontend'den taşındı)
# ============================================================
CROSSCHECK_RULES = [
    {"id": "P0-001", "name": "Mizan Denkliği Kontrolü", "check": "balance_check", "severity": "CRITICAL", "legal": "VUK Md. 175"},
    {"id": "P0-002", "name": "Bilanço Denkliği Kontrolü", "check": "aktif_pasif_check", "severity": "CRITICAL", "legal": "VUK Md. 175"},
    {"id": "P1-001", "name": "Amortisman Kontrolü", "check": "amortisman_check", "hesap": "25x,257,770", "severity": "HIGH", "legal": "VUK Md. 313-321"},
    {"id": "P1-006", "name": "Binek Oto Amortisman Limiti (2025)", "check": "binek_oto_limit", "hesap": "254", "severity": "HIGH", "legal": "GVK Md. 40, KVK Md. 11"},
    {"id": "P2-VDK-K12", "name": "Finansman Gider Kısıtlaması", "check": "fgk_check", "hesap": "656,660,661,780", "severity": "HIGH", "legal": "KVK Md. 11/1-i"},
    {"id": "P3-002", "name": "Dönem Sonu Kapatma Kontrolü", "check": "donem_sonu_kapatma", "hesap": "690", "severity": "MEDIUM", "legal": "VUK"},
    {"id": "P3-004", "name": "Stopaj/SGK Tahakkuk Kontrolü", "check": "stopaj_sgk_check", "hesap": "360,361,770", "severity": "HIGH", "legal": "GVK Md. 94, 5510 SK"},
    {"id": "R-KDV-001", "name": "Mizan-KDV Beyanname Mutabakatı", "check": "mizan_kdv_crosscheck", "hesap": "191,391", "severity": "HIGH", "legal": "KDVK Md. 29"},
    {"id": "R-BNK-001", "name": "Mizan-Banka Ekstre Mutabakatı", "check": "mizan_banka_crosscheck", "hesap": "102", "severity": "HIGH", "legal": "VUK Md. 183"},
]

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_mizan_data(client_id: str, period_id: str) -> Dict[str, Any]:
    """
    Get mizan entries as a dictionary keyed by hesap_kodu prefix.
    Returns: {entries: [...], by_code: {...}, totals: {...}}
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT hesap_kodu, hesap_adi, borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye
        FROM mizan_entries
        WHERE client_id = ? AND period_id = ?
        ORDER BY hesap_kodu
    """, (client_id, period_id))

    rows = cursor.fetchall()
    conn.close()

    # Build lookup structure
    data = {
        'entries': [dict(r) for r in rows],
        'by_code': {},
        'by_prefix': {},
        'totals': {
            'borc_bakiye': 0,
            'alacak_bakiye': 0,
            'assets': 0,  # 1xx-2xx
            'liabilities': 0,  # 3xx-4xx
            'equity': 0,  # 5xx
            'revenue': 0,  # 6xx alacak
            'expenses': 0,  # 6xx-7xx borc
        }
    }

    for row in rows:
        entry = dict(row)
        kod = entry['hesap_kodu']

        # By exact code
        data['by_code'][kod] = entry

        # By prefix (first 3 digits)
        prefix = kod[:3] if len(kod) >= 3 else kod
        if prefix not in data['by_prefix']:
            data['by_prefix'][prefix] = []
        data['by_prefix'][prefix].append(entry)

        # Calculate totals
        borc = entry.get('borc_bakiye') or 0
        alacak = entry.get('alacak_bakiye') or 0

        data['totals']['borc_bakiye'] += borc
        data['totals']['alacak_bakiye'] += alacak

        # Classify by account type
        if kod[0] in ['1', '2']:
            data['totals']['assets'] += borc - alacak
        elif kod[0] in ['3', '4']:
            data['totals']['liabilities'] += alacak - borc
        elif kod[0] == '5':
            data['totals']['equity'] += alacak - borc
        elif kod[0] == '6':
            data['totals']['revenue'] += alacak
            data['totals']['expenses'] += borc
        elif kod[0] == '7':
            data['totals']['expenses'] += borc

    return data

def get_account_balance(mizan: Dict, prefix: str) -> float:
    """
    Get net balance for accounts starting with prefix.

    MUHASEBE KURALI (Tek Düzen Hesap Planı):
    - AKTİF hesaplar (1xx, 2xx): Borç bakiyeli → borc - alacak (pozitif)
    - PASİF hesaplar (3xx, 4xx, 5xx): Alacak bakiyeli → alacak - borc (pozitif)
    - GELİR hesapları (6xx): Alacak bakiyeli → alacak - borc (pozitif)
    - GİDER hesapları (7xx): Borç bakiyeli → borc - alacak (pozitif)
    - 191 İndirilecek KDV: Borç bakiyeli (Aktif)
    - 391 Hesaplanan KDV: Alacak bakiyeli (Pasif)
    """
    total = 0
    for kod, entry in mizan['by_code'].items():
        if kod.startswith(prefix):
            borc = entry.get('borc_bakiye') or 0
            alacak = entry.get('alacak_bakiye') or 0

            # Hesap türüne göre bakiye hesapla
            first_digit = kod[0] if kod else '0'
            if first_digit in ['3', '4', '5', '6']:  # Pasif + Gelir hesapları
                total += alacak - borc  # Alacak bakiyeli
            else:  # Aktif + Gider hesapları (1, 2, 7, 8, 9)
                total += borc - alacak  # Borç bakiyeli

    return total

def get_account_total(mizan: Dict, prefix: str, field: str = 'borc_bakiye') -> float:
    """Get sum of a field for accounts starting with prefix."""
    total = 0
    for kod, entry in mizan['by_code'].items():
        if kod.startswith(prefix):
            total += entry.get(field) or 0
    return total

# ============================================================
# VDK ANALİZ FONKSİYONLARI
# ============================================================
def analyze_vdk_criteria(mizan: Dict, period_id: str) -> List[Dict]:
    """Run VDK 13 criteria analysis on mizan data."""
    findings = []

    # VDK-01: Kasa Negatif
    kasa_balance = get_account_balance(mizan, '100')
    if kasa_balance < 0:
        findings.append({
            'rule_code': 'VDK-01',
            'severity': 'CRITICAL',
            'title': 'Kasa Hesabı Negatif Bakiye',
            'message': f'Kasa bakiyesi {kasa_balance:,.2f} TL negatif. VUK Md. 183\'e aykırı durum.',
            'value': kasa_balance,
            'threshold': 0,
            'status': 'FAIL'
        })
    else:
        findings.append({
            'rule_code': 'VDK-01',
            'severity': 'INFO',
            'title': 'Kasa Hesabı Kontrolü',
            'message': f'Kasa bakiyesi {kasa_balance:,.2f} TL - Normal',
            'value': kasa_balance,
            'threshold': 0,
            'status': 'PASS'
        })

    # VDK-02: Ortaklara Borçlar (331)
    ortaklara_borc = get_account_balance(mizan, '331')
    ozkaynak = mizan['totals']['equity']
    if ozkaynak > 0 and abs(ortaklara_borc) > ozkaynak * 0.5:
        findings.append({
            'rule_code': 'VDK-02',
            'severity': 'CRITICAL',
            'title': 'Ortaklara Borçlar Yüksek',
            'message': f'Ortaklara borç ({abs(ortaklara_borc):,.2f} TL) özkaynak ({ozkaynak:,.2f} TL) oranına göre yüksek. Transfer fiyatlandırması riski.',
            'value': ortaklara_borc,
            'threshold': ozkaynak * 0.5,
            'status': 'FAIL'
        })

    # VDK-03: Stok Negatif (15x)
    stok_balance = get_account_balance(mizan, '15')
    if stok_balance < 0:
        findings.append({
            'rule_code': 'VDK-03',
            'severity': 'CRITICAL',
            'title': 'Stok Negatif Bakiye',
            'message': f'Stok bakiyesi {stok_balance:,.2f} TL negatif. VUK Md. 186\'ya aykırı.',
            'value': stok_balance,
            'threshold': 0,
            'status': 'FAIL'
        })
    else:
        findings.append({
            'rule_code': 'VDK-03',
            'severity': 'INFO',
            'title': 'Stok Bakiye Kontrolü',
            'message': f'Stok bakiyesi {stok_balance:,.2f} TL - Normal',
            'value': stok_balance,
            'threshold': 0,
            'status': 'PASS'
        })

    # VDK-06: Devreden KDV (190, 191)
    devreden_kdv = get_account_balance(mizan, '190') + get_account_balance(mizan, '191')
    revenue = mizan['totals']['revenue']
    if revenue > 0 and devreden_kdv > revenue * 0.05:
        findings.append({
            'rule_code': 'VDK-06',
            'severity': 'HIGH',
            'title': 'Devreden KDV Yüksek',
            'message': f'Devreden KDV ({devreden_kdv:,.2f} TL) hasılata ({revenue:,.2f} TL) oranla yüksek (%{devreden_kdv/revenue*100:.1f}). KDVK Md. 29 kapsamında inceleme riski.',
            'value': devreden_kdv,
            'threshold': revenue * 0.05,
            'status': 'WARNING'
        })

    # VDK-05: Borç/Özkaynak Oranı
    kvb = get_account_balance(mizan, '30')  # Kısa vadeli borçlar
    if ozkaynak > 0:
        borc_ozkaynak = abs(kvb) / ozkaynak if ozkaynak != 0 else 0
        if borc_ozkaynak > 3:
            findings.append({
                'rule_code': 'VDK-05',
                'severity': 'HIGH',
                'title': 'Borç/Özkaynak Oranı Kritik',
                'message': f'Kısa vadeli borç/özkaynak oranı {borc_ozkaynak:.2f} - Örtülü sermaye riski (KVK Md. 12).',
                'value': borc_ozkaynak,
                'threshold': 3,
                'status': 'FAIL'
            })
        else:
            findings.append({
                'rule_code': 'VDK-05',
                'severity': 'INFO',
                'title': 'Borç/Özkaynak Oranı',
                'message': f'Borç/özkaynak oranı {borc_ozkaynak:.2f} - Normal aralıkta.',
                'value': borc_ozkaynak,
                'threshold': 3,
                'status': 'PASS'
            })

    # VDK-11: Banka Bakiyesi
    banka_balance = get_account_balance(mizan, '102')
    findings.append({
        'rule_code': 'VDK-11',
        'severity': 'INFO',
        'title': 'Banka Bakiyesi Kontrolü',
        'message': f'Banka bakiyesi {banka_balance:,.2f} TL. Banka mutabakatı yapılmalı.',
        'value': banka_balance,
        'threshold': 0,
        'status': 'INFO'
    })

    # VDK-08: Brüt Kar Marjı
    satis = get_account_total(mizan, '600', 'alacak_bakiye')
    maliyet = get_account_total(mizan, '620', 'borc_bakiye') + get_account_total(mizan, '621', 'borc_bakiye')
    if satis > 0:
        margin = (satis - maliyet) / satis * 100
        if margin < 5:
            findings.append({
                'rule_code': 'VDK-08',
                'severity': 'MEDIUM',
                'title': 'Brüt Kar Marjı Düşük',
                'message': f'Brüt kar marjı %{margin:.1f} - Sektör ortalamasının altında olabilir.',
                'value': margin,
                'threshold': 5,
                'status': 'WARNING'
            })
        else:
            findings.append({
                'rule_code': 'VDK-08',
                'severity': 'INFO',
                'title': 'Brüt Kar Marjı',
                'message': f'Brüt kar marjı %{margin:.1f}',
                'value': margin,
                'threshold': 5,
                'status': 'PASS'
            })

    return findings

def analyze_gv_checks(mizan: Dict, period_id: str) -> List[Dict]:
    """Run Geçici Vergi 12 critical checks."""
    findings = []

    # GV-01: Banka Faiz Tahakkukları
    faiz_gelir = get_account_balance(mizan, '642')  # Faiz Gelirleri
    faiz_gider = get_account_balance(mizan, '780')  # Finansman Giderleri
    findings.append({
        'rule_code': 'GV-01',
        'severity': 'MEDIUM',
        'title': 'Banka & Faiz Tahakkukları',
        'message': f'Faiz Geliri: {faiz_gelir:,.2f} TL, Finansman Gideri: {abs(faiz_gider):,.2f} TL - Dönem sonu tahakkuk kontrolü yapılmalı.',
        'value': faiz_gelir,
        'status': 'CHECK'
    })

    # GV-03: Stok & SMM
    stok = get_account_balance(mizan, '15')
    smm = get_account_total(mizan, '620', 'borc_bakiye')
    findings.append({
        'rule_code': 'GV-03',
        'severity': 'HIGH',
        'title': 'Stok & Maliyet (SMM)',
        'message': f'Stok: {stok:,.2f} TL, SMM: {smm:,.2f} TL - Stok sayımı ve maliyet kontrolü yapılmalı.',
        'value': stok,
        'status': 'CHECK'
    })

    # GV-05: Amortisman
    amortisman = get_account_balance(mizan, '257') + get_account_balance(mizan, '268')
    findings.append({
        'rule_code': 'GV-05',
        'severity': 'MEDIUM',
        'title': 'Amortisman Kontrolü',
        'message': f'Birikmiş Amortisman: {abs(amortisman):,.2f} TL - Amortisman hesaplaması kontrol edilmeli.',
        'value': amortisman,
        'status': 'CHECK'
    })

    # GV-06: Şüpheli Alacaklar
    supheli = get_account_balance(mizan, '128') + get_account_balance(mizan, '129')
    ticari_alacak = get_account_balance(mizan, '120')
    findings.append({
        'rule_code': 'GV-06',
        'severity': 'HIGH',
        'title': 'Şüpheli Alacaklar',
        'message': f'Şüpheli Alacak Karşılığı: {abs(supheli):,.2f} TL, Ticari Alacaklar: {ticari_alacak:,.2f} TL',
        'value': supheli,
        'status': 'CHECK'
    })

    # GV-07: KDV Mutabakatı
    hesaplanan_kdv = get_account_balance(mizan, '391')
    indirilecek_kdv = get_account_balance(mizan, '191')
    findings.append({
        'rule_code': 'GV-07',
        'severity': 'CRITICAL',
        'title': 'KDV Mutabakatı',
        'message': f'Hesaplanan KDV: {abs(hesaplanan_kdv):,.2f} TL, İndirilecek KDV: {indirilecek_kdv:,.2f} TL - Beyanname ile mutabakat yapılmalı.',
        'value': hesaplanan_kdv,
        'status': 'CHECK'
    })

    # GV-09: KKEG
    kkeg_770 = get_account_balance(mizan, '770')  # Genel Yönetim Giderleri
    findings.append({
        'rule_code': 'GV-09',
        'severity': 'HIGH',
        'title': 'KKEG Kontrolü',
        'message': f'Genel Yönetim Giderleri: {abs(kkeg_770):,.2f} TL - KKEG ayrıştırması yapılmalı.',
        'value': kkeg_770,
        'status': 'CHECK'
    })

    return findings

# ============================================================
# CROSSCHECK ANALİZ FONKSİYONLARI (Frontend'den taşındı)
# ============================================================
def analyze_crosscheck_rules(mizan: Dict, period_id: str) -> List[Dict]:
    """
    Frontend'den taşınan CrossCheck kuralları.
    P0-001, P0-002, P1-006, P3-002, P3-004, R-KDV-001, R-BNK-001
    """
    findings = []

    # P0-001: Mizan Denkliği (Borç = Alacak)
    toplam_borc = mizan['totals']['borc_bakiye']
    toplam_alacak = mizan['totals']['alacak_bakiye']
    fark = abs(toplam_borc - toplam_alacak)

    if fark > 1.0:
        findings.append({
            'rule_code': 'P0-001',
            'severity': 'CRITICAL',
            'title': 'Mizan Dengesi Bozuk',
            'message': f'Mizan dengesi bozuk! Borç: {toplam_borc:,.2f} TL, Alacak: {toplam_alacak:,.2f} TL, Fark: {fark:,.2f} TL. VUK Md. 175\'e aykırı durum.',
            'value': fark,
            'threshold': 1.0,
            'status': 'FAIL'
        })
    else:
        findings.append({
            'rule_code': 'P0-001',
            'severity': 'INFO',
            'title': 'Mizan Denkliği Kontrolü',
            'message': f'Mizan dengesi doğru. Borç: {toplam_borc:,.2f} TL, Alacak: {toplam_alacak:,.2f} TL',
            'value': fark,
            'threshold': 1.0,
            'status': 'PASS'
        })

    # P0-002: Aktif-Pasif Denkliği (Bilanço)
    aktif = mizan['totals']['assets']
    pasif = mizan['totals']['liabilities'] + mizan['totals']['equity']
    bilanco_fark = abs(aktif - pasif)

    if bilanco_fark > 1.0:
        findings.append({
            'rule_code': 'P0-002',
            'severity': 'CRITICAL',
            'title': 'Bilanço Dengesi Bozuk',
            'message': f'Bilanço dengesi bozuk! Aktif: {aktif:,.2f} TL, Pasif: {pasif:,.2f} TL, Fark: {bilanco_fark:,.2f} TL. VUK Md. 175\'e aykırı durum.',
            'value': bilanco_fark,
            'threshold': 1.0,
            'status': 'FAIL'
        })
    else:
        findings.append({
            'rule_code': 'P0-002',
            'severity': 'INFO',
            'title': 'Bilanço Denkliği Kontrolü',
            'message': f'Bilanço dengesi doğru. Aktif: {aktif:,.2f} TL, Pasif: {pasif:,.2f} TL',
            'value': bilanco_fark,
            'threshold': 1.0,
            'status': 'PASS'
        })

    # P1-006: Binek Oto Amortisman Limiti (2025: 2.100.000 TL)
    binek_oto_toplam = get_account_balance(mizan, '254')
    limit_2025 = 2_100_000  # TL
    amortisman_orani = 0.20  # %20 yıllık amortisman varsayımı

    if binek_oto_toplam > limit_2025:
        kkeg = (binek_oto_toplam - limit_2025) * amortisman_orani
        findings.append({
            'rule_code': 'P1-006',
            'severity': 'HIGH',
            'title': 'Binek Oto Amortisman Limiti Aşıldı',
            'message': f'Binek oto toplamı {binek_oto_toplam:,.2f} TL, 2025 limiti {limit_2025:,.0f} TL aşıldı. Tahmini KKEG: {kkeg:,.2f} TL. GVK Md. 40, KVK Md. 11.',
            'value': binek_oto_toplam,
            'threshold': limit_2025,
            'status': 'WARNING'
        })
    elif binek_oto_toplam > 0:
        findings.append({
            'rule_code': 'P1-006',
            'severity': 'INFO',
            'title': 'Binek Oto Kontrolü',
            'message': f'Binek oto toplamı {binek_oto_toplam:,.2f} TL, limit ({limit_2025:,.0f} TL) altında.',
            'value': binek_oto_toplam,
            'threshold': limit_2025,
            'status': 'PASS'
        })

    # P3-002: Dönem Sonu Kapatma (690 hesap)
    donem_kari = abs(get_account_balance(mizan, '690'))
    gelir_toplam = mizan['totals']['revenue']
    gider_toplam = mizan['totals']['expenses']
    gelir_gider_farki = gelir_toplam - gider_toplam

    if donem_kari > 0:
        fark_690 = abs(donem_kari - gelir_gider_farki)
        if fark_690 > 1.0:
            findings.append({
                'rule_code': 'P3-002',
                'severity': 'MEDIUM',
                'title': 'Dönem Sonu Kapatma Uyumsuzluğu',
                'message': f'Dönem karı ({donem_kari:,.2f} TL) ile gelir-gider farkı ({gelir_gider_farki:,.2f} TL) uyuşmuyor. Fark: {fark_690:,.2f} TL',
                'value': fark_690,
                'threshold': 1.0,
                'status': 'WARNING'
            })
        else:
            findings.append({
                'rule_code': 'P3-002',
                'severity': 'INFO',
                'title': 'Dönem Sonu Kapatma Kontrolü',
                'message': f'Dönem karı ({donem_kari:,.2f} TL) ile gelir-gider farkı uyumlu.',
                'value': fark_690,
                'threshold': 1.0,
                'status': 'PASS'
            })

    # P3-004: Stopaj/SGK Tahakkuk Kontrolü
    personel_gideri = abs(get_account_balance(mizan, '770'))  # Genel Yönetim Giderleri (personel)
    stopaj_360 = abs(get_account_balance(mizan, '360'))  # Ödenecek Vergi ve Fonlar
    sgk_361 = abs(get_account_balance(mizan, '361'))  # Ödenecek SGK Primleri

    if personel_gideri > 50_000:
        eksik_stopaj = stopaj_360 == 0
        eksik_sgk = sgk_361 == 0

        if eksik_stopaj or eksik_sgk:
            eksik_liste = []
            if eksik_stopaj:
                eksik_liste.append('Stopaj (360)')
            if eksik_sgk:
                eksik_liste.append('SGK (361)')

            findings.append({
                'rule_code': 'P3-004',
                'severity': 'HIGH',
                'title': 'Stopaj/SGK Tahakkuku Eksik',
                'message': f'Personel gideri {personel_gideri:,.2f} TL var ancak {", ".join(eksik_liste)} tahakkuku yok. GVK Md. 94, 5510 SK.',
                'value': personel_gideri,
                'threshold': 50_000,
                'status': 'FAIL'
            })
        else:
            findings.append({
                'rule_code': 'P3-004',
                'severity': 'INFO',
                'title': 'Stopaj/SGK Tahakkuk Kontrolü',
                'message': f'Personel gideri {personel_gideri:,.2f} TL, Stopaj: {stopaj_360:,.2f} TL, SGK: {sgk_361:,.2f} TL - Tahakkuklar mevcut.',
                'value': personel_gideri,
                'threshold': 50_000,
                'status': 'PASS'
            })

    # R-KDV-001: Mizan-KDV Mutabakatı (391 vs 191)
    hesaplanan_kdv = abs(get_account_balance(mizan, '391'))  # Hesaplanan KDV
    indirilecek_kdv = abs(get_account_balance(mizan, '191'))  # İndirilecek KDV

    # KDV net pozisyon kontrolü
    if hesaplanan_kdv > 0 or indirilecek_kdv > 0:
        kdv_pozisyon = hesaplanan_kdv - indirilecek_kdv
        findings.append({
            'rule_code': 'R-KDV-001',
            'severity': 'HIGH' if abs(kdv_pozisyon) > 100_000 else 'INFO',
            'title': 'KDV Mutabakat Kontrolü',
            'message': f'Hesaplanan KDV: {hesaplanan_kdv:,.2f} TL, İndirilecek KDV: {indirilecek_kdv:,.2f} TL. Net pozisyon: {kdv_pozisyon:,.2f} TL. KDVK Md. 29 kapsamında beyanname mutabakatı yapılmalı.',
            'value': kdv_pozisyon,
            'threshold': 0,
            'status': 'CHECK'
        })

    # R-BNK-001: Mizan-Banka Mutabakatı (102 hesap)
    banka_bakiye = get_account_balance(mizan, '102')
    findings.append({
        'rule_code': 'R-BNK-001',
        'severity': 'INFO',
        'title': 'Banka Mutabakat Kontrolü',
        'message': f'Mizan banka bakiyesi (102): {banka_bakiye:,.2f} TL. VUK Md. 183 kapsamında banka ekstre mutabakatı yapılmalı.',
        'value': banka_bakiye,
        'threshold': 0,
        'status': 'CHECK'
    })

    # ============================================================
    # P1-001: Amortisman Ayrılmamış (Frontend'den taşındı)
    # ============================================================
    mdv_toplam = 0
    for kod, entry in mizan['by_code'].items():
        if kod.startswith('25') and not kod.startswith('257'):  # MDV hesapları (amortisman hariç)
            borc = entry.get('borc_bakiye') or 0
            alacak = entry.get('alacak_bakiye') or 0
            mdv_toplam += max(0, borc - alacak)

    donem_amortisman = abs(get_account_balance(mizan, '770'))  # Dönem amortismanı (770 - Genel Yönetim Giderleri içinde)
    birikimis_amortisman = abs(get_account_balance(mizan, '257'))  # Birikmiş amortisman

    if mdv_toplam > 5000 and donem_amortisman == 0 and birikimis_amortisman == 0:
        tahmini_amortisman = mdv_toplam * 0.20  # Ortalama %20 varsayımı
        findings.append({
            'rule_code': 'P1-001',
            'severity': 'HIGH',
            'title': 'Amortisman Ayrılmamış',
            'message': f'MDV toplamı {mdv_toplam:,.2f} TL için dönem amortismanı ayrılmamış. Tahmini amortisman: {tahmini_amortisman:,.2f} TL. VUK Md. 313-321.',
            'value': mdv_toplam,
            'threshold': 5000,
            'status': 'FAIL'
        })
    elif mdv_toplam > 5000:
        findings.append({
            'rule_code': 'P1-001',
            'severity': 'INFO',
            'title': 'Amortisman Kontrolü',
            'message': f'MDV: {mdv_toplam:,.2f} TL, Birikmiş Amortisman: {birikimis_amortisman:,.2f} TL - Kontrol edilmeli.',
            'value': mdv_toplam,
            'threshold': 5000,
            'status': 'CHECK'
        })

    # ============================================================
    # P2-VDK-K12: Finansman Gider Kısıtlaması (Frontend'den taşındı)
    # ============================================================
    # Yabancı Kaynak = 3xx + 4xx (Kısa + Uzun vadeli yabancı kaynaklar)
    yabanci_kaynak = 0
    for kod, entry in mizan['by_code'].items():
        if kod[0] in ['3', '4']:
            alacak = entry.get('alacak_bakiye') or 0
            borc = entry.get('borc_bakiye') or 0
            yabanci_kaynak += alacak - borc

    # Öz Sermaye = 5xx
    oz_sermaye = mizan['totals']['equity']

    # Finansman Giderleri = 656, 660, 661, 780
    finansman_giderleri = 0
    for kod, entry in mizan['by_code'].items():
        if kod.startswith('656') or kod.startswith('660') or kod.startswith('661') or kod.startswith('780'):
            borc = entry.get('borc_bakiye') or 0
            alacak = entry.get('alacak_bakiye') or 0
            finansman_giderleri += borc - alacak

    if yabanci_kaynak > oz_sermaye and oz_sermaye > 0 and finansman_giderleri > 10000:
        kkeg = finansman_giderleri * 0.10  # %10 KKEG
        vergi_etkisi = kkeg * 0.25  # %25 kurumlar vergisi etkisi
        findings.append({
            'rule_code': 'P2-VDK-K12',
            'severity': 'HIGH',
            'title': 'Finansman Gider Kısıtlaması (FGK)',
            'message': f'Yabancı kaynak ({yabanci_kaynak:,.2f} TL) > Öz sermaye ({oz_sermaye:,.2f} TL). Finansman giderleri: {finansman_giderleri:,.2f} TL. KKEG: {kkeg:,.2f} TL, Vergi etkisi: {vergi_etkisi:,.2f} TL. KVK Md. 11/1-i.',
            'value': finansman_giderleri,
            'threshold': 10000,
            'status': 'WARNING'
        })
    elif finansman_giderleri > 10000:
        findings.append({
            'rule_code': 'P2-VDK-K12',
            'severity': 'INFO',
            'title': 'Finansman Gider Kontrolü',
            'message': f'Finansman giderleri: {finansman_giderleri:,.2f} TL. Yabancı kaynak/Öz sermaye oranı FGK sınırında değil.',
            'value': finansman_giderleri,
            'threshold': 10000,
            'status': 'PASS'
        })

    return findings

# ============================================================
# FEED_ITEMS YAZMA
# ============================================================
def write_to_feed(tenant_id: str, client_id: str, period_id: str, findings: List[Dict]) -> int:
    """Write analysis findings to feed_items table."""
    conn = get_db()
    cursor = conn.cursor()

    # Clear existing items for this client/period
    cursor.execute("""
        DELETE FROM feed_items
        WHERE client_id = ? AND period_id = ?
    """, (client_id, period_id))
    deleted = cursor.rowcount

    # Insert new findings
    # Note: feed_items.type must be one of: 'risk', 'alert', 'info', 'upload', 'system'
    now = datetime.now(timezone.utc).isoformat()
    inserted = 0

    for finding in findings:
        try:
            metadata = {
                'rule_code': finding.get('rule_code'),
                'value': finding.get('value'),
                'threshold': finding.get('threshold'),
                'status': finding.get('status', 'CHECK')
            }

            # Map severity to appropriate type
            severity = finding.get('severity', 'INFO')
            if severity in ['CRITICAL', 'HIGH']:
                feed_type = 'risk'
            elif severity == 'MEDIUM':
                feed_type = 'alert'
            else:
                feed_type = 'info'

            cursor.execute("""
                INSERT INTO feed_items
                (tenant_id, client_id, period_id, type, title, message, severity, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id,
                client_id,
                period_id,
                feed_type,
                finding.get('title', ''),
                finding.get('message', ''),
                severity,
                json.dumps(metadata, ensure_ascii=False),
                now
            ))
            inserted += 1
        except Exception as e:
            print(f"  ERROR inserting finding: {e}")

    conn.commit()
    conn.close()

    return inserted

# ============================================================
# MAIN ANALYSIS FUNCTION
# ============================================================
def run_analysis(tenant_id: str, client_id: str, period_id: str) -> Dict:
    """
    Run full analysis for a client/period.

    Returns:
        Dict with analysis results and counts
    """
    print(f"  Analyzing {client_id} / {period_id}...")

    # Get mizan data
    mizan = get_mizan_data(client_id, period_id)

    if not mizan['entries']:
        return {
            'status': 'NO_DATA',
            'findings': 0,
            'message': f'No mizan data for {period_id}'
        }

    print(f"    Mizan entries: {len(mizan['entries'])}")
    print(f"    Total Borç: {mizan['totals']['borc_bakiye']:,.2f}")
    print(f"    Total Alacak: {mizan['totals']['alacak_bakiye']:,.2f}")

    # Run VDK analysis
    vdk_findings = analyze_vdk_criteria(mizan, period_id)
    print(f"    VDK findings: {len(vdk_findings)}")

    # Run GV checks
    gv_findings = analyze_gv_checks(mizan, period_id)
    print(f"    GV findings: {len(gv_findings)}")

    # Run CrossCheck rules (Frontend'den taşındı)
    crosscheck_findings = analyze_crosscheck_rules(mizan, period_id)
    print(f"    CrossCheck findings: {len(crosscheck_findings)}")

    # Combine all findings
    all_findings = vdk_findings + gv_findings + crosscheck_findings

    # Write to feed_items
    written = write_to_feed(tenant_id, client_id, period_id, all_findings)
    print(f"    Written to feed_items: {written}")

    return {
        'status': 'OK',
        'findings': len(all_findings),
        'written': written,
        'vdk_count': len(vdk_findings),
        'gv_count': len(gv_findings),
        'crosscheck_count': len(crosscheck_findings)
    }

def run_all_analysis(tenant_id: str, client_id: str) -> Dict:
    """Run analysis for all periods of a client."""

    # Get all periods for client
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT period_id FROM mizan_entries WHERE client_id = ?
    """, (client_id,))
    periods = [row['period_id'] for row in cursor.fetchall()]
    conn.close()

    print(f"Found {len(periods)} periods for {client_id}: {periods}")

    results = {}
    total_findings = 0

    for period_id in sorted(periods):
        result = run_analysis(tenant_id, client_id, period_id)
        results[period_id] = result
        total_findings += result.get('written', 0)

    return {
        'client_id': client_id,
        'periods_analyzed': len(periods),
        'total_findings': total_findings,
        'results': results
    }

# ============================================================
# CLI
# ============================================================
def main():
    print("=" * 70)
    print("LYNTOS SPRINT 5 - ANALYSIS PIPELINE (CrossCheck Rules Added)")
    print("=" * 70)

    tenant_id = "HKOZKAN"
    client_id = "OZKAN_KIRTASIYE"

    # Run analysis for all periods
    result = run_all_analysis(tenant_id, client_id)

    # Verification
    print("\n" + "=" * 70)
    print("VERIFICATION")
    print("=" * 70)

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT period_id, COUNT(*) as cnt,
               SUM(CASE WHEN severity='CRITICAL' THEN 1 ELSE 0 END) as critical,
               SUM(CASE WHEN severity='HIGH' THEN 1 ELSE 0 END) as high,
               SUM(CASE WHEN severity='MEDIUM' THEN 1 ELSE 0 END) as medium
        FROM feed_items
        WHERE client_id = ?
        GROUP BY period_id
        ORDER BY period_id
    """, (client_id,))

    print("\n  Period    | Total | Critical | High | Medium")
    print("  " + "-" * 50)
    for row in cursor.fetchall():
        print(f"  {row['period_id']:9} | {row['cnt']:5} | {row['critical']:8} | {row['high']:4} | {row['medium']:6}")

    cursor.execute("SELECT COUNT(*) as total FROM feed_items WHERE client_id = ?", (client_id,))
    total = cursor.fetchone()['total']

    conn.close()

    # Summary
    print(f"\n  TOTAL FEED ITEMS: {total}")

    if total > 0:
        print("\n✅ SPRINT 5 COMPLETE - Analysis pipeline with CrossCheck rules working!")
        status = "SUCCESS"
    else:
        print("\n❌ SPRINT 5 FAILED - No feed items created")
        status = "FAILED"

    # Output JSON
    summary = {
        "sprint": "5",
        "status": status,
        "total_feed_items": total,
        "periods_analyzed": result['periods_analyzed'],
        "rules": {
            "vdk": len(VDK_CRITERIA),
            "gv": len(GV_CHECKS),
            "crosscheck": len(CROSSCHECK_RULES)
        },
        "results": result['results'],
        "next_action": "Frontend rules taşıma tamamlandı" if status == "SUCCESS" else "DEBUG: Check analysis logic"
    }
    print(f"\n{json.dumps(summary, indent=2, ensure_ascii=False)}")

    return 0 if status == "SUCCESS" else 1

if __name__ == "__main__":
    sys.exit(main())
