"""
LYNTOS 2026 Tax Parameters Seed Script
========================================
tax_parameters ve deadline_calendar tablolarını 2026 verileriyle doldurur.
Idempotent: INSERT OR REPLACE kullanır, tekrar çalıştırılabilir.

Kullanım:
  cd /Users/cemsak/lyntos/backend
  .venv/bin/python scripts/seed_tax_parameters_2026.py
"""

import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database.db import get_connection, init_database


def seed_tax_parameters():
    """tax_parameters tablosuna 2026 verilerini yükle"""

    # Önce DB'yi initialize et (yoksa tabloları oluşturur)
    init_database()

    params = []

    # ═══════════════════════════════════════════════════════════
    # 1. GELİR VERGİSİ DİLİMLERİ (GVK Md. 103)
    # ═══════════════════════════════════════════════════════════
    dilimler = [
        ("gv_dilim_1", 15, {"min": 0, "max": 158000, "kumulatif": 23700}),
        ("gv_dilim_2", 20, {"min": 158000, "max": 330000, "kumulatif": 58100}),
        ("gv_dilim_3", 27, {"min": 330000, "max": 800000, "kumulatif": 185000}),
        ("gv_dilim_4", 35, {"min": 800000, "max": 4300000, "kumulatif": 1410000}),
        ("gv_dilim_5", 40, {"min": 4300000, "max": None}),
    ]
    for key, oran, meta in dilimler:
        params.append({
            "id": f"TP-GV-{key}-2026",
            "category": "gelir_vergisi_dilimleri",
            "param_key": key,
            "param_value": oran,
            "param_unit": "%",
            "valid_from": "2026-01-01",
            "valid_until": "2026-12-31",
            "legal_reference": "GVK Md. 103",
            "source_url": "https://www.mevzuat.gov.tr/MevzuatMetin/1.4.193.pdf",
            "description": f"Gelir vergisi %{oran} dilimi",
            "metadata": json.dumps(meta)
        })

    # ═══════════════════════════════════════════════════════════
    # 2. KURUMLAR VERGİSİ (KVK Md. 32)
    # ═══════════════════════════════════════════════════════════
    kv_params = [
        ("kv_genel", 25, "Genel oran", "KVK Md. 32"),
        ("kv_gecici", 25, "Geçici vergi oranı", "KVK Md. 32"),
        ("kv_ihracat", 20, "İhracat kazanç indirimi", "KVK Md. 32/7"),
    ]
    for key, val, desc, ref in kv_params:
        params.append({
            "id": f"TP-KV-{key}-2026", "category": "kurumlar_vergisi",
            "param_key": key, "param_value": val, "param_unit": "%",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": ref, "description": desc, "metadata": "{}"
        })

    # ═══════════════════════════════════════════════════════════
    # 3. KDV ORANLARI (KDVK Md. 28)
    # ═══════════════════════════════════════════════════════════
    kdv_params = [
        ("kdv_genel", 20, "Genel KDV oranı"),
        ("kdv_indirimli_1", 10, "İndirimli KDV oranı I"),
        ("kdv_indirimli_2", 1, "İndirimli KDV oranı II"),
    ]
    for key, val, desc in kdv_params:
        params.append({
            "id": f"TP-KDV-{key}-2026", "category": "kdv_oranlari",
            "param_key": key, "param_value": val, "param_unit": "%",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": "KDVK Md. 28", "description": desc, "metadata": "{}"
        })

    # ═══════════════════════════════════════════════════════════
    # 4. KDV TEVKİFAT ORANLARI (KDVK Md. 9)
    # ═══════════════════════════════════════════════════════════
    tevkifat = [
        ("kdv_tevk_2_10", 20, "Temizlik, bahçe bakım, çevre", {"pay": 2, "payda": 10}),
        ("kdv_tevk_4_10", 40, "Makine/teçhizat bakım onarım", {"pay": 4, "payda": 10}),
        ("kdv_tevk_5_10", 50, "Yapım işleri, etüt-proje", {"pay": 5, "payda": 10}),
        ("kdv_tevk_7_10", 70, "İşgücü temin hizmetleri", {"pay": 7, "payda": 10}),
        ("kdv_tevk_9_10", 90, "Hurda metal teslimleri", {"pay": 9, "payda": 10}),
    ]
    for key, val, desc, meta in tevkifat:
        params.append({
            "id": f"TP-KDVT-{key}-2026", "category": "kdv_tevkifat",
            "param_key": key, "param_value": val, "param_unit": "%",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": "KDVK Md. 9", "description": desc,
            "metadata": json.dumps(meta)
        })

    # ═══════════════════════════════════════════════════════════
    # 5. STOPAJ ORANLARI (GVK Md. 94, KVK Md. 15)
    # ═══════════════════════════════════════════════════════════
    stopaj = [
        ("stopaj_kar_payi", 10, "Kâr payı (temettü)", "KVK Md. 15"),
        ("stopaj_gayrimenkul", 20, "Gayrimenkul sermaye iradı", "GVK Md. 94"),
        ("stopaj_serbest_meslek", 20, "Serbest meslek kazancı", "GVK Md. 94"),
        ("stopaj_kira_gv", 20, "GV mükelleflerine ödenen kira", "GVK Md. 94"),
        ("stopaj_kira_basit", 20, "Basit usul / GV'den muaf kira", "GVK Md. 94"),
    ]
    for key, val, desc, ref in stopaj:
        params.append({
            "id": f"TP-STOP-{key}-2026", "category": "stopaj_oranlari",
            "param_key": key, "param_value": val, "param_unit": "%",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": ref, "description": desc, "metadata": "{}"
        })

    # ═══════════════════════════════════════════════════════════
    # 6. DAMGA VERGİSİ (488 SK)
    # ═══════════════════════════════════════════════════════════
    params.append({
        "id": "TP-DV-sozlesme-2026", "category": "damga_vergisi",
        "param_key": "damga_sozlesme", "param_value": 9.48, "param_unit": "‰",
        "valid_from": "2026-01-01", "valid_until": "2026-12-31",
        "legal_reference": "488 SK", "description": "Sözleşme damga vergisi oranı (binde)",
        "metadata": json.dumps({"maas_bordrosu_binde": 7.59})
    })
    params.append({
        "id": "TP-DV-ust-sinir-2026", "category": "damga_vergisi",
        "param_key": "damga_ust_sinir", "param_value": 18200000, "param_unit": "TL",
        "valid_from": "2026-01-01", "valid_until": "2026-12-31",
        "legal_reference": "488 SK", "description": "Damga vergisi üst sınırı", "metadata": "{}"
    })

    # ═══════════════════════════════════════════════════════════
    # 7. GEÇİCİ VERGİ ORANLARI
    # ═══════════════════════════════════════════════════════════
    params.append({
        "id": "TP-GEC-gv-2026", "category": "gecici_vergi",
        "param_key": "gecici_gv", "param_value": 15, "param_unit": "%",
        "valid_from": "2026-01-01", "valid_until": "2026-12-31",
        "legal_reference": "GVK Mük. 120", "description": "GV mükellefleri geçici vergi (ilk dilim)", "metadata": "{}"
    })
    params.append({
        "id": "TP-GEC-kv-2026", "category": "gecici_vergi",
        "param_key": "gecici_kv", "param_value": 25, "param_unit": "%",
        "valid_from": "2026-01-01", "valid_until": "2026-12-31",
        "legal_reference": "KVK Md. 32", "description": "KV mükellefleri geçici vergi", "metadata": "{}"
    })

    # ═══════════════════════════════════════════════════════════
    # 8. REESKONT VE AVANS ORANLARI
    # ═══════════════════════════════════════════════════════════
    params.append({
        "id": "TP-REES-reeskont-2026", "category": "reeskont_avans",
        "param_key": "reeskont", "param_value": 45, "param_unit": "%",
        "valid_from": "2026-01-01", "valid_until": "2026-12-31",
        "legal_reference": "TCMB", "description": "Reeskont işlemleri oranı (yıllık)", "metadata": "{}"
    })
    params.append({
        "id": "TP-REES-avans-2026", "category": "reeskont_avans",
        "param_key": "avans", "param_value": 46, "param_unit": "%",
        "valid_from": "2026-01-01", "valid_until": "2026-12-31",
        "legal_reference": "TCMB", "description": "Avans işlemleri oranı (yıllık)", "metadata": "{}"
    })

    # ═══════════════════════════════════════════════════════════
    # 9. GECİKME ORANLARI (6183 SK Md. 51, VUK Md. 112)
    # ═══════════════════════════════════════════════════════════
    gecikme = [
        ("gecikme_zammi", 3.5, "Gecikme zammı (aylık)", "6183 SK Md. 51"),
        ("gecikme_faizi", 3.5, "Gecikme faizi (aylık)", "VUK Md. 112"),
        ("pismanlik_zammi", 3, "Pişmanlık zammı (aylık)", "VUK Md. 371"),
        ("tecil_faizi", 36, "Tecil faizi (yıllık)", "6183 SK Md. 48"),
    ]
    for key, val, desc, ref in gecikme:
        params.append({
            "id": f"TP-GEC-{key}-2026", "category": "gecikme_oranlari",
            "param_key": key, "param_value": val, "param_unit": "%",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": ref, "description": desc, "metadata": "{}"
        })

    # Gecikme tarihçesi
    tarihce = [
        ("gecikme_zammi", 4.5, "2024-01-01", "2024-12-31"),
        ("gecikme_zammi", 2.5, "2023-01-01", "2023-12-31"),
        ("gecikme_zammi", 2.5, "2022-01-01", "2022-12-31"),
    ]
    for key, val, vf, vu in tarihce:
        yil = vf[:4]
        params.append({
            "id": f"TP-GEC-{key}-{yil}", "category": "gecikme_oranlari",
            "param_key": key, "param_value": val, "param_unit": "%",
            "valid_from": vf, "valid_until": vu,
            "legal_reference": "6183 SK Md. 51", "description": f"Gecikme zammı {yil} (aylık)", "metadata": "{}"
        })

    # ═══════════════════════════════════════════════════════════
    # 10. SGK PRİM ORANLARI (5510 SK)
    # ═══════════════════════════════════════════════════════════
    sgk = [
        ("sgk_kisa_vade", 2, "Kısa vadeli sigorta (iş kazası)", {"isci": 0, "isveren": 2}),
        ("sgk_uzun_vade", 20, "Malullük, yaşlılık, ölüm", {"isci": 9, "isveren": 11}),
        ("sgk_saglik", 12.5, "Genel sağlık sigortası", {"isci": 5, "isveren": 7.5}),
        ("sgk_issizlik", 3, "İşsizlik sigortası", {"isci": 1, "isveren": 2}),
    ]
    for key, toplam, desc, meta in sgk:
        params.append({
            "id": f"TP-SGK-{key}-2026", "category": "sgk_prim",
            "param_key": key, "param_value": toplam, "param_unit": "%",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": "5510 SK Md. 81", "description": desc,
            "metadata": json.dumps(meta)
        })

    # SGK Taban/Tavan
    params.append({
        "id": "TP-SGK-taban-2026", "category": "sgk_taban_tavan",
        "param_key": "sgk_taban", "param_value": 22104, "param_unit": "TL",
        "valid_from": "2026-01-01", "valid_until": "2026-06-30",
        "legal_reference": "5510 SK", "description": "SGK prim taban ücreti (asgari ücret)", "metadata": "{}"
    })
    params.append({
        "id": "TP-SGK-tavan-2026", "category": "sgk_taban_tavan",
        "param_key": "sgk_tavan", "param_value": 165780, "param_unit": "TL",
        "valid_from": "2026-01-01", "valid_until": "2026-06-30",
        "legal_reference": "5510 SK", "description": "SGK prim tavan ücreti (7.5 × asgari ücret)", "metadata": "{}"
    })

    # ═══════════════════════════════════════════════════════════
    # 11. İHBAR SÜRELERİ (4857 SK Md. 17)
    # ═══════════════════════════════════════════════════════════
    ihbar = [
        ("ihbar_0_6ay", 2, "0-6 ay arası", {"ay_min": 0, "ay_max": 6}),
        ("ihbar_6_18ay", 4, "6 ay - 1.5 yıl arası", {"ay_min": 6, "ay_max": 18}),
        ("ihbar_18_36ay", 6, "1.5 - 3 yıl arası", {"ay_min": 18, "ay_max": 36}),
        ("ihbar_36_uzeri", 8, "3 yıldan fazla", {"ay_min": 36, "ay_max": None}),
    ]
    for key, val, desc, meta in ihbar:
        params.append({
            "id": f"TP-IHBAR-{key}-2026", "category": "ihbar_sureleri",
            "param_key": key, "param_value": val, "param_unit": "hafta",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": "4857 SK Md. 17", "description": desc,
            "metadata": json.dumps(meta)
        })

    # ═══════════════════════════════════════════════════════════
    # 12. YILLIK İZİN SÜRELERİ (4857 SK Md. 53)
    # ═══════════════════════════════════════════════════════════
    izin = [
        ("izin_1_5yil", 14, "1-5 yıl çalışma", {"yil_min": 1, "yil_max": 5}),
        ("izin_5_15yil", 20, "5-15 yıl çalışma", {"yil_min": 5, "yil_max": 15}),
        ("izin_15_uzeri", 26, "15 yıl üzeri", {"yil_min": 15, "yil_max": None}),
        ("izin_ozel", 20, "18 yaş altı / 50 yaş üstü minimum", {"ozel": True}),
    ]
    for key, val, desc, meta in izin:
        params.append({
            "id": f"TP-IZIN-{key}-2026", "category": "yillik_izin",
            "param_key": key, "param_value": val, "param_unit": "gün",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": "4857 SK Md. 53", "description": desc,
            "metadata": json.dumps(meta)
        })

    # ═══════════════════════════════════════════════════════════
    # 13. HADLER VE TUTARLAR (VUK, GVK)
    # ═══════════════════════════════════════════════════════════
    hadler = [
        ("kidem_tavani", 35058.58, "TL", "Kıdem tazminatı tavanı", "1475 SK Md. 14"),
        ("defter_bilanco_haddi", 1200000, "TL", "Bilanço esası haddi (alış)", "VUK Md. 177"),
        ("defter_isletme_haddi", 600000, "TL", "İşletme hesabı haddi", "VUK Md. 177"),
        ("demirba_siniri", 10000, "TL", "Demirbaş/Amortisman sınırı (altı doğrudan gider)", "VUK Md. 313"),
        ("kira_istisnasi", 33000, "TL", "Konut kira geliri istisnası", "GVK Md. 21"),
        ("yemek_istisnasi", 270, "TL", "Yemek istisnası (günlük)", "GVK Md. 23/8"),
        ("e_fatura_haddi", 3000000, "TL", "e-Fatura zorunluluk haddi", "VUK Md. 232"),
        ("fatura_kesim_haddi", 6900, "TL", "Fatura kesim haddi", "VUK Md. 232"),
    ]
    for key, val, unit, desc, ref in hadler:
        params.append({
            "id": f"TP-HAD-{key}-2026", "category": "hadler",
            "param_key": key, "param_value": val, "param_unit": unit,
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": ref, "description": desc, "metadata": "{}"
        })

    # ═══════════════════════════════════════════════════════════
    # 14. YURTİÇİ GÜNDELİKLER (Bütçe Kanunu)
    # ═══════════════════════════════════════════════════════════
    gundelikler = [
        ("gundelik_8000_uzeri", 705, "Ek gösterge 8000+"),
        ("gundelik_5800_8000", 655, "Ek gösterge 5800-8000"),
        ("gundelik_3000_5800", 610, "Ek gösterge 3000-5800"),
        ("gundelik_derece_1_4", 540, "Aylık/kadro derecesi 1-4"),
        ("gundelik_derece_5_15", 525, "Aylık/kadro derecesi 5-15"),
    ]
    for key, val, desc in gundelikler:
        params.append({
            "id": f"TP-GUND-{key}-2026", "category": "gundelikler",
            "param_key": key, "param_value": val, "param_unit": "TL",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": "Bütçe Kanunu", "description": desc, "metadata": "{}"
        })

    # ═══════════════════════════════════════════════════════════
    # 15. ASGARİ ÜCRET (2026 - 1. Yarıyıl)
    # ═══════════════════════════════════════════════════════════
    asgari_meta = {
        "donem": "2026 - 1. Yarıyıl",
        "brut": 22104,
        "sgk_isci": 3094.56,
        "issizlik_isci": 221.04,
        "gelir_vergisi": 0,
        "damga_vergisi": 168.43,
        "net": 17002.17,
        "isveren_sgk": 3426.12,
        "isveren_issizlik": 442.08,
        "toplam_maliyet": 25972.20,
        "source_ref": "RG No: 32415"
    }
    params.append({
        "id": "TP-ASG-brut-2026-H1", "category": "asgari_ucret",
        "param_key": "asgari_ucret_brut", "param_value": 22104, "param_unit": "TL",
        "valid_from": "2026-01-01", "valid_until": "2026-06-30",
        "legal_reference": "4857 SK Md. 39", "description": "Asgari ücret (brüt)",
        "metadata": json.dumps(asgari_meta)
    })

    # ═══════════════════════════════════════════════════════════
    # 16. CEZALAR (VUK Md. 352-353)
    # ═══════════════════════════════════════════════════════════

    # Usulsüzlük cezaları
    usulsuzluk = [
        ("usul_1_derece_sermaye", 16000, "1. derece usulsüzlük - Sermaye şirketleri", {"grup": "Sermaye şirketleri"}),
        ("usul_1_derece_gv_1", 8800, "1. derece usulsüzlük - GV 1. sınıf tüccar", {"grup": "1. sınıf tüccar"}),
        ("usul_1_derece_gv_2", 4400, "1. derece usulsüzlük - GV 2. sınıf tüccar", {"grup": "2. sınıf tüccar"}),
        ("usul_1_derece_diger", 880, "1. derece usulsüzlük - Diğer", {"grup": "Diğer"}),
        ("usul_2_derece_sermaye", 8000, "2. derece usulsüzlük - Sermaye şirketleri", {"grup": "Sermaye şirketleri"}),
        ("usul_2_derece_diger", 450, "2. derece usulsüzlük - Diğer", {"grup": "Diğer"}),
    ]
    for key, val, desc, meta in usulsuzluk:
        params.append({
            "id": f"TP-CEZA-{key}-2026", "category": "cezalar_usulsuzluk",
            "param_key": key, "param_value": val, "param_unit": "TL",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": "VUK Md. 352", "description": desc,
            "metadata": json.dumps(meta)
        })

    # Özel usulsüzlük cezaları
    ozel = [
        ("ozel_fatura_almama", 6900, "Fatura/belge almama cezası (her belge)", {}),
        ("ozel_fatura_vermeme", 6900, "Fatura/belge vermeme cezası (her belge)", {}),
        ("ozel_e_fatura", 55000, "e-Fatura/e-Defter ihlali cezası (her ihlal)", {}),
        ("ozel_ba_bs", 4600, "Ba-Bs bildirimleri cezası", {}),
    ]
    for key, val, desc, meta in ozel:
        params.append({
            "id": f"TP-CEZA-{key}-2026", "category": "cezalar_ozel_usulsuzluk",
            "param_key": key, "param_value": val, "param_unit": "TL",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": "VUK Md. 353", "description": desc,
            "metadata": json.dumps(meta)
        })

    # Vergi ziyaı
    vzc = [
        ("vzc_normal", 50, "Normal vergi ziyaı cezası (%50)", {"kat": 1}),
        ("vzc_tekrar", 100, "Tekrarlayan vergi ziyaı (%50 + %50)", {"kat": 2}),
        ("vzc_kacakcilik", 300, "Kaçakçılık (3 kat)", {"kat": 3}),
    ]
    for key, val, desc, meta in vzc:
        params.append({
            "id": f"TP-CEZA-{key}-2026", "category": "cezalar_vergi_ziyai",
            "param_key": key, "param_value": val, "param_unit": "%",
            "valid_from": "2026-01-01", "valid_until": "2026-12-31",
            "legal_reference": "VUK Md. 344", "description": desc,
            "metadata": json.dumps(meta)
        })

    # ═══════════════════════════════════════════════════════════
    # INSERT INTO DB
    # ═══════════════════════════════════════════════════════════
    with get_connection() as conn:
        cursor = conn.cursor()
        inserted = 0
        for p in params:
            cursor.execute("""
                INSERT OR REPLACE INTO tax_parameters
                (id, category, param_key, param_value, param_unit, valid_from, valid_until,
                 legal_reference, source_url, description, metadata, updated_at, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'seed_script')
            """, (
                p["id"], p["category"], p["param_key"], p["param_value"],
                p["param_unit"], p["valid_from"], p.get("valid_until"),
                p.get("legal_reference"), p.get("source_url"), p.get("description"),
                p.get("metadata", "{}")
            ))
            inserted += 1
        conn.commit()
        print(f"✅ tax_parameters: {inserted} kayıt yüklendi")

    return inserted


