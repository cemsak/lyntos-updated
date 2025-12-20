from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List
import csv
import re


def _parse_tr_amount(val: str | None) -> float:
    """
    Türkçe sayı formatını (1.575,00 gibi) güvenli şekilde float'a çevirir.
    Boş veya okunamayan değerler için 0.0 döner.
    """
    if val is None:
        return 0.0
    text = str(val).strip()
    if not text:
        return 0.0

    # Binlik ayıracı nokta, ondalık virgül kullanımı
    # "1.575,00" -> "1575.00"
    normalized = text.replace(".", "").replace(",", ".")
    try:
        return float(normalized)
    except ValueError:
        return 0.0


def _is_fis_header(cell: str) -> bool:
    """
    Fiş başlığı satırını tespit eder.
    Örnek: 04050-----04050-----MAHSUP-----01/04/2025
    """
    if not cell:
        return False
    s = cell.strip()
    return bool(re.match(r"^\d{5}-----\d{5}-----", s))


def _parse_fis_header(cell: str) -> tuple[str, str]:
    """
    Fiş başlığından (yevmiye no, tarih) çıkarır.
    """
    s = (cell or "").strip()
    parts = s.split("-----")
    if len(parts) >= 4:
        yevmiye_no = parts[0].strip()
        tarih = parts[3].strip()
        return yevmiye_no, tarih
    return "", ""


def parse_yevmiye_csv_luca(path: Path) -> List[Dict[str, Any]]:
    """
    Tek bir Luca yevmiye CSV dosyasını okur ve Lyntos'un anlayacağı
    standart kayıt formatına çevirir.

    Beklenen yapı (senin örneğin):
    - Üstte başlıklar:
        YEVMİYE DEFTERİ
        Firma adı
        Dönem :
        Tarih Aralığı :
    - Her fiş için:
        04050-----04050-----MAHSUP-----01/04/2025;;;TL;;
        HESAP KODU;HESAP ADI;AÇIKLAMA;DETAY;BORÇ;ALACAK
        191;...;...;;262,50;
        ...
        FİŞ AÇIKLAMA : ;GİDER;;;;
        TOPLAM :;;;;1.575,00;1.575,00
    """
    entries: List[Dict[str, Any]] = []
    current_yevmiye: str | None = None
    current_date: str | None = None

    with path.open("r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.reader(f, delimiter=";")

        for row in reader:
            if not row:
                continue

            # Hücreleri strip et
            row = [(c or "").strip() for c in row]
            first = row[0]

            if not first:
                # tamamen boş satır
                continue

            # Üst başlık satırlarını atla
            if first.startswith("YEVMİYE DEFTERİ"):
                continue
            if first.startswith("Dönem"):
                continue
            if first.startswith("Tarih Aralığı"):
                continue

            # Firma adı satırını atla (çok genel bilgi, satır üretmiyoruz)
            if first and "KIRTASİYE" in first and "LTD" in first:
                continue

            # Fiş başlığı mı?
            if _is_fis_header(first):
                current_yevmiye, current_date = _parse_fis_header(first)
                continue

            # Hesap kolon başlığı mı?
            if first.upper().startswith("HESAP KODU"):
                # HESAP KODU;HESAP ADI;AÇIKLAMA;DETAY;BORÇ;ALACAK
                continue

            # Fiş açıklaması / toplam satırlarını atla
            if first.startswith("FİŞ AÇIKLAMA"):
                continue
            if first.startswith("TOPLAM"):
                continue

            # Buraya geldiysek: gerçek bir kayıt (hesap satırı) olmalı
            hesap_kodu = first
            if not hesap_kodu:
                # Hesap kodu boşsa kayıt üretmeyelim
                continue

            hesap_adi = row[1] if len(row) > 1 else ""
            aciklama = row[2] if len(row) > 2 else ""
            detay = row[3] if len(row) > 3 else ""
            borc_str = row[4] if len(row) > 4 else ""
            alacak_str = row[5] if len(row) > 5 else ""

            borc = _parse_tr_amount(borc_str)
            alacak = _parse_tr_amount(alacak_str)

            # Tutar: öncelik BORÇ, sonra ALACAK, ikisi de yoksa DETAY içindeki sayı
            if borc:
                tutar = borc
            elif alacak:
                tutar = alacak
            else:
                tutar = _parse_tr_amount(detay)

            entry: Dict[str, Any] = {
                "tarih": current_date,
                "yevmiye_no": current_yevmiye,
                "hesap_kodu": hesap_kodu,
                "hesap_adi": hesap_adi,
                "aciklama": aciklama,
                "detay": detay,
                "borc": borc,
                "alacak": alacak,
                "tutar": tutar,
                "source_file": path.name,
                "status": "ok",
                "warnings": [],
            }

            entries.append(entry)

    return entries


def parse_edefter_for_client(
    base_dir: Path,
    smmm_id: str,
    firma_id: str,
    period: str,
) -> List[Dict[str, Any]]:
    """
    data/edefter/<SMMM>/<FİRMA>/<PERİYOT> altındaki tüm CSV yevmiye dosyalarını
    okuyup tek bir liste olarak döner.

    Örn:
    base_dir = backend/data
    smmm_id = "HKOZKAN"
    firma_id = "OZKAN_KIRTASIYE"
    period = "2025-Q2"
    """
    root = Path(base_dir) / "edefter" / smmm_id / firma_id / period
    if not root.exists():
        return []

    all_entries: List[Dict[str, Any]] = []
    for csv_path in sorted(root.glob("*.csv")):
        recs = parse_yevmiye_csv_luca(csv_path)
        all_entries.extend(recs)

    return all_entries
