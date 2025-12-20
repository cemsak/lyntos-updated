from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any, Literal
from pathlib import Path
import pdfplumber
import re


# Türkçe ay isimlerini YYYY-MM formatına çevirmek için
MONTHS = {
    "Ocak": "01",
    "Şubat": "02",
    "Subat": "02",
    "Mart": "03",
    "Nisan": "04",
    "Mayıs": "05",
    "Mayis": "05",
    "Haziran": "06",
    "Temmuz": "07",
    "Ağustos": "08",
    "Agustos": "08",
    "Eylül": "09",
    "Eylul": "09",
    "Ekim": "10",
    "Kasım": "11",
    "Kasim": "11",
    "Aralık": "12",
    "Aralik": "12",
}


def parse_tr_number(s: str) -> float:
    """
    Türkçe sayı formatını (3.983.434,26 gibi) float'a çevirir.
    Boş veya '-' ise 0.0 döner.
    """
    s = s.strip()
    if not s or s == "-":
        return 0.0
    s = s.replace(".", "").replace(",", ".")
    return float(s)


def detect_beyan_type(text: str) -> str:
    """
    Beyanname PDF'inin türünü tespit eder:
    - KDV
    - KDV2
    - MUHTASAR
    - GECICI_KV
    """
    if "KATMA DEĞER VERGİSİ BEYANNAMESİ" in text:
        if "(Gerçek Usulde Vergilendirilen Mükellefler İçin)" in text:
            return "KDV"
        if "(Vergi Sorumluları İçin)" in text:
            return "KDV2"
        return "KDV"
    if "MUHTASAR VE PRİM HİZMET BEYANNAMESİ" in text:
        return "MUHTASAR"
    if "GEÇİCİ VERGİ BEYANNAMESİ" in text:
        return "GECICI_KV"
    return "UNKNOWN"


def extract_vkn(text: str) -> Optional[str]:
    m = re.search(r"Vergi Kimlik Numarası\s+(\d+)", text)
    return m.group(1) if m else None


def extract_unvan(text: str) -> Optional[str]:
    """
    'Soyadı (Unvanı)' ve 'Adı (Unvanın Devamı)' satırlarını birleştirir.
    """
    m = re.search(r"Soyadı \(Unvanı\)\s+(.+)", text)
    if m:
        part1 = m.group(1).strip()
        m2 = re.search(r"Adı \(Unvanın Devamı\)\s+(.+)", text)
        if m2:
            part2 = m2.group(1).strip()
            return (part1 + " " + part2).strip()
        return part1
    return None


def extract_period(text: str, beyan_type: str) -> Optional[str]:
    """
    KDV/KDV2/MUHTASAR için: 'Yıl 2025' + 'Aylık Ay Haziran' -> '2025-06'
    GEÇİCİ_KV için: 'Yılı 2025', 'Dönem 2. Dönem' -> '2025-06' (2. dönem son ayı)
    """
    year = None

    m = re.search(r"Yıl[ıi]?\s+(\d{4})", text)
    if m:
        year = m.group(1)

    if beyan_type in ("KDV", "KDV2", "MUHTASAR"):
        m2 = re.search(r"Aylık Ay\s+(\w+)", text)
        if m2 and year:
            month_name = m2.group(1)
            mm = MONTHS.get(month_name, None)
            if mm:
                return f"{year}-{mm}"

    if beyan_type == "GECICI_KV":
        # 'Dönem 2. Dönem' gibi
        m3 = re.search(r"Dönem\s+(\d)\.\s*Dönem", text)
        if year and m3:
            n = int(m3.group(1))
            # 1. dönem → 03, 2. dönem → 06, 3 → 09, 4 → 12
            mm_map = {1: "03", 2: "06", 3: "09", 4: "12"}
            mm = mm_map.get(n)
            if mm:
                return f"{year}-{mm}"
            # Olur da 1–4 dışında bir şey çıkarsa:
            return f"{year}-G{n}"

    return None


def extract_simple(text: str, label: str) -> Optional[float]:
    """
    'Etiket 3.983.434,26' şeklindeki satırlardan sayıyı yakalar.
    """
    m = re.search(re.escape(label) + r"\s+([0-9\.\,]+)", text)
    return parse_tr_number(m.group(1)) if m else None


def extract_onay_zamani(text: str) -> Optional[str]:
    m = re.search(r"Onay Zamanı\s*:\s*([0-9\.\:\-\s]+)", text)
    if m:
        return m.group(1).strip()
    return None


# --- Detay yapıları ---


@dataclass
class KdvDetails:
    matrah_toplami: Optional[float] = None
    hesaplanan_kdv: Optional[float] = None
    toplam_kdv: Optional[float] = None
    onceki_devreden_ind_kdv: Optional[float] = None
    indirimler_toplami: Optional[float] = None


