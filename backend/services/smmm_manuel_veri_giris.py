"""
SMMM Manuel Veri Giriş Servisi

TSG ve MERSIS siteleri captcha/e-Devlet korumalı olduğu için,
SMMM'nin müşteri bilgilerini sisteme manuel olarak girmesi gerekiyor.

Bu servis:
1. Ticaret Sicil Gazetesi ilanlarını kaydeder
2. Ortak/Yönetici bilgilerini kaydeder
3. Sermaye değişikliklerini kaydeder
4. Tüm veriler KURGAN senaryolarında kullanılır

⚠️ HARDCODED/MOCK/DEMO YASAK - SADECE SMMM'NİN GİRDİĞİ GERÇEK VERİ
"""

import logging
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from pathlib import Path
from enum import Enum

logger = logging.getLogger(__name__)


# =============================================================================
# VERİ YAPILARI
# =============================================================================

class OrtakTipi(str, Enum):
    GERCEK = "GERCEK"  # Gerçek kişi
    TUZEL = "TUZEL"    # Tüzel kişi (şirket)


class YoneticiGorev(str, Enum):
    MUDUR = "MUDUR"
    YK_UYESI = "YK_UYESI"
    YK_BASKANI = "YK_BASKANI"
    GENEL_MUDUR = "GENEL_MUDUR"
    DENETCI = "DENETCI"


class IlanTipi(str, Enum):
    KURULUS = "KURULUS"
    SERMAYE_ARTIRIMI = "SERMAYE_ARTIRIMI"
    SERMAYE_AZALTIMI = "SERMAYE_AZALTIMI"
    ORTAK_DEGISIKLIGI = "ORTAK_DEGISIKLIGI"
    YONETICI_DEGISIKLIGI = "YONETICI_DEGISIKLIGI"
    ADRES_DEGISIKLIGI = "ADRES_DEGISIKLIGI"
    UNVAN_DEGISIKLIGI = "UNVAN_DEGISIKLIGI"
    TASFIYE_GIRIS = "TASFIYE_GIRIS"
    TASFIYE_SONU = "TASFIYE_SONU"
    TUR_DEGISIKLIGI = "TUR_DEGISIKLIGI"
    BIRLESME = "BIRLESME"
    BOLUNME = "BOLUNME"
    DIGER = "DIGER"


@dataclass
class ManuelOrtakKayit:
    """SMMM'nin girdiği ortak bilgisi"""
    sirket_vkn: str
    ad_soyad: str
    tckn_vkn: Optional[str] = None
    uyruk: str = "TC"
    pay_tutari: Optional[float] = None  # TL
    pay_orani: Optional[float] = None   # %
    pay_adedi: Optional[int] = None
    ortak_tipi: OrtakTipi = OrtakTipi.GERCEK
    giris_tarihi: Optional[str] = None  # Ortaklığa giriş
    cikis_tarihi: Optional[str] = None  # Ortaklıktan çıkış
    giren_smmm: str = ""  # Veriyi giren SMMM
    gercek_belge_no: str = ""  # TSG ilan no veya belge referansı
    notlar: str = ""


@dataclass
class ManuelYoneticiKayit:
    """SMMM'nin girdiği yönetici/yetkili bilgisi"""
    sirket_vkn: str
    ad_soyad: str
    tckn_vkn: Optional[str] = None
    gorev: YoneticiGorev = YoneticiGorev.MUDUR
    temsil_sekli: str = ""  # Münferit, Müşterek
    temsil_siniri: Optional[float] = None  # TL limiti
    baslangic_tarihi: Optional[str] = None
    bitis_tarihi: Optional[str] = None
    giren_smmm: str = ""
    gercek_belge_no: str = ""
    notlar: str = ""


