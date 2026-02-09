# -*- coding: utf-8 -*-
"""
LYNTOS Period Validator
========================

Dosya içeriğini seçilen dönemle karşılaştırır.
Dönem uyuşmazlığı varsa sert engelleme (HTTP 400).

Desteklenen dosya tipleri:
- BEYANNAME / GECICI_VERGI / POSET PDF → donem_yil + donem_ay çıkarma
- TAHAKKUK PDF → aynı mantık
- EDEFTER_BERAT XML → dosya adından YYYYMM
- BANKA CSV/Excel → tarih sütunundan min/max
- YEVMIYE / KEBIR Excel → tarih sütunundan
- MIZAN → dönem bilgisi genelde yok → status='unknown'

Author: Claude
Date: 2026-02-08
"""

import re
import logging
from pathlib import Path
from datetime import date, datetime
from typing import Optional, List, Dict, Any

from utils.period_utils import (
    PeriodValidation,
    normalize_period,
    get_period_date_range,
    validate_dates_in_period,
    month_in_quarter,
    detect_period_from_dates,
)

logger = logging.getLogger(__name__)


class PeriodValidator:
    """
    Dosya içeriğini seçilen dönemle doğrular.

    Kullanım:
        validator = PeriodValidator()
        result = validator.validate_file_period(
            file_path=Path("beyanname.pdf"),
            doc_type="BEYANNAME",
            filename="kdv_beyanname_2025_q1.pdf",
            selected_period="2025-Q1"
        )
        if result.status == 'mismatch':
            raise HTTPException(400, result.detail)
    """

    # ──────────────────────────────────────────────────────────────────────
    # Ana giriş noktası
    # ──────────────────────────────────────────────────────────────────────

    def validate_file_period(
        self,
        file_path: Path,
        doc_type: str,
        filename: str,
        selected_period: str,
    ) -> PeriodValidation:
        """
        Dosya içeriğini seçilen dönemle karşılaştır.

        Args:
            file_path: Dosya yolu
            doc_type: Dosya tipi (BEYANNAME, EDEFTER_BERAT, BANKA, MIZAN, vb.)
            filename: Orijinal dosya adı
            selected_period: Seçilen dönem (örn: '2025-Q1')

        Returns:
            PeriodValidation(status='ok'|'mismatch'|'unknown', ...)
        """
        try:
            period = normalize_period(selected_period)
        except ValueError:
            return PeriodValidation(
                status='unknown',
                detail=f"Geçersiz dönem formatı: {selected_period}"
            )

        try:
            # Dosya tipine göre doğrulama
            doc_type_upper = doc_type.upper()

            if doc_type_upper in ('BEYANNAME', 'GECICI_VERGI', 'POSET'):
                return self._validate_beyanname_pdf(file_path, filename, period)

            elif doc_type_upper == 'TAHAKKUK':
                return self._validate_tahakkuk_pdf(file_path, filename, period)

            elif doc_type_upper == 'EDEFTER_BERAT':
                return self._validate_edefter(file_path, filename, period)

            elif doc_type_upper == 'BANKA':
                return self._validate_banka(file_path, filename, period)

            elif doc_type_upper in ('YEVMIYE', 'KEBIR'):
                return self._validate_defter_excel(file_path, filename, period)

            elif doc_type_upper == 'MIZAN':
                # Mizan'da genelde dönem bilgisi yok
                return self._validate_mizan(file_path, filename, period)

            else:
                return PeriodValidation(
                    status='unknown',
                    detail=f"Dönem doğrulaması desteklenmiyor: {doc_type}"
                )

        except Exception as e:
            logger.warning(f"Dönem doğrulaması sırasında hata ({filename}): {e}")
            return PeriodValidation(
                status='unknown',
                detail=f"Dönem doğrulaması yapılamadı: {str(e)}"
            )

    # ──────────────────────────────────────────────────────────────────────
    # BEYANNAME PDF doğrulaması
    # ──────────────────────────────────────────────────────────────────────

    def _validate_beyanname_pdf(
        self, file_path: Path, filename: str, period: str
    ) -> PeriodValidation:
        """
        Beyanname PDF'inden donem_yil + donem_ay çıkarıp dönemle karşılaştır.
        parse_service.py satır 1378-1390 mantığını kullanır.
        """
        if not file_path.exists() or file_path.suffix.lower() != '.pdf':
            return PeriodValidation(status='unknown', detail='PDF dosyası bulunamadı')

        donem_yil = None
        donem_ay = None

        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                # İlk 3 sayfaya bak (beyanname genelde kısa)
                for page in pdf.pages[:3]:
                    text = page.extract_text()
                    if not text:
                        continue

                    for line in text.split('\n'):
                        line_upper = line.upper()

                        # Yıl bilgisi
                        if 'YIL' in line_upper and re.search(r'20\d{2}', line):
                            match = re.search(r'(20\d{2})', line)
                            if match:
                                donem_yil = int(match.group(1))

                        # Ay bilgisi
                        aylar = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
                                 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK']
                        for i, ay in enumerate(aylar, 1):
                            if ay in line_upper:
                                donem_ay = i
                                break

                        # Dönem satırı - "DÖNEM: 2025/01" veya "VERGİLENDİRME DÖNEMİ: 01/2025"
                        if 'DÖNEM' in line_upper:
                            match = re.search(r'(20\d{2})\s*[/\-]\s*(\d{1,2})', line)
                            if match:
                                donem_yil = int(match.group(1))
                                donem_ay = int(match.group(2))
                            else:
                                match = re.search(r'(\d{1,2})\s*[/\-]\s*(20\d{2})', line)
                                if match:
                                    donem_ay = int(match.group(1))
                                    donem_yil = int(match.group(2))

        except ImportError:
            logger.warning("pdfplumber not installed, skipping PDF period validation")
            return PeriodValidation(status='unknown', detail='pdfplumber kurulu değil')
        except Exception as e:
            logger.warning(f"Beyanname PDF parse hatası: {e}")
            # Dosya adından dönem çıkarmayı dene
            return self._validate_from_filename(filename, period)

        if donem_yil and donem_ay:
            return self._check_month_in_period(donem_yil, donem_ay, period, "Beyanname")

        if donem_yil:
            # Sadece yıl var, ayı bilemiyoruz
            p_year = int(period[:4])
            if donem_yil != p_year:
                detected_period = f"{donem_yil}-Q?"
                return PeriodValidation(
                    status='mismatch',
                    detected_period=detected_period,
                    detail=f"Beyanname yılı {donem_yil}, seçilen dönem yılı {p_year}. "
                           f"Lütfen doğru dönemi seçin."
                )
            return PeriodValidation(
                status='ok',
                detected_period=period,
                detail=f"Beyanname yılı ({donem_yil}) eşleşiyor, ay belirlenemedi"
            )

        # PDF'den çıkaramadık, dosya adından dene
        return self._validate_from_filename(filename, period)

    # ──────────────────────────────────────────────────────────────────────
    # TAHAKKUK PDF doğrulaması
    # ──────────────────────────────────────────────────────────────────────

    def _validate_tahakkuk_pdf(
        self, file_path: Path, filename: str, period: str
    ) -> PeriodValidation:
        """Tahakkuk PDF — beyanname ile aynı mantık."""
        return self._validate_beyanname_pdf(file_path, filename, period)

    # ──────────────────────────────────────────────────────────────────────
    # E-DEFTER doğrulaması (dosya adından YYYYMM)
    # ──────────────────────────────────────────────────────────────────────

    def _validate_edefter(
        self, file_path: Path, filename: str, period: str
    ) -> PeriodValidation:
        """
        E-Defter dosya adı formatı: VKN-YYYYMM-TYPE-SEQ.xml
        Örnek: 0480525636-202501-Y-0001.xml

        YYYYMM → yıl ve ay çıkar, dönem içinde mi kontrol et.
        """
        # Dosya adından YYYYMM çıkar
        match = re.search(r'(\d{10,11})-(\d{6})-([YKDB][RB]?)-', filename)
        if match:
            yyyymm = match.group(2)
            year = int(yyyymm[:4])
            month = int(yyyymm[4:])

            if 1 <= month <= 12:
                return self._check_month_in_period(year, month, period, "E-Defter")

        # Alternatif: YYYYMM pattern (VKN olmadan)
        match = re.search(r'(\d{4})(\d{2})', filename)
        if match:
            year = int(match.group(1))
            month = int(match.group(2))
            if 2020 <= year <= 2030 and 1 <= month <= 12:
                return self._check_month_in_period(year, month, period, "E-Defter")

        return PeriodValidation(
            status='unknown',
            detail=f"E-Defter dosya adından dönem bilgisi çıkarılamadı: {filename}"
        )

    # ──────────────────────────────────────────────────────────────────────
    # BANKA doğrulaması (tarih sütunundan)
    # ──────────────────────────────────────────────────────────────────────

    def _validate_banka(
        self, file_path: Path, filename: str, period: str
    ) -> PeriodValidation:
        """
        Banka dosyasından tarihleri çıkarıp dönemle karşılaştır.
        CSV/Excel desteği.
        """
        if not file_path.exists():
            return PeriodValidation(status='unknown', detail='Dosya bulunamadı')

        dates = self._extract_dates_from_file(file_path)

        if not dates:
            # Dosya adından dene
            return self._validate_from_filename(filename, period)

        return validate_dates_in_period(dates, period)

    # ──────────────────────────────────────────────────────────────────────
    # YEVMIYE / KEBIR doğrulaması
    # ──────────────────────────────────────────────────────────────────────

    def _validate_defter_excel(
        self, file_path: Path, filename: str, period: str
    ) -> PeriodValidation:
        """
        Yevmiye/Kebir Excel dosyasından tarih sütununu çıkarıp doğrula.
        """
        if not file_path.exists():
            return PeriodValidation(status='unknown', detail='Dosya bulunamadı')

        dates = self._extract_dates_from_file(file_path)

        if not dates:
            return self._validate_from_filename(filename, period)

        return validate_dates_in_period(dates, period)

    # ──────────────────────────────────────────────────────────────────────
    # MIZAN doğrulaması
    # ──────────────────────────────────────────────────────────────────────

    def _validate_mizan(
        self, file_path: Path, filename: str, period: str
    ) -> PeriodValidation:
        """
        Mizan dosyasında genelde dönem bilgisi yok.
        Dosya adından dönerse kontrol et, yoksa 'unknown' döndür.
        """
        # Dosya adında Q1, Q2, vb. veya 2025 gibi bilgi var mı?
        result = self._validate_from_filename(filename, period)
        if result.status != 'unknown':
            return result

        return PeriodValidation(
            status='unknown',
            detail='Mizan dosyasında dönem bilgisi algılanamadı'
        )

    # ──────────────────────────────────────────────────────────────────────
    # Yardımcı: Ay-dönem kontrolü
    # ──────────────────────────────────────────────────────────────────────

    def _check_month_in_period(
        self, year: int, month: int, period: str, doc_label: str
    ) -> PeriodValidation:
        """Belirli bir ay/yıl, seçilen dönem içinde mi kontrol et."""
        if month_in_quarter(year, month, period):
            q = (month - 1) // 3 + 1
            detected = f"{year}-Q{q}"
            return PeriodValidation(
                status='ok',
                detected_period=detected,
                detail=f"{doc_label} dönemi ({year}/{month:02d}) seçilen dönemle eşleşiyor"
            )
        else:
            q = (month - 1) // 3 + 1
            detected = f"{year}-Q{q}"
            return PeriodValidation(
                status='mismatch',
                detected_period=detected,
                detail=f"Bu {doc_label} dosyası {detected} dönemine ait ({year}/{month:02d}), "
                       f"ancak siz {period} dönemini seçtiniz. "
                       f"Lütfen doğru dönemi seçin veya doğru dosyayı yükleyin."
            )

    # ──────────────────────────────────────────────────────────────────────
    # Yardımcı: Dosya adından dönem çıkarma
    # ──────────────────────────────────────────────────────────────────────

    def _validate_from_filename(
        self, filename: str, period: str
    ) -> PeriodValidation:
        """
        Dosya adından dönem bilgisi çıkarmayı dene.

        Tanınan formatlar:
        - Q1, Q2, Q3, Q4
        - 2025-Q1, 2025_Q1
        - 2025-01, 2025/01
        - OCAK, ŞUBAT, ...
        """
        fn_upper = filename.upper()

        # "2025-Q1" veya "2025_Q1" pattern
        match = re.search(r'(20\d{2})[_\-\s]?Q([1-4])', fn_upper)
        if match:
            detected = f"{match.group(1)}-Q{match.group(2)}"
            if detected == period:
                return PeriodValidation(
                    status='ok',
                    detected_period=detected,
                    detail=f"Dosya adından dönem: {detected}"
                )
            else:
                return PeriodValidation(
                    status='mismatch',
                    detected_period=detected,
                    detail=f"Dosya adı {detected} dönemine ait görünüyor, "
                           f"ancak {period} dönemi seçildi."
                )

        # "2025-01" veya "2025/03" → ay bazlı
        match = re.search(r'(20\d{2})[_\-/](\d{1,2})', fn_upper)
        if match:
            year = int(match.group(1))
            month = int(match.group(2))
            if 1 <= month <= 12:
                return self._check_month_in_period(year, month, period, "Dosya")

        # Sadece "Q1", "Q2" vb. (yılsız)
        match = re.search(r'\bQ([1-4])\b', fn_upper)
        if match:
            p_year = int(period[:4])
            p_quarter = int(period[-1])
            file_quarter = int(match.group(1))
            if file_quarter == p_quarter:
                return PeriodValidation(
                    status='ok',
                    detected_period=f"{p_year}-Q{file_quarter}",
                    detail=f"Dosya adında Q{file_quarter} bulundu"
                )
            else:
                return PeriodValidation(
                    status='mismatch',
                    detected_period=f"{p_year}-Q{file_quarter}",
                    detail=f"Dosya adı Q{file_quarter} dönemine ait görünüyor, "
                           f"ancak Q{p_quarter} dönemi seçildi."
                )

        # Türkçe ay adları
        aylar = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
                 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK']
        for i, ay in enumerate(aylar, 1):
            if ay in fn_upper:
                # Yıl var mı?
                year_match = re.search(r'(20\d{2})', fn_upper)
                if year_match:
                    return self._check_month_in_period(
                        int(year_match.group(1)), i, period, "Dosya"
                    )
                else:
                    # Yıl yok, sadece ay var → dönem yılıyla varsay
                    p_year = int(period[:4])
                    return self._check_month_in_period(p_year, i, period, "Dosya")

        return PeriodValidation(
            status='unknown',
            detail='Dosya adından dönem bilgisi çıkarılamadı'
        )

    # ──────────────────────────────────────────────────────────────────────
    # Yardımcı: Dosyadan tarih çıkarma
    # ──────────────────────────────────────────────────────────────────────

    def _extract_dates_from_file(self, file_path: Path) -> List[date]:
        """
        CSV veya Excel dosyasından tarih değerlerini çıkar.
        Tarih sütununu otomatik algılar.
        """
        dates = []
        suffix = file_path.suffix.lower()

        try:
            if suffix in ('.xlsx', '.xls'):
                dates = self._extract_dates_from_excel(file_path)
            elif suffix in ('.csv', '.txt'):
                dates = self._extract_dates_from_csv(file_path)
        except Exception as e:
            logger.warning(f"Dosyadan tarih çıkarma hatası ({file_path.name}): {e}")

        return dates

    def _extract_dates_from_excel(self, file_path: Path) -> List[date]:
        """Excel dosyasından tarih sütununu bul ve tarihleri çıkar."""
        dates = []

        try:
            import pandas as pd

            df = pd.read_excel(file_path, nrows=500)  # İlk 500 satır yeter

            # Tarih sütununu bul
            tarih_col = None
            for col in df.columns:
                col_str = str(col).upper().strip()
                if col_str in ('TARİH', 'TARIH', 'DATE', 'İŞLEM TARİHİ', 'ISLEM TARIHI',
                               'VALÖR', 'VALOR', 'BELGE TARİHİ', 'BELGE TARIHI'):
                    tarih_col = col
                    break

            if tarih_col is None:
                # Sütun adlarından tarih benzerlerini ara
                for col in df.columns:
                    col_str = str(col).upper().strip()
                    if 'TARİH' in col_str or 'TARIH' in col_str or 'DATE' in col_str:
                        tarih_col = col
                        break

            if tarih_col is None:
                return dates

            for val in df[tarih_col].dropna():
                d = self._parse_date_value(val)
                if d:
                    dates.append(d)

        except ImportError:
            logger.warning("pandas not installed, skipping Excel date extraction")
        except Exception as e:
            logger.warning(f"Excel tarih çıkarma hatası: {e}")

        return dates

    def _extract_dates_from_csv(self, file_path: Path) -> List[date]:
        """CSV dosyasından tarih değerlerini çıkar."""
        dates = []

        # Encoding dene
        content = None
        for encoding in ['utf-8-sig', 'utf-8', 'windows-1254', 'latin-1', 'iso-8859-9']:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                if content and re.search(r'\d{2}[./]\d{2}[./]\d{4}', content):
                    break
            except (UnicodeDecodeError, UnicodeError):
                continue

        if not content:
            return dates

        # Tüm tarih pattern'lerini bul
        # DD.MM.YYYY veya DD/MM/YYYY
        for match in re.finditer(r'(\d{2})[./](\d{2})[./](\d{4})', content):
            try:
                day = int(match.group(1))
                month = int(match.group(2))
                year = int(match.group(3))
                if 2020 <= year <= 2030 and 1 <= month <= 12 and 1 <= day <= 31:
                    d = date(year, month, day)
                    dates.append(d)
            except ValueError:
                continue

        # YYYY-MM-DD formatı
        for match in re.finditer(r'(\d{4})-(\d{2})-(\d{2})', content):
            try:
                year = int(match.group(1))
                month = int(match.group(2))
                day = int(match.group(3))
                if 2020 <= year <= 2030 and 1 <= month <= 12 and 1 <= day <= 31:
                    d = date(year, month, day)
                    dates.append(d)
            except ValueError:
                continue

        # Fazla tarih varsa sample al (performans)
        if len(dates) > 200:
            import random
            dates = random.sample(dates, 200)

        return dates

    def _parse_date_value(self, val) -> Optional[date]:
        """Tek bir değeri date nesnesine dönüştür."""
        if val is None:
            return None

        # Pandas Timestamp
        try:
            import pandas as pd
            if isinstance(val, pd.Timestamp):
                return val.date()
        except ImportError:
            pass

        # datetime / date
        if isinstance(val, datetime):
            return val.date()
        if isinstance(val, date):
            return val

        # String parse
        s = str(val).strip()
        if not s or s.upper() in ('NAN', 'NONE', 'NAT', ''):
            return None

        # DD.MM.YYYY
        match = re.match(r'^(\d{1,2})[./](\d{1,2})[./](\d{4})$', s)
        if match:
            try:
                return date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
            except ValueError:
                pass

        # YYYY-MM-DD
        match = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})', s)
        if match:
            try:
                return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
            except ValueError:
                pass

        return None
