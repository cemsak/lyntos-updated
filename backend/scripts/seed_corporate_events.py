#!/usr/bin/env python3
"""
Seed Corporate Event Types for LYNTOS
Sprint S1 - Sirketler Hukuku (Corporate Law)

Seeds the corporate_event_types table with TTK (Turkish Commercial Code) operations:
- Kurulus (establishment)
- Birlesme (merger)
- Bolunme (demerger)
- Tur degistirme (type change)
- Sermaye islemleri (capital operations)
- Tasfiye (liquidation)

Usage:
    python scripts/seed_corporate_events.py
"""

import sys
import uuid
import json
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection


# Corporate Event Types - Turkish Commercial Code Operations
CORPORATE_EVENT_TYPES = [
    # ============================================
    # KURULUS (Establishment)
    # ============================================
    {
        "event_code": "establishment_as",
        "event_name": "Anonim Sirket Kurulusu",
        "company_types": ["as"],
        "required_documents": [
            "MERSIS basvurusu ve randevu",
            "Dilekce (NACE kodlu, yetkili imzali)",
            "Esas sozlesme (3 nusha, noter onayli)",
            "Kurucu beyani",
            "Imza beyannamesi (noter veya ticaret sicil)",
            "Oda kayit beyannamesi",
            "Sermaye bloke yazisi (min %25 = 62.500 TL)",
            "Rekabet Kurumu payi (sermayenin 0.04%)",
            "Ayni sermaye varsa: Bilirkisi raporu + mahkeme karari"
        ],
        "gk_quorum": None,
        "registration_deadline": 15,
        "legal_basis": "TTK 335-353",
        "tax_implications": {
            "kv_istisna": False,
            "kdv_istisna": False,
            "damga_vergisi": "binde 9.48",
            "harc": "var"
        },
        "min_capital": 250000,
        "notes": "Asgari sermaye 01.01.2024'ten itibaren 250.000 TL"
    },
    {
        "event_code": "establishment_ltd",
        "event_name": "Limited Sirket Kurulusu",
        "company_types": ["ltd"],
        "required_documents": [
            "MERSIS basvurusu",
            "Dilekce",
            "Sirket sozlesmesi (3 nusha, noter onayli)",
            "Kurucu beyani",
            "Ortaklarin imza beyannamesi",
            "Mudurlerin imza beyannamesi",
            "Oda kayit beyannamesi",
            "Sermaye bloke yazisi (min %25 = 12.500 TL)",
            "Rekabet Kurumu payi"
        ],
        "gk_quorum": None,
        "registration_deadline": 15,
        "legal_basis": "TTK 573-644",
        "tax_implications": {
            "kv_istisna": False,
            "kdv_istisna": False,
            "damga_vergisi": "binde 9.48"
        },
        "min_capital": 50000,
        "notes": "Asgari sermaye 01.01.2024'ten itibaren 50.000 TL"
    },

    # ============================================
    # BIRLESME (Merger)
    # ============================================
    {
        "event_code": "merger_acquisition",
        "event_name": "Devralma Seklinde Birlesme",
        "company_types": ["as", "ltd", "koop"],
        "required_documents": [
            "Birlesme sozlesmesi (noter onayli)",
            "Birlesme raporu (YK/Mudurler hazirlar)",
            "Genel kurul kararlari (her iki sirket)",
            "Son 3 yil finansal tablolar ve faaliyet raporlari",
            "Devir bilancosu (6 aydan eski olmayan)",
            "YMM/SMMM raporu (ozvarlik tespiti)",
            "Alacaklilara cagri ilanlari (3 kez, 7'ser gun arayla)",
            "Bakanlik temsilcisi talep yazisi"
        ],
        "gk_quorum": {
            "as": {"meeting": "1/2", "decision": "2/3"},
            "ltd": {"meeting": None, "decision": "2/3 oy + salt cogunluk sermaye"}
        },
        "registration_deadline": 15,
        "legal_basis": "TTK 136-158, KVK 19-20",
        "tax_implications": {
            "kv_istisna": True,
            "kdv_istisna": True,
            "damga_vergisi": "istisna",
            "harc": "istisna",
            "note": "KVK 19-20 sartlari saglanirsa vergisiz. 7524 ile devreden KDV inceleme sartina bagli (02.08.2024+)"
        },
        "min_capital": None,
        "notes": "Devralma birlesme: devralan sirket varligini surduruyor"
    },
    {
        "event_code": "merger_new_formation",
        "event_name": "Yeni Kurulus Seklinde Birlesme",
        "company_types": ["as", "ltd", "koop"],
        "required_documents": [
            "Birlesme sozlesmesi (noter onayli)",
            "Birlesme raporu",
            "Yeni sirket esas sozlesmesi",
            "Genel kurul kararlari (tum katilan sirketler)",
            "Son 3 yil finansal tablolar",
            "YMM/SMMM raporu",
            "Alacaklilara cagri ilanlari"
        ],
        "gk_quorum": {
            "as": {"meeting": "1/2", "decision": "2/3"},
            "ltd": {"meeting": None, "decision": "2/3 oy + salt cogunluk sermaye"}
        },
        "registration_deadline": 15,
        "legal_basis": "TTK 136-158",
        "tax_implications": {
            "kv_istisna": True,
            "kdv_istisna": True,
            "damga_vergisi": "istisna"
        },
        "min_capital": None,
        "notes": "Yeni kurulus birlesme: tum sirketler sona erer, yeni sirket olusur"
    },

    # ============================================
    # BOLUNME (Demerger)
    # ============================================
    {
        "event_code": "demerger_full",
        "event_name": "Tam Bolunme",
        "company_types": ["as", "ltd", "koop"],
        "required_documents": [
            "Bolunme sozlesmesi veya plani",
            "Bolunme raporu",
            "Genel kurul karari",
            "Bolunme bilancosu",
            "YMM/SMMM raporu",
            "Alacaklilara cagri ilanlari",
            "Malvarligi dagilim listesi"
        ],
        "gk_quorum": {
            "as": {"meeting": "1/2", "decision": "3/4"},
            "ltd": {"meeting": None, "decision": "3/4 oy + 2/3 sermaye"}
        },
        "registration_deadline": 15,
        "legal_basis": "TTK 159-179",
        "tax_implications": {
            "kv_istisna": True,
            "kdv_istisna": True,
            "note": "Bolunen sirket sona erer, malvarligi en az 2 sirkete gecer"
        },
        "min_capital": None,
        "notes": "Bolunen sirket tum malvarligini devreder ve sona erer"
    },
    {
        "event_code": "demerger_partial",
        "event_name": "Kismi Bolunme",
        "company_types": ["as", "ltd", "koop"],
        "required_documents": [
            "Bolunme sozlesmesi veya plani",
            "Bolunme raporu",
            "Genel kurul karari",
            "Bolunme bilancosu",
            "YMM/SMMM raporu",
            "Devredilecek malvarligi listesi"
        ],
        "gk_quorum": {
            "as": {"meeting": "1/2", "decision": "3/4"},
            "ltd": {"meeting": None, "decision": "3/4 oy + 2/3 sermaye"}
        },
        "registration_deadline": 15,
        "legal_basis": "TTK 159-179, KVK 19",
        "tax_implications": {
            "kv_istisna": True,
            "kdv_istisna": True,
            "note": "UYARI: 01.01.2024'ten itibaren TASINMAZLAR kismi bolunme kapsamından CIKARILDI (7456 sayili Kanun)"
        },
        "min_capital": None,
        "notes": "Bolunen sirket devam eder, malvarliginin bir kismini devreder"
    },

    # ============================================
    # TUR DEGISTIRME (Type Change)
    # ============================================
    {
        "event_code": "type_change_ltd_to_as",
        "event_name": "Ltd.S. -> A.S. Tur Degistirme",
        "company_types": ["ltd"],
        "required_documents": [
            "Tur degistirme plani",
            "Tur degistirme raporu (opsiyonel - tum ortaklar onaylarsa)",
            "Yeni A.S. esas sozlesmesi (3 nusha)",
            "Ortaklar kurulu karari (noter onayli)",
            "YMM/SMMM raporu (ozvarlik tespiti)",
            "Guncel bilanco (6 aydan yeni)",
            "Ortaklar listesi",
            "YK uyelerinin imza beyannamesi",
            "Bakanlik temsilcisi talep yazisi"
        ],
        "gk_quorum": {
            "ltd": {"meeting": None, "decision": "2/3 oy + salt cogunluk sermaye"}
        },
        "registration_deadline": 15,
        "legal_basis": "TTK 180-190, KVK 19-20",
        "tax_implications": {
            "kv_istisna": True,
            "kdv_istisna": True,
            "damga_vergisi": "istisna",
            "note": "Devir hukmunde, vergisiz. Sermaye min 250.000 TL olmali."
        },
        "min_capital": 250000,
        "notes": "Limited sirket anonim sirkete donusuyor"
    },
    {
        "event_code": "type_change_as_to_ltd",
        "event_name": "A.S. -> Ltd.S. Tur Degistirme",
        "company_types": ["as"],
        "required_documents": [
            "Tur degistirme plani",
            "Tur degistirme raporu",
            "Yeni Ltd. sirket sozlesmesi",
            "Genel kurul karari (noter onayli)",
            "YMM/SMMM raporu",
            "Guncel bilanco",
            "Ortaklar listesi",
            "Mudur imza beyannamesi"
        ],
        "gk_quorum": {
            "as": {"meeting": "1/2", "decision": "2/3"}
        },
        "registration_deadline": 15,
        "legal_basis": "TTK 180-190",
        "tax_implications": {
            "kv_istisna": True,
            "kdv_istisna": True
        },
        "min_capital": 50000,
        "notes": "Anonim sirket limited sirkete donusuyor"
    },

    # ============================================
    # SERMAYE ISLEMLERI (Capital Operations)
    # ============================================
    {
        "event_code": "capital_increase",
        "event_name": "Sermaye Artirimi",
        "company_types": ["as", "ltd"],
        "required_documents": [
            "Dilekce",
            "GK/Ortaklar kurulu karari (noter onayli)",
            "Tadil tasarisi (2 nusha)",
            "YK/Mudur sermaye artirimi beyani",
            "Banka bloke mektubu + dekont (min %25)",
            "Rekabet Kurumu payi (artirilan sermayenin 0.04%)",
            "YMM/SMMM raporu (ozsermaye tespiti)",
            "Bakanlik izni (gerekli sirketlerde)"
        ],
        "gk_quorum": {
            "as": {"meeting": "1/2", "decision": "2/3"},
            "ltd": {"meeting": None, "decision": "2/3 oy + salt cogunluk"}
        },
        "registration_deadline": 30,
        "legal_basis": "TTK 456-472",
        "tax_implications": {
            "damga_vergisi": "binde 9.48",
            "note": "3 ay icinde tescil edilmezse GK karari gecersiz olur!"
        },
        "min_capital": None,
        "notes": "Tescil 3 ay icinde yapilmali, aksi halde GK karari gecersiz"
    },
    {
        "event_code": "capital_decrease",
        "event_name": "Sermaye Azaltimi",
        "company_types": ["as", "ltd"],
        "required_documents": [
            "Dilekce",
            "GK karari (noter onayli)",
            "YK sermaye azaltim raporu (amac, kapsam, yontem)",
            "Denetci/YMM/SMMM raporu (aktif tespiti)",
            "Tadil tasarisi",
            "Alacaklilara cagri ilanlari (3 kez, 7'ser gun arayla)",
            "Alacaklarin odendigi/teminata baglandigina dair belgeler"
        ],
        "gk_quorum": {
            "as": {"meeting": "1/2", "decision": "2/3"},
            "ltd": {"meeting": None, "decision": "2/3 oy + salt cogunluk"}
        },
        "registration_deadline": None,
        "legal_basis": "TTK 473-475",
        "tax_implications": {
            "note": "Zarar karsilama amacliysa alacaklilara cagridan vazgecilebilir (TTK 474/2)"
        },
        "min_capital": None,
        "notes": "Alacaklilara 3 kez cagri zorunlu (zarar karsilama haric)"
    },
    {
        "event_code": "capital_simultaneous",
        "event_name": "Es Zamanli Sermaye Azaltimi ve Artirimi",
        "company_types": ["as", "ltd"],
        "required_documents": [
            "Dilekce",
            "GK karari (azaltim + artirim birlikte)",
            "YK azaltim raporu",
            "YMM/SMMM raporu (ozvarlik tespiti)",
            "Tadil tasarisi",
            "Banka bloke mektubu (asan kisim icin min %25)",
            "Bakanlik izni (gerekli sirketlerde)"
        ],
        "gk_quorum": {
            "as": {"meeting": "1/2", "decision": "2/3"},
            "ltd": {"meeting": None, "decision": "2/3 oy + salt cogunluk"}
        },
        "registration_deadline": None,
        "legal_basis": "TTK 475, Ticaret Sicili Yonetmeligi 81",
        "tax_implications": {
            "note": "TTK 376 kapsaminda sermaye kaybi giderme icin kullanilir"
        },
        "min_capital": None,
        "notes": "TTK 376 sermaye kaybi durumlarinda tercih edilen yontem"
    },

    # ============================================
    # TASFIYE (Liquidation)
    # ============================================
    {
        "event_code": "liquidation_start",
        "event_name": "Tasfiye Baslangic",
        "company_types": ["as", "ltd"],
        "required_documents": [
            "Dilekce",
            "GK karari (noter onayli)",
            "Tasfiye memuru secimi karari",
            "Tasfiye memurunun imza beyannamesi",
            "Tasfiye acilis bilancosu",
            "Mal beyannamesi"
        ],
        "gk_quorum": {
            "as": {"meeting": "1/4", "decision": "1/2"},
            "ltd": {"meeting": None, "decision": "salt cogunluk"}
        },
        "registration_deadline": 15,
        "legal_basis": "TTK 529-548",
        "tax_implications": {},
        "min_capital": None,
        "notes": "Tasfiye sureci baslar, sirket unvani 'tasfiye halinde' ibaresi alir"
    },
    {
        "event_code": "liquidation_end",
        "event_name": "Tasfiye Sonu Kapanis",
        "company_types": ["as", "ltd"],
        "required_documents": [
            "Dilekce",
            "GK karari (kapanis onayi)",
            "Son ve kesin bilanco",
            "Alacaklilara cagri ilanlarinin yayimlandigina dair TTSG ornekleri",
            "Vergi dairesi yazisi (borc yoktur)",
            "SGK yazisi (prim borcu yoktur)"
        ],
        "gk_quorum": None,
        "registration_deadline": None,
        "legal_basis": "TTK 545",
        "tax_implications": {},
        "min_capital": None,
        "notes": "Sirket tuzel kisiligi sona erer"
    },

    # ============================================
    # HISSE DEVRI (Share Transfer)
    # ============================================
    {
        "event_code": "share_transfer_ltd",
        "event_name": "Limited Sirket Hisse Devri",
        "company_types": ["ltd"],
        "required_documents": [
            "Dilekce",
            "Ortaklar kurulu onay karari (noter onayli)",
            "Pay devir sozlesmesi (noter onayli - ZORUNLU)",
            "Guncel ortaklar listesi",
            "Yeni ortakin kimlik fotokopisi"
        ],
        "gk_quorum": {
            "ltd": {"meeting": None, "decision": "salt cogunluk oy + salt cogunluk sermaye"}
        },
        "registration_deadline": None,
        "legal_basis": "TTK 595",
        "tax_implications": {
            "damga_vergisi": "binde 9.48 (devir bedeli uzerinden)",
            "note": "2 yildan fazla elde tutulan hisse satisinda GV yok (GVK muk.80)"
        },
        "min_capital": None,
        "notes": "Limited sirket paylari devrinde noter tasdiki zorunlu"
    },

    # ============================================
    # ASGARI SERMAYE TAMAMLAMA (7511)
    # ============================================
    {
        "event_code": "min_capital_compliance",
        "event_name": "Asgari Sermaye Tamamlama (7511)",
        "company_types": ["as", "ltd"],
        "required_documents": [
            "Dilekce",
            "GK karari",
            "Tadil tasarisi",
            "Banka bloke mektubu",
            "YMM/SMMM raporu"
        ],
        "gk_quorum": {
            "as": {"meeting": "nisap aranmaz", "decision": "mevcut oylarin cogunlugu"},
            "ltd": {"meeting": "nisap aranmaz", "decision": "mevcut oylarin cogunlugu"}
        },
        "registration_deadline": None,
        "legal_basis": "7511 sayili Kanun, TTK gecici 15",
        "tax_implications": {
            "note": "Imtiyazli paylar aleyhine kullanilamaz. Yapilmazsa 31.12.2026'da sirket infisah etmis sayilir."
        },
        "min_capital": None,
        "notes": "A.S. min 250.000 TL, Ltd. min 50.000 TL - Son tarih: 31.12.2026"
    },
]


