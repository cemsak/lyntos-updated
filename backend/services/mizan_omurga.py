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
    - 500: Sermaye (Tek Düzen Hesap Planı - NOT: 400 değil!)
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

        # Equity (500 Sermaye - Tek Düzen Hesap Planı)
        results["500"] = self.analyze_sermaye()
        results["590"] = self.analyze_donem_kari()

        # Revenue
        results["600"] = self.analyze_satislar()
        results["620"] = self.analyze_iadeler()

        # Expenses
        results["710"] = self.analyze_direkt_madde()
        results["770"] = self.analyze_genel_yonetim()

        # Finansal oranları hesapla
        finansal_oranlar = self.get_finansal_oranlar()
        summary = self._generate_summary(results)

        # ════════════════════════════════════════════════════════════════════════════
        # SMMM İÇİN GÜVEN SKORU VE DETAYLI ANALİZ
        # Trust score GERÇEK verilere dayanmalı, hardcoded değil!
        # ════════════════════════════════════════════════════════════════════════════
        trust_analysis = self._calculate_trust_score(results, finansal_oranlar)

        return {
            "accounts": results,
            "summary": summary,
            "finansal_oranlar": finansal_oranlar,
            "analysis": {
                "expert": {
                    # Türkçe özet - SMMM'ye anlamlı bilgi
                    "summary_tr": trust_analysis["summary_tr"],
                    "details_tr": trust_analysis["details_tr"],
                    "method": trust_analysis["method"],
                    "rule_refs": trust_analysis["rule_refs"],
                    # Güven skoru hesaplama detayları
                    "trust_score": trust_analysis["trust_score"],
                    "trust_factors": trust_analysis["trust_factors"],
                    # Yasal dayanaklar
                    "legal_basis_refs": trust_analysis["legal_basis_refs"],
                    "evidence_refs": [],  # SAHTE DOSYA İSİMLERİ YASAK - gerçek dosya yoksa boş
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
        }

    def analyze_ortaklar_cari(self) -> Dict:
        """
        131 Ortaklar Cari (Partner Current Accounts)
        Risk: High balances indicate capital extraction (ortulu sermaye)
        """
        bakiye = self.mizan.get("131", 0)
        # 500 Sermaye - Tek Düzen Hesap Planı (400 değil!)
        sermaye = self.mizan.get("500", 0) or self.mizan.get("_ozkaynaklar", 1)  # Avoid div by zero
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
        }

    def analyze_ticari_mal(self) -> Dict:
        """
        153 Ticari Mallar (Trade Goods)
        Check: Inventory turnover

        Formül: Stok Devir Süresi = (Stoklar / SMM) × 365
        SMM = Satışların Maliyeti (620-623 hesap grubu)
        """
        bakiye = self.mizan.get("153", 0)
        # GERÇEK SMM kullan - TAHMİN YASAK!
        # _smm: mizan_data.py tarafından 620-623 hesaplarından hesaplanmış
        smm = self.mizan.get("_smm", 0)
        if smm == 0:
            # Fallback: Sadece veri yoksa tahmin yap ve UYARI ver
            smm = self.ciro * 0.7
            smm_tahmini = True
        else:
            smm_tahmini = False

        devir_hizi = (smm / bakiye) if bakiye > 0 else 0
        stok_gun = (365 / devir_hizi) if devir_hizi > 0 else 0

        if stok_gun > 180:
            status = "warning"
            reason = f"Stok devir suresi uzun ({stok_gun:.0f} gun)"
            if smm_tahmini:
                reason += " [SMM tahmini kullanildi - 62x hesaplari kontrol edin]"
            required_actions = [
                "Yavas hareket eden urunleri tespit edin",
                "Stok degerleme kontrolu yapin",
                "Eski stoklar icin indirim kampanyasi dusunun"
            ]
        elif stok_gun > 120:
            status = "warning"
            reason = f"Stok devir suresi ortalamanin uzerinde ({stok_gun:.0f} gun)"
            if smm_tahmini:
                reason += " [SMM tahmini]"
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
            "smm_kullanilan": round(smm, 2),
            "smm_tahmini_mi": smm_tahmini,
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
        }

    def analyze_saticilar(self) -> Dict:
        """
        320 Saticilar (Trade Payables)

        Formül: Satıcı Ödeme Süresi = (Satıcılar / SMM) × 365
        SMM = Satışların Maliyeti (620-623 hesap grubu)
        """
        bakiye = self.mizan.get("320", 0)

        # GERÇEK SMM kullan - TAHMİN YASAK!
        smm = self.mizan.get("_smm", 0)
        if smm == 0:
            smm = self.ciro * 0.7
            smm_tahmini = True
        else:
            smm_tahmini = False

        odeme_suresi = (bakiye / smm * 365) if smm > 0 else 0

        if odeme_suresi > 90:
            status = "warning"
            reason = f"Satici odeme suresi uzun ({odeme_suresi:.0f} gun)"
            if smm_tahmini:
                reason += " [SMM tahmini kullanildi]"
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
            "smm_kullanilan": round(smm, 2),
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0002"],
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
        }

    def analyze_sermaye(self) -> Dict:
        """
        500 Sermaye (Capital) - TEK DÜZEN HESAP PLANI

        NOT: Tek Düzen Hesap Planı'nda:
        - 400: Banka Kredileri (Pasif/Borç)
        - 500: Sermaye (Özkaynak/Pasif)

        Sermaye ALACAK bakiye verir (pozitif değer = sermaye var)
        """
        # 500 Sermaye hesabını kontrol et (3 haneli ve tam kod)
        bakiye = self.mizan.get("500", 0)

        # Eğer 500 yoksa, _ozkaynaklar extended datasını kullan
        if bakiye == 0:
            bakiye = self.mizan.get("_ozkaynaklar", 0)

        # Sermaye ALACAK bakiye verir, pozitif değer = sermaye var
        # bakiye > 0 = normal (şirketin sermayesi var)
        # bakiye <= 0 = sorun (sermaye yok veya negatif özkaynak)
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
            reason = f"Sermaye kaydi normal ({bakiye:,.0f} TL)"
            required_actions = []

        return {
            "hesap": "500",
            "ad": "Sermaye",
            "bakiye": bakiye,
            "status": status,
            "reason_tr": reason,
            "required_actions": required_actions,
            "legal_basis_refs": ["SRC-0001"],
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
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
            "evidence_refs": []  # SAHTE DOSYA İSİMLERİ YASAK
        }

    # ════════════════════════════════════════════════════════════════════════════
    # IS-7 OTURUM 7A: HESAP KARTI + YATAY ANALİZ + DİKEY ANALİZ
    # ════════════════════════════════════════════════════════════════════════════

    def hesap_karti(self, hesap_kodu: str, hesap_detaylari: List[Dict]) -> Dict:
        """
        Hesap Kartı - Tek hesap için detaylı davranış analizi

        SMMM için kritik bilgiler:
        - Bakiye yönü ve tutarlılığı
        - Ciro oranı
        - VDK risk göstergeleri
        - Mevzuat referansları
        - Alt hesap dağılımı

        Args:
            hesap_kodu: 3 haneli hesap kodu (ör: "100", "120")
            hesap_detaylari: Tüm mizan satırları (alt hesapları bulmak için)
        """
        # 3 haneli bakiye
        bakiye = self.mizan.get(hesap_kodu, 0)
        oran_ciro = (bakiye / self.ciro * 100) if self.ciro > 0 else 0

        # Alt hesapları bul (ör: 100 → 100.01, 100.02, ...)
        alt_hesaplar = []
        for row in hesap_detaylari:
            kod = row.get('hesap_kodu', '')
            if kod.startswith(hesap_kodu) and len(kod) > len(hesap_kodu):
                bakiye_borc = row.get('bakiye_borc', 0) or row.get('borc', 0) or 0
                bakiye_alacak = row.get('bakiye_alacak', 0) or row.get('alacak', 0) or 0
                # Net bakiye hesapla
                if hesap_kodu.startswith(('1', '2', '7')):
                    net = bakiye_borc - bakiye_alacak
                else:
                    net = bakiye_alacak - bakiye_borc
                alt_hesaplar.append({
                    "hesap_kodu": kod,
                    "hesap_adi": row.get('hesap_adi', ''),
                    "borc": bakiye_borc,
                    "alacak": bakiye_alacak,
                    "net_bakiye": round(net, 2),
                })

        # Bakiye yönü kontrolü (Tekdüzen Hesap Planı)
        beklenen_yon = self._beklenen_bakiye_yonu(hesap_kodu)
        yanlis_yon = False
        if beklenen_yon == 'B' and bakiye < 0:
            yanlis_yon = True
        elif beklenen_yon == 'A' and bakiye > 0:
            # Pasif hesaplar alacak bakiye vermeli, pozitif = normal
            # Ama mizan_data'da pasif hesaplar alacak-borc olarak saklanır (pozitif = alacak bakiye)
            yanlis_yon = False
        elif beklenen_yon == 'A' and bakiye < 0:
            yanlis_yon = True

        # Hesap grubu bilgisi
        hesap_grubu = self._hesap_grubu_bilgisi(hesap_kodu)

        # VDK risk kontrolü
        vdk_risk = self._hesap_vdk_risk(hesap_kodu, bakiye)

        # Mevzuat referansları
        mevzuat_refs = self._hesap_mevzuat_refs(hesap_kodu)

        # Davranış analizi
        davranis = self._hesap_davranis_analizi(hesap_kodu, bakiye)

        return {
            "hesap_kodu": hesap_kodu,
            "hesap_adi": hesap_grubu["ad"],
            "hesap_grubu": hesap_grubu["grup"],
            "hesap_tipi": hesap_grubu["tip"],
            "bakiye": round(bakiye, 2),
            "oran_ciro": round(oran_ciro, 2),
            "beklenen_bakiye_yonu": beklenen_yon,
            "yanlis_yon": yanlis_yon,
            "yanlis_yon_aciklama": (
                f"{hesap_kodu} hesabı {beklenen_yon} bakiye vermeli, ancak ters yönde bakiye var."
                if yanlis_yon else None
            ),
            "alt_hesaplar": alt_hesaplar[:50],  # Max 50
            "alt_hesap_sayisi": len(alt_hesaplar),
            "davranis": davranis,
            "vdk_risk": vdk_risk,
            "mevzuat_refs": mevzuat_refs,
            "period": self.period,
        }

    def yatay_analiz(
        self,
        onceki_mizan: Dict,
        onceki_ciro: float,
        esik_yuzde: float = 20.0,
    ) -> Dict:
        """
        Yatay Analiz (Horizontal Analysis)
        Dönemler arası % değişim + "neden motoru" + materiality threshold

        Formül: Değişim % = ((Cari - Önceki) / |Önceki|) × 100

        Args:
            onceki_mizan: Önceki dönem mizan verisi (kod → bakiye)
            onceki_ciro: Önceki dönem cirosu
            esik_yuzde: Materiality eşiği (% olarak, default %20)

        Returns:
            Yatay analiz sonuçları (değişim tablosu + nedenler + özetler)
        """
        sonuclar = []
        toplam_material_degisim = 0
        kritik_sayac = 0
        uyari_sayac = 0

        # Tüm hesap kodlarını birleştir (her iki dönemde de olabilir)
        tum_kodlar = set()
        for k in self.mizan.keys():
            if not k.startswith('_') and len(k) == 3:
                tum_kodlar.add(k)
        for k in onceki_mizan.keys():
            if not k.startswith('_') and len(k) == 3:
                tum_kodlar.add(k)

        for kod in sorted(tum_kodlar):
            cari_bakiye = self.mizan.get(kod, 0)
            onceki_bakiye = onceki_mizan.get(kod, 0)
            fark = cari_bakiye - onceki_bakiye

            # % değişim hesapla
            if onceki_bakiye != 0:
                degisim_yuzde = (fark / abs(onceki_bakiye)) * 100
            elif cari_bakiye != 0:
                degisim_yuzde = 100.0  # Yeni hesap (önceki 0)
            else:
                degisim_yuzde = 0.0

            # Ciro oranları
            oran_cari = (cari_bakiye / self.ciro * 100) if self.ciro > 0 else 0
            oran_onceki = (onceki_bakiye / onceki_ciro * 100) if onceki_ciro > 0 else 0

            # Material mi?
            material = abs(degisim_yuzde) >= esik_yuzde and abs(fark) > 1000

            # Neden motoru
            neden = self._yatay_neden_motoru(kod, cari_bakiye, onceki_bakiye, degisim_yuzde)

            # Durum belirleme
            if abs(degisim_yuzde) >= 50 and abs(fark) > 10000:
                durum = "kritik"
                kritik_sayac += 1
            elif material:
                durum = "uyari"
                uyari_sayac += 1
            else:
                durum = "normal"

            if material:
                toplam_material_degisim += 1

            hesap_bilgi = self._hesap_grubu_bilgisi(kod)

            sonuclar.append({
                "hesap_kodu": kod,
                "hesap_adi": hesap_bilgi["ad"],
                "hesap_grubu": hesap_bilgi["grup"],
                "cari_bakiye": round(cari_bakiye, 2),
                "onceki_bakiye": round(onceki_bakiye, 2),
                "fark": round(fark, 2),
                "degisim_yuzde": round(degisim_yuzde, 2),
                "oran_cari": round(oran_cari, 2),
                "oran_onceki": round(oran_onceki, 2),
                "material": material,
                "durum": durum,
                "neden": neden,
            })

        # Özet
        ozet = {
            "toplam_hesap": len(sonuclar),
            "material_degisim_sayisi": toplam_material_degisim,
            "kritik_sayisi": kritik_sayac,
            "uyari_sayisi": uyari_sayac,
            "esik_yuzde": esik_yuzde,
            "cari_ciro": round(self.ciro, 2),
            "onceki_ciro": round(onceki_ciro, 2),
            "ciro_degisim_yuzde": round(
                ((self.ciro - onceki_ciro) / abs(onceki_ciro) * 100) if onceki_ciro != 0 else 0, 2
            ),
        }

        # En önemli değişimler (material + sıralı)
        material_degisimler = [s for s in sonuclar if s["material"]]
        material_degisimler.sort(key=lambda x: abs(x["degisim_yuzde"]), reverse=True)

        return {
            "sonuclar": sonuclar,
            "ozet": ozet,
            "material_degisimler": material_degisimler[:20],
            "method": "Yatay Analiz (Period-over-Period % Change)",
            "legal_basis_refs": [
                {"id": "SRC-0002", "title_tr": "VUK 171-178 Defter Tutma"},
                {"id": "SRC-0045", "title_tr": "Tekdüzen Hesap Planı Tebliği"},
            ],
        }

    def dikey_analiz(self) -> Dict:
        """
        Dikey Analiz (Vertical Analysis / Common-Size Analysis)

        Bilanço: Her kalem / Toplam Aktif × 100
        Gelir Tablosu: Her kalem / Net Satışlar × 100

        SMMM için kritik: Yapısal anormallikleri gösterir
        (ör: Kasa/Aktif %15+ → VDK inceleme riski)
        """
        # Toplam değerler
        donen_varliklar = self.mizan.get('_donen_varliklar', 0)
        duran_varliklar = self.mizan.get('_duran_varliklar', 0)
        toplam_aktif = self.mizan.get('_toplam_aktif', 0)
        kvyk = self.mizan.get('_kvyk', 0)
        uvyk = self.mizan.get('_uvyk', 0)
        ozkaynaklar = self.mizan.get('_ozkaynaklar', 0)
        ciro = self.mizan.get('_ciro', self.ciro)
        smm = self.mizan.get('_smm', 0)

        if toplam_aktif == 0:
            # Fallback: Manuel hesapla
            donen_varliklar = sum(v for k, v in self.mizan.items() if k.startswith('1') and not k.startswith('_'))
            duran_varliklar = sum(v for k, v in self.mizan.items() if k.startswith('2') and not k.startswith('_'))
            toplam_aktif = donen_varliklar + duran_varliklar
            kvyk = sum(v for k, v in self.mizan.items() if k.startswith('3') and not k.startswith('_'))
            uvyk = sum(v for k, v in self.mizan.items() if k.startswith('4') and not k.startswith('_'))
            ozkaynaklar = sum(v for k, v in self.mizan.items() if k.startswith('5') and not k.startswith('_'))

        toplam_pasif = kvyk + uvyk + ozkaynaklar

        # ═══════════════════════════════════════════════
        # BİLANÇO DİKEY ANALİZİ
        # Baz: Toplam Aktif
        # ═══════════════════════════════════════════════
        bilanco_kalemleri = []

        # Aktif hesaplar (1xx, 2xx)
        for kod in sorted(k for k in self.mizan.keys() if not k.startswith('_') and len(k) == 3 and k[0] in ('1', '2')):
            bakiye = self.mizan[kod]
            oran = (bakiye / toplam_aktif * 100) if toplam_aktif > 0 else 0
            hesap_bilgi = self._hesap_grubu_bilgisi(kod)
            bilanco_kalemleri.append({
                "hesap_kodu": kod,
                "hesap_adi": hesap_bilgi["ad"],
                "taraf": "aktif",
                "bakiye": round(bakiye, 2),
                "oran": round(oran, 2),
                "baz": "toplam_aktif",
                "baz_tutar": round(toplam_aktif, 2),
            })

        # Pasif hesaplar (3xx, 4xx, 5xx)
        for kod in sorted(k for k in self.mizan.keys() if not k.startswith('_') and len(k) == 3 and k[0] in ('3', '4', '5')):
            bakiye = self.mizan[kod]
            oran = (bakiye / toplam_pasif * 100) if toplam_pasif > 0 else 0
            hesap_bilgi = self._hesap_grubu_bilgisi(kod)
            bilanco_kalemleri.append({
                "hesap_kodu": kod,
                "hesap_adi": hesap_bilgi["ad"],
                "taraf": "pasif",
                "bakiye": round(bakiye, 2),
                "oran": round(oran, 2),
                "baz": "toplam_pasif",
                "baz_tutar": round(toplam_pasif, 2),
            })

        # ═══════════════════════════════════════════════
        # GELİR TABLOSU DİKEY ANALİZİ
        # Baz: Net Satışlar (Ciro)
        # ═══════════════════════════════════════════════
        gelir_tablosu_kalemleri = []

        # Gelir hesapları (6xx)
        for kod in sorted(k for k in self.mizan.keys() if not k.startswith('_') and len(k) == 3 and k[0] == '6'):
            bakiye = self.mizan[kod]
            oran = (bakiye / ciro * 100) if ciro > 0 else 0
            hesap_bilgi = self._hesap_grubu_bilgisi(kod)
            gelir_tablosu_kalemleri.append({
                "hesap_kodu": kod,
                "hesap_adi": hesap_bilgi["ad"],
                "taraf": "gelir",
                "bakiye": round(bakiye, 2),
                "oran": round(oran, 2),
                "baz": "net_satislar",
                "baz_tutar": round(ciro, 2),
            })

        # Gider hesapları (7xx)
        for kod in sorted(k for k in self.mizan.keys() if not k.startswith('_') and len(k) == 3 and k[0] == '7'):
            bakiye = self.mizan[kod]
            oran = (bakiye / ciro * 100) if ciro > 0 else 0
            hesap_bilgi = self._hesap_grubu_bilgisi(kod)
            gelir_tablosu_kalemleri.append({
                "hesap_kodu": kod,
                "hesap_adi": hesap_bilgi["ad"],
                "taraf": "gider",
                "bakiye": round(bakiye, 2),
                "oran": round(oran, 2),
                "baz": "net_satislar",
                "baz_tutar": round(ciro, 2),
            })

        # ═══════════════════════════════════════════════
        # YAPISI ANALİZİ (Grup bazlı özet)
        # ═══════════════════════════════════════════════
        yapi_ozeti = {
            "donen_varliklar": {
                "tutar": round(donen_varliklar, 2),
                "oran_aktif": round((donen_varliklar / toplam_aktif * 100) if toplam_aktif > 0 else 0, 2),
            },
            "duran_varliklar": {
                "tutar": round(duran_varliklar, 2),
                "oran_aktif": round((duran_varliklar / toplam_aktif * 100) if toplam_aktif > 0 else 0, 2),
            },
            "kvyk": {
                "tutar": round(kvyk, 2),
                "oran_pasif": round((kvyk / toplam_pasif * 100) if toplam_pasif > 0 else 0, 2),
            },
            "uvyk": {
                "tutar": round(uvyk, 2),
                "oran_pasif": round((uvyk / toplam_pasif * 100) if toplam_pasif > 0 else 0, 2),
            },
            "ozkaynaklar": {
                "tutar": round(ozkaynaklar, 2),
                "oran_pasif": round((ozkaynaklar / toplam_pasif * 100) if toplam_pasif > 0 else 0, 2),
            },
            "toplam_aktif": round(toplam_aktif, 2),
            "toplam_pasif": round(toplam_pasif, 2),
            "net_satislar": round(ciro, 2),
            "smm": round(smm, 2),
            "brut_kar": round(ciro - smm, 2),
            "brut_kar_marji": round(((ciro - smm) / ciro * 100) if ciro > 0 else 0, 2),
        }

        # Yapısal anomaliler
        anomaliler = []
        # Kasa/Aktif kontrolü (VDK K-09)
        kasa = self.mizan.get('100', 0)
        if toplam_aktif > 0:
            kasa_oran = kasa / toplam_aktif * 100
            if kasa_oran > 15:
                anomaliler.append({
                    "kod": "K-09",
                    "aciklama": f"Kasa/Aktif oranı %{kasa_oran:.1f} (eşik: %15)",
                    "durum": "kritik",
                    "mevzuat": "VDK Risk Analiz Kriterleri",
                })
            elif kasa_oran > 5:
                anomaliler.append({
                    "kod": "K-09",
                    "aciklama": f"Kasa/Aktif oranı %{kasa_oran:.1f} (eşik: %5)",
                    "durum": "uyari",
                    "mevzuat": "VDK Risk Analiz Kriterleri",
                })

        # Özkaynak/Pasif oranı kontrolü
        if toplam_pasif > 0:
            oz_oran = ozkaynaklar / toplam_pasif * 100
            if oz_oran < 20:
                anomaliler.append({
                    "kod": "MY-01",
                    "aciklama": f"Özkaynak/Pasif oranı %{oz_oran:.1f} (düşük - mali bağımsızlık zayıf)",
                    "durum": "uyari",
                    "mevzuat": "TTK 376 (Sermaye Kaybı)",
                })

        return {
            "bilanco": bilanco_kalemleri,
            "gelir_tablosu": gelir_tablosu_kalemleri,
            "yapi_ozeti": yapi_ozeti,
            "anomaliler": anomaliler,
            "method": "Dikey Analiz (Common-Size Analysis)",
            "legal_basis_refs": [
                {"id": "SRC-0002", "title_tr": "VUK 171-178 Defter Tutma"},
                {"id": "SRC-0045", "title_tr": "Tekdüzen Hesap Planı Tebliği"},
                {"id": "SRC-0034", "title_tr": "VDK Risk Analiz Kriterleri"},
            ],
        }

    # ════════════════════════════════════════════════════════════════════════════
    # IS-7 YARDIMCI METODLAR
    # ════════════════════════════════════════════════════════════════════════════

    @staticmethod
    def _beklenen_bakiye_yonu(hesap_kodu: str) -> str:
        """Tekdüzen Hesap Planına göre beklenen bakiye yönü"""
        ilk = hesap_kodu[0] if hesap_kodu else ''
        if ilk in ('1', '2', '7', '8'):
            return 'B'  # Borç bakiye
        elif ilk in ('3', '4', '5', '6'):
            return 'A'  # Alacak bakiye
        return 'B'

    # ════════════════════════════════════════════════════════════════════════════
    # HESAP GRUBU BİLGİ TABLOSU (Tekdüzen Hesap Planı)
    # ════════════════════════════════════════════════════════════════════════════

    _HESAP_BILGI = {
        "100": {"ad": "Kasa", "grup": "Dönen Varlıklar", "tip": "Hazır Değerler"},
        "101": {"ad": "Alınan Çekler", "grup": "Dönen Varlıklar", "tip": "Hazır Değerler"},
        "102": {"ad": "Bankalar", "grup": "Dönen Varlıklar", "tip": "Hazır Değerler"},
        "103": {"ad": "Verilen Çekler ve Ödeme Emirleri (-)", "grup": "Dönen Varlıklar", "tip": "Hazır Değerler"},
        "108": {"ad": "Diğer Hazır Değerler", "grup": "Dönen Varlıklar", "tip": "Hazır Değerler"},
        "120": {"ad": "Alıcılar", "grup": "Dönen Varlıklar", "tip": "Ticari Alacaklar"},
        "121": {"ad": "Alacak Senetleri", "grup": "Dönen Varlıklar", "tip": "Ticari Alacaklar"},
        "126": {"ad": "Verilen Depozito ve Teminatlar", "grup": "Dönen Varlıklar", "tip": "Ticari Alacaklar"},
        "127": {"ad": "Diğer Ticari Alacaklar", "grup": "Dönen Varlıklar", "tip": "Ticari Alacaklar"},
        "128": {"ad": "Şüpheli Ticari Alacaklar", "grup": "Dönen Varlıklar", "tip": "Ticari Alacaklar"},
        "129": {"ad": "Şüpheli Ticari Alacaklar Karşılığı (-)", "grup": "Dönen Varlıklar", "tip": "Ticari Alacaklar"},
        "131": {"ad": "Ortaklardan Alacaklar", "grup": "Dönen Varlıklar", "tip": "Diğer Alacaklar"},
        "135": {"ad": "Personelden Alacaklar", "grup": "Dönen Varlıklar", "tip": "Diğer Alacaklar"},
        "136": {"ad": "Diğer Çeşitli Alacaklar", "grup": "Dönen Varlıklar", "tip": "Diğer Alacaklar"},
        "150": {"ad": "İlk Madde ve Malzeme", "grup": "Dönen Varlıklar", "tip": "Stoklar"},
        "151": {"ad": "Yarı Mamuller - Üretim", "grup": "Dönen Varlıklar", "tip": "Stoklar"},
        "152": {"ad": "Mamuller", "grup": "Dönen Varlıklar", "tip": "Stoklar"},
        "153": {"ad": "Ticari Mallar", "grup": "Dönen Varlıklar", "tip": "Stoklar"},
        "157": {"ad": "Diğer Stoklar", "grup": "Dönen Varlıklar", "tip": "Stoklar"},
        "159": {"ad": "Verilen Sipariş Avansları", "grup": "Dönen Varlıklar", "tip": "Stoklar"},
        "180": {"ad": "Gelecek Aylara Ait Giderler", "grup": "Dönen Varlıklar", "tip": "Gelecek Aya Ait Giderler"},
        "190": {"ad": "Devreden KDV", "grup": "Dönen Varlıklar", "tip": "Yıllara Yaygın İnşaat"},
        "191": {"ad": "İndirilecek KDV", "grup": "Dönen Varlıklar", "tip": "Diğer Dönen Varlıklar"},
        "193": {"ad": "Peşin Ödenen Vergiler ve Fonlar", "grup": "Dönen Varlıklar", "tip": "Diğer Dönen Varlıklar"},
        "196": {"ad": "Personel Avansları", "grup": "Dönen Varlıklar", "tip": "Diğer Dönen Varlıklar"},
        "250": {"ad": "Arazi ve Arsalar", "grup": "Duran Varlıklar", "tip": "Maddi Duran Varlıklar"},
        "252": {"ad": "Binalar", "grup": "Duran Varlıklar", "tip": "Maddi Duran Varlıklar"},
        "253": {"ad": "Tesis, Makine ve Cihazlar", "grup": "Duran Varlıklar", "tip": "Maddi Duran Varlıklar"},
        "254": {"ad": "Taşıtlar", "grup": "Duran Varlıklar", "tip": "Maddi Duran Varlıklar"},
        "255": {"ad": "Demirbaşlar", "grup": "Duran Varlıklar", "tip": "Maddi Duran Varlıklar"},
        "257": {"ad": "Birikmiş Amortismanlar (-)", "grup": "Duran Varlıklar", "tip": "Maddi Duran Varlıklar"},
        "260": {"ad": "Haklar", "grup": "Duran Varlıklar", "tip": "Maddi Olmayan Duran Varlıklar"},
        "264": {"ad": "Özel Maliyetler", "grup": "Duran Varlıklar", "tip": "Maddi Olmayan Duran Varlıklar"},
        "268": {"ad": "Birikmiş Amortismanlar (MODV) (-)", "grup": "Duran Varlıklar", "tip": "Maddi Olmayan Duran Varlıklar"},
        "300": {"ad": "Banka Kredileri", "grup": "KVYK", "tip": "Mali Borçlar"},
        "320": {"ad": "Satıcılar", "grup": "KVYK", "tip": "Ticari Borçlar"},
        "321": {"ad": "Borç Senetleri", "grup": "KVYK", "tip": "Ticari Borçlar"},
        "326": {"ad": "Alınan Depozito ve Teminatlar", "grup": "KVYK", "tip": "Ticari Borçlar"},
        "331": {"ad": "Ortaklara Borçlar", "grup": "KVYK", "tip": "Diğer Borçlar"},
        "335": {"ad": "Personele Borçlar", "grup": "KVYK", "tip": "Diğer Borçlar"},
        "336": {"ad": "Diğer Çeşitli Borçlar", "grup": "KVYK", "tip": "Diğer Borçlar"},
        "340": {"ad": "Alınan Sipariş Avansları", "grup": "KVYK", "tip": "Alınan Avanslar"},
        "360": {"ad": "Ödenecek Vergi ve Fonlar", "grup": "KVYK", "tip": "Ödenecek Vergi"},
        "361": {"ad": "Ödenecek SGK Primleri", "grup": "KVYK", "tip": "Ödenecek Vergi"},
        "370": {"ad": "Dönem Kârı Vergi ve Yasal Yükümlülükler", "grup": "KVYK", "tip": "Borç ve Gider Karşılıkları"},
        "380": {"ad": "Gelecek Aylara Ait Gelirler", "grup": "KVYK", "tip": "Gelecek Aya Ait Gelirler"},
        "391": {"ad": "Hesaplanan KDV", "grup": "KVYK", "tip": "Diğer KVYK"},
        "400": {"ad": "Banka Kredileri (Uzun Vadeli)", "grup": "UVYK", "tip": "Mali Borçlar"},
        "431": {"ad": "Ortaklara Borçlar (Uzun Vadeli)", "grup": "UVYK", "tip": "Diğer Borçlar"},
        "500": {"ad": "Sermaye", "grup": "Özkaynaklar", "tip": "Ödenmiş Sermaye"},
        "520": {"ad": "Sermaye Yedekleri", "grup": "Özkaynaklar", "tip": "Sermaye Yedekleri"},
        "540": {"ad": "Yasal Yedekler", "grup": "Özkaynaklar", "tip": "Kâr Yedekleri"},
        "570": {"ad": "Geçmiş Yıllar Kârları", "grup": "Özkaynaklar", "tip": "Geçmiş Yıl Kâr/Zarar"},
        "580": {"ad": "Geçmiş Yıllar Zararları (-)", "grup": "Özkaynaklar", "tip": "Geçmiş Yıl Kâr/Zarar"},
        "590": {"ad": "Dönem Net Kârı (Zararı)", "grup": "Özkaynaklar", "tip": "Dönem Net Kâr/Zarar"},
        "600": {"ad": "Yurt İçi Satışlar", "grup": "Gelirler", "tip": "Brüt Satışlar"},
        "601": {"ad": "Yurt Dışı Satışlar", "grup": "Gelirler", "tip": "Brüt Satışlar"},
        "602": {"ad": "Diğer Gelirler", "grup": "Gelirler", "tip": "Brüt Satışlar"},
        "610": {"ad": "Satıştan İadeler (-)", "grup": "Gelirler", "tip": "Satış İndirimleri"},
        "611": {"ad": "Satış İskontoları (-)", "grup": "Gelirler", "tip": "Satış İndirimleri"},
        "620": {"ad": "Satılan Mamüller Maliyeti (-)", "grup": "Gelirler", "tip": "Satışların Maliyeti"},
        "621": {"ad": "Satılan Ticari Mallar Maliyeti (-)", "grup": "Gelirler", "tip": "Satışların Maliyeti"},
        "622": {"ad": "Satılan Hizmet Maliyeti (-)", "grup": "Gelirler", "tip": "Satışların Maliyeti"},
        "623": {"ad": "Diğer Satışların Maliyeti (-)", "grup": "Gelirler", "tip": "Satışların Maliyeti"},
        "630": {"ad": "Araştırma Geliştirme Giderleri (-)", "grup": "Gelirler", "tip": "Faaliyet Giderleri"},
        "631": {"ad": "Pazarlama Satış Dağıtım Giderleri (-)", "grup": "Gelirler", "tip": "Faaliyet Giderleri"},
        "632": {"ad": "Genel Yönetim Giderleri (-)", "grup": "Gelirler", "tip": "Faaliyet Giderleri"},
        "640": {"ad": "İştiraklerden Temettü Gelirleri", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gelir"},
        "642": {"ad": "Faiz Gelirleri", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gelir"},
        "644": {"ad": "Konusu Kalmayan Karşılıklar", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gelir"},
        "648": {"ad": "Enflasyon Düzeltmesi Karları", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gelir"},
        "649": {"ad": "Diğer Olağan Gelir ve Kârlar", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gelir"},
        "654": {"ad": "Karşılık Giderleri (-)", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gider"},
        "655": {"ad": "Menkul Kıymet Satış Zararları (-)", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gider"},
        "656": {"ad": "Kambiyo Zararları (-)", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gider"},
        "657": {"ad": "Reeskont Faiz Giderleri (-)", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gider"},
        "658": {"ad": "Enflasyon Düzeltmesi Zararları (-)", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gider"},
        "659": {"ad": "Diğer Olağan Gider ve Zararlar (-)", "grup": "Gelirler", "tip": "Diğer Faaliyetlerden Gider"},
        "660": {"ad": "KVYK Faiz Giderleri (-)", "grup": "Gelirler", "tip": "Finansman Giderleri"},
        "661": {"ad": "UVYK Faiz Giderleri (-)", "grup": "Gelirler", "tip": "Finansman Giderleri"},
        "671": {"ad": "Önceki Dönem Gelir ve Kârları", "grup": "Gelirler", "tip": "Olağandışı Gelir"},
        "679": {"ad": "Diğer Olağandışı Gelir ve Kârlar", "grup": "Gelirler", "tip": "Olağandışı Gelir"},
        "680": {"ad": "Çalışmayan Kısım Giderleri (-)", "grup": "Gelirler", "tip": "Olağandışı Gider"},
        "681": {"ad": "Önceki Dönem Gider ve Zararları (-)", "grup": "Gelirler", "tip": "Olağandışı Gider"},
        "689": {"ad": "Diğer Olağandışı Gider ve Zararlar (-)", "grup": "Gelirler", "tip": "Olağandışı Gider"},
        "691": {"ad": "Dönem Kârı Vergi ve Yasal Yüküm. (-)", "grup": "Gelirler", "tip": "Dönem Net Kâr/Zarar"},
        "692": {"ad": "Dönem Net Kârı veya Zararı", "grup": "Gelirler", "tip": "Dönem Net Kâr/Zarar"},
        "698": {"ad": "Enflasyon Düzeltme Hesabı", "grup": "Gelirler", "tip": "Enflasyon Düzeltme"},
        "710": {"ad": "Direkt İlk Madde ve Malzeme Giderleri", "grup": "Giderler", "tip": "Maliyet Hesapları"},
        "720": {"ad": "Direkt İşçilik Giderleri", "grup": "Giderler", "tip": "Maliyet Hesapları"},
        "730": {"ad": "Genel Üretim Giderleri", "grup": "Giderler", "tip": "Maliyet Hesapları"},
        "740": {"ad": "Hizmet Üretim Maliyeti", "grup": "Giderler", "tip": "Maliyet Hesapları"},
        "750": {"ad": "Araştırma ve Geliştirme Giderleri", "grup": "Giderler", "tip": "Maliyet Hesapları"},
        "760": {"ad": "Pazarlama Satış Dağıtım Giderleri", "grup": "Giderler", "tip": "Maliyet Hesapları"},
        "770": {"ad": "Genel Yönetim Giderleri", "grup": "Giderler", "tip": "Maliyet Hesapları"},
        "780": {"ad": "Finansman Giderleri", "grup": "Giderler", "tip": "Maliyet Hesapları"},
    }

    def _hesap_grubu_bilgisi(self, hesap_kodu: str) -> Dict:
        """Tekdüzen Hesap Planı'na göre hesap bilgisi döndür"""
        if hesap_kodu in self._HESAP_BILGI:
            return self._HESAP_BILGI[hesap_kodu]

        # Prefix bazlı fallback
        ilk = hesap_kodu[0] if hesap_kodu else '0'
        grup_map = {
            '1': ("Dönen Varlıklar", "Dönen Varlık"),
            '2': ("Duran Varlıklar", "Duran Varlık"),
            '3': ("KVYK", "Kısa Vadeli Borç"),
            '4': ("UVYK", "Uzun Vadeli Borç"),
            '5': ("Özkaynaklar", "Özkaynak"),
            '6': ("Gelirler", "Gelir/Gider"),
            '7': ("Giderler", "Maliyet"),
            '8': ("Maliyet Hesapları", "Maliyet"),
            '9': ("Nazım Hesaplar", "Nazım"),
        }
        grup, tip = grup_map.get(ilk, ("Diğer", "Diğer"))
        return {"ad": f"Hesap {hesap_kodu}", "grup": grup, "tip": tip}

    def _hesap_vdk_risk(self, hesap_kodu: str, bakiye: float) -> Optional[Dict]:
        """Hesap için VDK risk kontrolü"""
        toplam_aktif = self.mizan.get('_toplam_aktif', 0)
        ozkaynaklar = self.mizan.get('_ozkaynaklar', 0)

        if hesap_kodu == '100' and bakiye < 0:
            return {
                "kod": "K-09",
                "durum": "kritik",
                "aciklama": "Negatif kasa bakiyesi - kayıt dışı ödeme şüphesi",
                "mevzuat": "VUK 227 (Belge Düzeni)",
            }
        if hesap_kodu == '100' and toplam_aktif > 0:
            oran = bakiye / toplam_aktif * 100
            if oran > 15:
                return {
                    "kod": "K-09",
                    "durum": "kritik",
                    "aciklama": f"Kasa/Aktif oranı %{oran:.1f} (eşik %15)",
                    "mevzuat": "VDK Risk Analiz Kriterleri",
                }
            elif oran > 5:
                return {
                    "kod": "K-09",
                    "durum": "uyari",
                    "aciklama": f"Kasa/Aktif oranı %{oran:.1f} (eşik %5)",
                    "mevzuat": "VDK Risk Analiz Kriterleri",
                }
        if hesap_kodu == '131' and ozkaynaklar > 0:
            oran = bakiye / ozkaynaklar * 100
            if oran > 25:
                return {
                    "kod": "TF-01",
                    "durum": "kritik",
                    "aciklama": f"Ortaklardan alacak/sermaye %{oran:.0f} (örtülü kazanç riski)",
                    "mevzuat": "KVK 13, TTK 358",
                }

        return None

    def _hesap_mevzuat_refs(self, hesap_kodu: str) -> List[Dict]:
        """Hesap için mevzuat referansları"""
        refs_map = {
            "100": [
                {"id": "SRC-0047", "title_tr": "VUK 227 - Belge Düzeni"},
                {"id": "SRC-0034", "title_tr": "VDK K-09 Kasa Kontrolü"},
            ],
            "102": [{"id": "SRC-0046", "title_tr": "VUK 227 - Banka Hesapları"}],
            "120": [
                {"id": "SRC-0002", "title_tr": "VUK 323 - Şüpheli Alacaklar"},
            ],
            "131": [
                {"id": "SRC-0026", "title_tr": "KVK 12-13 Örtülü Sermaye/Kazanç"},
                {"id": "SRC-0058", "title_tr": "TTK 358 Borçlanma Yasağı"},
            ],
            "153": [{"id": "SRC-0002", "title_tr": "VUK 274-278 Stok Değerlemesi"}],
            "191": [{"id": "SRC-0003", "title_tr": "KDV Kanunu 29 İndirim Hakkı"}],
            "320": [{"id": "SRC-0002", "title_tr": "VUK Md. 287 Reeskont"}],
            "360": [{"id": "SRC-0002", "title_tr": "VUK 112 Vergi Ödeme Süreleri"}],
            "500": [{"id": "SRC-0001", "title_tr": "TTK 332 Asgari Sermaye"}],
            "590": [{"id": "SRC-0001", "title_tr": "TTK 376 Sermaye Kaybı"}],
            "600": [{"id": "SRC-0045", "title_tr": "Tekdüzen Hesap Planı Tebliği"}],
            "698": [{"id": "SRC-0060", "title_tr": "VUK Geçici 37 Enflasyon Düzeltmesi"}],
        }
        return refs_map.get(hesap_kodu, [
            {"id": "SRC-0045", "title_tr": "Tekdüzen Hesap Planı Tebliği"},
        ])

    def _hesap_davranis_analizi(self, hesap_kodu: str, bakiye: float) -> Dict:
        """Hesap için davranış analizi"""
        ciro = self.ciro
        oran = (bakiye / ciro * 100) if ciro > 0 else 0

        result = {
            "bakiye_tutari": round(bakiye, 2),
            "ciro_orani": round(oran, 2),
            "durum": "normal",
            "yorum": "",
        }

        # Hesaba özel davranış kuralları
        if hesap_kodu == '100':
            if bakiye < 0:
                result["durum"] = "kritik"
                result["yorum"] = "Negatif kasa bakiyesi. Fizik olarak imkansız."
            elif oran > 2:
                result["durum"] = "uyari"
                result["yorum"] = f"Kasa bakiyesi yüksek (%{oran:.1f}). Bankaya aktarım gerekli."
            else:
                result["yorum"] = "Kasa bakiyesi normal seviyede."
        elif hesap_kodu == '120':
            devir = (ciro / bakiye) if bakiye > 0 else 0
            gun = (365 / devir) if devir > 0 else 0
            result["ekstra"] = {"devir_hizi": round(devir, 2), "tahsilat_gun": round(gun, 0)}
            if gun > 90:
                result["durum"] = "uyari"
                result["yorum"] = f"Tahsilat süresi uzun ({gun:.0f} gün). Yaşlandırma yapın."
            else:
                result["yorum"] = f"Tahsilat süresi {gun:.0f} gün. Normal."
        elif hesap_kodu == '131':
            sermaye = self.mizan.get('500', 0) or self.mizan.get('_ozkaynaklar', 1)
            sermaye_oran = (bakiye / sermaye * 100) if sermaye > 0 else 0
            result["ekstra"] = {"sermaye_orani": round(sermaye_oran, 2)}
            if sermaye_oran > 50:
                result["durum"] = "kritik"
                result["yorum"] = f"Sermayenin %{sermaye_oran:.0f}'si ortağa borç. Örtülü sermaye riski."
            elif sermaye_oran > 20:
                result["durum"] = "uyari"
                result["yorum"] = f"Ortaklar cari sermayenin %{sermaye_oran:.0f}'si."
            else:
                result["yorum"] = "Ortaklardan alacak normal seviyede."
        elif hesap_kodu == '153':
            smm = self.mizan.get('_smm', 0) or ciro * 0.7
            devir = (smm / bakiye) if bakiye > 0 else 0
            gun = (365 / devir) if devir > 0 else 0
            result["ekstra"] = {"stok_devir": round(devir, 2), "stok_gun": round(gun, 0)}
            if gun > 180:
                result["durum"] = "uyari"
                result["yorum"] = f"Stok devir süresi {gun:.0f} gün. Yavaş stok riski."
            else:
                result["yorum"] = f"Stok devir süresi {gun:.0f} gün."
        else:
            result["yorum"] = f"Bakiye: {bakiye:,.2f} TL, Ciro oranı: %{oran:.1f}"

        return result

    def _yatay_neden_motoru(
        self,
        hesap_kodu: str,
        cari: float,
        onceki: float,
        degisim_yuzde: float,
    ) -> Optional[str]:
        """Yatay analiz neden motoru - Değişimin olası nedenini açıklar"""
        if abs(degisim_yuzde) < 20:
            return None

        # Hesaba göre neden önerileri
        neden_map = {
            "100": {
                "artis": "Nakit girişi artmış veya bankadan nakit çekilmiş olabilir. Kasa sayımı kontrol edin.",
                "azalis": "Bankaya aktarım veya nakit ödemelerde artış olabilir.",
            },
            "102": {
                "artis": "Tahsilatlar artmış, kredi kullanılmış veya mevduat birikmiş olabilir.",
                "azalis": "Yüksek tutarlı ödemeler, kredi geri ödemesi veya yatırım yapılmış olabilir.",
            },
            "120": {
                "artis": "Vadeli satışlar artmış veya tahsilat yavaşlamış olabilir. Yaşlandırma yapın.",
                "azalis": "Tahsilat hızlanmış veya satışlar azalmış olabilir.",
            },
            "131": {
                "artis": "Ortağa ek borç verilmiş olabilir. KVK 13 transfer fiyatlandırması kontrol edin.",
                "azalis": "Ortak borç ödemiş. Olumlu gelişme.",
            },
            "150": {
                "artis": "Hammadde alımı artmış veya stok devir hızı düşmüş olabilir.",
                "azalis": "Üretime daha fazla malzeme sevk edilmiş olabilir.",
            },
            "153": {
                "artis": "Stok birikimi var. Satış hızı ve değer düşüklüğü kontrol edin.",
                "azalis": "Satışlar artmış veya stok eritme politikası uygulanmış olabilir.",
            },
            "191": {
                "artis": "Büyük alımlar veya yatırım yapılmış, devreden KDV artmış olabilir.",
                "azalis": "KDV iadesi alınmış veya satışlardan hesaplanan KDV artmış olabilir.",
            },
            "320": {
                "artis": "Vadeli alımlar artmış veya ödeme süresi uzamış olabilir.",
                "azalis": "Tedarikçi ödemeleri hızlanmış olabilir.",
            },
            "360": {
                "artis": "Vergi borcu artmış veya ödemeler gecikmiş olabilir. Faiz riski kontrol edin.",
                "azalis": "Vergi ödemeleri düzenli yapılıyor.",
            },
            "500": {
                "artis": "Sermaye artırımı yapılmış olabilir.",
                "azalis": "Sermaye azaltımı veya zarar nedeniyle kayıp olabilir. TTK 376 kontrol edin.",
            },
            "600": {
                "artis": "Satış hacmi artmış. Sektör ortalamasıyla karşılaştırın.",
                "azalis": "Satış hacmi düşmüş. Pazar koşullarını değerlendirin.",
            },
            "770": {
                "artis": "Yönetim giderleri artmış. Gider kalemlerini inceleyin.",
                "azalis": "Tasarruf tedbirleri uygulanmış olabilir.",
            },
        }

        yon = "artis" if degisim_yuzde > 0 else "azalis"
        if hesap_kodu in neden_map:
            return neden_map[hesap_kodu].get(yon)

        # Genel neden
        if abs(degisim_yuzde) > 100:
            return f"Hesapta %{abs(degisim_yuzde):.0f} oranında {'artış' if yon == 'artis' else 'azalış'} tespit edildi. Detaylı inceleme gerekli."
        return None

    def _calculate_trust_score(self, results: Dict, finansal_oranlar: Dict) -> Dict:
        """
        SMMM İÇİN GERÇEK GÜVEN SKORU HESAPLAMA

        Güven skoru şu faktörlere dayanır:
        1. Veri Bütünlüğü: Tüm kritik hesaplar mevcut mu?
        2. Denge Kontrolü: Borç = Alacak mı?
        3. Hesap Anomalileri: Negatif bakiye, mantıksız değerler var mı?
        4. Oran Tutarlılığı: Finansal oranlar hesaplanabilir mi?

        SMMM bu skora güvenip karar verebilmeli!
        """
        trust_factors = []
        trust_score = 1.0  # Başlangıç: %100 güven
        warnings = []
        legal_refs = []

        # ════════════════════════════════════════════════════════════════════════════
        # FAKTÖR 1: Veri Bütünlüğü (%25)
        # ════════════════════════════════════════════════════════════════════════════
        # Kritik hesap grupları - 3 karakterlik prefix kontrolü
        kritik_hesap_gruplari = {
            '100': 'Kasa',
            '102': 'Bankalar',
            '120': 'Alıcılar',
            '320': 'Satıcılar',
            '5': 'Özkaynaklar',  # 5xx grubu
            '600': 'Satışlar',
        }
        mevcut_hesaplar = []
        for kod, ad in kritik_hesap_gruplari.items():
            # mizan_data'da bu prefix'le başlayan hesap var mı?
            if kod in results or any(k.startswith(kod) for k in self.mizan.keys() if not k.startswith('_')):
                mevcut_hesaplar.append(kod)
        veri_butunlugu = len(mevcut_hesaplar) / len(kritik_hesap_gruplari)

        if veri_butunlugu == 1.0:
            trust_factors.append({
                "faktor": "Veri Bütünlüğü",
                "skor": 1.0,
                "aciklama": f"Tüm kritik hesap grupları mevcut ({len(mevcut_hesaplar)}/{len(kritik_hesap_gruplari)})",
                "durum": "ok"
            })
        else:
            eksik = [f"{kod} ({ad})" for kod, ad in kritik_hesap_gruplari.items() if kod not in mevcut_hesaplar]
            trust_factors.append({
                "faktor": "Veri Bütünlüğü",
                "skor": veri_butunlugu,
                "aciklama": f"Eksik hesap grupları: {', '.join(eksik)}",
                "durum": "warning"
            })
            trust_score -= (1 - veri_butunlugu) * 0.25
            warnings.append(f"Eksik kritik hesap grupları: {', '.join(eksik)}")

        # ════════════════════════════════════════════════════════════════════════════
        # FAKTÖR 2: Hesap Durumları (%25)
        # SMMM İÇİN KRİTİK: Hangi hesaplarda sorun var AÇIKÇA gösterilmeli!
        # ════════════════════════════════════════════════════════════════════════════
        error_hesaplar = []
        warning_hesaplar = []

        for hesap_kodu, hesap_data in results.items():
            if hesap_data.get("status") == "error":
                error_hesaplar.append({
                    "kod": hesap_kodu,
                    "ad": hesap_data.get("ad", hesap_kodu),
                    "neden": hesap_data.get("reason_tr", "Kritik hata"),
                    "bakiye": hesap_data.get("bakiye", 0)
                })
            elif hesap_data.get("status") == "warning":
                warning_hesaplar.append({
                    "kod": hesap_kodu,
                    "ad": hesap_data.get("ad", hesap_kodu),
                    "neden": hesap_data.get("reason_tr", "Uyarı"),
                    "bakiye": hesap_data.get("bakiye", 0)
                })

        error_count = len(error_hesaplar)
        warning_count = len(warning_hesaplar)
        total_accounts = len(results)

        if error_count == 0 and warning_count == 0:
            trust_factors.append({
                "faktor": "Hesap Durumları",
                "skor": 1.0,
                "aciklama": f"Tüm hesaplar normal ({total_accounts} hesap kontrol edildi)",
                "durum": "ok",
                "detay": None
            })
        elif error_count == 0:
            hesap_skor = 1 - (warning_count / total_accounts * 0.5)
            # Uyarılı hesapları listele
            uyari_listesi = ", ".join([f"{h['kod']} {h['ad']}" for h in warning_hesaplar[:5]])
            if warning_count > 5:
                uyari_listesi += f" (+{warning_count - 5} daha)"

            trust_factors.append({
                "faktor": "Hesap Durumları",
                "skor": hesap_skor,
                "aciklama": f"{warning_count} hesapta uyarı: {uyari_listesi}",
                "durum": "warning",
                "detay": {
                    "uyari_hesaplar": warning_hesaplar,
                    "hata_hesaplar": []
                }
            })
            trust_score -= (1 - hesap_skor) * 0.25
        else:
            hesap_skor = 1 - (error_count / total_accounts)
            # Hatalı ve uyarılı hesapları listele
            hata_listesi = ", ".join([f"{h['kod']} {h['ad']}" for h in error_hesaplar])
            uyari_listesi = ", ".join([f"{h['kod']} {h['ad']}" for h in warning_hesaplar[:3]])
            if warning_count > 3:
                uyari_listesi += f" (+{warning_count - 3} daha)"

            aciklama = f"KRİTİK HATA: {hata_listesi}"
            if warning_count > 0:
                aciklama += f" | UYARI: {uyari_listesi}"

            trust_factors.append({
                "faktor": "Hesap Durumları",
                "skor": hesap_skor,
                "aciklama": aciklama,
                "durum": "error",
                "detay": {
                    "hata_hesaplar": error_hesaplar,
                    "uyari_hesaplar": warning_hesaplar
                }
            })
            trust_score -= (1 - hesap_skor) * 0.25

            # SMMM için detaylı uyarı
            for h in error_hesaplar:
                warnings.append(f"❌ {h['kod']} {h['ad']}: {h['neden']} (Bakiye: {h['bakiye']:,.2f} TL)")
            legal_refs.append("VUK 227 - Belge Düzeni")

        # ════════════════════════════════════════════════════════════════════════════
        # FAKTÖR 3: Finansal Oran Hesaplanabilirliği (%25)
        # SMMM İÇİN KRİTİK: Hangi verilerle hesaplandığı gösterilmeli!
        # ════════════════════════════════════════════════════════════════════════════
        oranlar = finansal_oranlar.get("oranlar", {})
        raw_values = finansal_oranlar.get("raw_values", {})
        likidite = oranlar.get("likidite", {})
        cari_oran = likidite.get("cari_oran", 0)
        asit_test = likidite.get("asit_test", 0)

        # Ham verileri al
        donen_varliklar = raw_values.get("donen_varliklar", 0)
        kvyk = raw_values.get("kvyk", 0)
        stoklar = raw_values.get("stoklar", 0)
        ozkaynaklar = raw_values.get("ozkaynaklar", 0)
        toplam_borc = kvyk + raw_values.get("uvyk", 0)

        if cari_oran > 0 and kvyk > 0:
            # Formül açıklaması ile birlikte göster
            formul_aciklama = (
                f"Cari Oran = {donen_varliklar:,.0f} / {kvyk:,.0f} = {cari_oran:.2f}x | "
                f"Asit-Test = ({donen_varliklar:,.0f} - {stoklar:,.0f}) / {kvyk:,.0f} = {asit_test:.2f}x"
            )

            trust_factors.append({
                "faktor": "Oran Hesaplamaları",
                "skor": 1.0,
                "aciklama": f"✓ Gerçek verilerle hesaplandı: {formul_aciklama}",
                "durum": "ok",
                "detay": {
                    "formul": "Cari Oran = Dönen Varlıklar / KVYK",
                    "donen_varliklar": donen_varliklar,
                    "kvyk": kvyk,
                    "stoklar": stoklar,
                    "sonuc": cari_oran,
                    "kaynak": "Tekdüzen Hesap Planı 1xx-3xx grupları"
                }
            })
        elif kvyk == 0:
            trust_factors.append({
                "faktor": "Oran Hesaplamaları",
                "skor": 0.5,
                "aciklama": f"⚠ KVYK (3xx grubu) sıfır - likidite oranları hesaplanamadı. Dönen Varlıklar: {donen_varliklar:,.0f} TL",
                "durum": "warning",
                "detay": {
                    "eksik_veri": "KVYK (Kısa Vadeli Yabancı Kaynaklar)",
                    "kontrol": "320-380 hesap grubu kontrol edilmeli"
                }
            })
            trust_score -= 0.125
            warnings.append("KVYK sıfır - 3xx hesap grubu kontrol edilmeli")
        else:
            trust_factors.append({
                "faktor": "Oran Hesaplamaları",
                "skor": 0.5,
                "aciklama": f"⚠ Eksik veri nedeniyle bazı oranlar hesaplanamadı. Dönen Varlıklar: {donen_varliklar:,.0f}, KVYK: {kvyk:,.0f}",
                "durum": "warning",
                "detay": None
            })
            trust_score -= 0.125
            warnings.append("Finansal oranlar için yeterli veri yok")

        # ════════════════════════════════════════════════════════════════════════════
        # FAKTÖR 4: VDK Risk Kontrolü (%25)
        # ════════════════════════════════════════════════════════════════════════════
        kasa = results.get("100", {})
        kasa_bakiye = kasa.get("bakiye", 0)

        if kasa_bakiye >= 0:
            trust_factors.append({
                "faktor": "VDK Risk Kontrolü",
                "skor": 1.0,
                "aciklama": "Kritik VDK riski tespit edilmedi",
                "durum": "ok"
            })
        else:
            trust_factors.append({
                "faktor": "VDK Risk Kontrolü",
                "skor": 0.3,
                "aciklama": f"Negatif kasa bakiyesi: {kasa_bakiye:,.2f} TL (VDK inceleme riski)",
                "durum": "error"
            })
            trust_score -= 0.175
            warnings.append("Negatif kasa bakiyesi - VDK inceleme riski yüksek")
            legal_refs.append("VDK K-09 - Kasa Bakiyesi Kontrolü")

        # ════════════════════════════════════════════════════════════════════════════
        # SONUÇ: Güven skoru ve özet
        # ════════════════════════════════════════════════════════════════════════════
        trust_score = max(0, min(1, trust_score))  # 0-1 arasında sınırla

        # Türkçe özet oluştur
        if trust_score >= 0.9:
            trust_level = "Yüksek"
            summary_tr = "Mizan verisi güvenilir ve analiz için uygun."
        elif trust_score >= 0.7:
            trust_level = "Orta"
            summary_tr = "Mizan verisinde bazı eksiklikler veya uyarılar var."
        else:
            trust_level = "Düşük"
            summary_tr = "Mizan verisinde kritik sorunlar tespit edildi. Dikkatli değerlendirin."

        # Detaylı açıklama
        details_parts = []
        for factor in trust_factors:
            status_icon = "✓" if factor["durum"] == "ok" else ("⚠" if factor["durum"] == "warning" else "✗")
            details_parts.append(f"{status_icon} {factor['faktor']}: {factor['aciklama']}")

        details_tr = "\n".join(details_parts)

        if warnings:
            details_tr += "\n\n⚠️ Dikkat Edilmesi Gerekenler:\n• " + "\n• ".join(warnings)

        return {
            "trust_score": round(trust_score, 2),
            "trust_level": trust_level,
            "summary_tr": summary_tr,
            "details_tr": details_tr,
            "trust_factors": trust_factors,
            "warnings": warnings,
            "method": "VDK kriterleri + Tekdüzen Hesap Planı kuralları + Finansal oran analizi",
            "rule_refs": [
                "VUK 227 - Belge Düzeni",
                "VDK K-09 - Kasa Kontrolü",
                "Tekdüzen Hesap Planı",
                "KVK 12-13 - Örtülü Sermaye/Kazanç"
            ],
            "legal_basis_refs": legal_refs if legal_refs else [
                {"id": "SRC-0047", "title_tr": "VUK 227 - Belge Düzeni"},
                {"id": "SRC-0045", "title_tr": "Tekdüzen Hesap Planı Tebliği"},
                {"id": "SRC-0034", "title_tr": "VDK Risk Analiz Kriterleri"}
            ]
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

    def get_finansal_oranlar(self) -> Dict:
        """
        YMM/SMMM Seviyesi Finansal Oran Analizi

        TEKDÜZEN HESAP PLANI bazlı doğru hesaplamalar.
        VDK-RAM ve KURGAN kriterleri ile uyumlu.
        """
        # Extended data kullan (mizan_data.py tarafından hesaplanmış)
        donen_varliklar = self.mizan.get('_donen_varliklar', 0)
        duran_varliklar = self.mizan.get('_duran_varliklar', 0)
        toplam_aktif = self.mizan.get('_toplam_aktif', 0)
        kvyk = self.mizan.get('_kvyk', 0)
        uvyk = self.mizan.get('_uvyk', 0)
        ozkaynaklar = self.mizan.get('_ozkaynaklar', 0)
        stoklar = self.mizan.get('_stoklar', 0)
        alicilar = self.mizan.get('_alicilar', 0)
        hazir_degerler = self.mizan.get('_hazir_degerler', 0)
        ciro = self.mizan.get('_ciro', self.ciro)
        smm = self.mizan.get('_smm', 0)

        # Eğer extended data yoksa, eski yöntemle hesapla
        if toplam_aktif == 0:
            donen_varliklar = sum(v for k, v in self.mizan.items() if k.startswith('1') and not k.startswith('_'))
            duran_varliklar = sum(v for k, v in self.mizan.items() if k.startswith('2') and not k.startswith('_'))
            toplam_aktif = donen_varliklar + duran_varliklar
            kvyk = sum(v for k, v in self.mizan.items() if k.startswith('3') and not k.startswith('_'))
            uvyk = sum(v for k, v in self.mizan.items() if k.startswith('4') and not k.startswith('_'))
            ozkaynaklar = sum(v for k, v in self.mizan.items() if k.startswith('5') and not k.startswith('_'))
            stoklar = sum(v for k, v in self.mizan.items() if k.startswith('15') and not k.startswith('_'))
            alicilar = self.mizan.get('120', 0)
            hazir_degerler = self.mizan.get('100', 0) + self.mizan.get('102', 0)
            smm = (
                self.mizan.get('620', 0) + self.mizan.get('621', 0) +
                self.mizan.get('622', 0) + self.mizan.get('623', 0)
            )

        toplam_borc = kvyk + uvyk
        brut_kar = ciro - smm

        # ════════════════════════════════════════════════════════════════════════
        # LİKİDİTE ORANLARI
        # ════════════════════════════════════════════════════════════════════════
        cari_oran = (donen_varliklar / kvyk) if kvyk > 0 else 0
        asit_test = ((donen_varliklar - stoklar) / kvyk) if kvyk > 0 else 0
        nakit_oran = (hazir_degerler / kvyk) if kvyk > 0 else 0

        # ════════════════════════════════════════════════════════════════════════
        # MALİ YAPI ORANLARI
        # ════════════════════════════════════════════════════════════════════════
        borc_ozkaynak = (toplam_borc / ozkaynaklar) if ozkaynaklar > 0 else 0
        finansal_kaldirac = (toplam_aktif / ozkaynaklar) if ozkaynaklar > 0 else 0

        # ════════════════════════════════════════════════════════════════════════
        # FAALİYET ORANLARI
        # ════════════════════════════════════════════════════════════════════════
        alacak_devir = (ciro / alicilar) if alicilar > 0 else 0
        tahsilat_suresi = (365 / alacak_devir) if alacak_devir > 0 else 0
        stok_devir = (smm / stoklar) if stoklar > 0 else 0
        stok_gun = (365 / stok_devir) if stok_devir > 0 else 0
        aktif_devir = (ciro / toplam_aktif) if toplam_aktif > 0 else 0

        # ════════════════════════════════════════════════════════════════════════
        # KARLILIK ORANLARI
        # ════════════════════════════════════════════════════════════════════════
        brut_kar_marji = ((brut_kar / ciro) * 100) if ciro > 0 else 0
        net_kar_marji = ((brut_kar / ciro) * 100) if ciro > 0 else 0  # Simplified
        aktif_karliligi = ((brut_kar / toplam_aktif) * 100) if toplam_aktif > 0 else 0
        ozkaynak_karliligi = ((brut_kar / ozkaynaklar) * 100) if ozkaynaklar > 0 else 0

        return {
            # Ham veriler - Frontend'e gönder
            "raw_values": {
                "donen_varliklar": round(donen_varliklar, 2),
                "duran_varliklar": round(duran_varliklar, 2),
                "toplam_aktif": round(toplam_aktif, 2),
                "kvyk": round(kvyk, 2),
                "uvyk": round(uvyk, 2),
                "ozkaynaklar": round(ozkaynaklar, 2),
                "stoklar": round(stoklar, 2),
                "alicilar": round(alicilar, 2),
                "hazir_degerler": round(hazir_degerler, 2),
                "ciro": round(ciro, 2),
                "smm": round(smm, 2),
                "brut_kar": round(brut_kar, 2),
            },
            # Oranlar
            "oranlar": {
                "likidite": {
                    "cari_oran": round(cari_oran, 2),
                    "asit_test": round(asit_test, 2),
                    "nakit_oran": round(nakit_oran, 2),
                },
                "mali_yapi": {
                    "borc_ozkaynak": round(borc_ozkaynak, 2),
                    "finansal_kaldirac": round(finansal_kaldirac, 2),
                },
                "faaliyet": {
                    "alacak_devir": round(alacak_devir, 2),
                    "tahsilat_suresi": round(tahsilat_suresi, 0),
                    "stok_devir": round(stok_devir, 2),
                    "stok_gun": round(stok_gun, 0),
                    "aktif_devir": round(aktif_devir, 2),
                },
                "karlilik": {
                    "brut_kar_marji": round(brut_kar_marji, 2),
                    "net_kar_marji": round(net_kar_marji, 2),
                    "aktif_karliligi": round(aktif_karliligi, 2),
                    "ozkaynak_karliligi": round(ozkaynak_karliligi, 2),
                },
            },
            # SMMM Uyarıları
            "smmm_uyarilari": self._generate_smmm_warnings(
                ozkaynaklar, stoklar, smm, ciro, kvyk, toplam_borc
            ),
        }

    def _generate_smmm_warnings(
        self,
        ozkaynaklar: float,
        stoklar: float,
        smm: float,
        ciro: float,
        kvyk: float,
        toplam_borc: float
    ) -> list:
        """SMMM için eksik veri/belge uyarıları üret"""
        warnings = []

        if ozkaynaklar == 0:
            warnings.append({
                "kod": "OZKAYNAK_SIFIR",
                "mesaj": "Özkaynaklar sıfır görünüyor. 5xx hesap grubu kontrol edilmeli.",
                "oneri": "500 Sermaye, 520 Yedekler, 570 Geçmiş Yıl Karları hesaplarını kontrol edin.",
                "seviye": "kritik"
            })

        if stoklar == 0 and ciro > 0:
            warnings.append({
                "kod": "STOK_SIFIR",
                "mesaj": "Stoklar sıfır ama satış var. Stok kaydı eksik olabilir.",
                "oneri": "150-159 Stok hesaplarını kontrol edin. Envanter sayımı yapılmalı.",
                "seviye": "uyari"
            })

        if smm == 0 and ciro > 0:
            warnings.append({
                "kod": "SMM_SIFIR",
                "mesaj": "Satışların Maliyeti sıfır görünüyor. 620-623 veya 7xx maliyet hesapları kontrol edilmeli.",
                "oneri": "Maliyet muhasebesi kayıtlarını kontrol edin.",
                "seviye": "kritik"
            })

        if kvyk == 0 and toplam_borc == 0:
            warnings.append({
                "kod": "BORC_SIFIR",
                "mesaj": "Yabancı kaynaklar sıfır. 3xx ve 4xx hesap grupları kontrol edilmeli.",
                "oneri": "Satıcılar, banka kredileri, vergi borçları hesaplarını kontrol edin.",
                "seviye": "uyari"
            })

        if ciro == 0:
            warnings.append({
                "kod": "CIRO_SIFIR",
                "mesaj": "Net satışlar sıfır. 600-602 hesap grubu kontrol edilmeli.",
                "oneri": "Satış faturaları kaydedilmiş mi kontrol edin.",
                "seviye": "kritik"
            })

        return warnings


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
