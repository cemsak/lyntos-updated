from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any, Literal
from pathlib import Path
import csv


@dataclass
class MizanRow:
    hesap_kodu: str
    hesap_adi: Optional[str]
    borc: float
    alacak: float
    bakiye_borc: float
    bakiye_alacak: float
    source_file: str
    status: Literal["ok", "unreliable"]
    warnings: List[str]


def _parse_tr_number(s: Optional[str]) -> float:
    """
    Türkçe sayı formatını (3.983.434,26 gibi) float'a çevirir.
    Boş, None veya '-' ise 0.0 döner.
    """
    if s is None:
        return 0.0
    s = s.strip()
    if not s or s == "-":
        return 0.0
    # Noktaları binlik ayırıcı varsay, virgülü ondalık ayıraç olarak kabul et
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _build_dict_rows(path: Path) -> List[Dict[str, str]]:
    """
    mizan.csv dosyasını satır satır okur,
    'HESAP KODU' satırını gerçek HEADER kabul eder,
    altındaki satırları da veri olarak dict listesine çevirir.
    """
    with path.open("r", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        all_rows = list(reader)

    header_idx: Optional[int] = None
    for i, row in enumerate(all_rows):
        if not row:
            continue
        first_cell = (row[0] or "").strip().upper()
        if first_cell == "HESAP KODU":
            header_idx = i
            break

    if header_idx is None:
        raise RuntimeError("HESAP KODU başlığı bulunamadı. Mizan formatını kontrol edin.")

    header = [(c or "").strip() for c in all_rows[header_idx]]
    data_rows = all_rows[header_idx + 1 :]

    dict_rows: List[Dict[str, str]] = []
    for row in data_rows:
        # Tamamen boş satırları at
        if not any((cell or "").strip() for cell in row):
            continue

        # Satır uzunluğu header'dan kısa ise doldur
        if len(row) < len(header):
            row = list(row) + [""] * (len(header) - len(row))

        record: Dict[str, str] = {}
        for idx, col_name in enumerate(header):
            record[col_name] = row[idx] if idx < len(row) else ""

        dict_rows.append(record)

    return dict_rows


def _try_get(row: Dict[str, str], keys: List[str]) -> Optional[str]:
    """
    CSV header'ında farklı isimlerle gelebilecek kolonları yakalamak için:
    örn: ["Hesap Kodu", "HESAP KODU", "hesap_kodu"] gibi.

    Header'ı boş olan sütunlar için DictReader/reader None üretebiliyor,
    onları görmezden geliyoruz.
    """
    lower_map: Dict[str, str] = {}

    for k in row.keys():
        if k is None:
            continue
        norm = k.strip().lower()
        lower_map[norm] = k

    for key in keys:
        wanted = key.strip().lower()
        if wanted in lower_map:
            return row[lower_map[wanted]]

    return None


def parse_mizan_csv(path: Path) -> List[Dict[str, Any]]:
    """
    Tek bir mizan.csv dosyasını okur ve normalize edilmiş satır listesi döner.

    Senin dosyanda başlık satırı şu formatta:
    HESAP KODU;HESAP ADI; ;BORÇ;ALACAK;BORÇ BAKİYESİ;ALACAK BAKİYESİ

    Bizim ihtiyacımız olan alanlar:

    - Hesap Kodu
    - Hesap Adı
    - Borç
    - Alacak
    - Borç Bakiyesi
    - Alacak Bakiyesi
    """
    dict_rows = _build_dict_rows(path)
    results: List[Dict[str, Any]] = []

    for row in dict_rows:
        warnings: List[str] = []

        hesap_kodu_raw = _try_get(
            row,
            ["Hesap Kodu", "HESAP KODU", "hesap_kodu", "Kod", "Hesap No"],
        )
        if not hesap_kodu_raw:
            warnings.append("Hesap kodu bulunamadı, satır atlandı.")
            continue

        hesap_kodu = hesap_kodu_raw.strip()

        hesap_adi = _try_get(
            row,
            ["Hesap Adı", "HESAP ADI", "HesapAdi", "hesap_adi", "Ad"],
        )

        borc_str = _try_get(
            row,
            ["Borç", "BORÇ", "Borç Toplamı", "DonemBorc"],
        )
        alacak_str = _try_get(
            row,
            ["Alacak", "ALACAK", "Alacak Toplamı", "DonemAlacak"],
        )

        bakiye_borc_str = _try_get(
            row,
            [
                "Bakiye Borç",
                "Borç Bakiye",
                "BorcBakiye",
                "BORÇ BAKİYE",
                "BORÇ BAKİYESİ",
            ],
        )
        bakiye_alacak_str = _try_get(
            row,
            [
                "Bakiye Alacak",
                "Alacak Bakiye",
                "AlacakBakiye",
                "ALACAK BAKİYE",
                "ALACAK BAKİYESİ",
            ],
        )

        borc = _parse_tr_number(borc_str)
        alacak = _parse_tr_number(alacak_str)
        bakiye_borc = _parse_tr_number(bakiye_borc_str)
        bakiye_alacak = _parse_tr_number(bakiye_alacak_str)

        status: Literal["ok", "unreliable"] = "ok"
        if bakiye_borc != 0.0 and bakiye_alacak != 0.0:
            warnings.append(
                "Hem borç bakiye hem alacak bakiye dolu görünüyor; kontrol önerilir."
            )
            status = "unreliable"

        rec = MizanRow(
            hesap_kodu=hesap_kodu,
            hesap_adi=hesap_adi.strip() if hesap_adi else None,
            borc=borc,
            alacak=alacak,
            bakiye_borc=bakiye_borc,
            bakiye_alacak=bakiye_alacak,
            source_file=path.name,
            status=status,
            warnings=warnings,
        )

        results.append(asdict(rec))

    return results


def parse_mizan_for_client(
    base_dir: Path, smmm_id: str, entity_id: str, period: str
) -> List[Dict[str, Any]]:
    """
    Örnek:
    base_dir = backend/data
    smmm_id  = "HKOZKAN"
    entity_id= "OZKAN_KIRTASIYE"
    period   = "2025-Q2"

    klasör:
    data/luca/HKOZKAN/OZKAN_KIRTASIYE/2025-Q2/mizan.csv
    """
    folder = base_dir / "luca" / smmm_id / entity_id / period
    csv_path = folder / "mizan.csv"

    if not csv_path.exists():
        raise FileNotFoundError(f"Mizan dosyası yok: {csv_path}")

    return parse_mizan_csv(csv_path)