@dataclass
class ManuelTsgIlanKayit:
    """SMMM'nin girdiği TSG ilan bilgisi"""
    sirket_vkn: str
    sirket_unvan: str
    ilan_no: str  # TSG ilan numarası
    ilan_tarihi: str
    gazete_tarihi: Optional[str] = None
    gazete_sayisi: Optional[str] = None
    ilan_tipi: IlanTipi = IlanTipi.DIGER
    ilan_ozeti: str = ""  # İlan özeti
    ilan_tam_metni: str = ""  # Tam metin (opsiyonel)
    sicil_memurlugu: str = ""
    giren_smmm: str = ""
    gercek_mi: bool = True  # SMMM onayı
    notlar: str = ""


@dataclass
class ManuelSermayeKayit:
    """SMMM'nin girdiği sermaye bilgisi"""
    sirket_vkn: str
    islem_tarihi: str
    islem_tipi: str = "ARTTIRIM"  # ARTTIRIM, AZALTIM, KURULUS
    onceki_sermaye: float = 0
    yeni_sermaye: float = 0
    odenmis_sermaye: float = 0
    taahhut_sermaye: float = 0
    tsg_ilan_no: str = ""  # Referans TSG ilan
    giren_smmm: str = ""
    notlar: str = ""


# =============================================================================
# SMMM MANUEL VERİ GİRİŞ SERVİSİ
# =============================================================================

