"""
KURGAN Veri Entegrasyon Servisi

Tüm veri kaynaklarını birleştirerek KURGAN senaryolarına besleme yapar.

Veri Kaynakları:
1. Vergi Levhası (PDF Parse) → Şirket, VKN, NACE, Matrah
2. MERSIS Sorgulama → Ortaklar, Yöneticiler, Sermaye
3. Ticaret Sicil Gazetesi → Ortak değişiklikleri, Tasfiye
4. GİB Borçlu Listesi → VUK Md.5 kontrolü
5. GİB e-Fatura Kayıtlı → e-Belge kontrolü
6. GİB Sektör İstatistikleri → Kârlılık, Vergi yükü karşılaştırması

KURGAN Senaryo Eşleştirmeleri:
- KRG-01: Tedarikçi VKN → GİB Borçlu + e-Fatura
- KRG-02: Zincirleme Risk → GİB Borçlu (2+ riskli tedarikçi)
- KRG-08: Sektörel Kârlılık → GİB Sektör İstatistikleri
- KRG-09: Yaşam Standardı → Vergi Levhası + MERSIS Ortak
- KRG-13: Transfer Fiyat → MERSIS İlişkili Şirket
- KRG-15: Düşük Vergi Yükü → GİB Sektör İstatistikleri
- KRG-16: Ortak/Yönetici Risk → Vergi Levhası + MERSIS + TSG + GİB Borçlu

⚠️ HARDCODED/MOCK/DEMO YASAK - SADECE GERÇEK VERİ
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

# Servisleri import et
try:
    from .gib_risk_service import GibRiskService
    GIB_RISK_MEVCUT = True
except ImportError:
    try:
        from gib_risk_service import GibRiskService
        GIB_RISK_MEVCUT = True
    except ImportError:
        GIB_RISK_MEVCUT = False

try:
    from .mersis_sorgulama import get_mersis_servisi, OrtakBilgisi, SirketBilgisi
    MERSIS_MEVCUT = True
except ImportError:
    try:
        from mersis_sorgulama import get_mersis_servisi, OrtakBilgisi, SirketBilgisi
        MERSIS_MEVCUT = True
    except ImportError:
        MERSIS_MEVCUT = False

try:
    from .ticaret_sicil_gazetesi import get_tsg_servisi, TsgSorguSonucu
    TSG_MEVCUT = True
except ImportError:
    try:
        from ticaret_sicil_gazetesi import get_tsg_servisi, TsgSorguSonucu
        TSG_MEVCUT = True
    except ImportError:
        TSG_MEVCUT = False

try:
    from .trade_registry_service import get_trade_registry_service
    TRADE_REGISTRY_MEVCUT = True
except ImportError:
    try:
        from trade_registry_service import get_trade_registry_service
        TRADE_REGISTRY_MEVCUT = True
    except ImportError:
        TRADE_REGISTRY_MEVCUT = False

# Ticaret Sicil Tam Entegrasyon Servisi (YENİ - Kapsamlı)
try:
    from .ticaret_sicil_tam_entegrasyon import get_ticaret_sicil_tam_servisi
    TICARET_SICIL_TAM_MEVCUT = True
except ImportError:
    try:
        from ticaret_sicil_tam_entegrasyon import get_ticaret_sicil_tam_servisi
        TICARET_SICIL_TAM_MEVCUT = True
    except ImportError:
        TICARET_SICIL_TAM_MEVCUT = False

# SMMM Manuel Veri Giriş Servisi (TSG/MERSIS captcha korumalı olduğundan)
try:
    from .smmm_manuel_veri_giris import get_smmm_manuel_servisi
    SMMM_MANUEL_MEVCUT = True
except ImportError:
    try:
        from smmm_manuel_veri_giris import get_smmm_manuel_servisi
        SMMM_MANUEL_MEVCUT = True
    except ImportError:
        SMMM_MANUEL_MEVCUT = False


@dataclass
class OrtakYoneticiVeri:
    """Ortak/Yönetici birleşik veri"""
    ad_soyad: str
    tckn_vkn: Optional[str] = None
    gorev: str = ""  # Ortak, Müdür, YK Üyesi
    pay_orani: Optional[float] = None
    temsil_yetkisi: bool = False
    riskli_mi: bool = False
    risk_nedenleri: List[str] = field(default_factory=list)
    veri_kaynagi: str = ""  # VERGI_LEVHASI, MERSIS, TSG


@dataclass
class SirketBirlesikVeri:
    """Şirket birleşik veri - tüm kaynaklardan"""
    vkn: str
    unvan: str
    nace_kodu: Optional[str] = None
    nace_aciklama: Optional[str] = None
    sermaye: Optional[float] = None
    kurulus_tarihi: Optional[str] = None
    adres: Optional[str] = None
    il: Optional[str] = None
    vergi_dairesi: Optional[str] = None
    mersis_no: Optional[str] = None
    ticaret_sicil_no: Optional[str] = None
    faaliyet_durumu: str = "AKTIF"
    ortaklar: List[OrtakYoneticiVeri] = field(default_factory=list)
    yillik_matrah: List[Dict] = field(default_factory=list)
    veri_kaynaklari: List[str] = field(default_factory=list)
    son_guncelleme: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class KurganVeriPaketi:
    """KURGAN senaryolarına gönderilecek veri paketi"""
    sirket: SirketBirlesikVeri
    tedarikci_vkn_listesi: List[str] = field(default_factory=list)
    riskli_tedarikci_sayisi: int = 0
    zincirleme_risk_var: bool = False
    ortaklar: List[Dict] = field(default_factory=list)  # KURGAN formatında
    riskli_ortak_sayisi: int = 0
    sektor_kar_ortalamasi: Optional[float] = None
    sektor_vergi_yuku: Optional[float] = None
    iliskili_kisi_islem_tutari: float = 0
    veri_tamamlik_orani: float = 0  # 0-1
    veri_kaynaklari: Dict[str, bool] = field(default_factory=dict)
    hazirlanma_tarihi: str = field(default_factory=lambda: datetime.now().isoformat())
    # KURGAN senaryo-veri kaynağı eşleştirmeleri
    kurgan_senaryolari_veri_eslestirme: Dict[str, str] = field(default_factory=lambda: {
        "KRG-01": "GİB Borçlu + e-Fatura Kayıtlı",
        "KRG-02": "GİB Borçlu (Zincirleme)",
        "KRG-08": "GİB Sektör İstatistikleri",
        "KRG-09": "Vergi Levhası + MERSIS Ortak",
        "KRG-13": "MERSIS İlişkili Kişi",
        "KRG-15": "GİB Sektör İstatistikleri",
        "KRG-16": "Vergi Levhası + MERSIS + TSG + GİB Borçlu"
    })


class KurganVeriEntegrasyonServisi:
    """
    KURGAN senaryoları için birleşik veri hazırlama servisi.

    Tüm veri kaynaklarını koordine eder ve KURGAN Calculator'a
    %100 gerçek veri sağlar.
    """

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

        # Servisleri başlat
        self.gib_risk_service = GibRiskService() if GIB_RISK_MEVCUT else None
        self.mersis_servisi = get_mersis_servisi() if MERSIS_MEVCUT else None
        self.tsg_servisi = get_tsg_servisi() if TSG_MEVCUT else None
        self.trade_registry_service = get_trade_registry_service() if TRADE_REGISTRY_MEVCUT else None

        # YENİ: Ticaret Sicil Tam Entegrasyon (TSG + İl Sicilleri + MERSIS birleşik)
        self.ticaret_sicil_tam_servisi = None
        if TICARET_SICIL_TAM_MEVCUT:
            try:
                self.ticaret_sicil_tam_servisi = get_ticaret_sicil_tam_servisi()
                self.logger.info("Ticaret Sicil Tam Entegrasyon servisi aktif")
            except Exception as e:
                self.logger.warning(f"Ticaret Sicil Tam Entegrasyon yüklenemedi: {e}")

        # SMMM Manuel Veri Giriş Servisi (TSG/MERSIS captcha korumalı)
        self.smmm_manuel_servisi = None
        if SMMM_MANUEL_MEVCUT:
            try:
                self.smmm_manuel_servisi = get_smmm_manuel_servisi()
                self.logger.info("SMMM Manuel Veri Giriş servisi aktif")
            except Exception as e:
                self.logger.warning(f"SMMM Manuel Veri Giriş yüklenemedi: {e}")

        self._log_servis_durumu()

    def _log_servis_durumu(self):
        """Servis durumlarını logla"""
        durumlar = {
            "GİB Risk Servisi": GIB_RISK_MEVCUT,
            "MERSIS Sorgulama": MERSIS_MEVCUT,
            "Ticaret Sicil Gazetesi": TSG_MEVCUT,
            "Ticaret Sicil Tam Entegrasyon": TICARET_SICIL_TAM_MEVCUT,
            "Trade Registry": TRADE_REGISTRY_MEVCUT,
            "SMMM Manuel Veri Giriş": SMMM_MANUEL_MEVCUT,
        }

        aktif = sum(1 for v in durumlar.values() if v)
        self.logger.info(f"[KurganVeriEntegrasyon] {aktif}/{len(durumlar)} servis aktif")

        for servis, durum in durumlar.items():
            status = "✅" if durum else "⚠️"
            self.logger.info(f"  {status} {servis}: {'Aktif' if durum else 'Pasif'}")

    async def hazirla_kurgan_verisi(
        self,
        vergi_levhasi_data: Optional[Dict] = None,
        tedarikci_vkn_listesi: Optional[List[str]] = None,
        fatura_verileri: Optional[Dict] = None
    ) -> KurganVeriPaketi:
        """
        KURGAN senaryoları için birleşik veri hazırla.

        Args:
            vergi_levhasi_data: Parse edilmiş vergi levhası verisi
            tedarikci_vkn_listesi: e-Fatura/e-Arşiv'den tedarikçi VKN'leri
            fatura_verileri: Fatura toplam/detay verileri

        Returns:
            KurganVeriPaketi: KURGAN Calculator'a gönderilecek veri
        """
        veri_kaynaklari = {
            "vergi_levhasi": vergi_levhasi_data is not None,
            "gib_borclu": self.gib_risk_service is not None,
            "gib_efatura": self.gib_risk_service is not None,
            "mersis": self.mersis_servisi is not None,
            "tsg": self.tsg_servisi is not None,
            "sektor_istatistik": self.gib_risk_service is not None,
        }

        # 1. Şirket temel bilgilerini birleştir
        sirket = await self._birlestir_sirket_bilgileri(vergi_levhasi_data)

        # 2. Tedarikçi risk analizi
        riskli_tedarikci_sayisi = 0
        zincirleme_risk_var = False

        if tedarikci_vkn_listesi and self.gib_risk_service:
            tedarikci_analiz = self.gib_risk_service.analiz_tedarikci_riski(tedarikci_vkn_listesi)
            riskli_tedarikci_sayisi = tedarikci_analiz.get("riskli_tedarikci_sayisi", 0)
            zincirleme_risk_var = tedarikci_analiz.get("zincirleme_risk_var", False)

        # 3. Ortak/Yönetici risk analizi
        ortaklar_kurgan_format = []
        riskli_ortak_sayisi = 0

        for ortak in sirket.ortaklar:
            ortak_dict = {
                "tc_kimlik": ortak.tckn_vkn,
                "ad_soyad": ortak.ad_soyad,
                "gorev": ortak.gorev,
                "pay_orani": ortak.pay_orani,
                "riskli_mi": ortak.riskli_mi
            }
            ortaklar_kurgan_format.append(ortak_dict)

            if ortak.riskli_mi:
                riskli_ortak_sayisi += 1

        # 4. Sektör karşılaştırması
        sektor_kar_ortalamasi = None
        sektor_vergi_yuku = None

        if self.gib_risk_service and sirket.nace_kodu:
            sektor_kar_ortalamasi = self.gib_risk_service.get_sektor_kar_marji(sirket.nace_kodu)
            sektor_vergi_yuku = self.gib_risk_service.get_sektor_vergi_yuku(sirket.nace_kodu)

        # 5. Veri tamlık oranı hesapla
        tamamlik = self._hesapla_veri_tamamligi(sirket, tedarikci_vkn_listesi, ortaklar_kurgan_format)

        return KurganVeriPaketi(
            sirket=sirket,
            tedarikci_vkn_listesi=tedarikci_vkn_listesi or [],
            riskli_tedarikci_sayisi=riskli_tedarikci_sayisi,
            zincirleme_risk_var=zincirleme_risk_var,
            ortaklar=ortaklar_kurgan_format,
            riskli_ortak_sayisi=riskli_ortak_sayisi,
            sektor_kar_ortalamasi=sektor_kar_ortalamasi,
            sektor_vergi_yuku=sektor_vergi_yuku,
            veri_tamamlik_orani=tamamlik,
            veri_kaynaklari=veri_kaynaklari
        )

    async def _birlestir_sirket_bilgileri(self, vergi_levhasi_data: Optional[Dict]) -> SirketBirlesikVeri:
        """Vergi levhası, MERSIS ve TSG'den gelen bilgileri birleştir"""

        if not vergi_levhasi_data:
            return SirketBirlesikVeri(vkn="", unvan="[Vergi levhası yüklenmedi]")

        vkn = vergi_levhasi_data.get("vkn", "")
        unvan = vergi_levhasi_data.get("company_name", "")

        # Temel şirket verisi
        sirket = SirketBirlesikVeri(
            vkn=vkn,
            unvan=unvan,
            nace_kodu=vergi_levhasi_data.get("nace_code"),
            nace_aciklama=vergi_levhasi_data.get("nace_description"),
            adres=vergi_levhasi_data.get("address"),
            il=vergi_levhasi_data.get("city"),
            vergi_dairesi=vergi_levhasi_data.get("tax_office"),
            kurulus_tarihi=vergi_levhasi_data.get("start_date"),
            yillik_matrah=vergi_levhasi_data.get("yearly_data", []),
            veri_kaynaklari=["VERGI_LEVHASI"]
        )

        # MERSIS'ten ek bilgiler
        if self.mersis_servisi and vkn:
            try:
                mersis_sonuc = await self.mersis_servisi.sorgula_vkn(vkn)

                if mersis_sonuc.bulundu and mersis_sonuc.sirket:
                    ms = mersis_sonuc.sirket
                    sirket.mersis_no = ms.mersis_no
                    sirket.ticaret_sicil_no = ms.ticaret_sicil_no
                    sirket.sermaye = ms.sermaye
                    sirket.faaliyet_durumu = ms.faaliyet_durumu
                    sirket.veri_kaynaklari.append("MERSIS")

                    # Ortakları al
                    ortaklar = self.mersis_servisi.get_ortaklar(vkn)
                    for ortak in ortaklar:
                        sirket.ortaklar.append(OrtakYoneticiVeri(
                            ad_soyad=ortak.ad_soyad,
                            tckn_vkn=ortak.tckn_vkn,
                            gorev=ortak.gorev,
                            pay_orani=ortak.pay_orani,
                            temsil_yetkisi=ortak.temsil_yetkisi,
                            veri_kaynagi="MERSIS"
                        ))
            except Exception as e:
                self.logger.warning(f"MERSIS sorgulama hatası: {e}")

        # YENİ: Ticaret Sicil Tam Entegrasyon (TSG + İl Sicilleri birleşik)
        if self.ticaret_sicil_tam_servisi and (vkn or unvan):
            try:
                tam_sonuc = await self.ticaret_sicil_tam_servisi.sorgula(vkn=vkn, unvan=unvan)

                if tam_sonuc.basarili and tam_sonuc.sirket:
                    ts = tam_sonuc.sirket
                    sirket.veri_kaynaklari.append("TICARET_SICIL_TAM")

                    # Ticaret sicil bilgileri
                    if ts.ticaret_sicil_no and not sirket.ticaret_sicil_no:
                        sirket.ticaret_sicil_no = ts.ticaret_sicil_no
                    if ts.mersis_no and not sirket.mersis_no:
                        sirket.mersis_no = ts.mersis_no

                    # Faaliyet durumu
                    if ts.faaliyet_durumu in ["TASFIYEDE", "KAPANMIS"]:
                        sirket.faaliyet_durumu = ts.faaliyet_durumu

                    # Sermaye bilgisi
                    if ts.sermaye and not sirket.sermaye:
                        sirket.sermaye = ts.sermaye.esas_sermaye

                    # Ortaklar
                    for ortak in ts.ortaklar:
                        # Aynı ortak var mı kontrol et
                        var_mi = any(o.ad_soyad == ortak.ad_soyad for o in sirket.ortaklar)
                        if not var_mi:
                            sirket.ortaklar.append(OrtakYoneticiVeri(
                                ad_soyad=ortak.ad_soyad,
                                tckn_vkn=ortak.tckn_vkn,
                                gorev="Ortak",
                                pay_orani=ortak.pay_orani,
                                veri_kaynagi="TICARET_SICIL_TAM"
                            ))

                    # Yöneticiler de ortak listesine ekle
                    for yon in ts.yoneticiler:
                        var_mi = any(o.ad_soyad == yon.ad_soyad for o in sirket.ortaklar)
                        if not var_mi:
                            sirket.ortaklar.append(OrtakYoneticiVeri(
                                ad_soyad=yon.ad_soyad,
                                tckn_vkn=yon.tckn_vkn,
                                gorev=yon.gorev or "Yönetici",
                                temsil_yetkisi=True if yon.temsil_sekli else False,
                                veri_kaynagi="TICARET_SICIL_TAM"
                            ))

                    self.logger.info(f"Ticaret Sicil Tam: {len(ts.ortaklar)} ortak, {len(ts.yoneticiler)} yönetici, {len(ts.ilanlar)} ilan")

            except Exception as e:
                self.logger.warning(f"Ticaret Sicil Tam sorgulama hatası: {e}")

        # Eski TSG servisi (yedek olarak)
        elif self.tsg_servisi and unvan:
            try:
                tsg_sonuc = await self.tsg_servisi.sorgula_unvan(unvan)

                if tsg_sonuc.bulundu:
                    sirket.veri_kaynaklari.append("TSG")

                    # Tasfiye kontrolü
                    if tsg_sonuc.faaliyet_durumu == "TASFIYEDE":
                        sirket.faaliyet_durumu = "TASFIYEDE"

                    # Ortak değişiklikleri logla
                    if tsg_sonuc.ortak_degisiklikleri:
                        self.logger.info(f"TSG'den {len(tsg_sonuc.ortak_degisiklikleri)} ortak değişikliği bulundu")
            except Exception as e:
                self.logger.warning(f"TSG sorgulama hatası: {e}")

        # SMMM Manuel Veri Giriş (TSG/MERSIS captcha korumalı olduğundan)
        # Bu en güvenilir kaynak - SMMM'nin elindeki belgelerden girilen veriler
        if self.smmm_manuel_servisi and vkn:
            try:
                manuel_veri = self.smmm_manuel_servisi.getir_kurgan_verisi(vkn)

                if manuel_veri and manuel_veri.get("ortaklar"):
                    sirket.veri_kaynaklari.append("SMMM_MANUEL")

                    # Ortakları ekle (SMMM'nin girdiği = EN GÜVENİLİR)
                    for ortak in manuel_veri["ortaklar"]:
                        if ortak.get("aktif"):
                            # Aynı ortak var mı kontrol et
                            var_mi = any(o.ad_soyad == ortak["ad_soyad"] for o in sirket.ortaklar)
                            if not var_mi:
                                sirket.ortaklar.append(OrtakYoneticiVeri(
                                    ad_soyad=ortak["ad_soyad"],
                                    tckn_vkn=ortak.get("tckn_vkn"),
                                    gorev="Ortak",
                                    pay_orani=ortak.get("pay_orani"),
                                    veri_kaynagi="SMMM_MANUEL"
                                ))

                    # Yöneticileri ekle
                    for yon in manuel_veri.get("yoneticiler", []):
                        if yon.get("aktif"):
                            var_mi = any(o.ad_soyad == yon["ad_soyad"] for o in sirket.ortaklar)
                            if not var_mi:
                                sirket.ortaklar.append(OrtakYoneticiVeri(
                                    ad_soyad=yon["ad_soyad"],
                                    tckn_vkn=yon.get("tckn_vkn"),
                                    gorev=yon.get("gorev", "Yönetici"),
                                    temsil_yetkisi=True,
                                    veri_kaynagi="SMMM_MANUEL"
                                ))

                    # Sermaye bilgisi
                    if manuel_veri.get("guncel_sermaye"):
                        sermaye = manuel_veri["guncel_sermaye"]
                        if sermaye.get("esas") and not sirket.sermaye:
                            sirket.sermaye = sermaye["esas"]

                    self.logger.info(f"SMMM Manuel: {len(manuel_veri['ortaklar'])} ortak, "
                                   f"{len(manuel_veri.get('yoneticiler', []))} yönetici")
            except Exception as e:
                self.logger.warning(f"SMMM Manuel veri hatası: {e}")

        # Ortakların GİB Borçlu kontrolü
        if self.gib_risk_service and sirket.ortaklar:
            await self._kontrol_ortak_riskleri(sirket.ortaklar)

        return sirket

    async def _kontrol_ortak_riskleri(self, ortaklar: List[OrtakYoneticiVeri]):
        """Ortakların GİB Borçlu Listesinde olup olmadığını kontrol et"""
        if not self.gib_risk_service:
            return

        for ortak in ortaklar:
            if not ortak.tckn_vkn:
                continue

            # TC/VKN bazlı sorgu
            sonuc = self.gib_risk_service.sorgu_ortak_risk(ortak.tckn_vkn)

            if sonuc.riskli_mi:
                ortak.riskli_mi = True
                ortak.risk_nedenleri.append("GİB VUK Md.5 Borçlu Listesinde")

                if sonuc.vergi_borcu_var_mi:
                    ortak.risk_nedenleri.append("Kişisel vergi borcu var")

                for gecmis in sonuc.risk_gecmisi:
                    ortak.risk_nedenleri.append(f"Geçmiş: {gecmis.get('sirket', '')} - {gecmis.get('durum', '')}")

    def _hesapla_veri_tamamligi(
        self,
        sirket: SirketBirlesikVeri,
        tedarikci_listesi: Optional[List[str]],
        ortaklar: List[Dict]
    ) -> float:
        """
        Veri tamlık oranını hesapla.

        KURGAN senaryoları için kritik alanlar:
        - VKN (zorunlu)
        - NACE kodu (KRG-08, KRG-15)
        - Ortaklar (KRG-16)
        - Tedarikçi listesi (KRG-01, KRG-02)
        - Sektör istatistikleri (KRG-08, KRG-15)
        """
        puan = 0
        max_puan = 0

        # Zorunlu alanlar
        if sirket.vkn:
            puan += 20
        max_puan += 20

        if sirket.unvan:
            puan += 10
        max_puan += 10

        # KRG-08, KRG-15 için NACE
        if sirket.nace_kodu:
            puan += 15
        max_puan += 15

        # KRG-01, KRG-02 için tedarikçi listesi
        if tedarikci_listesi and len(tedarikci_listesi) > 0:
            puan += 20
        max_puan += 20

        # KRG-16 için ortaklar
        if ortaklar and len(ortaklar) > 0:
            puan += 20
            # Ortak TC bilgisi varsa ekstra puan
            tc_var = any(o.get("tc_kimlik") for o in ortaklar)
            if tc_var:
                puan += 10
        max_puan += 30

        # Veri kaynağı çeşitliliği
        kaynak_sayisi = len(sirket.veri_kaynaklari)
        puan += min(kaynak_sayisi * 2, 10)
        max_puan += 10

        return puan / max_puan if max_puan > 0 else 0

    def hazirla_kurgan_data_dict(self, paket: KurganVeriPaketi) -> Dict[str, Any]:
        """
        KurganVeriPaketi'ni KURGAN Calculator'ın beklediği dict formatına çevir.

        Bu format, kurgan_calculator.py'deki analyze() metoduna geçirilir.
        """
        sirket = paket.sirket

        return {
            # Şirket temel bilgileri
            "vkn": sirket.vkn,
            "unvan": sirket.unvan,
            "nace_kodu": sirket.nace_kodu,
            "faaliyet_kodu": sirket.nace_kodu,  # Alias

            # KRG-01, KRG-02: Tedarikçi riski
            "tedarikci_vkn_listesi": paket.tedarikci_vkn_listesi,
            "riskli_tedarikci_sayisi": paket.riskli_tedarikci_sayisi,
            "toplam_tedarikci_sayisi": len(paket.tedarikci_vkn_listesi),
            "zincirleme_riskli_alim": 1 if paket.zincirleme_risk_var else 0,

            # KRG-08, KRG-15: Sektör karşılaştırması
            "sektor_kar_ortalamasi": paket.sektor_kar_ortalamasi,
            "sektor_vergi_yuku": paket.sektor_vergi_yuku,

            # KRG-16: Ortak/Yönetici riski
            "ortaklar": paket.ortaklar,
            "riskli_ortak_sayisi": paket.riskli_ortak_sayisi,
            "toplam_ortak_sayisi": len(paket.ortaklar),

            # KRG-13: İlişkili kişi (MERSIS'ten)
            "iliskili_kisi_islem_tutari": paket.iliskili_kisi_islem_tutari,

            # Meta bilgiler
            "_veri_tamamlik_orani": paket.veri_tamamlik_orani,
            "_veri_kaynaklari": paket.veri_kaynaklari,
            "_hazirlanma_tarihi": paket.hazirlanma_tarihi,

            # Vergi levhası verileri
            "yearly_data": sirket.yillik_matrah,
            "sermaye": sirket.sermaye,
            "kurulus_tarihi": sirket.kurulus_tarihi,
        }

    def get_servis_durumu(self) -> Dict:
        """Tüm servislerin durumunu döndür"""
        durum = {
            "aktif_servisler": [],
            "pasif_servisler": [],
            "detay": {}
        }

        servisler = {
            "GİB Risk Servisi": (GIB_RISK_MEVCUT, self.gib_risk_service),
            "MERSIS Sorgulama": (MERSIS_MEVCUT, self.mersis_servisi),
            "Ticaret Sicil Gazetesi": (TSG_MEVCUT, self.tsg_servisi),
            "Trade Registry": (TRADE_REGISTRY_MEVCUT, self.trade_registry_service),
        }

        for ad, (aktif, servis) in servisler.items():
            if aktif:
                durum["aktif_servisler"].append(ad)
            else:
                durum["pasif_servisler"].append(ad)

            durum["detay"][ad] = {
                "aktif": aktif,
                "hazir": servis is not None
            }

        # GİB Risk Servisi alt durumu
        if self.gib_risk_service:
            durum["detay"]["GİB Risk Alt Servisler"] = self.gib_risk_service.get_veri_kaynagi_durumu()

        return durum