@dataclass
class Kdv2Details:
    matrah: Optional[float] = None
    tevkif_edilen_kdv: Optional[float] = None
    odenecek_kdv: Optional[float] = None


@dataclass
class GeciciKvDetails:
    ticari_bilanco_kari: Optional[float] = None
    ticari_bilanco_zarari: Optional[float] = None
    gecici_vergi_matrahi: Optional[float] = None
    hesaplanan_gecici_vergi: Optional[float] = None


@dataclass
class MuhtasarDetails:
    mahsup_edilecek_toplam_vergi: Optional[float] = None
    tevkifata_iliskin_damga_vergisi: Optional[float] = None


@dataclass
class BeyannameRecord:
    vkn: Optional[str]
    unvan: Optional[str]
    beyan_type: str
    period: Optional[str]
    onay_zamani: Optional[str]
    details: Dict[str, Any]
    source_file: str
    status: Literal["ok", "unreliable"]
    warnings: List[str]


# --- Tek PDF'i okuyan fonksiyon ---


def parse_beyanname_pdf(path: Path) -> BeyannameRecord:
    with pdfplumber.open(str(path)) as pdf:
        full_text = "\n".join(p.extract_text() or "" for p in pdf.pages)

    warnings: List[str] = []
    beyan_type = detect_beyan_type(full_text)
    vkn = extract_vkn(full_text)
    unvan = extract_unvan(full_text)
    period = extract_period(full_text, beyan_type)
    onay_zamani = extract_onay_zamani(full_text)
    details: Dict[str, Any] = {}
    status: Literal["ok", "unreliable"] = "ok"

    if beyan_type == "KDV":
        det = KdvDetails(
            matrah_toplami=extract_simple(full_text, "Matrah Toplamı"),
            hesaplanan_kdv=extract_simple(full_text, "Hesaplanan Katma Değer Vergisi"),
            toplam_kdv=extract_simple(full_text, "Toplam Katma Değer Vergisi"),
            onceki_devreden_ind_kdv=extract_simple(
                full_text, "Önceki Dönemden Devreden İndirilecek KDV"
            ),
            indirimler_toplami=extract_simple(full_text, "İndirimler Toplamı"),
        )
        details = asdict(det)

    elif beyan_type == "KDV2":
        det = Kdv2Details(
            matrah=extract_simple(full_text, "Katma Değer Vergisi Matrahı"),
            tevkif_edilen_kdv=extract_simple(
                full_text, "Tevkif Edilen Katma Değer Vergisi"
            ),
            odenecek_kdv=extract_simple(
                full_text, "Ödenmesi Gereken Katma Değer Vergisi"
            ),
        )
        details = asdict(det)

    elif beyan_type == "GECICI_KV":
        det = GeciciKvDetails(
            ticari_bilanco_kari=extract_simple(full_text, "Ticari Bilanço Karı"),
            ticari_bilanco_zarari=extract_simple(full_text, "Ticari Bilanço Zararı"),
            gecici_vergi_matrahi=extract_simple(full_text, "Geçici Vergi Matrahı"),
            hesaplanan_gecici_vergi=extract_simple(
                full_text, "Hesaplanan Geçici Vergi"
            ),
        )
        details = asdict(det)

    elif beyan_type == "MUHTASAR":
        det = MuhtasarDetails(
            mahsup_edilecek_toplam_vergi=extract_simple(
                full_text, "Mahsup Edilecek Toplam Vergi"
            ),
            tevkifata_iliskin_damga_vergisi=extract_simple(
                full_text, "Tevkifata İlişkin Damga Vergisi"
            ),
        )
        details = asdict(det)

    else:
        warnings.append("Beyanname türü tespit edilemedi.")
        status = "unreliable"

    return BeyannameRecord(
        vkn=vkn,
        unvan=unvan,
        beyan_type=beyan_type,
        period=period,
        onay_zamani=onay_zamani,
        details=details,
        source_file=path.name,
        status=status,
        warnings=warnings,
    )


# --- SMMM / Mükellef / Dönem bazında tüm beyannameleri okuyan fonksiyon ---


def parse_beyanname_for_client(
    base_dir: Path, smmm_id: str, entity_id: str, period: str
) -> List[Dict[str, Any]]:
    """
    Örnek:
    base_dir = backend/data
    smmm_id  = "HKOZKAN"
    entity_id= "OZKAN_KIRTASIYE"
    period   = "2025-06"

    klasör:
    data/luca/HKOZKAN/OZKAN_KIRTASIYE/2025-06/beyanname/*.pdf
    """
    folder = base_dir / "luca" / smmm_id / entity_id / period / "beyanname"
    if not folder.exists():
        raise FileNotFoundError(f"Beyanname klasörü yok: {folder}")

    results: List[Dict[str, Any]] = []
    for pdf_path in sorted(folder.glob("*.pdf")):
        rec = parse_beyanname_pdf(pdf_path)
        results.append(asdict(rec))

    return results
