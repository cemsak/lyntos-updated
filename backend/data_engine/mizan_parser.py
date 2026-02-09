from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any, Literal, Tuple
from pathlib import Path
import csv
import logging

# Mizan parser için özel logger
_mizan_logger = logging.getLogger("lyntos.mizan_parser")


@dataclass
class MizanValidationResult:
    """Mizan denge kontrolü sonucu"""
    is_balanced: bool
    toplam_borc: float
    toplam_alacak: float
    fark: float
    fark_yuzde: float
    warnings: List[str]


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


def _parse_tr_number(s: Optional[str], field_name: str = "bilinmeyen", row_info: str = "") -> Tuple[float, Optional[str]]:
    """
    Türkçe sayı formatını (3.983.434,26 gibi) float'a çevirir.
    Boş, None veya '-' ise 0.0 döner.

    Returns:
        Tuple[float, Optional[str]]: (değer, uyarı mesajı veya None)

    KRİTİK: Hatalı formatlı sayıları sessizce 0.0 yapmak yerine warning döndürür!
    """
    if s is None:
        return 0.0, None

    original = s
    s = s.strip()

    if not s or s == "-":
        return 0.0, None

    # Noktaları binlik ayırıcı varsay, virgülü ondalık ayıraç olarak kabul et
    s = s.replace(".", "").replace(",", ".")

    try:
        value = float(s)
        return value, None
    except ValueError:
        # KRİTİK: Parse hatalarını logla ve warning döndür
        warning = f"PARSE HATASI: '{field_name}' alanı çevrilemedi: '{original}' {row_info}"
        _mizan_logger.warning(warning)
        return 0.0, warning


def validate_mizan_balance(rows: List[Dict[str, Any]]) -> MizanValidationResult:
    """
    MİZAN DENGE KONTROLÜ - MUHASEBE TEMEL KURALI

    Çift taraflı kayıt sisteminde:
    Toplam Borç = Toplam Alacak OLMALIDIR

    Eşit değilse mizan hatalıdır ve VERGİ CEZASI riski vardır!

    Returns:
        MizanValidationResult: Denge durumu ve detaylar
    """
    toplam_borc = 0.0
    toplam_alacak = 0.0

    for row in rows:
        toplam_borc += row.get('borc', 0.0) or 0.0
        toplam_alacak += row.get('alacak', 0.0) or 0.0

    fark = abs(toplam_borc - toplam_alacak)

    # Yüzdelik fark hesapla (büyük değere göre)
    max_val = max(toplam_borc, toplam_alacak)
    fark_yuzde = (fark / max_val * 100) if max_val > 0 else 0.0

    warnings = []

    # 0.01 TL tolerance (kuruş hatası)
    is_balanced = fark < 0.01

    if not is_balanced:
        # Fark büyüklüğüne göre uyarı seviyesi
        if fark_yuzde > 1.0:
            # %1'den fazla fark - KRİTİK HATA
            warnings.append(
                f"KRİTİK MİZAN HATASI: Toplam Borç ({toplam_borc:,.2f}) ≠ Toplam Alacak ({toplam_alacak:,.2f}). "
                f"Fark: {fark:,.2f} TL (%{fark_yuzde:.2f}). MİZAN DENGESİZ - VERGİ CEZASI RİSKİ!"
            )
            _mizan_logger.error(warnings[-1])
        elif fark_yuzde > 0.1:
            # %0.1-%1 arası fark - YÜKSEK UYARI
            warnings.append(
                f"MİZAN DENGESİZLİĞİ: Toplam Borç ({toplam_borc:,.2f}) ≠ Toplam Alacak ({toplam_alacak:,.2f}). "
                f"Fark: {fark:,.2f} TL (%{fark_yuzde:.2f}). Kontrol ediniz."
            )
            _mizan_logger.warning(warnings[-1])
        else:
            # Küçük fark - muhtemelen yuvarlama
            warnings.append(
                f"Mizan küçük fark: Borç ({toplam_borc:,.2f}) - Alacak ({toplam_alacak:,.2f}) = {fark:,.2f} TL. "
                f"Yuvarlama hatası olabilir."
            )
            _mizan_logger.info(warnings[-1])
    else:
        _mizan_logger.info(f"Mizan dengeli: Borç = Alacak = {toplam_borc:,.2f} TL")

    return MizanValidationResult(
        is_balanced=is_balanced,
        toplam_borc=toplam_borc,
        toplam_alacak=toplam_alacak,
        fark=fark,
        fark_yuzde=fark_yuzde,
        warnings=warnings
    )


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

        # Her sayı parse'ında row bilgisi ver - hata takibi için
        row_info = f"(Hesap: {hesap_kodu})"

        borc, borc_warn = _parse_tr_number(borc_str, "Borç", row_info)
        alacak, alacak_warn = _parse_tr_number(alacak_str, "Alacak", row_info)
        bakiye_borc, bb_warn = _parse_tr_number(bakiye_borc_str, "Borç Bakiye", row_info)
        bakiye_alacak, ba_warn = _parse_tr_number(bakiye_alacak_str, "Alacak Bakiye", row_info)

        # Parse uyarılarını topla
        if borc_warn:
            warnings.append(borc_warn)
        if alacak_warn:
            warnings.append(alacak_warn)
        if bb_warn:
            warnings.append(bb_warn)
        if ba_warn:
            warnings.append(ba_warn)

        status: Literal["ok", "unreliable"] = "ok"

        # Parse hatası varsa status unreliable
        if borc_warn or alacak_warn or bb_warn or ba_warn:
            status = "unreliable"

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

    # KRİTİK: MİZAN DENGE KONTROLÜ
    # Çift taraflı kayıt sisteminde Toplam Borç = Toplam Alacak olmalı!
    validation = validate_mizan_balance(results)

    if not validation.is_balanced:
        _mizan_logger.warning(
            f"MİZAN DENGESİZ ({path.name}): "
            f"Borç={validation.toplam_borc:,.2f}, Alacak={validation.toplam_alacak:,.2f}, "
            f"Fark={validation.fark:,.2f} TL (%{validation.fark_yuzde:.2f})"
        )

    # Validation sonucunu da döndür
    return {
        "rows": results,
        "validation": asdict(validation),
        "file_name": path.name,
        "row_count": len(results),
    }


def parse_mizan_csv_simple(path: Path) -> List[Dict[str, Any]]:
    """
    Eski arayüz uyumluluğu için - sadece satır listesi döner.
    Yeni kod parse_mizan_csv kullanmalı.
    """
    result = parse_mizan_csv(path)
    return result.get("rows", []) if isinstance(result, dict) else result


def parse_mizan_for_client(
    base_dir: Path, smmm_id: str, entity_id: str, period: str
) -> Dict[str, Any]:
    """
    Örnek:
    base_dir = backend/data
    smmm_id  = "HKOZKAN"
    entity_id= "OZKAN_KIRTASIYE"
    period   = "2025-Q2"

    klasör:
    data/luca/HKOZKAN/OZKAN_KIRTASIYE/2025-Q2/mizan.csv

    Returns:
        Dict with keys: rows, validation, file_name, row_count
    """
    folder = base_dir / "luca" / smmm_id / entity_id / period
    csv_path = folder / "mizan.csv"

    if not csv_path.exists():
        raise FileNotFoundError(f"Mizan dosyası yok: {csv_path}")

    result = parse_mizan_csv(csv_path)

    # Client bilgilerini ekle
    if isinstance(result, dict):
        result["smmm_id"] = smmm_id
        result["entity_id"] = entity_id
        result["period"] = period

    return result