class SmmmManuelVeriGirisServisi:
    """
    SMMM'nin müşteri bilgilerini manuel girmesi için servis.

    TSG ve MERSIS siteleri e-Devlet/captcha korumalı olduğundan,
    SMMM'nin elindeki belgelerden sisteme veri girmesi gerekiyor.

    Girilen tüm veriler:
    - Veritabanında saklanır
    - KURGAN senaryolarında kullanılır
    - Audit trail tutulur
    """

    def __init__(self, db_path: str = None):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

        self.db_path = db_path
        if db_path is None:
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            self.db_path = str(data_dir / "smmm_manuel_veriler.db")

        self._init_database()
        self.logger.info(f"SMMM Manuel Veri Giriş Servisi başlatıldı: {self.db_path}")

    def _init_database(self):
        """Veritabanını oluştur"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Ortaklar tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manuel_ortaklar (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sirket_vkn TEXT NOT NULL,
                ad_soyad TEXT NOT NULL,
                tckn_vkn TEXT,
                uyruk TEXT DEFAULT 'TC',
                pay_tutari REAL,
                pay_orani REAL,
                pay_adedi INTEGER,
                ortak_tipi TEXT DEFAULT 'GERCEK',
                giris_tarihi TEXT,
                cikis_tarihi TEXT,
                giren_smmm TEXT NOT NULL,
                gercek_belge_no TEXT,
                notlar TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                aktif INTEGER DEFAULT 1
            )
        """)

        # Yöneticiler tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manuel_yoneticiler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sirket_vkn TEXT NOT NULL,
                ad_soyad TEXT NOT NULL,
                tckn_vkn TEXT,
                gorev TEXT DEFAULT 'MUDUR',
                temsil_sekli TEXT,
                temsil_siniri REAL,
                baslangic_tarihi TEXT,
                bitis_tarihi TEXT,
                giren_smmm TEXT NOT NULL,
                gercek_belge_no TEXT,
                notlar TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                aktif INTEGER DEFAULT 1
            )
        """)

        # TSG İlanları tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manuel_tsg_ilanlari (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sirket_vkn TEXT NOT NULL,
                sirket_unvan TEXT NOT NULL,
                ilan_no TEXT UNIQUE NOT NULL,
                ilan_tarihi TEXT NOT NULL,
                gazete_tarihi TEXT,
                gazete_sayisi TEXT,
                ilan_tipi TEXT DEFAULT 'DIGER',
                ilan_ozeti TEXT,
                ilan_tam_metni TEXT,
                sicil_memurlugu TEXT,
                giren_smmm TEXT NOT NULL,
                gercek_mi INTEGER DEFAULT 1,
                notlar TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Sermaye değişiklikleri tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS manuel_sermaye (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sirket_vkn TEXT NOT NULL,
                islem_tarihi TEXT NOT NULL,
                islem_tipi TEXT DEFAULT 'ARTTIRIM',
                onceki_sermaye REAL,
                yeni_sermaye REAL,
                odenmis_sermaye REAL,
                taahhut_sermaye REAL,
                tsg_ilan_no TEXT,
                giren_smmm TEXT NOT NULL,
                notlar TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Audit log tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                islem_tipi TEXT NOT NULL,
                tablo TEXT NOT NULL,
                kayit_id INTEGER,
                sirket_vkn TEXT,
                smmm TEXT NOT NULL,
                detay TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # İndeksler
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ortaklar_vkn ON manuel_ortaklar(sirket_vkn)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ortaklar_tckn ON manuel_ortaklar(tckn_vkn)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_yoneticiler_vkn ON manuel_yoneticiler(sirket_vkn)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tsg_vkn ON manuel_tsg_ilanlari(sirket_vkn)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tsg_ilan_no ON manuel_tsg_ilanlari(ilan_no)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sermaye_vkn ON manuel_sermaye(sirket_vkn)")

        conn.commit()
        conn.close()
        self.logger.info("SMMM Manuel Veri veritabanı hazır")

    def _audit_log(self, conn: sqlite3.Connection, islem_tipi: str, tablo: str,
                   kayit_id: int, sirket_vkn: str, smmm: str, detay: str = ""):
        """Audit log kaydı ekle"""
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_log (islem_tipi, tablo, kayit_id, sirket_vkn, smmm, detay)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (islem_tipi, tablo, kayit_id, sirket_vkn, smmm, detay))

    # =========================================================================
    # ORTAK İŞLEMLERİ
    # =========================================================================

    def ekle_ortak(self, kayit: ManuelOrtakKayit) -> int:
        """Yeni ortak kaydı ekle"""
        if not kayit.sirket_vkn or not kayit.ad_soyad or not kayit.giren_smmm:
            raise ValueError("sirket_vkn, ad_soyad ve giren_smmm zorunludur")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO manuel_ortaklar
                (sirket_vkn, ad_soyad, tckn_vkn, uyruk, pay_tutari, pay_orani,
                 pay_adedi, ortak_tipi, giris_tarihi, cikis_tarihi, giren_smmm,
                 gercek_belge_no, notlar)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                kayit.sirket_vkn, kayit.ad_soyad, kayit.tckn_vkn, kayit.uyruk,
                kayit.pay_tutari, kayit.pay_orani, kayit.pay_adedi,
                kayit.ortak_tipi.value if isinstance(kayit.ortak_tipi, OrtakTipi) else kayit.ortak_tipi,
                kayit.giris_tarihi, kayit.cikis_tarihi, kayit.giren_smmm,
                kayit.gercek_belge_no, kayit.notlar
            ))

            kayit_id = cursor.lastrowid
            self._audit_log(conn, "EKLE", "manuel_ortaklar", kayit_id,
                           kayit.sirket_vkn, kayit.giren_smmm, f"Ortak: {kayit.ad_soyad}")

            conn.commit()
            self.logger.info(f"Ortak eklendi: {kayit.ad_soyad} -> {kayit.sirket_vkn}")
            return kayit_id

        except Exception as e:
            conn.rollback()
            self.logger.error(f"Ortak ekleme hatası: {e}")
            raise
        finally:
            conn.close()

    def getir_ortaklar(self, sirket_vkn: str, sadece_aktif: bool = True) -> List[Dict]:
        """Şirketin ortaklarını getir"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            if sadece_aktif:
                cursor.execute("""
                    SELECT * FROM manuel_ortaklar
                    WHERE sirket_vkn = ? AND aktif = 1
                    ORDER BY pay_orani DESC NULLS LAST
                """, (sirket_vkn,))
            else:
                cursor.execute("""
                    SELECT * FROM manuel_ortaklar
                    WHERE sirket_vkn = ?
                    ORDER BY created_at DESC
                """, (sirket_vkn,))

            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    def guncelle_ortak(self, ortak_id: int, guncellemeler: Dict, smmm: str) -> bool:
        """Ortak kaydını güncelle"""
        if not guncellemeler or not smmm:
            return False

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            # Önce mevcut kaydı al
            cursor.execute("SELECT sirket_vkn FROM manuel_ortaklar WHERE id = ?", (ortak_id,))
            row = cursor.fetchone()
            if not row:
                return False

            sirket_vkn = row[0]

            # Güncellemeleri uygula
            set_parts = []
            values = []
            for key, value in guncellemeler.items():
                if key not in ['id', 'created_at']:
                    set_parts.append(f"{key} = ?")
                    values.append(value)

            set_parts.append("updated_at = ?")
            values.append(datetime.now().isoformat())
            values.append(ortak_id)

            cursor.execute(f"""
                UPDATE manuel_ortaklar
                SET {', '.join(set_parts)}
                WHERE id = ?
            """, values)

            self._audit_log(conn, "GUNCELLE", "manuel_ortaklar", ortak_id,
                           sirket_vkn, smmm, str(guncellemeler))

            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            self.logger.error(f"Ortak güncelleme hatası: {e}")
            return False
        finally:
            conn.close()

    def pasif_yap_ortak(self, ortak_id: int, smmm: str, neden: str = "") -> bool:
        """Ortak kaydını pasif yap (silmek yerine)"""
        return self.guncelle_ortak(ortak_id, {
            "aktif": 0,
            "cikis_tarihi": datetime.now().strftime("%Y-%m-%d"),
            "notlar": f"Pasif yapıldı: {neden}"
        }, smmm)

    # =========================================================================
    # YÖNETİCİ İŞLEMLERİ
    # =========================================================================

    def ekle_yonetici(self, kayit: ManuelYoneticiKayit) -> int:
        """Yeni yönetici/yetkili kaydı ekle"""
        if not kayit.sirket_vkn or not kayit.ad_soyad or not kayit.giren_smmm:
            raise ValueError("sirket_vkn, ad_soyad ve giren_smmm zorunludur")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO manuel_yoneticiler
                (sirket_vkn, ad_soyad, tckn_vkn, gorev, temsil_sekli, temsil_siniri,
                 baslangic_tarihi, bitis_tarihi, giren_smmm, gercek_belge_no, notlar)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                kayit.sirket_vkn, kayit.ad_soyad, kayit.tckn_vkn,
                kayit.gorev.value if isinstance(kayit.gorev, YoneticiGorev) else kayit.gorev,
                kayit.temsil_sekli, kayit.temsil_siniri,
                kayit.baslangic_tarihi, kayit.bitis_tarihi, kayit.giren_smmm,
                kayit.gercek_belge_no, kayit.notlar
            ))

            kayit_id = cursor.lastrowid
            self._audit_log(conn, "EKLE", "manuel_yoneticiler", kayit_id,
                           kayit.sirket_vkn, kayit.giren_smmm, f"Yönetici: {kayit.ad_soyad}")

            conn.commit()
            self.logger.info(f"Yönetici eklendi: {kayit.ad_soyad} -> {kayit.sirket_vkn}")
            return kayit_id

        except Exception as e:
            conn.rollback()
            self.logger.error(f"Yönetici ekleme hatası: {e}")
            raise
        finally:
            conn.close()

    def getir_yoneticiler(self, sirket_vkn: str, sadece_aktif: bool = True) -> List[Dict]:
        """Şirketin yöneticilerini getir"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            if sadece_aktif:
                cursor.execute("""
                    SELECT * FROM manuel_yoneticiler
                    WHERE sirket_vkn = ? AND aktif = 1
                    ORDER BY gorev, ad_soyad
                """, (sirket_vkn,))
            else:
                cursor.execute("""
                    SELECT * FROM manuel_yoneticiler
                    WHERE sirket_vkn = ?
                    ORDER BY created_at DESC
                """, (sirket_vkn,))

            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    # =========================================================================
    # TSG İLAN İŞLEMLERİ
    # =========================================================================

    def ekle_tsg_ilan(self, kayit: ManuelTsgIlanKayit) -> int:
        """Yeni TSG ilan kaydı ekle"""
        if not kayit.sirket_vkn or not kayit.ilan_no or not kayit.giren_smmm:
            raise ValueError("sirket_vkn, ilan_no ve giren_smmm zorunludur")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO manuel_tsg_ilanlari
                (sirket_vkn, sirket_unvan, ilan_no, ilan_tarihi, gazete_tarihi,
                 gazete_sayisi, ilan_tipi, ilan_ozeti, ilan_tam_metni,
                 sicil_memurlugu, giren_smmm, gercek_mi, notlar)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                kayit.sirket_vkn, kayit.sirket_unvan, kayit.ilan_no, kayit.ilan_tarihi,
                kayit.gazete_tarihi, kayit.gazete_sayisi,
                kayit.ilan_tipi.value if isinstance(kayit.ilan_tipi, IlanTipi) else kayit.ilan_tipi,
                kayit.ilan_ozeti, kayit.ilan_tam_metni,
                kayit.sicil_memurlugu, kayit.giren_smmm, 1 if kayit.gercek_mi else 0,
                kayit.notlar
            ))

            kayit_id = cursor.lastrowid
            self._audit_log(conn, "EKLE", "manuel_tsg_ilanlari", kayit_id,
                           kayit.sirket_vkn, kayit.giren_smmm, f"TSG İlan: {kayit.ilan_no}")

            conn.commit()
            self.logger.info(f"TSG ilan eklendi: {kayit.ilan_no} -> {kayit.sirket_vkn}")
            return kayit_id

        except sqlite3.IntegrityError:
            self.logger.warning(f"TSG ilan zaten mevcut: {kayit.ilan_no}")
            raise ValueError(f"Bu ilan numarası zaten kayıtlı: {kayit.ilan_no}")
        except Exception as e:
            conn.rollback()
            self.logger.error(f"TSG ilan ekleme hatası: {e}")
            raise
        finally:
            conn.close()

    def getir_tsg_ilanlari(self, sirket_vkn: str = None, ilan_tipi: IlanTipi = None,
                          limit: int = 100) -> List[Dict]:
        """TSG ilanlarını getir"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            query = "SELECT * FROM manuel_tsg_ilanlari WHERE 1=1"
            params = []

            if sirket_vkn:
                query += " AND sirket_vkn = ?"
                params.append(sirket_vkn)

            if ilan_tipi:
                query += " AND ilan_tipi = ?"
                params.append(ilan_tipi.value if isinstance(ilan_tipi, IlanTipi) else ilan_tipi)

            query += " ORDER BY ilan_tarihi DESC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    # =========================================================================
    # SERMAYE İŞLEMLERİ
    # =========================================================================

    def ekle_sermaye_degisikligi(self, kayit: ManuelSermayeKayit) -> int:
        """Sermaye değişikliği kaydı ekle"""
        if not kayit.sirket_vkn or not kayit.giren_smmm:
            raise ValueError("sirket_vkn ve giren_smmm zorunludur")

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT INTO manuel_sermaye
                (sirket_vkn, islem_tarihi, islem_tipi, onceki_sermaye, yeni_sermaye,
                 odenmis_sermaye, taahhut_sermaye, tsg_ilan_no, giren_smmm, notlar)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                kayit.sirket_vkn, kayit.islem_tarihi, kayit.islem_tipi,
                kayit.onceki_sermaye, kayit.yeni_sermaye,
                kayit.odenmis_sermaye, kayit.taahhut_sermaye,
                kayit.tsg_ilan_no, kayit.giren_smmm, kayit.notlar
            ))

            kayit_id = cursor.lastrowid
            self._audit_log(conn, "EKLE", "manuel_sermaye", kayit_id,
                           kayit.sirket_vkn, kayit.giren_smmm,
                           f"Sermaye: {kayit.onceki_sermaye} -> {kayit.yeni_sermaye}")

            conn.commit()
            self.logger.info(f"Sermaye değişikliği eklendi: {kayit.sirket_vkn}")
            return kayit_id

        except Exception as e:
            conn.rollback()
            self.logger.error(f"Sermaye ekleme hatası: {e}")
            raise
        finally:
            conn.close()

    def getir_sermaye_gecmisi(self, sirket_vkn: str) -> List[Dict]:
        """Şirketin sermaye geçmişini getir"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            cursor.execute("""
                SELECT * FROM manuel_sermaye
                WHERE sirket_vkn = ?
                ORDER BY islem_tarihi DESC
            """, (sirket_vkn,))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    # =========================================================================
    # KURGAN ENTEGRASYON
    # =========================================================================

    def getir_kurgan_verisi(self, sirket_vkn: str) -> Dict[str, Any]:
        """
        KURGAN senaryoları için şirket verilerini hazırla.

        Bu metod, SMMM'nin manuel girdiği tüm verileri KURGAN formatında döndürür.
        """
        ortaklar = self.getir_ortaklar(sirket_vkn)
        yoneticiler = self.getir_yoneticiler(sirket_vkn)
        ilanlar = self.getir_tsg_ilanlari(sirket_vkn)
        sermaye = self.getir_sermaye_gecmisi(sirket_vkn)

        # Son sermaye bilgisi
        son_sermaye = sermaye[0] if sermaye else None

        # Ortak TCKN/VKN listesi (KRG-16 için)
        ortak_kimlikleri = [
            o["tckn_vkn"] for o in ortaklar
            if o.get("tckn_vkn") and o.get("aktif")
        ]

        # Yönetici TCKN/VKN listesi
        yonetici_kimlikleri = [
            y["tckn_vkn"] for y in yoneticiler
            if y.get("tckn_vkn") and y.get("aktif")
        ]

        return {
            "vkn": sirket_vkn,
            "ortaklar": ortaklar,
            "yoneticiler": yoneticiler,
            "tsg_ilanlari": ilanlar,
            "sermaye_gecmisi": sermaye,
            "guncel_sermaye": {
                "esas": son_sermaye["yeni_sermaye"] if son_sermaye else 0,
                "odenmis": son_sermaye["odenmis_sermaye"] if son_sermaye else 0,
            } if son_sermaye else None,
            "ortak_kimlikleri": ortak_kimlikleri,
            "yonetici_kimlikleri": yonetici_kimlikleri,
            "veri_kaynagi": "SMMM_MANUEL",
            "veri_tarihi": datetime.now().isoformat(),
            # KURGAN senaryoları için hazır veri
            "kurgan_hazir": {
                "KRG-09": {  # Yaşam Standardı
                    "ortak_sayisi": len(ortaklar),
                    "ortaklar": [
                        {"ad_soyad": o["ad_soyad"], "tckn_vkn": o["tckn_vkn"], "pay_orani": o["pay_orani"]}
                        for o in ortaklar if o.get("aktif")
                    ]
                },
                "KRG-13": {  # Transfer Fiyatlandırması
                    "iliskili_kisi_sayisi": len(ortak_kimlikleri) + len(yonetici_kimlikleri),
                    "iliskili_kisiler": ortak_kimlikleri + yonetici_kimlikleri
                },
                "KRG-16": {  # Ortak/Yönetici Risk
                    "kontrol_edilecek_kisiler": ortak_kimlikleri + yonetici_kimlikleri,
                    "ortak_sayisi": len(ortaklar),
                    "yonetici_sayisi": len(yoneticiler)
                }
            }
        }

    # =========================================================================
    # İSTATİSTİKLER
    # =========================================================================

    def istatistikler(self) -> Dict[str, Any]:
        """Veritabanı istatistikleri"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            stats = {}

            cursor.execute("SELECT COUNT(*) FROM manuel_ortaklar")
            stats["toplam_ortak"] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM manuel_ortaklar WHERE aktif = 1")
            stats["aktif_ortak"] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM manuel_yoneticiler")
            stats["toplam_yonetici"] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM manuel_tsg_ilanlari")
            stats["toplam_tsg_ilan"] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM manuel_sermaye")
            stats["toplam_sermaye_islem"] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(DISTINCT sirket_vkn) FROM manuel_ortaklar")
            stats["sirket_sayisi"] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(DISTINCT giren_smmm) FROM manuel_ortaklar")
            stats["smmm_sayisi"] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM audit_log")
            stats["audit_kayit_sayisi"] = cursor.fetchone()[0]

            return stats
        finally:
            conn.close()