def seed_deadline_calendar():
    """deadline_calendar tablosuna 2026 beyan tarihlerini yükle"""

    deadlines = []

    # Aylık beyannameler (12 ay)
    aylar = {
        1: "Aralık 2025", 2: "Ocak 2026", 3: "Şubat 2026", 4: "Mart 2026",
        5: "Nisan 2026", 6: "Mayıs 2026", 7: "Haziran 2026", 8: "Temmuz 2026",
        9: "Ağustos 2026", 10: "Eylül 2026", 11: "Ekim 2026", 12: "Kasım 2026"
    }

    for ay in range(1, 13):
        donem = aylar[ay]
        # Son gün hesabı (28 veya 26 — Şubat özel)
        if ay == 2:
            beyan_gun = 28
        else:
            beyan_gun = 28
        sgk_gun = 31 if ay in [1, 3, 5, 7, 8, 10, 12] else (28 if ay == 2 else 30)

        beyanname_tarihi = f"2026-{ay:02d}-{beyan_gun:02d}"
        sgk_tarihi = f"2026-{ay:02d}-{sgk_gun:02d}"

        # KDV Beyannamesi
        deadlines.append({
            "deadline_type": "BEYANNAME",
            "title": f"KDV Beyannamesi ({donem})",
            "description": f"{donem} dönemi KDV beyannamesi son verilme tarihi",
            "deadline_date": beyanname_tarihi,
            "applicable_to": "ALL",
            "frequency": "MONTHLY",
            "legal_reference": "KDVK Md. 41",
        })

        # Muhtasar ve Prim Hizmet Beyannamesi
        deadlines.append({
            "deadline_type": "BEYANNAME",
            "title": f"Muhtasar ve Prim Hizmet ({donem})",
            "description": f"{donem} dönemi muhtasar beyanname son verilme tarihi",
            "deadline_date": beyanname_tarihi,
            "applicable_to": "ALL",
            "frequency": "MONTHLY",
            "legal_reference": "GVK Md. 98",
        })

        # Damga Vergisi Beyannamesi
        deadlines.append({
            "deadline_type": "BEYANNAME",
            "title": f"Damga Vergisi ({donem})",
            "description": f"{donem} dönemi damga vergisi beyannamesi",
            "deadline_date": beyanname_tarihi,
            "applicable_to": "ALL",
            "frequency": "MONTHLY",
            "legal_reference": "488 SK",
        })

        # SGK Prim Bildirge
        deadlines.append({
            "deadline_type": "ODEME",
            "title": f"SGK Prim Bildirge ({donem})",
            "description": f"{donem} dönemi SGK prim bildirge son ödeme tarihi",
            "deadline_date": sgk_tarihi,
            "applicable_to": "ALL",
            "frequency": "MONTHLY",
            "legal_reference": "5510 SK Md. 86",
        })

        # e-Defter Berat Yükleme
        deadlines.append({
            "deadline_type": "BEYANNAME",
            "title": f"e-Defter Berat Yükleme ({donem})",
            "description": f"{donem} dönemi e-Defter berat yükleme son tarihi",
            "deadline_date": beyanname_tarihi,
            "applicable_to": "ALL",
            "frequency": "MONTHLY",
            "legal_reference": "VUK Md. 242",
        })

    # Yıllık beyannameler
    yillik = [
        ("BEYANNAME", "Yıllık Gelir Vergisi Beyannamesi (2025)", "2026-03-31", "GVK Md. 92", "2025 yılı gelir vergisi beyannamesi"),
        ("BEYANNAME", "Kurumlar Vergisi Beyannamesi (2025)", "2026-04-30", "KVK Md. 25", "2025 yılı kurumlar vergisi beyannamesi"),
        ("BEYANNAME", "1. Dönem Geçici Vergi (Ocak-Mart 2026)", "2026-05-17", "GVK Mük. 120", "2026 1. çeyrek geçici vergi beyannamesi"),
        ("BEYANNAME", "2. Dönem Geçici Vergi (Nisan-Haziran 2026)", "2026-08-17", "GVK Mük. 120", "2026 2. çeyrek geçici vergi beyannamesi"),
        ("BEYANNAME", "3. Dönem Geçici Vergi (Temmuz-Eylül 2026)", "2026-11-17", "GVK Mük. 120", "2026 3. çeyrek geçici vergi beyannamesi"),
    ]
    for dtype, title, ddate, ref, desc in yillik:
        deadlines.append({
            "deadline_type": dtype, "title": title,
            "description": desc, "deadline_date": ddate,
            "applicable_to": "ALL", "frequency": "ANNUAL",
            "legal_reference": ref,
        })

    # INSERT
    with get_connection() as conn:
        cursor = conn.cursor()
        # Önce mevcut 2026 verilerini temizle
        cursor.execute("DELETE FROM deadline_calendar WHERE deadline_date LIKE '2026-%'")
        inserted = 0
        for d in deadlines:
            cursor.execute("""
                INSERT INTO deadline_calendar
                (deadline_type, title, description, deadline_date, applicable_to, frequency, legal_reference)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                d["deadline_type"], d["title"], d["description"],
                d["deadline_date"], d["applicable_to"], d["frequency"],
                d["legal_reference"]
            ))
            inserted += 1
        conn.commit()
        print(f"✅ deadline_calendar: {inserted} kayıt yüklendi")

    return inserted


if __name__ == "__main__":
    print("=" * 60)
    print("LYNTOS 2026 Tax Parameters Seed Script")
    print("=" * 60)
    tp_count = seed_tax_parameters()
    dl_count = seed_deadline_calendar()
    print(f"\n✅ Toplam: {tp_count} parametre + {dl_count} deadline yüklendi")
    print("=" * 60)
