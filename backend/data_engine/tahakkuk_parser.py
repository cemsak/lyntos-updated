from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional, Literal, Dict, Any
import math
import re

import pdfplumber


# -------------------------
# Yardımcı fonksiyonlar
# -------------------------

def parse_tr_number(s: str) -> float:
    """
    Türk formatındaki sayıyı (3.983.434,26 gibi) float'a çevirir.
    Boş veya '-' ise 0.0 döner.
    """
    s = s.strip()
    if not s or s == "-":
        return 0.0
    # Binlik ayraçları (.) sil, virgülü noktaya çevir
    s = s.replace(".", "").replace(",", ".")
    return float(s)


def extract_date_period_line(text: str) -> Optional[str]:
    """
    '26/07/2025 06/2025-06/2025 26/07/2025' gibi tarih + dönem + tarih satırını bulur.
    """
    for line in text.splitlines():
        if re.search(r"\d{2}/\d{2}/\d{4}", line) and "-" in line and "/" in line:
            return line.strip()
    return None


def parse_date_period_line(line: str):
    """
    26/07/2025 06/2025-06/2025 26/07/2025
     -> acceptance_date, period ('2025-06'), issue_date
    """
    m = re.search(
        r"(\d{2}/\d{2}/\d{4})\s+(\d{2}\/\d{4}-\d{2}\/\d{4})\s+(\d{2}/\d{2}/\d{4})",
        line,
    )
    if not m:
        return None, None, None
    acc, period_range, issue = m.groups()
    start, end = period_range.split("-")  # örn: '06/2025', '06/2025'
    m2 = re.match(r"(\d{2})/(\d{4})", end)
    if m2:
        month, year = m2.groups()
        canonical_period = f"{year}-{month}"  # 2025-06
    else:
        canonical_period = period_range
    return acc, canonical_period, issue


def detect_tax_type(text: str) -> str:
    """
    Ana Vergi Kodu veya başlığa göre vergi türünü belirler.
    """
    m = re.search(r"Ana Vergi Kodu\s+(\d{4})", text)
    code = m.group(1) if m else None

    mapping = {
        "0015": "KDV",
        "0003": "MUHTASAR",
        "0033": "GECICI_KV",
        "4017": "KDV2",
    }
    if code and code in mapping:
        return mapping[code]

    # Emniyet için yedek kontroller
    if "KATMA DEĞER VERGİSİ TEVKİFATI" in text:
        return "KDV2"
    if "MUHTASAR" in text:
        return "MUHTASAR"

    return "UNKNOWN"


def extract_vkn(text: str) -> Optional[str]:
    m = re.search(r"VE?RGİ KİMLİK NUMARASI\s+(\d+)", text)
    return m.group(1) if m else None


def extract_unvan(text: str) -> Optional[str]:
    for line in text.splitlines():
        if "SOYADI (UNVANI)" in line:
            parts = line.split("SOYADI (UNVANI)")
            if len(parts) > 1:
                return parts[1].strip()
    return None


# -------------------------
# Veri modelleri
# -------------------------

@dataclass
class TahakkukRow:
    kod: str
    label: str
    matrah: float
    tahakkuk_eden: float
    mahsup_edilen: float
    odenecek_olan: float
    vade: Optional[str]


@dataclass
class TahakkukRecord:
    vkn: Optional[str]
    unvan: Optional[str]
    tax_type: str
    period: Optional[str]
    acceptance_date: Optional[str]
    issue_date: Optional[str]
    thn: Optional[str]
    main_row: TahakkukRow
    other_rows: List[TahakkukRow]
    total_payable: float
    source_file: str
    status: Literal["ok", "unreliable"]
    warnings: List[str]


# -------------------------
# Tablo satırlarını parse eden fonksiyon
# -------------------------

def parse_tur_table(text: str):
    """
    'TÜRÜ MATRAH ...' başlığından sonra gelen satırları okuyup
    satır listesi + TOPLAM ödenecek tutarını döndürür.
    """
    lines = text.splitlines()
    rows: List[TahakkukRow] = []
    in_table = False
    total_payable: Optional[float] = None

    for line in lines:
        if "TÜRÜ MATRAH" in line:
            in_table = True
            continue

        if not in_table:
            continue

        stripped = line.strip()
        if not stripped:
            continue

        # TOPLAM satırı
        if stripped.startswith("TOPLAM"):
            parts = stripped.split()
            if len(parts) >= 2:
                total_payable = parse_tr_number(parts[1])
            break

        # Başlık devamı satırları: "R EDEN EDİLEN OLAN" / "O" gibi
        if not re.match(r"^\d{4}\s", stripped):
            continue

        tokens = stripped.split()
        if len(tokens) < 7:
            # Format çok bozuksa bu satırı atlıyoruz
            continue

        kod = tokens[0]
        label = tokens[1]
        matrah = parse_tr_number(tokens[2])
        tahakkuk_eden = parse_tr_number(tokens[3])
        mahsup_edilen = parse_tr_number(tokens[4])
        odenecek_olan = parse_tr_number(tokens[5])
        vade = tokens[6]

        rows.append(
            TahakkukRow(
                kod=kod,
                label=label,
                matrah=matrah,
                tahakkuk_eden=tahakkuk_eden,
                mahsup_edilen=mahsup_edilen,
                odenecek_olan=odenecek_olan,
                vade=vade,
            )
        )

    return rows, total_payable