# Singleton instance
_entegrasyon_servisi: Optional[KurganVeriEntegrasyonServisi] = None


def get_kurgan_veri_servisi() -> KurganVeriEntegrasyonServisi:
    """KURGAN Veri Entegrasyon servisi singleton'ı al"""
    global _entegrasyon_servisi
    if _entegrasyon_servisi is None:
        _entegrasyon_servisi = KurganVeriEntegrasyonServisi()
    return _entegrasyon_servisi


# Test
if __name__ == "__main__":
    async def test():
        servis = get_kurgan_veri_servisi()

        # Servis durumu
        print("\n=== Servis Durumu ===")
        print(servis.get_servis_durumu())

        # Test verisi
        test_vergi_levhasi = {
            "vkn": "1234567890",
            "company_name": "TEST LİMİTED ŞİRKETİ",
            "nace_code": "4762",
            "city": "ANTALYA"
        }

        print("\n=== KURGAN Veri Paketi Hazırlama ===")
        paket = await servis.hazirla_kurgan_verisi(
            vergi_levhasi_data=test_vergi_levhasi,
            tedarikci_vkn_listesi=["9876543210", "1111111111"]
        )

        print(f"Veri Tamlık Oranı: %{paket.veri_tamamlik_orani * 100:.1f}")
        print(f"Riskli Tedarikçi: {paket.riskli_tedarikci_sayisi}")
        print(f"Riskli Ortak: {paket.riskli_ortak_sayisi}")

        # KURGAN formatına çevir
        kurgan_data = servis.hazirla_kurgan_data_dict(paket)
        print(f"\nKURGAN Data Keys: {list(kurgan_data.keys())}")

    asyncio.run(test())
