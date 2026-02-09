"""
LYNTOS Opening Balance Service
==============================
Açılış Fişi ve Açılış Mizanı yönetimi için servis.

Muhasebe Kuralı:
- Her yılın başında dönem başı bakiyeler sisteme yüklenmeli
- Açılış bakiyeleri olmadan Kebir-Mizan cross-check tutarsızlık gösterir
- Mizan Borç = Dönem Başı Bakiye + Dönem İçi Hareketler
- Kebir'de açılış fişi yoksa sadece dönem içi hareketler görünür

Veri Kaynakları:
1. Açılış Fişi (Yevmiye) - XML formatında e-defter açılış kaydı
2. Açılış Mizanı (Excel) - Önceki dönem kapanış mizanı
3. Manuel Giriş - Kullanıcı tarafından tek tek hesap girişi
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import json
import pandas as pd

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)


class OpeningBalanceService:
    """Açılış bakiyesi yönetim servisi"""

    def __init__(self):
        self.supported_formats = ['xlsx', 'xls', 'csv', 'xml']

    # ════════════════════════════════════════════════════════════════
    # SORGULAMA
    # ════════════════════════════════════════════════════════════════

    def get_summary(self, client_id: str, period_id: str, fiscal_year: int = None) -> Optional[Dict]:
        """Açılış bakiyesi özet durumunu getir"""
        with get_connection() as conn:
            cursor = conn.cursor()

            if fiscal_year:
                cursor.execute("""
                    SELECT * FROM opening_balance_summary
                    WHERE client_id = ? AND period_id = ? AND fiscal_year = ?
                """, (client_id, period_id, fiscal_year))
            else:
                cursor.execute("""
                    SELECT * FROM opening_balance_summary
                    WHERE client_id = ? AND period_id = ?
                    ORDER BY fiscal_year DESC LIMIT 1
                """, (client_id, period_id))

            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def get_balances(self, client_id: str, period_id: str, fiscal_year: int = None) -> List[Dict]:
        """Hesap bazında açılış bakiyelerini getir"""
        with get_connection() as conn:
            cursor = conn.cursor()

            if fiscal_year:
                cursor.execute("""
                    SELECT * FROM opening_balances
                    WHERE client_id = ? AND period_id = ? AND fiscal_year = ?
                    ORDER BY hesap_kodu
                """, (client_id, period_id, fiscal_year))
            else:
                cursor.execute("""
                    SELECT * FROM opening_balances
                    WHERE client_id = ? AND period_id = ?
                    ORDER BY fiscal_year DESC, hesap_kodu
                """, (client_id, period_id))

            return [dict(row) for row in cursor.fetchall()]

    def get_balance_for_account(self, client_id: str, period_id: str,
                                 hesap_kodu: str, fiscal_year: int = None) -> Optional[Dict]:
        """Belirli bir hesabın açılış bakiyesini getir"""
        with get_connection() as conn:
            cursor = conn.cursor()

            if fiscal_year:
                cursor.execute("""
                    SELECT * FROM opening_balances
                    WHERE client_id = ? AND period_id = ? AND hesap_kodu = ? AND fiscal_year = ?
                """, (client_id, period_id, hesap_kodu, fiscal_year))
            else:
                cursor.execute("""
                    SELECT * FROM opening_balances
                    WHERE client_id = ? AND period_id = ? AND hesap_kodu = ?
                    ORDER BY fiscal_year DESC LIMIT 1
                """, (client_id, period_id, hesap_kodu))

            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def has_opening_balances(self, client_id: str, period_id: str, fiscal_year: int = None) -> bool:
        """Açılış bakiyesi yüklenmiş mi kontrol et"""
        summary = self.get_summary(client_id, period_id, fiscal_year)
        return summary is not None and summary.get('status') in ('loaded', 'verified')

    # ════════════════════════════════════════════════════════════════
    # AÇILIŞ MİZANI YÜKLEME (Excel)
    # ════════════════════════════════════════════════════════════════

    def load_from_mizan_excel(self, client_id: str, period_id: str,
                              file_path: str, fiscal_year: int,
                              tenant_id: str = 'default') -> Dict:
        """
        Açılış mizanı Excel dosyasından yükle

        Beklenen Excel formatı:
        - HESAP KODU | HESAP ADI | BORÇ | ALACAK | BORÇ BAKİYE | ALACAK BAKİYE
        - veya TL/USD para birimi satırları ile
        """
        result = {
            'success': False,
            'message': '',
            'loaded_count': 0,
            'total_borc': 0,
            'total_alacak': 0,
            'is_balanced': False
        }

        try:
            # Excel dosyasını oku
            df = pd.read_excel(file_path)

            # Sütun isimlerini normalize et
            df.columns = df.columns.str.strip().str.upper()

            # TL satırlarını filtrele (eğer para birimi sütunu varsa)
            para_col = None
            for col in df.columns:
                if 'PARA' in col or 'BİRİM' in col or col == 'TL':
                    para_col = col
                    break

            if para_col:
                df = df[df[para_col] == 'TL']

            # Hesap kodu sütununu bul
            hesap_kodu_col = None
            for col in ['HESAP KODU', 'HESAP_KODU', 'HESAPKODU', 'KOD']:
                if col in df.columns:
                    hesap_kodu_col = col
                    break

            if not hesap_kodu_col:
                result['message'] = 'Hesap kodu sütunu bulunamadı'
                return result

            # Hesap adı sütununu bul
            hesap_adi_col = None
            for col in ['HESAP ADI', 'HESAP_ADI', 'HESAPADI', 'AD', 'ADI']:
                if col in df.columns:
                    hesap_adi_col = col
                    break

            # Borç ve Alacak bakiye sütunlarını bul
            borc_bakiye_col = None
            alacak_bakiye_col = None

            for col in df.columns:
                col_upper = col.upper()
                if 'BORÇ' in col_upper and 'BAKİYE' in col_upper:
                    borc_bakiye_col = col
                elif 'ALACAK' in col_upper and 'BAKİYE' in col_upper:
                    alacak_bakiye_col = col

            # Bakiye sütunları yoksa, BORÇ ve ALACAK toplamlarını kullan
            borc_col = None
            alacak_col = None

            if not borc_bakiye_col:
                for col in df.columns:
                    if col.upper() in ['BORÇ', 'BORC']:
                        borc_col = col
                        break

            if not alacak_bakiye_col:
                for col in df.columns:
                    if col.upper() == 'ALACAK':
                        alacak_col = col
                        break

            # Veritabanına kaydet
            with get_connection() as conn:
                cursor = conn.cursor()

                # Önce mevcut açılış bakiyelerini temizle
                cursor.execute("""
                    DELETE FROM opening_balances
                    WHERE client_id = ? AND period_id = ? AND fiscal_year = ?
                """, (client_id, period_id, fiscal_year))

                loaded_count = 0
                total_borc = 0
                total_alacak = 0

                for _, row in df.iterrows():
                    hesap_kodu = str(row.get(hesap_kodu_col, '')).strip()

                    # Boş veya geçersiz hesap kodlarını atla
                    if not hesap_kodu or hesap_kodu in ['nan', '', 'None', 'TOPLAM', 'GENEL TOPLAM']:
                        continue

                    # Sadece rakamla başlayan hesap kodlarını al
                    if not hesap_kodu[0].isdigit():
                        continue

                    hesap_adi = str(row.get(hesap_adi_col, '')) if hesap_adi_col else ''

                    # Bakiye değerlerini al
                    if borc_bakiye_col:
                        borc_bakiye = float(row.get(borc_bakiye_col, 0) or 0)
                    elif borc_col:
                        borc_bakiye = float(row.get(borc_col, 0) or 0)
                    else:
                        borc_bakiye = 0

                    if alacak_bakiye_col:
                        alacak_bakiye = float(row.get(alacak_bakiye_col, 0) or 0)
                    elif alacak_col:
                        alacak_bakiye = float(row.get(alacak_col, 0) or 0)
                    else:
                        alacak_bakiye = 0

                    # Sıfır bakiyeli hesapları da kaydet (muhasebe bütünlüğü için)
                    cursor.execute("""
                        INSERT OR REPLACE INTO opening_balances
                        (tenant_id, client_id, period_id, fiscal_year, hesap_kodu, hesap_adi,
                         borc_bakiye, alacak_bakiye, source_type, source_file, acilis_tarihi)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'acilis_mizani', ?, ?)
                    """, (
                        tenant_id, client_id, period_id, fiscal_year,
                        hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye,
                        Path(file_path).name, f'{fiscal_year}-01-01'
                    ))

                    loaded_count += 1
                    total_borc += borc_bakiye
                    total_alacak += alacak_bakiye

                # Özet kaydını güncelle
                balance_diff = abs(total_borc - total_alacak)
                is_balanced = balance_diff < 0.01  # 1 kuruş tolerans

                cursor.execute("""
                    INSERT OR REPLACE INTO opening_balance_summary
                    (tenant_id, client_id, period_id, fiscal_year, toplam_hesap_sayisi,
                     toplam_borc, toplam_alacak, is_balanced, balance_diff,
                     source_type, source_file, upload_date, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'acilis_mizani', ?, ?, 'loaded')
                """, (
                    tenant_id, client_id, period_id, fiscal_year, loaded_count,
                    total_borc, total_alacak, 1 if is_balanced else 0, balance_diff,
                    Path(file_path).name, datetime.now().isoformat()
                ))

                conn.commit()

                result['success'] = True
                result['message'] = f'{loaded_count} hesap başarıyla yüklendi'
                result['loaded_count'] = loaded_count
                result['total_borc'] = total_borc
                result['total_alacak'] = total_alacak
                result['is_balanced'] = is_balanced
                result['balance_diff'] = balance_diff

                logger.info(f"Açılış mizanı yüklendi: {client_id}/{period_id}/{fiscal_year} - {loaded_count} hesap")

        except Exception as e:
            logger.error(f"Açılış mizanı yükleme hatası: {e}")
            result['message'] = f'Yükleme hatası: {str(e)}'

        return result

    # ════════════════════════════════════════════════════════════════
    # AÇILIŞ FİŞİ YÜKLEME (Yevmiye'den)
    # ════════════════════════════════════════════════════════════════

    def load_from_yevmiye(self, client_id: str, period_id: str,
                          fiscal_year: int, tenant_id: str = 'default') -> Dict:
        """
        Yevmiye defterindeki açılış fişinden bakiyeleri çıkar

        Açılış fişi genellikle:
        - Fiş No: 1 veya özel açılış fiş numarası
        - Açıklama: "AÇILIŞ", "AÇILIŞ FİŞİ", "DÖNEM BAŞI"
        """
        result = {
            'success': False,
            'message': '',
            'loaded_count': 0,
            'total_borc': 0,
            'total_alacak': 0,
            'is_balanced': False
        }

        try:
            with get_connection() as conn:
                cursor = conn.cursor()

                # Yevmiye'den açılış kayıtlarını bul
                # e-defter entries tablosundan
                cursor.execute("""
                    SELECT
                        COALESCE(alt_hesap_kodu, hesap_kodu) as hesap_kodu,
                        COALESCE(alt_hesap_adi, hesap_adi) as hesap_adi,
                        SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END) as borc,
                        SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END) as alacak
                    FROM edefter_entries
                    WHERE client_id = ? AND period_id = ?
                    AND defter_tipi = 'Y'
                    AND (
                        UPPER(aciklama) LIKE '%AÇILIŞ%' OR
                        UPPER(aciklama) LIKE '%ACILIS%' OR
                        UPPER(fis_aciklama) LIKE '%AÇILIŞ%' OR
                        UPPER(fis_aciklama) LIKE '%ACILIS%' OR
                        fis_no = '1' OR fis_no = '0001'
                    )
                    GROUP BY COALESCE(alt_hesap_kodu, hesap_kodu)
                """, (client_id, period_id))

                rows = cursor.fetchall()

                if not rows:
                    result['message'] = 'Yevmiye\'de açılış fişi bulunamadı'
                    return result

                # Önce mevcut açılış bakiyelerini temizle
                cursor.execute("""
                    DELETE FROM opening_balances
                    WHERE client_id = ? AND period_id = ? AND fiscal_year = ?
                    AND source_type = 'acilis_fisi'
                """, (client_id, period_id, fiscal_year))

                loaded_count = 0
                total_borc = 0
                total_alacak = 0

                for row in rows:
                    hesap_kodu = row['hesap_kodu']
                    hesap_adi = row['hesap_adi'] or ''
                    borc = row['borc'] or 0
                    alacak = row['alacak'] or 0

                    # Bakiye hesapla (Borç bakiye = Borç - Alacak pozitifse Borç bakiye)
                    if borc > alacak:
                        borc_bakiye = borc - alacak
                        alacak_bakiye = 0
                    else:
                        borc_bakiye = 0
                        alacak_bakiye = alacak - borc

                    cursor.execute("""
                        INSERT OR REPLACE INTO opening_balances
                        (tenant_id, client_id, period_id, fiscal_year, hesap_kodu, hesap_adi,
                         borc_bakiye, alacak_bakiye, source_type, acilis_tarihi)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'acilis_fisi', ?)
                    """, (
                        tenant_id, client_id, period_id, fiscal_year,
                        hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye,
                        f'{fiscal_year}-01-01'
                    ))

                    loaded_count += 1
                    total_borc += borc_bakiye
                    total_alacak += alacak_bakiye

                # Özet kaydını güncelle
                balance_diff = abs(total_borc - total_alacak)
                is_balanced = balance_diff < 0.01

                cursor.execute("""
                    INSERT OR REPLACE INTO opening_balance_summary
                    (tenant_id, client_id, period_id, fiscal_year, toplam_hesap_sayisi,
                     toplam_borc, toplam_alacak, is_balanced, balance_diff,
                     source_type, upload_date, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'acilis_fisi', ?, 'loaded')
                """, (
                    tenant_id, client_id, period_id, fiscal_year, loaded_count,
                    total_borc, total_alacak, 1 if is_balanced else 0, balance_diff,
                    datetime.now().isoformat()
                ))

                conn.commit()

                result['success'] = True
                result['message'] = f'Yevmiye açılış fişinden {loaded_count} hesap yüklendi'
                result['loaded_count'] = loaded_count
                result['total_borc'] = total_borc
                result['total_alacak'] = total_alacak
                result['is_balanced'] = is_balanced

                logger.info(f"Açılış fişi yüklendi: {client_id}/{period_id}/{fiscal_year}")

        except Exception as e:
            logger.error(f"Açılış fişi yükleme hatası: {e}")
            result['message'] = f'Yükleme hatası: {str(e)}'

        return result

    # ════════════════════════════════════════════════════════════════
    # MANUEL GİRİŞ
    # ════════════════════════════════════════════════════════════════

    def add_manual_balance(self, client_id: str, period_id: str, fiscal_year: int,
                           hesap_kodu: str, hesap_adi: str,
                           borc_bakiye: float, alacak_bakiye: float,
                           tenant_id: str = 'default') -> Dict:
        """Tek bir hesap için manuel açılış bakiyesi ekle"""
        result = {'success': False, 'message': ''}

        try:
            with get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    INSERT OR REPLACE INTO opening_balances
                    (tenant_id, client_id, period_id, fiscal_year, hesap_kodu, hesap_adi,
                     borc_bakiye, alacak_bakiye, source_type, acilis_tarihi)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)
                """, (
                    tenant_id, client_id, period_id, fiscal_year,
                    hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye,
                    f'{fiscal_year}-01-01'
                ))

                # Özet tablosunu güncelle
                self._update_summary(cursor, tenant_id, client_id, period_id, fiscal_year)

                conn.commit()

                result['success'] = True
                result['message'] = f'{hesap_kodu} hesabı için açılış bakiyesi eklendi'

        except Exception as e:
            logger.error(f"Manuel açılış bakiyesi ekleme hatası: {e}")
            result['message'] = str(e)

        return result

    def _update_summary(self, cursor, tenant_id: str, client_id: str,
                        period_id: str, fiscal_year: int):
        """Özet tablosunu hesapla ve güncelle"""
        cursor.execute("""
            SELECT
                COUNT(*) as hesap_sayisi,
                SUM(borc_bakiye) as toplam_borc,
                SUM(alacak_bakiye) as toplam_alacak
            FROM opening_balances
            WHERE client_id = ? AND period_id = ? AND fiscal_year = ?
        """, (client_id, period_id, fiscal_year))

        row = cursor.fetchone()
        if row:
            hesap_sayisi = row['hesap_sayisi'] or 0
            toplam_borc = row['toplam_borc'] or 0
            toplam_alacak = row['toplam_alacak'] or 0
            balance_diff = abs(toplam_borc - toplam_alacak)
            is_balanced = balance_diff < 0.01

            cursor.execute("""
                INSERT OR REPLACE INTO opening_balance_summary
                (tenant_id, client_id, period_id, fiscal_year, toplam_hesap_sayisi,
                 toplam_borc, toplam_alacak, is_balanced, balance_diff,
                 source_type, upload_date, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, 'loaded')
            """, (
                tenant_id, client_id, period_id, fiscal_year, hesap_sayisi,
                toplam_borc, toplam_alacak, 1 if is_balanced else 0, balance_diff,
                datetime.now().isoformat()
            ))

    # ════════════════════════════════════════════════════════════════
    # SİLME
    # ════════════════════════════════════════════════════════════════

    def delete_balances(self, client_id: str, period_id: str, fiscal_year: int) -> Dict:
        """Belirli bir yılın açılış bakiyelerini sil"""
        result = {'success': False, 'message': '', 'deleted_count': 0}

        try:
            with get_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    DELETE FROM opening_balances
                    WHERE client_id = ? AND period_id = ? AND fiscal_year = ?
                """, (client_id, period_id, fiscal_year))

                deleted_count = cursor.rowcount

                cursor.execute("""
                    DELETE FROM opening_balance_summary
                    WHERE client_id = ? AND period_id = ? AND fiscal_year = ?
                """, (client_id, period_id, fiscal_year))

                conn.commit()

                result['success'] = True
                result['message'] = f'{deleted_count} açılış bakiyesi silindi'
                result['deleted_count'] = deleted_count

                logger.info(f"Açılış bakiyeleri silindi: {client_id}/{period_id}/{fiscal_year}")

        except Exception as e:
            logger.error(f"Açılış bakiyesi silme hatası: {e}")
            result['message'] = str(e)

        return result

    # ════════════════════════════════════════════════════════════════
    # CROSS-CHECK ENTEGRASYONU
    # ════════════════════════════════════════════════════════════════

    def get_opening_balance_for_crosscheck(self, client_id: str, period_id: str,
                                            fiscal_year: int = None) -> Dict[str, Dict]:
        """
        Cross-check için hesap bazında açılış bakiyelerini döndür

        Returns:
            Dict[hesap_kodu, {'borc': float, 'alacak': float}]
        """
        balances = self.get_balances(client_id, period_id, fiscal_year)

        result = {}
        for bal in balances:
            result[bal['hesap_kodu']] = {
                'borc': bal['borc_bakiye'] or 0,
                'alacak': bal['alacak_bakiye'] or 0
            }

        return result

    def calculate_missing_opening_balances(self, client_id: str, period_id: str,
                                            fiscal_year: int = None) -> Dict:
        """
        Mizan ile Kebir arasındaki farktan eksik açılış bakiyelerini hesapla

        Bu fonksiyon:
        1. Mizan'dan hesap toplamlarını alır
        2. Kebir'den hesap toplamlarını alır
        3. Farkı dönem başı bakiye olarak tanımlar
        """
        result = {
            'success': False,
            'message': '',
            'missing_balances': [],
            'total_missing_borc': 0,
            'total_missing_alacak': 0
        }

        try:
            with get_connection() as conn:
                cursor = conn.cursor()

                # Mizan toplamları
                cursor.execute("""
                    SELECT hesap_kodu, hesap_adi,
                           SUM(borc_toplam) as mizan_borc,
                           SUM(alacak_toplam) as mizan_alacak
                    FROM mizan_entries
                    WHERE client_id = ? AND period_id = ?
                    GROUP BY hesap_kodu
                """, (client_id, period_id))

                mizan_data = {row['hesap_kodu']: dict(row) for row in cursor.fetchall()}

                # Kebir toplamları (edefter'den)
                cursor.execute("""
                    SELECT
                        COALESCE(alt_hesap_kodu, hesap_kodu) as hesap_kodu,
                        SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END) as kebir_borc,
                        SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END) as kebir_alacak
                    FROM edefter_entries
                    WHERE client_id = ? AND period_id = ?
                    AND defter_tipi = 'K'
                    GROUP BY COALESCE(alt_hesap_kodu, hesap_kodu)
                """, (client_id, period_id))

                kebir_data = {row['hesap_kodu']: dict(row) for row in cursor.fetchall()}

                # Farkları hesapla
                missing_balances = []
                total_missing_borc = 0
                total_missing_alacak = 0

                for hesap_kodu, mizan in mizan_data.items():
                    kebir = kebir_data.get(hesap_kodu, {'kebir_borc': 0, 'kebir_alacak': 0})

                    mizan_borc = mizan.get('mizan_borc') or 0
                    mizan_alacak = mizan.get('mizan_alacak') or 0
                    kebir_borc = kebir.get('kebir_borc') or 0
                    kebir_alacak = kebir.get('kebir_alacak') or 0

                    borc_fark = mizan_borc - kebir_borc
                    alacak_fark = mizan_alacak - kebir_alacak

                    if abs(borc_fark) > 0.01 or abs(alacak_fark) > 0.01:
                        missing_balances.append({
                            'hesap_kodu': hesap_kodu,
                            'hesap_adi': mizan.get('hesap_adi', ''),
                            'mizan_borc': mizan_borc,
                            'mizan_alacak': mizan_alacak,
                            'kebir_borc': kebir_borc,
                            'kebir_alacak': kebir_alacak,
                            'eksik_borc': borc_fark,
                            'eksik_alacak': alacak_fark
                        })

                        total_missing_borc += borc_fark
                        total_missing_alacak += alacak_fark

                result['success'] = True
                result['message'] = f'{len(missing_balances)} hesapta açılış bakiyesi eksikliği tespit edildi'
                result['missing_balances'] = sorted(missing_balances, key=lambda x: abs(x['eksik_borc']), reverse=True)
                result['total_missing_borc'] = total_missing_borc
                result['total_missing_alacak'] = total_missing_alacak

        except Exception as e:
            logger.error(f"Eksik açılış bakiyesi hesaplama hatası: {e}")
            result['message'] = str(e)

        return result


# Singleton instance
opening_balance_service = OpeningBalanceService()
