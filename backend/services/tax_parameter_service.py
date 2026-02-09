"""
LYNTOS Tax Parameter Service
=============================
Pratik Bilgiler verilerini tax_parameters tablosundan servis eder.
Hesap makineleri (gecikme faizi, kıdem/ihbar tazminatı, damga vergisi, bordro, gelir vergisi)
"""

import json
import logging
from datetime import datetime, date
from typing import Optional
from database.db import get_connection

logger = logging.getLogger(__name__)


class TaxParameterService:
    """Merkezi vergi parametreleri servisi"""

    # ═══════════════════════════════════════════════════════════
    # PARAMETRE SORGULARI
    # ═══════════════════════════════════════════════════════════

    def get_by_category(self, category: str, effective_date: str = None) -> list[dict]:
        """Kategori bazlı parametreleri getir"""
        with get_connection() as conn:
            cursor = conn.cursor()
            if effective_date:
                cursor.execute("""
                    SELECT * FROM tax_parameters
                    WHERE category = ? AND valid_from <= ? AND (valid_until IS NULL OR valid_until >= ?)
                    ORDER BY param_key
                """, (category, effective_date, effective_date))
            else:
                cursor.execute("""
                    SELECT * FROM tax_parameters
                    WHERE category = ?
                    ORDER BY param_key
                """, (category,))
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    def get_effective(self, param_key: str, ref_date: str = None) -> dict | None:
        """Belirli bir parametre key'i için geçerli değeri getir"""
        if not ref_date:
            ref_date = date.today().isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM tax_parameters
                WHERE param_key = ? AND valid_from <= ? AND (valid_until IS NULL OR valid_until >= ?)
                ORDER BY valid_from DESC LIMIT 1
            """, (param_key, ref_date, ref_date))
            row = cursor.fetchone()
            return self._row_to_dict(row) if row else None

    def get_all_effective(self, ref_date: str = None) -> list[dict]:
        """Bugün geçerli tüm parametreleri getir"""
        if not ref_date:
            ref_date = date.today().isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM tax_parameters
                WHERE valid_from <= ? AND (valid_until IS NULL OR valid_until >= ?)
                ORDER BY category, param_key
            """, (ref_date, ref_date))
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    def get_history(self, param_key: str) -> list[dict]:
        """Parametre tarihçesini getir"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM tax_parameters
                WHERE param_key = ?
                ORDER BY valid_from DESC
            """, (param_key,))
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    # ═══════════════════════════════════════════════════════════
    # DEADLINE SORGULARI
    # ═══════════════════════════════════════════════════════════

    def get_upcoming_deadlines(self, limit: int = 10) -> list[dict]:
        """Yaklaşan beyan tarihlerini getir"""
        today = date.today().isoformat()
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM deadline_calendar
                WHERE deadline_date >= ? AND is_active = 1
                ORDER BY deadline_date ASC
                LIMIT ?
            """, (today, limit))
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = dict(row)
                deadline = datetime.strptime(d["deadline_date"], "%Y-%m-%d").date()
                d["days_remaining"] = (deadline - date.today()).days
                result.append(d)
            return result

    def get_deadlines_by_month(self, year: int, month: int) -> list[dict]:
        """Ay bazlı takvim"""
        date_prefix = f"{year}-{month:02d}"
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM deadline_calendar
                WHERE deadline_date LIKE ? AND is_active = 1
                ORDER BY deadline_date ASC
            """, (f"{date_prefix}%",))
            rows = cursor.fetchall()
            result = []
            for row in rows:
                d = dict(row)
                deadline = datetime.strptime(d["deadline_date"], "%Y-%m-%d").date()
                d["days_remaining"] = (deadline - date.today()).days
                result.append(d)
            return result

    # ═══════════════════════════════════════════════════════════
    # HESAP MAKİNELERİ
    # ═══════════════════════════════════════════════════════════

    def calculate_gecikme_faizi(self, ana_para: float, baslangic: str, bitis: str) -> dict:
        """
        Tarih aralığı bazlı gecikme faizi hesaplama.
        Farklı dönemlerde farklı oranlar uygulanır.
        6183 sayılı Kanun Md. 51 (gecikme zammı)
        VUK Md. 112 (gecikme faizi)
        """
        start = datetime.strptime(baslangic, "%Y-%m-%d").date()
        end = datetime.strptime(bitis, "%Y-%m-%d").date()

        if end <= start:
            return {"error": "Bitiş tarihi başlangıçtan büyük olmalı"}

        # Gecikme oranları tarihçesini getir
        rates = self._get_gecikme_rates()
        if not rates:
            # Fallback: sabit %3.5 aylık
            rates = [{"valid_from": "2020-01-01", "valid_until": None, "oran": 3.5}]

        gun_sayisi = (end - start).days
        donem_detaylari = []
        toplam_faiz = 0.0
        current = start

        for rate_info in sorted(rates, key=lambda x: x["valid_from"]):
            rate_start = datetime.strptime(rate_info["valid_from"], "%Y-%m-%d").date()
            rate_end_str = rate_info.get("valid_until")
            rate_end = datetime.strptime(rate_end_str, "%Y-%m-%d").date() if rate_end_str else date(2099, 12, 31)
            oran = rate_info["oran"]

            # Bu oran döneminin hesaplama aralığıyla kesişimi
            period_start = max(current, rate_start)
            period_end = min(end, rate_end)

            if period_start >= period_end:
                continue

            gun = (period_end - period_start).days
            gunluk_oran = oran / 100 / 30
            faiz = ana_para * gunluk_oran * gun

            donem_detaylari.append({
                "donem_baslangic": period_start.isoformat(),
                "donem_bitis": period_end.isoformat(),
                "oran_aylik": oran,
                "gun_sayisi": gun,
                "faiz_tutari": round(faiz, 2)
            })
            toplam_faiz += faiz
            current = period_end

        return {
            "ana_para": ana_para,
            "baslangic": baslangic,
            "bitis": bitis,
            "gun_sayisi": gun_sayisi,
            "donem_detaylari": donem_detaylari,
            "toplam_faiz": round(toplam_faiz, 2),
            "toplam_odeme": round(ana_para + toplam_faiz, 2)
        }

    def calculate_kidem_tazminati(self, brut_ucret: float, ise_giris: str, cikis_tarihi: str) -> dict:
        """
        Kıdem tazminatı hesaplama.
        1475 sayılı İş Kanunu Md. 14
        Her tam yıl için 30 günlük brüt ücret.
        Tavan: 6 aylık dönem başına açıklanan memur emekli ikramiyesi tavanı.
        """
        giris = datetime.strptime(ise_giris, "%Y-%m-%d").date()
        cikis = datetime.strptime(cikis_tarihi, "%Y-%m-%d").date()

        if cikis <= giris:
            return {"error": "Çıkış tarihi giriş tarihinden büyük olmalı"}

        # Çalışma süresi hesapla
        delta = cikis - giris
        toplam_gun = delta.days
        yil = toplam_gun // 365
        kalan_gun = toplam_gun % 365
        ay = kalan_gun // 30
        gun = kalan_gun % 30
        toplam_yil_kesir = toplam_gun / 365.0

        # Kıdem tavanı
        tavan_param = self.get_effective("kidem_tavani", cikis_tarihi)
        tavan = tavan_param["param_value"] if tavan_param else 35058.58  # 2025 fallback

        # Giydirilmiş brüt ücret (tavan kontrolü)
        gunluk_ucret = min(brut_ucret, tavan) / 30

        # Her yıl 30 günlük ücret
        tazminat = gunluk_ucret * 30 * toplam_yil_kesir

        return {
            "brut_ucret": brut_ucret,
            "ise_giris": ise_giris,
            "cikis_tarihi": cikis_tarihi,
            "calisma_suresi": {
                "yil": yil,
                "ay": ay,
                "gun": gun,
                "toplam_gun": toplam_gun,
                "toplam_yil_kesir": round(toplam_yil_kesir, 2)
            },
            "kidem_tavani": tavan,
            "tavan_uygulanadi": brut_ucret > tavan,
            "gunluk_ucret": round(gunluk_ucret, 2),
            "tazminat_tutari": round(tazminat, 2),
            "damga_vergisi": round(tazminat * 0.00759, 2),
            "net_tazminat": round(tazminat - (tazminat * 0.00759), 2)
        }

    def calculate_ihbar_tazminati(self, brut_ucret: float, ise_giris: str, cikis_tarihi: str) -> dict:
        """
        İhbar tazminatı hesaplama.
        4857 sayılı İş Kanunu Md. 17
        """
        giris = datetime.strptime(ise_giris, "%Y-%m-%d").date()
        cikis = datetime.strptime(cikis_tarihi, "%Y-%m-%d").date()
        toplam_gun = (cikis - giris).days
        toplam_ay = toplam_gun / 30.0

        # İhbar süreleri
        if toplam_ay < 6:
            hafta = 2
            sure_aciklama = "0-6 ay arası"
        elif toplam_ay < 18:
            hafta = 4
            sure_aciklama = "6 ay - 1.5 yıl arası"
        elif toplam_ay < 36:
            hafta = 6
            sure_aciklama = "1.5 - 3 yıl arası"
        else:
            hafta = 8
            sure_aciklama = "3 yıldan fazla"

        ihbar_gun = hafta * 7
        gunluk_ucret = brut_ucret / 30
        tazminat = gunluk_ucret * ihbar_gun

        return {
            "brut_ucret": brut_ucret,
            "calisma_suresi_ay": round(toplam_ay, 1),
            "ihbar_suresi_hafta": hafta,
            "ihbar_suresi_gun": ihbar_gun,
            "sure_aciklama": sure_aciklama,
            "gunluk_ucret": round(gunluk_ucret, 2),
            "tazminat_tutari": round(tazminat, 2),
            "gelir_vergisi": round(tazminat * 0.15, 2),
            "damga_vergisi": round(tazminat * 0.00759, 2),
            "sgk_isci": round(tazminat * 0.14, 2),
            "net_tazminat": round(tazminat - (tazminat * 0.15) - (tazminat * 0.00759) - (tazminat * 0.14), 2)
        }

    def calculate_damga_vergisi(self, tutar: float, belge_tipi: str = "sozlesme") -> dict:
        """
        Damga vergisi hesaplama.
        488 sayılı Damga Vergisi Kanunu
        """
        # Oran ve tavan al
        oran_param = self.get_effective("damga_sozlesme")
        tavan_param = self.get_effective("damga_ust_sinir")

        oran_binde = oran_param["param_value"] if oran_param else 9.48
        tavan = tavan_param["param_value"] if tavan_param else 18200000

        # Belge tipine göre oran varyasyonları
        belge_oranlari = {
            "sozlesme": oran_binde,
            "karar": oran_binde,
            "maas_bordrosu": 7.59,
            "kira_kontrati": oran_binde,
            "ihale": oran_binde,
            "taahhutname": oran_binde,
        }
        uygulanan_oran = belge_oranlari.get(belge_tipi, oran_binde)

        hesaplanan = tutar * (uygulanan_oran / 1000)
        tavan_asildi = hesaplanan > tavan
        nihai = min(hesaplanan, tavan)

        return {
            "tutar": tutar,
            "belge_tipi": belge_tipi,
            "oran_binde": uygulanan_oran,
            "hesaplanan_vergi": round(hesaplanan, 2),
            "tavan": tavan,
            "tavan_asildi": tavan_asildi,
            "odenecek_vergi": round(nihai, 2)
        }

    def calculate_gelir_vergisi(self, yillik_gelir: float) -> dict:
        """
        Gelir vergisi hesaplama (kümülatif dilimli).
        GVK Md. 103
        """
        dilimler = self._get_gelir_vergisi_dilimleri()
        if not dilimler:
            # Fallback 2025 dilimleri
            dilimler = [
                {"min": 0, "max": 158000, "oran": 15},
                {"min": 158000, "max": 330000, "oran": 20},
                {"min": 330000, "max": 800000, "oran": 27},
                {"min": 800000, "max": 4300000, "oran": 35},
                {"min": 4300000, "max": None, "oran": 40},
            ]

        toplam_vergi = 0.0
        detaylar = []
        kalan = yillik_gelir

        for dilim in dilimler:
            if kalan <= 0:
                break
            alt = dilim["min"]
            ust = dilim["max"] if dilim["max"] else float('inf')
            oran = dilim["oran"]
            dilim_genisligi = ust - alt if ust != float('inf') else kalan
            vergilenen = min(kalan, dilim_genisligi)
            vergi = vergilenen * (oran / 100)
            toplam_vergi += vergi
            detaylar.append({
                "dilim": f"{alt:,.0f} - {ust:,.0f}" if ust != float('inf') else f"{alt:,.0f}+",
                "oran": oran,
                "vergilenen_tutar": round(vergilenen, 2),
                "vergi": round(vergi, 2)
            })
            kalan -= vergilenen

        efektif_oran = (toplam_vergi / yillik_gelir * 100) if yillik_gelir > 0 else 0

        return {
            "yillik_gelir": yillik_gelir,
            "toplam_vergi": round(toplam_vergi, 2),
            "net_gelir": round(yillik_gelir - toplam_vergi, 2),
            "efektif_oran": round(efektif_oran, 2),
            "dilim_detaylari": detaylar
        }

    def calculate_bordro(self, brut_ucret: float) -> dict:
        """
        Bordro hesaplama (SGK + Gelir Vergisi + Damga Vergisi).
        5510 sayılı Kanun, GVK, 488 sayılı DVK
        """
        # SGK oranlarını al
        sgk_isci = 0.14  # %14 (9% uzun vade + 5% sağlık)
        sgk_isveren = 0.205  # %20.5 (2% kısa + 11% uzun + 7.5% sağlık)
        issizlik_isci = 0.01  # %1
        issizlik_isveren = 0.02  # %2

        # SGK taban/tavan kontrol
        taban_param = self.get_effective("sgk_taban")
        tavan_param = self.get_effective("sgk_tavan")
        sgk_taban = taban_param["param_value"] if taban_param else 22104
        sgk_tavan = tavan_param["param_value"] if tavan_param else 165780

        sgk_matrahi = max(sgk_taban, min(brut_ucret, sgk_tavan))

        # İşçi kesintileri
        sgk_isci_tutar = sgk_matrahi * sgk_isci
        issizlik_isci_tutar = sgk_matrahi * issizlik_isci
        gelir_vergisi_matrahi = brut_ucret - sgk_isci_tutar - issizlik_isci_tutar

        # Gelir vergisi (aylık - ilk dilim %15 varsayımı, kümülatif değil)
        gv_tutar = max(0, gelir_vergisi_matrahi * 0.15)

        # Asgari ücret istisna kontrolü
        asgari_param = self.get_effective("asgari_ucret_brut")
        asgari_ucret = asgari_param["param_value"] if asgari_param else 22104
        if brut_ucret <= asgari_ucret:
            gv_tutar = 0  # Asgari ücrete kadar GV istisnası

        # Damga vergisi
        dv_tutar = brut_ucret * 0.00759

        # Net ücret
        net_ucret = brut_ucret - sgk_isci_tutar - issizlik_isci_tutar - gv_tutar - dv_tutar

        # İşveren maliyeti
        sgk_isveren_tutar = sgk_matrahi * sgk_isveren
        issizlik_isveren_tutar = sgk_matrahi * issizlik_isveren
        toplam_maliyet = brut_ucret + sgk_isveren_tutar + issizlik_isveren_tutar

        return {
            "brut_ucret": brut_ucret,
            "isci_kesintileri": {
                "sgk_isci": round(sgk_isci_tutar, 2),
                "issizlik_isci": round(issizlik_isci_tutar, 2),
                "gelir_vergisi": round(gv_tutar, 2),
                "damga_vergisi": round(dv_tutar, 2),
                "toplam_kesinti": round(sgk_isci_tutar + issizlik_isci_tutar + gv_tutar + dv_tutar, 2)
            },
            "net_ucret": round(net_ucret, 2),
            "isveren_maliyeti": {
                "sgk_isveren": round(sgk_isveren_tutar, 2),
                "issizlik_isveren": round(issizlik_isveren_tutar, 2),
                "toplam_ek_maliyet": round(sgk_isveren_tutar + issizlik_isveren_tutar, 2)
            },
            "toplam_maliyet": round(toplam_maliyet, 2)
        }

    # ═══════════════════════════════════════════════════════════
    # YARDIMCI METODLAR
    # ═══════════════════════════════════════════════════════════

    def _row_to_dict(self, row) -> dict:
        """sqlite3.Row → dict, metadata JSON parse"""
        d = dict(row)
        if d.get("metadata"):
            try:
                d["metadata"] = json.loads(d["metadata"])
            except (json.JSONDecodeError, TypeError):
                d["metadata"] = {}
        return d

    def _get_gecikme_rates(self) -> list[dict]:
        """Gecikme oranları tarihçesini getir"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT param_value, valid_from, valid_until FROM tax_parameters
                WHERE param_key = 'gecikme_zammi'
                ORDER BY valid_from ASC
            """)
            rows = cursor.fetchall()
            return [{"valid_from": r["valid_from"], "valid_until": r["valid_until"], "oran": r["param_value"]} for r in rows]

    def _get_gelir_vergisi_dilimleri(self) -> list[dict]:
        """Gelir vergisi dilimlerini metadata'dan getir"""
        params = self.get_by_category("gelir_vergisi_dilimleri")
        if not params:
            return []
        dilimler = []
        for p in sorted(params, key=lambda x: x.get("param_value", 0)):
            meta = p.get("metadata", {})
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except (json.JSONDecodeError, TypeError):
                    meta = {}
            dilimler.append({
                "min": meta.get("min", 0),
                "max": meta.get("max"),
                "oran": p["param_value"],
            })
        return dilimler