# =============================================================================
# SİNGLETON
# =============================================================================

_servis: Optional[SmmmManuelVeriGirisServisi] = None


def get_smmm_manuel_servisi() -> SmmmManuelVeriGirisServisi:
    """SMMM Manuel Veri Giriş servisi singleton'ı al"""
    global _servis
    if _servis is None:
        _servis = SmmmManuelVeriGirisServisi()
    return _servis


# =============================================================================
# TEST
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("SMMM MANUEL VERİ GİRİŞ SERVİSİ TESTİ")
    print("=" * 70)

    servis = get_smmm_manuel_servisi()

    # Test verisi ekle
    test_vkn = "1234567890"

    # Ortak ekle
    ortak = ManuelOrtakKayit(
        sirket_vkn=test_vkn,
        ad_soyad="AHMET YILMAZ",
        tckn_vkn="12345678901",
        pay_orani=60.0,
        pay_tutari=60000.0,
        ortak_tipi=OrtakTipi.GERCEK,
        giren_smmm="TEST_SMMM",
        gercek_belge_no="TSG-2024-123456"
    )

    try:
        ortak_id = servis.ekle_ortak(ortak)
        print(f"✅ Ortak eklendi: ID={ortak_id}")
    except Exception as e:
        print(f"⚠️ Ortak ekleme: {e}")

    # Yönetici ekle
    yonetici = ManuelYoneticiKayit(
        sirket_vkn=test_vkn,
        ad_soyad="MEHMET KAYA",
        tckn_vkn="98765432101",
        gorev=YoneticiGorev.MUDUR,
        temsil_sekli="Münferit",
        giren_smmm="TEST_SMMM",
        gercek_belge_no="TSG-2024-123456"
    )

    try:
        yonetici_id = servis.ekle_yonetici(yonetici)
        print(f"✅ Yönetici eklendi: ID={yonetici_id}")
    except Exception as e:
        print(f"⚠️ Yönetici ekleme: {e}")

    # TSG ilan ekle
    ilan = ManuelTsgIlanKayit(
        sirket_vkn=test_vkn,
        sirket_unvan="TEST LİMİTED ŞİRKETİ",
        ilan_no=f"TSG-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        ilan_tarihi=datetime.now().strftime("%Y-%m-%d"),
        ilan_tipi=IlanTipi.KURULUS,
        ilan_ozeti="Şirket kuruluş ilanı",
        giren_smmm="TEST_SMMM"
    )

    try:
        ilan_id = servis.ekle_tsg_ilan(ilan)
        print(f"✅ TSG ilan eklendi: ID={ilan_id}")
    except Exception as e:
        print(f"⚠️ TSG ilan ekleme: {e}")

    # KURGAN verisi al
    kurgan = servis.getir_kurgan_verisi(test_vkn)
    print(f"\n📊 KURGAN Verisi:")
    print(f"   - Ortaklar: {len(kurgan['ortaklar'])}")
    print(f"   - Yöneticiler: {len(kurgan['yoneticiler'])}")
    print(f"   - TSG İlanları: {len(kurgan['tsg_ilanlari'])}")
    print(f"   - Veri Kaynağı: {kurgan['veri_kaynagi']}")

    # İstatistikler
    stats = servis.istatistikler()
    print(f"\n📈 İstatistikler:")
    for k, v in stats.items():
        print(f"   - {k}: {v}")