# -------------------------
# Ana parser: Tek PDF -> TahakkukRecord
# -------------------------

# -------------------------
# THN / Referans çıkarımı (banka 'THN:' alanı ile eşleştirme için)
# Örnek: THN:2025072601Mkx0000342
# -------------------------
THN_RE = re.compile(r"\b(20\d{8}[A-Za-z]{3}\d{7})\b")

def extract_thn(text: str):
    if not text:
        return None
    m = THN_RE.search(text)
    if m:
        return m.group(1)
    m = re.search(r"THN[:\s]*([0-9A-Za-z]{10,})", text, flags=re.I)
    return m.group(1) if m else None



def parse_tahakkuk_pdf(path: Path) -> TahakkukRecord:
    """
    Tek bir tahakkuk fişi PDF'ini okuyup TahakkukRecord döndürür.
    """
    with pdfplumber.open(str(path)) as pdf:
        text = pdf.pages[0].extract_text()

    warnings: List[str] = []

    tax_type = detect_tax_type(text)
    vkn = extract_vkn(text)
    unvan = extract_unvan(text)
    thn = extract_thn(text)

    date_line = extract_date_period_line(text)
    if date_line:
        acceptance_date, period, issue_date = parse_date_period_line(date_line)
    else:
        acceptance_date = period = issue_date = None
        warnings.append("Tarih/dönem satırı bulunamadı.")

    rows, total = parse_tur_table(text)
    if not rows:
        raise ValueError(f"Tablo satırı bulunamadı: {path}")

    # Ana vergi kodu satırını bulalım
    m = re.search(r"Ana Vergi Kodu\s+(\d{4})", text)
    main_code = m.group(1) if m else rows[0].kod

    main_row: Optional[TahakkukRow] = None
    other_rows: List[TahakkukRow] = []

    for r in rows:
        if r.kod == main_code and main_row is None:
            main_row = r
        else:
            other_rows.append(r)

    if main_row is None:
        # Emniyet: ilk satırı ana satır kabul et
        main_row = rows[0]
        other_rows = rows[1:]
        warnings.append(
            "Ana vergi kodu satırı bulunamadı, ilk satır ana satır kabul edildi."
        )

    # TOPLAM kontrolü
    sum_odenecek = sum(r.odenecek_olan for r in rows)
    status: Literal["ok", "unreliable"] = "ok"

    if total is None:
        total = sum_odenecek
        warnings.append(
            "TOPLAM satırı bulunamadı, toplam ödenecek satırlardan hesaplandı."
        )
    else:
        if not math.isclose(total, sum_odenecek, rel_tol=0, abs_tol=0.01):
            warnings.append(
                f"TOPLAM ({total}) satırların ödenecek toplamından ({sum_odenecek}) farklı."
            )
            status = "unreliable"

    return TahakkukRecord(
        vkn=vkn,
        unvan=unvan,
        tax_type=tax_type,
        period=period,
        acceptance_date=acceptance_date,
        issue_date=issue_date,
        thn=thn,
        main_row=main_row,
        other_rows=other_rows,
        total_payable=total,
        source_file=path.name,
        status=status,
        warnings=warnings,
    )


# -------------------------
# Çoklu dosya için yardımcı fonksiyon
# -------------------------

def parse_tahakkuk_for_client(
    base_dir: Path,
    smmm_id: str,
    entity_id: str,
    period: str,
) -> List[Dict[str, Any]]:
    """
    Şu klasördeki tüm tahakkuk PDF'lerini parse eder:

      base_dir / 'luca' / smmm_id / entity_id / period / 'tahakkuk'

    ve JSON'a hazır dict listesi döndürür.
    """
    folder = base_dir / "luca" / smmm_id / entity_id / period / "tahakkuk"
    if not folder.exists():
        raise FileNotFoundError(f"Tahakkuk klasörü yok: {folder}")

    results: List[Dict[str, Any]] = []
    for pdf_path in sorted(folder.glob("*.pdf")):
        rec = parse_tahakkuk_pdf(pdf_path)
        results.append(asdict(rec))

    return results
