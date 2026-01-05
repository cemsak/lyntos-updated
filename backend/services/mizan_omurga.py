"""
Mizan Omurga (Backbone) Module
Comprehensive trial balance account analysis

Analyzes 18+ critical mizan accounts with:
- Balance analysis
- Ratio calculations (vs ciro)
- Turnover metrics
- Anomaly detection
- VDK-based thresholds
- Evidence-gated warnings
"""

from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class MizanOmurgaAnalyzer:
    """
    Analyzes 18+ critical mizan accounts

    Critical accounts:
    - 100: Kasa
    - 102: Bankalar
    - 108: Diger Hazir Degerler
    - 120: Alicilar
    - 131: Ortaklar Cari
    - 150: Ilk Madde Malzeme
    - 153: Ticari Mallar
    - 191: Indirilecek KDV
    - 250: Demirbaslar
    - 253: Tasitlar
    - 320: Saticilar
    - 321: Borc Senetleri
    - 335: Personele Borclar
    - 360: Odenecek Vergi ve Fonlar
    - 400: Sermaye
    - 590: Donem Kari/Zarari
    - 600: Yurt Ici Satislar
    - 620: Satistan Iadeler
    - 710: Direkt Ilk Madde Malzeme
    - 770: Genel Yonetim Giderleri
    """

    def __init__(self, mizan_data: Dict, ciro: float, period: str):
        """
        Args:
            mizan_data: Dict with account codes as keys, balances as values
            ciro: Period revenue (for ratio calculations)
            period: Period identifier (e.g., "2025-Q2")
        """
        self.mizan = mizan_data
        self.ciro = ciro if ciro > 0 else 1  # Avoid division by zero
        self.period = period

    def analyze_all(self) -> Dict:
        """Run analysis on all critical accounts"""

        results = {}

        # Cash accounts
        results["100"] = self.analyze_kasa()
        results["102"] = self.analyze_bankalar()
        results["108"] = self.analyze_diger_hazir()

        # Receivables
        results["120"] = self.analyze_alicilar()
        results["131"] = self.analyze_ortaklar_cari()

        # Inventory
        results["150"] = self.analyze_ilk_madde()
        results["153"] = self.analyze_ticari_mal()

        # VAT
        results["191"] = self.analyze_indirilecek_kdv()

        # Fixed assets
        results["250"] = self.analyze_demirbaslar()
        results["253"] = self.analyze_tasitlar()

        # Payables
        results["320"] = self.analyze_saticilar()
        results["321"] = self.analyze_borc_senetleri()
        results["335"] = self.analyze_personel_borclari()
        results["360"] = self.analyze_odenecek_vergi()

        # Equity
        results["400"] = self.analyze_sermaye()
        results["590"] = self.analyze_donem_kari()

        # Revenue
        results["600"] = self.analyze_satislar()
        results["620"] = self.analyze_iadeler()

        # Expenses
        results["710"] = self.analyze_direkt_madde()
        results["770"] = self.analyze_genel_yonetim()

        return {
            "accounts": results,
            "summary": self._generate_summary(results),
            "analysis": {
                "expert": {
                    "method": "VDK kriterleri + oran analizi + trend tespiti",
                    "legal_basis_refs": ["SRC-0047", "SRC-0045", "SRC-0034"],
                    "evidence_refs": ["mizan_detay.csv"],
                    "trust_score": 1.0,
                    "computed_at": datetime.utcnow().isoformat() + "Z"
                }
            }
        }

    def analyze_kasa(self) -> Dict:
        """
        100 Kasa Analysis
        Threshold: Max 2% of revenue (VUK Madde 229)
        """
        bakiye = self.mizan.get("100", 0)
        esik = self.ciro * 0.02
        oran = (bakiye / self.ciro * 100)

        if bakiye > esik:
            status = "warning"
            reason = f"Kasa tutari ciroya gore yuksek (%{oran:.1f}, esik %2)"
            required_actions = [
                "Kasa fizik sayimi yapin",
                "Nakit giris/cikis belgelerini kontrol edin",
                "Fazla nakit bankaya yatirilmali"
            ]
        else:
            status = "ok"
            reason = "Kasa tutari normal sinirlarda"
            required_actions = []

        return {
            "hesap": "100",
            "ad": "Kasa",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "esik": round(esik, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0047"],
            "evidence_refs": ["mizan_100.csv", "kasa_sayim_tutanagi.pdf"]
        }

    def analyze_bankalar(self) -> Dict:
        """
        102 Bankalar Analysis
        Check: Negative balance (overdrawn), high balance
        """
        bakiye = self.mizan.get("102", 0)
        oran = (bakiye / self.ciro * 100)

        if bakiye < 0:
            status = "error"
            reason = f"Banka hesabi ekside ({bakiye:,.0f} TL)"
            required_actions = [
                "Banka hesap hareketlerini kontrol edin",
                "Kredi limit asimi var mi kontrol edin",
                "Mutabakat yapin"
            ]
        elif bakiye > self.ciro * 0.5:
            status = "warning"
            reason = "Banka bakiyesi yuksek (cirosunun %50'sinden fazla)"
            required_actions = [
                "Yatirim firsatlarini degerlendirin",
                "Isletme sermayesi planlamasi yapin"
            ]
        else:
            status = "ok"
            reason = "Banka bakiyesi normal"
            required_actions = []

        return {
            "hesap": "102",
            "ad": "Bankalar",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0046"],
            "evidence_refs": ["mizan_102.csv", "banka_ekstresi.pdf"]
        }

    def analyze_diger_hazir(self) -> Dict:
        """108 Diger Hazir Degerler"""
        bakiye = self.mizan.get("108", 0)

        return {
            "hesap": "108",
            "ad": "Diger Hazir Degerler",
            "bakiye": bakiye,
            "status": "ok" if bakiye >= 0 else "warning",
            "reason_tr": "Normal" if bakiye >= 0 else "Negatif bakiye",
            "required_actions": [] if bakiye >= 0 else ["Hesap hareketlerini kontrol edin"],
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_108.csv"]
        }

    def analyze_alicilar(self) -> Dict:
        """
        120 Alicilar (Trade Receivables)
        Check: Turnover ratio, collection period
        """
        bakiye = self.mizan.get("120", 0)
        # Turnover: Satislar / Ortalama Alacaklar
        devir_hizi = (self.ciro / bakiye) if bakiye > 0 else 0
        tahsilat_suresi = (365 / devir_hizi) if devir_hizi > 0 else 0

        if tahsilat_suresi > 90:
            status = "warning"
            reason = f"Alacak tahsilat suresi uzun ({tahsilat_suresi:.0f} gun)"
            required_actions = [
                "Vadesi gecmis alacaklari takip edin",
                "Musteri bazli yaslandirma analizi yapin",
                "Tahsilat politikalarini gozden gecirin"
            ]
        elif tahsilat_suresi > 60:
            status = "warning"
            reason = f"Alacak tahsilat suresi ortalamanin uzerinde ({tahsilat_suresi:.0f} gun)"
            required_actions = [
                "Alacak yaslandirma raporunu inceleyin"
            ]
        else:
            status = "ok"
            reason = f"Alacak tahsilat suresi normal ({tahsilat_suresi:.0f} gun)"
            required_actions = []

        return {
            "hesap": "120",
            "ad": "Alicilar",
            "bakiye": bakiye,
            "devir_hizi": round(devir_hizi, 2),
            "tahsilat_suresi_gun": round(tahsilat_suresi, 0),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_120.csv", "alacak_yaslandirma.xlsx"]
        }

    def analyze_ortaklar_cari(self) -> Dict:
        """
        131 Ortaklar Cari (Partner Current Accounts)
        Risk: High balances indicate capital extraction (ortulu sermaye)
        """
        bakiye = self.mizan.get("131", 0)
        sermaye = self.mizan.get("400", 1)  # Avoid div by zero
        oran = (bakiye / sermaye * 100) if sermaye > 0 else 0

        if bakiye > sermaye * 0.5:
            status = "error"
            reason = f"Ortaklar cari sermayenin %{oran:.0f}'si (ORTULU SERMAYE RISKI)"
            required_actions = [
                "Ortak borclarinin kaynagini belirleyin",
                "Ortulu sermaye riski var mi degerlendirin",
                "Ortak cari hareketlerini belgeleyin",
                "VDK inceleme riski yuksek"
            ]
        elif bakiye > sermaye * 0.2:
            status = "warning"
            reason = f"Ortaklar cari sermayenin %{oran:.0f}'si"
            required_actions = [
                "Ortak cari bakiyesini azaltmayi planlayin"
            ]
        else:
            status = "ok"
            reason = "Ortaklar cari normal seviyede"
            required_actions = []

        return {
            "hesap": "131",
            "ad": "Ortaklardan Alacaklar",
            "bakiye": bakiye,
            "oran_sermaye": round(oran, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0026"],
            "evidence_refs": ["mizan_131.csv", "ortak_cari_detay.xlsx"]
        }

    def analyze_ilk_madde(self) -> Dict:
        """150 Ilk Madde ve Malzeme (Raw Materials)"""
        bakiye = self.mizan.get("150", 0)
        oran = (bakiye / self.ciro * 100)

        return {
            "hesap": "150",
            "ad": "Ilk Madde ve Malzeme",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "status": "ok",
            "reason_tr": "Envanter kaydi",
            "required_actions": [],
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_150.csv", "stok_sayim.xlsx"]
        }

    def analyze_ticari_mal(self) -> Dict:
        """
        153 Ticari Mallar (Trade Goods)
        Check: Inventory turnover
        """
        bakiye = self.mizan.get("153", 0)
        # SMY approx: ciro * 0.7 (70% maliyet varsayimi)
        smy = self.ciro * 0.7
        devir_hizi = (smy / bakiye) if bakiye > 0 else 0
        stok_gun = (365 / devir_hizi) if devir_hizi > 0 else 0

        if stok_gun > 180:
            status = "warning"
            reason = f"Stok devir suresi uzun ({stok_gun:.0f} gun)"
            required_actions = [
                "Yavas hareket eden urunleri tespit edin",
                "Stok degerleme kontrolu yapin",
                "Eski stoklar icin indirim kampanyasi dusunun"
            ]
        elif stok_gun > 120:
            status = "warning"
            reason = f"Stok devir suresi ortalamanin uzerinde ({stok_gun:.0f} gun)"
            required_actions = [
                "Stok optimizasyonu degerlendirin"
            ]
        else:
            status = "ok"
            reason = f"Stok devir suresi normal ({stok_gun:.0f} gun)"
            required_actions = []

        return {
            "hesap": "153",
            "ad": "Ticari Mallar",
            "bakiye": bakiye,
            "devir_hizi": round(devir_hizi, 2),
            "stok_gun": round(stok_gun, 0),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_153.csv", "stok_sayim.xlsx"]
        }

    def analyze_indirilecek_kdv(self) -> Dict:
        """191 Indirilecek KDV (Input VAT)"""
        bakiye = self.mizan.get("191", 0)
        oran = (bakiye / self.ciro * 100)

        # Check if balance is too high (possible refund situation)
        if bakiye > self.ciro * 0.05:
            status = "warning"
            reason = f"Indirilecek KDV yuksek (%{oran:.1f}) - iade durumu olabilir"
            required_actions = [
                "KDV beyani ile karsilastirin",
                "Iade basvurusu gerekli mi degerlendirin"
            ]
        else:
            status = "ok"
            reason = "Indirilecek KDV normal"
            required_actions = []

        return {
            "hesap": "191",
            "ad": "Indirilecek KDV",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0003"],
            "evidence_refs": ["mizan_191.csv", "kdv_beyan.pdf"]
        }

    def analyze_demirbaslar(self) -> Dict:
        """250 Demirbaslar (Furniture & Fixtures)"""
        bakiye = self.mizan.get("250", 0)
        oran = (bakiye / self.ciro * 100)

        return {
            "hesap": "250",
            "ad": "Demirbaslar",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "status": "ok",
            "reason_tr": "Sabit kiymet kaydi",
            "required_actions": [],
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_250.csv", "sabit_kiymet_listesi.xlsx"]
        }

    def analyze_tasitlar(self) -> Dict:
        """253 Tasitlar (Vehicles)"""
        bakiye = self.mizan.get("253", 0)
        oran = (bakiye / self.ciro * 100)

        return {
            "hesap": "253",
            "ad": "Tasitlar",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "status": "ok",
            "reason_tr": "Tasit kaydi",
            "required_actions": [],
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_253.csv", "tasit_listesi.xlsx"]
        }

    def analyze_saticilar(self) -> Dict:
        """320 Saticilar (Trade Payables)"""
        bakiye = self.mizan.get("320", 0)

        # Payment period approximation (COGS / Payables * 365)
        cogs = self.ciro * 0.7
        odeme_suresi = (bakiye / cogs * 365) if cogs > 0 else 0

        if odeme_suresi > 90:
            status = "warning"
            reason = f"Satici odeme suresi uzun ({odeme_suresi:.0f} gun)"
            required_actions = [
                "Vadesi gecmis borclari tespit edin",
                "Tedarikci iliskileri risk altinda olabilir"
            ]
        else:
            status = "ok"
            reason = f"Satici odeme suresi normal ({odeme_suresi:.0f} gun)"
            required_actions = []

        return {
            "hesap": "320",
            "ad": "Saticilar",
            "bakiye": bakiye,
            "odeme_suresi_gun": round(odeme_suresi, 0),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_320.csv", "satici_yaslandirma.xlsx"]
        }

    def analyze_borc_senetleri(self) -> Dict:
        """321 Borc Senetleri"""
        bakiye = self.mizan.get("321", 0)
        oran = (bakiye / self.ciro * 100)

        if oran > 20:
            status = "warning"
            reason = f"Borc senetleri yuksek (cirosunun %{oran:.1f}'si)"
            required_actions = [
                "Senet vadelerini kontrol edin",
                "Nakit akis planlamasi yapin"
            ]
        else:
            status = "ok"
            reason = "Borc senetleri normal seviyede"
            required_actions = []

        return {
            "hesap": "321",
            "ad": "Borc Senetleri",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_321.csv"]
        }

    def analyze_personel_borclari(self) -> Dict:
        """335 Personele Borclar"""
        bakiye = self.mizan.get("335", 0)

        # Threshold: 1 month payroll approximation
        if bakiye > self.ciro * 0.05:
            status = "warning"
            reason = "Personele borclar yuksek (maas odemesi gecikmi olabilir)"
            required_actions = [
                "Odenmemis maaslari kontrol edin",
                "SGK prim borclari var mi kontrol edin"
            ]
        else:
            status = "ok"
            reason = "Personele borclar normal"
            required_actions = []

        return {
            "hesap": "335",
            "ad": "Personele Borclar",
            "bakiye": bakiye,
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_335.csv", "bordro.xlsx"]
        }

    def analyze_odenecek_vergi(self) -> Dict:
        """360 Odenecek Vergi ve Fonlar"""
        bakiye = self.mizan.get("360", 0)
        oran = (bakiye / self.ciro * 100)

        if bakiye > self.ciro * 0.1:
            status = "error"
            reason = f"Odenecek vergi yuksek (%{oran:.1f}) - odeme yapilmamis olabilir"
            required_actions = [
                "Vergi odeme plani yapin",
                "Gecikme faizi riski var",
                "Taksitlendirme basvurusu degerlendirin"
            ]
        elif bakiye > self.ciro * 0.05:
            status = "warning"
            reason = "Odenecek vergi ortalamanin uzerinde"
            required_actions = [
                "Vergi takvimini kontrol edin"
            ]
        else:
            status = "ok"
            reason = "Odenecek vergi normal"
            required_actions = []

        return {
            "hesap": "360",
            "ad": "Odenecek Vergi ve Fonlar",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_360.csv", "vergi_beyan.pdf"]
        }

    def analyze_sermaye(self) -> Dict:
        """400 Sermaye (Capital)"""
        bakiye = self.mizan.get("400", 0)

        if bakiye <= 0:
            status = "error"
            reason = "Sermaye negatif veya sifir (YASAL SORUN)"
            required_actions = [
                "Sermaye artirimi gerekli",
                "Ticaret sicil tescili kontrol edin",
                "TTK sermaye kaybi hukumleri uygulanabilir"
            ]
        else:
            status = "ok"
            reason = "Sermaye kaydi normal"
            required_actions = []

        return {
            "hesap": "400",
            "ad": "Sermaye",
            "bakiye": bakiye,
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0001"],
            "evidence_refs": ["mizan_400.csv", "ticaret_sicil.pdf"]
        }

    def analyze_donem_kari(self) -> Dict:
        """590 Donem Kari/Zarari"""
        bakiye = self.mizan.get("590", 0)
        kar_marji = (bakiye / self.ciro * 100)

        if bakiye < 0:
            status = "error"
            reason = f"Donem zarari var ({bakiye:,.0f} TL)"
            required_actions = [
                "Zarar nedenlerini analiz edin",
                "Maliyet dusurme plani yapin",
                "Gelir artirma stratejileri gelistirin"
            ]
        elif kar_marji < 3:
            status = "warning"
            reason = f"Kar marji cok dusuk (%{kar_marji:.1f})"
            required_actions = [
                "Karlilik analizi yapin",
                "Fiyatlama stratejisini gozden gecirin"
            ]
        elif kar_marji < 5:
            status = "warning"
            reason = f"Kar marji dusuk (%{kar_marji:.1f})"
            required_actions = [
                "Karliligi artirma stratejileri gelistirin"
            ]
        else:
            status = "ok"
            reason = f"Kar marji normal (%{kar_marji:.1f})"
            required_actions = []

        return {
            "hesap": "590",
            "ad": "Donem Net Kari (Zarari)",
            "bakiye": bakiye,
            "kar_marji": round(kar_marji, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0001"],
            "evidence_refs": ["mizan_590.csv", "gelir_tablosu.pdf"]
        }

    def analyze_satislar(self) -> Dict:
        """600 Yurt Ici Satislar"""
        bakiye = self.mizan.get("600", 0)

        return {
            "hesap": "600",
            "ad": "Yurt Ici Satislar",
            "bakiye": bakiye,
            "status": "ok",
            "reason_tr": "Satis kaydi",
            "required_actions": [],
            "legal_basis_refs": ["SRC-0045"],
            "evidence_refs": ["mizan_600.csv", "satis_faturalari.zip"]
        }

    def analyze_iadeler(self) -> Dict:
        """620 Satistan Iadeler"""
        bakiye = self.mizan.get("620", 0)
        iade_orani = (abs(bakiye) / self.ciro * 100)

        if iade_orani > 5:
            status = "warning"
            reason = f"Iade orani yuksek (%{iade_orani:.1f})"
            required_actions = [
                "Iade nedenlerini analiz edin",
                "Urun kalitesi sorunlari olabilir",
                "Musteri memnuniyeti arastirmasi yapin"
            ]
        elif iade_orani > 3:
            status = "warning"
            reason = f"Iade orani ortalamanin uzerinde (%{iade_orani:.1f})"
            required_actions = [
                "Iade nedenlerini inceleyin"
            ]
        else:
            status = "ok"
            reason = f"Iade orani normal (%{iade_orani:.1f})"
            required_actions = []

        return {
            "hesap": "620",
            "ad": "Satistan Iadeler (-)",
            "bakiye": bakiye,
            "iade_orani": round(iade_orani, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_620.csv", "iade_faturalari.zip"]
        }

    def analyze_direkt_madde(self) -> Dict:
        """710 Direkt Ilk Madde ve Malzeme"""
        bakiye = self.mizan.get("710", 0)
        oran = (bakiye / self.ciro * 100)

        if oran > 60:
            status = "warning"
            reason = f"Direkt madde maliyeti yuksek (%{oran:.1f})"
            required_actions = [
                "Tedarik maliyetlerini gozden gecirin",
                "Alternatif tedarikci arayin"
            ]
        else:
            status = "ok"
            reason = f"Direkt madde maliyeti normal (%{oran:.1f})"
            required_actions = []

        return {
            "hesap": "710",
            "ad": "Direkt Ilk Madde ve Malzeme Giderleri",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_710.csv"]
        }

    def analyze_genel_yonetim(self) -> Dict:
        """770 Genel Yonetim Giderleri"""
        bakiye = self.mizan.get("770", 0)
        oran = (bakiye / self.ciro * 100)

        if oran > 20:
            status = "warning"
            reason = f"Genel yonetim giderleri cok yuksek (%{oran:.1f})"
            required_actions = [
                "Gider kalemlerini gozden gecirin",
                "Verimlilik analizi yapin",
                "Gereksiz giderleri tespit edin"
            ]
        elif oran > 15:
            status = "warning"
            reason = f"Genel yonetim giderleri yuksek (%{oran:.1f})"
            required_actions = [
                "Gider optimizasyonu degerlendirin"
            ]
        else:
            status = "ok"
            reason = f"Genel yonetim giderleri normal (%{oran:.1f})"
            required_actions = []

        return {
            "hesap": "770",
            "ad": "Genel Yonetim Giderleri",
            "bakiye": bakiye,
            "oran_ciro": round(oran, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": ["mizan_770.csv", "gider_dokumanlari.zip"]
        }

    def _generate_summary(self, results: Dict) -> Dict:
        """Generate summary statistics"""

        total = len(results)
        ok_count = sum(1 for r in results.values() if r["status"] == "ok")
        warning_count = sum(1 for r in results.values() if r["status"] == "warning")
        error_count = sum(1 for r in results.values() if r["status"] == "error")

        # Collect all required actions
        all_actions = []
        for r in results.values():
            if r.get("required_actions"):
                for action in r["required_actions"]:
                    all_actions.append({
                        "hesap": r["hesap"],
                        "action": action,
                        "priority": "high" if r["status"] == "error" else "medium"
                    })

        return {
            "total_accounts": total,
            "ok": ok_count,
            "warning": warning_count,
            "error": error_count,
            "overall_status": "error" if error_count > 0 else ("warning" if warning_count > 0 else "ok"),
            "total_actions": len(all_actions),
            "priority_actions": all_actions[:5]  # Top 5 actions
        }


def get_mizan_analysis(
    smmm_id: str,
    client_id: str,
    period: str,
    mizan_data: Optional[Dict] = None
) -> Dict:
    """
    Main entry point for mizan analysis

    Args:
        smmm_id: SMMM identifier
        client_id: Client identifier
        period: Period (e.g., "2025-Q2")
        mizan_data: Optional pre-loaded mizan data

    Returns:
        Complete mizan analysis with 20 accounts
    """

    # If no mizan data provided, use sample data
    # In production, this would load from database/CSV
    if mizan_data is None:
        mizan_data = {
            "100": 180548,      # Kasa
            "102": 3315535,     # Bankalar
            "108": 25000,       # Diger Hazir
            "120": 2500000,     # Alicilar
            "131": 500000,      # Ortaklar Cari
            "150": 300000,      # Ilk Madde
            "153": 1200000,     # Ticari Mallar
            "191": 450000,      # Indirilecek KDV
            "250": 150000,      # Demirbaslar
            "253": 350000,      # Tasitlar
            "320": 1800000,     # Saticilar
            "321": 500000,      # Borc Senetleri
            "335": 120000,      # Personel Borclari
            "360": 250000,      # Odenecek Vergi
            "400": 1000000,     # Sermaye
            "590": 500000,      # Donem Kari
            "600": 10000000,    # Satislar
            "620": -200000,     # Iadeler
            "710": 4000000,     # Direkt Madde
            "770": 1500000      # Genel Yonetim
        }

    ciro = mizan_data.get("600", 0)

    analyzer = MizanOmurgaAnalyzer(mizan_data, ciro, period)
    return analyzer.analyze_all()
