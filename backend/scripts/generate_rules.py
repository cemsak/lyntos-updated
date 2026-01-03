#!/usr/bin/env python3
"""
Generate YAML rule files for LYNTOS Rule Library
"""

import os
from pathlib import Path

RULES_DIR = Path(__file__).parent.parent / "rules" / "registry"

RULES = [
    # VDK Risk Rules
    {
        "rule_id": "R-150",
        "name": "Stok Devir Hizi Analizi",
        "category": "VDK_RISK",
        "priority": "MEDIUM",
        "description": "Stok devir hizini sektör ortalamasiyla karsilastirir.",
        "legal_basis_refs": ["SRC-0048"],
        "inputs": [
            {"name": "stok_bakiye", "type": "decimal", "required": True, "description": "Stok bakiyesi"},
            {"name": "satis_maliyeti", "type": "decimal", "required": True, "description": "Satislarin maliyeti"}
        ],
        "algorithm": "devir = satis_maliyeti / stok_bakiye if stok_bakiye > 0 else 0\\nif devir < 2:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 2, "error": 1},
        "evidence": ["mizan_150.csv", "stok_raporu.pdf"],
        "tests": [
            {"name": "Normal", "inputs": {"stok_bakiye": 100000, "satis_maliyeti": 300000}, "expected": {"status": "ok"}},
            {"name": "Dusuk", "inputs": {"stok_bakiye": 200000, "satis_maliyeti": 300000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-191",
        "name": "Indirilecek KDV Kontrolu",
        "category": "KDV",
        "priority": "HIGH",
        "description": "Indirilecek KDV'nin satislara oranini kontrol eder.",
        "legal_basis_refs": ["SRC-0003"],
        "inputs": [
            {"name": "indirilecek_kdv", "type": "decimal", "required": True, "description": "191 Indirilecek KDV"},
            {"name": "hesaplanan_kdv", "type": "decimal", "required": True, "description": "391 Hesaplanan KDV"}
        ],
        "algorithm": "oran = indirilecek_kdv / hesaplanan_kdv if hesaplanan_kdv > 0 else 0\\nif oran > 0.95:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 0.95},
        "evidence": ["mizan_191.csv", "kdv_beyani.pdf"],
        "tests": [
            {"name": "Normal", "inputs": {"indirilecek_kdv": 80000, "hesaplanan_kdv": 100000}, "expected": {"status": "ok"}},
            {"name": "Yuksek", "inputs": {"indirilecek_kdv": 98000, "hesaplanan_kdv": 100000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-320",
        "name": "Borc Ozkaynak Orani",
        "category": "MIZAN",
        "priority": "MEDIUM",
        "description": "Borc/Ozkaynak oranini kontrol eder (finansal risk).",
        "legal_basis_refs": ["SRC-0001"],
        "inputs": [
            {"name": "toplam_borc", "type": "decimal", "required": True, "description": "Toplam borclar"},
            {"name": "ozkaynak", "type": "decimal", "required": True, "description": "Toplam ozkaynak"}
        ],
        "algorithm": "oran = toplam_borc / ozkaynak if ozkaynak > 0 else 999\\nif oran > 3:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 3, "error": 5},
        "evidence": ["bilanco.pdf"],
        "tests": [
            {"name": "Normal", "inputs": {"toplam_borc": 1000000, "ozkaynak": 500000}, "expected": {"status": "ok"}},
            {"name": "Yuksek", "inputs": {"toplam_borc": 2000000, "ozkaynak": 500000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-400",
        "name": "Sermaye Yeterlilik Kontrolu",
        "category": "KV_BRIDGE",
        "priority": "HIGH",
        "description": "Odenmi sermayenin yasal sinirin uzerinde olup olmadigini kontrol eder.",
        "legal_basis_refs": ["SRC-0001"],
        "inputs": [
            {"name": "odenmis_sermaye", "type": "decimal", "required": True, "description": "Odenmis sermaye"},
            {"name": "yasal_sinir", "type": "decimal", "required": True, "description": "Yasal asgari sermaye"}
        ],
        "algorithm": "if odenmis_sermaye < yasal_sinir:\\n  status = 'error'\\nelse:\\n  status = 'ok'",
        "thresholds": {"error": 50000},
        "evidence": ["ticaret_sicil.pdf"],
        "tests": [
            {"name": "Yeterli", "inputs": {"odenmis_sermaye": 100000, "yasal_sinir": 50000}, "expected": {"status": "ok"}},
            {"name": "Yetersiz", "inputs": {"odenmis_sermaye": 40000, "yasal_sinir": 50000}, "expected": {"status": "error"}}
        ]
    },
    {
        "rule_id": "R-600",
        "name": "Satis Trend Anomalisi",
        "category": "VDK_RISK",
        "priority": "MEDIUM",
        "description": "Satis trendinde ani dususleri tespit eder.",
        "legal_basis_refs": ["SRC-0034"],
        "inputs": [
            {"name": "cari_donem_satis", "type": "decimal", "required": True, "description": "Cari donem satis"},
            {"name": "onceki_donem_satis", "type": "decimal", "required": True, "description": "Onceki donem satis"}
        ],
        "algorithm": "degisim = (cari_donem_satis - onceki_donem_satis) / onceki_donem_satis if onceki_donem_satis > 0 else 0\\nif degisim < -0.30:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": -0.30},
        "evidence": ["satis_raporu.pdf"],
        "tests": [
            {"name": "Normal", "inputs": {"cari_donem_satis": 900000, "onceki_donem_satis": 1000000}, "expected": {"status": "ok"}},
            {"name": "Ani dusus", "inputs": {"cari_donem_satis": 600000, "onceki_donem_satis": 1000000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-646",
        "name": "Vergi Provizyon Kontrolu",
        "category": "KV_BRIDGE",
        "priority": "HIGH",
        "description": "Vergi karsiliginin hesaplanan vergiye uyumunu kontrol eder.",
        "legal_basis_refs": ["SRC-0001"],
        "inputs": [
            {"name": "vergi_karsiligi", "type": "decimal", "required": True, "description": "370 Vergi karsiligi"},
            {"name": "hesaplanan_vergi", "type": "decimal", "required": True, "description": "Hesaplanan KV"}
        ],
        "algorithm": "fark = abs(vergi_karsiligi - hesaplanan_vergi)\\nif fark > hesaplanan_vergi * 0.10:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 0.10},
        "evidence": ["mizan_370.csv"],
        "tests": [
            {"name": "Uyumlu", "inputs": {"vergi_karsiligi": 100000, "hesaplanan_vergi": 105000}, "expected": {"status": "ok"}},
            {"name": "Uyumsuz", "inputs": {"vergi_karsiligi": 100000, "hesaplanan_vergi": 150000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-679",
        "name": "Diger Gelirler Analizi",
        "category": "VDK_RISK",
        "priority": "MEDIUM",
        "description": "Diger gelirlerin olagandisi yuksekligini tespit eder.",
        "legal_basis_refs": ["SRC-0034"],
        "inputs": [
            {"name": "diger_gelirler", "type": "decimal", "required": True, "description": "679 Diger gelirler"},
            {"name": "toplam_gelir", "type": "decimal", "required": True, "description": "Toplam gelir"}
        ],
        "algorithm": "oran = diger_gelirler / toplam_gelir if toplam_gelir > 0 else 0\\nif oran > 0.20:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 0.20},
        "evidence": ["gelir_tablosu.pdf"],
        "tests": [
            {"name": "Normal", "inputs": {"diger_gelirler": 100000, "toplam_gelir": 1000000}, "expected": {"status": "ok"}},
            {"name": "Yuksek", "inputs": {"diger_gelirler": 300000, "toplam_gelir": 1000000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-770",
        "name": "Finansal Gelir Kontrolu",
        "category": "VDK_RISK",
        "priority": "LOW",
        "description": "Finansal gelirlerin uygunlugunu kontrol eder.",
        "legal_basis_refs": ["SRC-0001"],
        "inputs": [
            {"name": "finansal_gelir", "type": "decimal", "required": True, "description": "770 Finansal gelirler"},
            {"name": "ortalama_mevduat", "type": "decimal", "required": True, "description": "Ortalama mevduat"}
        ],
        "algorithm": "beklenen = ortalama_mevduat * 0.20\\nif finansal_gelir > beklenen * 1.5:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 1.5},
        "evidence": ["banka_faiz_dekont.pdf"],
        "tests": [
            {"name": "Normal", "inputs": {"finansal_gelir": 15000, "ortalama_mevduat": 100000}, "expected": {"status": "ok"}},
            {"name": "Yuksek", "inputs": {"finansal_gelir": 50000, "ortalama_mevduat": 100000}, "expected": {"status": "warning"}}
        ]
    },
    # KV Bridge Rules
    {
        "rule_id": "R-KV1",
        "name": "KKEG Para Cezasi Kontrolu",
        "category": "KV_BRIDGE",
        "priority": "HIGH",
        "description": "Para cezalarinin KKEG olarak eklenip eklenmedigini kontrol eder.",
        "legal_basis_refs": ["SRC-0026"],
        "inputs": [
            {"name": "para_cezasi", "type": "decimal", "required": True, "description": "Odenen para cezalari"},
            {"name": "kkeg_tutari", "type": "decimal", "required": True, "description": "Beyan edilen KKEG"}
        ],
        "algorithm": "if para_cezasi > 0 and para_cezasi not in kkeg_tutari:\\n  status = 'error'\\nelse:\\n  status = 'ok'",
        "thresholds": {},
        "evidence": ["para_cezasi_dekont.pdf", "kv_beyani.pdf"],
        "tests": [
            {"name": "Eklenmis", "inputs": {"para_cezasi": 10000, "kkeg_tutari": 50000}, "expected": {"status": "ok"}},
            {"name": "Eksik", "inputs": {"para_cezasi": 10000, "kkeg_tutari": 0}, "expected": {"status": "error"}}
        ]
    },
    {
        "rule_id": "R-KV2",
        "name": "KKEG Ortulu Sermaye Kontrolu",
        "category": "KV_BRIDGE",
        "priority": "HIGH",
        "description": "Ortulu sermaye faiz giderlerinin KKEG olarak eklenip eklenmedigini kontrol eder.",
        "legal_basis_refs": ["SRC-0001"],
        "inputs": [
            {"name": "ortak_borc", "type": "decimal", "required": True, "description": "Ortaklardan alinan borc"},
            {"name": "ozkaynak", "type": "decimal", "required": True, "description": "Ozkaynak"}
        ],
        "algorithm": "oran = ortak_borc / ozkaynak if ozkaynak > 0 else 0\\nif oran > 3:\\n  status = 'warning'\\n  reason = 'Ortulu sermaye riski'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 3},
        "evidence": ["ortak_borc_sozlesme.pdf"],
        "tests": [
            {"name": "Normal", "inputs": {"ortak_borc": 100000, "ozkaynak": 100000}, "expected": {"status": "ok"}},
            {"name": "Ortulu sermaye", "inputs": {"ortak_borc": 500000, "ozkaynak": 100000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-KV3",
        "name": "Istirak Kazanci Istisnasi",
        "category": "KV_BRIDGE",
        "priority": "MEDIUM",
        "description": "Istirak kazanclarinin istisna olarak beyan edilip edilmedigini kontrol eder.",
        "legal_basis_refs": ["SRC-0025"],
        "inputs": [
            {"name": "istirak_kazanci", "type": "decimal", "required": True, "description": "Istiraklerden kar payi"},
            {"name": "istisna_tutari", "type": "decimal", "required": True, "description": "Beyan edilen istisna"}
        ],
        "algorithm": "if istirak_kazanci > 0 and istisna_tutari < istirak_kazanci:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {},
        "evidence": ["kar_dagilim_karari.pdf"],
        "tests": [
            {"name": "Istisna uygulanmis", "inputs": {"istirak_kazanci": 100000, "istisna_tutari": 100000}, "expected": {"status": "ok"}},
            {"name": "Eksik istisna", "inputs": {"istirak_kazanci": 100000, "istisna_tutari": 50000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-KV4",
        "name": "Ar-Ge Indirimi Kontrolu",
        "category": "KV_BRIDGE",
        "priority": "MEDIUM",
        "description": "Ar-Ge indiriminin dogru hesaplanip hesaplanmadigini kontrol eder.",
        "legal_basis_refs": ["SRC-0014"],
        "inputs": [
            {"name": "arge_harcama", "type": "decimal", "required": True, "description": "Ar-Ge harcamalari"},
            {"name": "arge_indirimi", "type": "decimal", "required": True, "description": "Beyan edilen Ar-Ge indirimi"}
        ],
        "algorithm": "beklenen = arge_harcama * 1.00\\nif arge_indirimi > beklenen * 1.05:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 1.05},
        "evidence": ["arge_belgesi.pdf"],
        "tests": [
            {"name": "Dogru", "inputs": {"arge_harcama": 100000, "arge_indirimi": 100000}, "expected": {"status": "ok"}},
            {"name": "Fazla", "inputs": {"arge_harcama": 100000, "arge_indirimi": 120000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-KV5",
        "name": "Gecmis Zarar Mahsubu",
        "category": "KV_BRIDGE",
        "priority": "HIGH",
        "description": "Gecmis donem zararlarinin dogru mahsup edilip edilmedigini kontrol eder.",
        "legal_basis_refs": ["SRC-0001"],
        "inputs": [
            {"name": "gecmis_zarar", "type": "decimal", "required": True, "description": "Devir zararlari"},
            {"name": "mahsup_edilen", "type": "decimal", "required": True, "description": "Mahsup edilen zarar"},
            {"name": "mali_kar", "type": "decimal", "required": True, "description": "Cari donem mali kari"}
        ],
        "algorithm": "if mahsup_edilen > mali_kar:\\n  status = 'error'\\nelif mahsup_edilen > gecmis_zarar:\\n  status = 'error'\\nelse:\\n  status = 'ok'",
        "thresholds": {},
        "evidence": ["kv_beyani.pdf"],
        "tests": [
            {"name": "Dogru", "inputs": {"gecmis_zarar": 100000, "mahsup_edilen": 50000, "mali_kar": 80000}, "expected": {"status": "ok"}},
            {"name": "Fazla", "inputs": {"gecmis_zarar": 100000, "mahsup_edilen": 150000, "mali_kar": 80000}, "expected": {"status": "error"}}
        ]
    },
    # Gecici Vergi Rules
    {
        "rule_id": "R-GV1",
        "name": "Gecici Vergi Q1 Kontrolu",
        "category": "GVK",
        "priority": "HIGH",
        "description": "Q1 gecici vergi hesaplamasini kontrol eder (Kar x 4).",
        "legal_basis_refs": ["SRC-0023"],
        "inputs": [
            {"name": "q1_kar", "type": "decimal", "required": True, "description": "Q1 kari"},
            {"name": "beyan_edilen", "type": "decimal", "required": True, "description": "Beyan edilen gecici vergi"}
        ],
        "algorithm": "yillik_tahmin = q1_kar * 4\\nhesaplanan = yillik_tahmin * 0.25\\nfark = abs(beyan_edilen - hesaplanan)\\nif fark > hesaplanan * 0.05:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 0.05},
        "evidence": ["gecici_vergi_beyani.pdf"],
        "tests": [
            {"name": "Dogru", "inputs": {"q1_kar": 100000, "beyan_edilen": 100000}, "expected": {"status": "ok"}},
            {"name": "Farkli", "inputs": {"q1_kar": 100000, "beyan_edilen": 80000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-GV2",
        "name": "Gecici Vergi Q2 Kontrolu",
        "category": "GVK",
        "priority": "HIGH",
        "description": "Q2 gecici vergi hesaplamasini kontrol eder ((Q1+Q2) x 2).",
        "legal_basis_refs": ["SRC-0023"],
        "inputs": [
            {"name": "q1_kar", "type": "decimal", "required": True, "description": "Q1 kari"},
            {"name": "q2_kar", "type": "decimal", "required": True, "description": "Q2 kari"},
            {"name": "q1_odeme", "type": "decimal", "required": True, "description": "Q1 odenen vergi"},
            {"name": "beyan_edilen", "type": "decimal", "required": True, "description": "Q2 beyan edilen vergi"}
        ],
        "algorithm": "toplam = q1_kar + q2_kar\\nyillik_tahmin = toplam * 2\\nhesaplanan = (yillik_tahmin * 0.25) - q1_odeme\\nfark = abs(beyan_edilen - hesaplanan)\\nif fark > abs(hesaplanan) * 0.05:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 0.05},
        "evidence": ["gecici_vergi_beyani.pdf"],
        "tests": [
            {"name": "Dogru", "inputs": {"q1_kar": 100000, "q2_kar": 110000, "q1_odeme": 100000, "beyan_edilen": 5000}, "expected": {"status": "ok"}},
            {"name": "Farkli", "inputs": {"q1_kar": 100000, "q2_kar": 110000, "q1_odeme": 100000, "beyan_edilen": 50000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-GV3",
        "name": "Gecici Vergi Q3 Kontrolu",
        "category": "GVK",
        "priority": "HIGH",
        "description": "Q3 gecici vergi hesaplamasini kontrol eder ((Q1+Q2+Q3) x 1.33).",
        "legal_basis_refs": ["SRC-0023"],
        "inputs": [
            {"name": "toplam_kar", "type": "decimal", "required": True, "description": "9 aylik toplam kar"},
            {"name": "onceki_odemeler", "type": "decimal", "required": True, "description": "Q1+Q2 odenen vergi"},
            {"name": "beyan_edilen", "type": "decimal", "required": True, "description": "Q3 beyan edilen vergi"}
        ],
        "algorithm": "yillik_tahmin = toplam_kar * 1.33\\nhesaplanan = (yillik_tahmin * 0.25) - onceki_odemeler\\nfark = abs(beyan_edilen - hesaplanan)\\nif fark > abs(hesaplanan) * 0.05:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 0.05},
        "evidence": ["gecici_vergi_beyani.pdf"],
        "tests": [
            {"name": "Dogru", "inputs": {"toplam_kar": 300000, "onceki_odemeler": 50000, "beyan_edilen": 50000}, "expected": {"status": "ok"}},
            {"name": "Farkli", "inputs": {"toplam_kar": 300000, "onceki_odemeler": 50000, "beyan_edilen": 10000}, "expected": {"status": "warning"}}
        ]
    },
    # TMS / Enflasyon
    {
        "rule_id": "R-TMS",
        "name": "Enflasyon Duzeltme Kontrolu",
        "category": "INFLATION",
        "priority": "HIGH",
        "description": "Enflasyon duzeltmesi uygulanip uygulanmadigini kontrol eder.",
        "legal_basis_refs": ["SRC-0006"],
        "inputs": [
            {"name": "yiufe_3yil", "type": "decimal", "required": True, "description": "3 yillik Yi-UFE artisi"},
            {"name": "duzeltme_yapildi", "type": "boolean", "required": True, "description": "Duzeltme yapildi mi"}
        ],
        "algorithm": "if yiufe_3yil >= 1.0 and not duzeltme_yapildi:\\n  status = 'error'\\nelse:\\n  status = 'ok'",
        "thresholds": {"threshold": 1.0},
        "evidence": ["enflasyon_duzeltme_raporu.pdf"],
        "tests": [
            {"name": "Yapilmis", "inputs": {"yiufe_3yil": 1.5, "duzeltme_yapildi": True}, "expected": {"status": "ok"}},
            {"name": "Yapilmamis", "inputs": {"yiufe_3yil": 1.5, "duzeltme_yapildi": False}, "expected": {"status": "error"}}
        ]
    },
    # VUK / SGK
    {
        "rule_id": "R-VUK",
        "name": "Defter Beyan Tutarliligi",
        "category": "VDK_RISK",
        "priority": "HIGH",
        "description": "E-Defter ve beyanname tutarliligini kontrol eder.",
        "legal_basis_refs": ["SRC-0013"],
        "inputs": [
            {"name": "edefter_toplam", "type": "decimal", "required": True, "description": "E-Defter toplam"},
            {"name": "beyan_toplam", "type": "decimal", "required": True, "description": "Beyanname toplam"}
        ],
        "algorithm": "fark = abs(edefter_toplam - beyan_toplam)\\nif fark > 100:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"absolute": 100},
        "evidence": ["edefter_beratlar.pdf", "beyanname.pdf"],
        "tests": [
            {"name": "Tutarli", "inputs": {"edefter_toplam": 1000000, "beyan_toplam": 1000000}, "expected": {"status": "ok"}},
            {"name": "Tutarsiz", "inputs": {"edefter_toplam": 1000000, "beyan_toplam": 1001000}, "expected": {"status": "warning"}}
        ]
    },
    {
        "rule_id": "R-SGK",
        "name": "SGK Prim Provizyon Kontrolu",
        "category": "SGK",
        "priority": "MEDIUM",
        "description": "SGK prim karsiliginin dogru ayrilip ayrilmadigini kontrol eder.",
        "legal_basis_refs": ["SRC-0016"],
        "inputs": [
            {"name": "sgk_borcu", "type": "decimal", "required": True, "description": "SGK borc bakiyesi"},
            {"name": "prim_karsiligi", "type": "decimal", "required": True, "description": "Ayrilan prim karsiligi"}
        ],
        "algorithm": "if sgk_borcu > 0 and prim_karsiligi < sgk_borcu * 0.9:\\n  status = 'warning'\\nelse:\\n  status = 'ok'",
        "thresholds": {"warning": 0.9},
        "evidence": ["sgk_borc_dokumu.pdf"],
        "tests": [
            {"name": "Yeterli", "inputs": {"sgk_borcu": 100000, "prim_karsiligi": 100000}, "expected": {"status": "ok"}},
            {"name": "Yetersiz", "inputs": {"sgk_borcu": 100000, "prim_karsiligi": 50000}, "expected": {"status": "warning"}}
        ]
    },
]


def generate_yaml(rule):
    """Generate YAML content for a rule"""
    inputs_yaml = ""
    for inp in rule["inputs"]:
        inputs_yaml += f"""
  - name: {inp["name"]}
    type: {inp["type"]}
    required: {str(inp["required"]).lower()}
    description: "{inp["description"]}" """

    tests_yaml = ""
    for test in rule["tests"]:
        inputs_str = ", ".join([f"{k}: {v}" for k, v in test["inputs"].items()])
        expected_str = ", ".join([f"{k}: {v}" for k, v in test["expected"].items()])
        tests_yaml += f"""
  - name: "{test["name"]}"
    inputs:
      {chr(10).join([f'      {k}: {v}' for k, v in test["inputs"].items()]).strip()}
    expected:
      {chr(10).join([f'      {k}: "{v}"' if isinstance(v, str) else f'      {k}: {v}' for k, v in test["expected"].items()]).strip()}"""

    thresholds_yaml = ""
    if rule["thresholds"]:
        thresholds_yaml = "thresholds:"
        for k, v in rule["thresholds"].items():
            thresholds_yaml += f"\\n  {k}: {v}"
    else:
        thresholds_yaml = "thresholds: {}"

    evidence_yaml = "\\n  - ".join(rule["evidence"])

    yaml_content = f'''rule_id: {rule["rule_id"]}
name: "{rule["name"]}"
version: "1.0.0"
category: "{rule["category"]}"
priority: "{rule["priority"]}"
description: |
  {rule["description"]}

legal_basis_refs:
  - {rule["legal_basis_refs"][0]}

inputs:{inputs_yaml}

algorithm: |
  {rule["algorithm"].replace(chr(92) + "n", chr(10) + "  ")}

{thresholds_yaml}

evidence_required:
  - {evidence_yaml}

test_cases:{tests_yaml}

created_at: "2026-01-01T00:00:00Z"
updated_at: "2026-01-01T00:00:00Z"
'''
    return yaml_content


def main():
    for rule in RULES:
        filename = f"{rule['rule_id']}_{rule['name'].lower().replace(' ', '_').replace('-', '_')[:20]}.yaml"
        filepath = RULES_DIR / filename

        yaml_content = generate_yaml(rule)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(yaml_content)

        print(f"Created: {filename}")

    print(f"\\nTotal rules created: {len(RULES)}")


if __name__ == "__main__":
    main()