def seed_corporate_event_types():
    """Insert all corporate event types into the database."""
    created_count = 0
    skipped_count = 0

    with get_connection() as conn:
        cursor = conn.cursor()

        try:
            for event_type in CORPORATE_EVENT_TYPES:
                event_id = str(uuid.uuid4())

                # Check if event code already exists
                cursor.execute("""
                    SELECT id FROM corporate_event_types WHERE event_code = ?
                """, (event_type["event_code"],))

                existing = cursor.fetchone()

                if existing:
                    print(f"  Skipped (exists): {event_type['event_code']}")
                    skipped_count += 1
                    continue

                # Insert new event type
                cursor.execute("""
                    INSERT INTO corporate_event_types (
                        id, event_code, event_name, company_types, required_documents,
                        gk_quorum, registration_deadline, legal_basis, tax_implications,
                        min_capital, notes, is_active, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                """, (
                    event_id,
                    event_type["event_code"],
                    event_type["event_name"],
                    json.dumps(event_type.get("company_types", []), ensure_ascii=False),
                    json.dumps(event_type.get("required_documents", []), ensure_ascii=False),
                    json.dumps(event_type.get("gk_quorum"), ensure_ascii=False) if event_type.get("gk_quorum") else None,
                    event_type.get("registration_deadline"),
                    event_type.get("legal_basis"),
                    json.dumps(event_type.get("tax_implications", {}), ensure_ascii=False),
                    event_type.get("min_capital"),
                    event_type.get("notes"),
                    datetime.now().isoformat()
                ))
                created_count += 1
                print(f"  Created: {event_type['event_code']} - {event_type['event_name']}")

            conn.commit()
            print(f"\n{'='*60}")
            print(f"Corporate Event Types Seed Complete!")
            print(f"  Created: {created_count}")
            print(f"  Skipped: {skipped_count}")
            print(f"  Total:   {len(CORPORATE_EVENT_TYPES)}")
            print(f"{'='*60}")

        except Exception as e:
            conn.rollback()
            print(f"Error seeding corporate event types: {e}")
            raise


def main():
    """Main entry point."""
    print("="*60)
    print("LYNTOS Corporate Event Types Seed Script")
    print("Sprint S1 - Sirketler Hukuku (Corporate Law)")
    print("="*60)
    print()

    print("Seeding Corporate Event Types...")
    seed_corporate_event_types()

    print()
    print("Seed complete!")


if __name__ == "__main__":
    main()
