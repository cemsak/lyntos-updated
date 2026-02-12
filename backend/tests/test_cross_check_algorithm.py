"""
LYNTOS Çapraz Kontrol Algoritma Doğrulama Testi

Bu test dosyası, çapraz kontrol engine'inin hesaplamalarının
%100 doğru olduğunu doğrular.

SMMM İÇİN KRİTİK: Bu testler başarısız olursa, üretimde kullanmayın!
"""

import pytest
from services.cross_check_engine import (
    CrossCheckEngine,
    CrossCheckResult,
    TeknikKontrolResult,
    HESAP_BAKIYE_KURALLARI,
    CheckCategory
)


class TestCrossCheckEngine:
    """Çapraz kontrol motoru testleri"""

    def setup_method(self):
        """Her test öncesi engine'i başlat"""
        self.engine = CrossCheckEngine()

    # ==========================================================================
    # MİZAN VS KDV BEYANNAME TESTLERİ
    # ==========================================================================

    def test_mizan_vs_beyanname_eslesme(self):
        """Mizan ve KDV beyanname eşleştiğinde status=ok olmalı"""
        result = self.engine.check_mizan_vs_beyanname(
            mizan_600=1000000.0,
            kdv_beyan_satis=1000000.0,
            mizan_601_ihracat=0.0,
            mizan_602_istisna=0.0
        )
        assert result.status == "ok"
        assert abs(result.difference) <= 100  # Tolerans içinde

    def test_mizan_vs_beyanname_ihracat_dusulmeli(self):
        """İhracat (601) KDV matrahından düşülmeli"""
        # 600: 1,000,000 - 601: 200,000 = 800,000 (KDV Matrahı)
        result = self.engine.check_mizan_vs_beyanname(
            mizan_600=1000000.0,
            kdv_beyan_satis=800000.0,
            mizan_601_ihracat=200000.0,
            mizan_602_istisna=0.0
        )
        assert result.status == "ok"
        assert result.breakdown["hesaplanan_kdv_matrahi"] == 800000.0

    def test_mizan_vs_beyanname_istisna_dusulmeli(self):
        """İstisna satışlar (602) KDV matrahından düşülmeli"""
        # 600: 1,000,000 - 602: 100,000 = 900,000 (KDV Matrahı)
        result = self.engine.check_mizan_vs_beyanname(
            mizan_600=1000000.0,
            kdv_beyan_satis=900000.0,
            mizan_601_ihracat=0.0,
            mizan_602_istisna=100000.0
        )
        assert result.status == "ok"
        assert result.breakdown["hesaplanan_kdv_matrahi"] == 900000.0

    def test_mizan_vs_beyanname_buyuk_fark_error(self):
        """Büyük farkta (%10+) status=error olmalı"""
        result = self.engine.check_mizan_vs_beyanname(
            mizan_600=1000000.0,
            kdv_beyan_satis=800000.0,  # %20 fark
            mizan_601_ihracat=0.0,
            mizan_602_istisna=0.0
        )
        assert result.status == "error"
        assert "KRİTİK" in result.reason_tr

    def test_mizan_vs_beyanname_kucuk_fark_warning(self):
        """Küçük farkta (%5-10) status=warning olmalı"""
        result = self.engine.check_mizan_vs_beyanname(
            mizan_600=1000000.0,
            kdv_beyan_satis=930000.0,  # %7 fark
            mizan_601_ihracat=0.0,
            mizan_602_istisna=0.0
        )
        assert result.status == "warning"

    # ==========================================================================
    # HESAPLANAN KDV TESTLERİ (391)
    # ==========================================================================

    def test_kdv_hesaplanan_eslesme(self):
        """391 hesap ve beyanname eşleştiğinde ok olmalı"""
        result = self.engine.check_kdv_hesaplanan(
            mizan_391=180000.0,
            beyan_hesaplanan_kdv=180000.0
        )
        assert result.status == "ok"

    def test_kdv_hesaplanan_tolerans(self):
        """100 TL tolerans içinde ok olmalı"""
        result = self.engine.check_kdv_hesaplanan(
            mizan_391=180050.0,
            beyan_hesaplanan_kdv=180000.0
        )
        assert result.status == "ok"

    def test_kdv_hesaplanan_fark(self):
        """Fark varsa warning/error olmalı"""
        result = self.engine.check_kdv_hesaplanan(
            mizan_391=200000.0,
            beyan_hesaplanan_kdv=180000.0
        )
        assert result.status in ["warning", "error"]

    # ==========================================================================
    # İNDİRİLECEK KDV TESTLERİ (191)
    # ==========================================================================

    def test_kdv_indirilecek_eslesme(self):
        """191 hesap ve beyanname eşleştiğinde ok olmalı"""
        result = self.engine.check_kdv_indirilecek(
            mizan_191=150000.0,
            beyan_indirilecek_kdv=150000.0
        )
        assert result.status == "ok"

    # ==========================================================================
    # MİZAN VS BANKA TESTLERİ
    # ==========================================================================

    def test_mizan_vs_bank_eslesme(self):
        """102 hesap ve banka ekstresi eşleştiğinde ok olmalı"""
        result = self.engine.check_mizan_vs_bank(
            mizan_102=500000.0,
            bank_balance=500000.0
        )
        assert result.status == "ok"

    def test_mizan_vs_bank_buyuk_fark(self):
        """Büyük banka farkında error olmalı"""
        result = self.engine.check_mizan_vs_bank(
            mizan_102=500000.0,
            bank_balance=400000.0  # %20 fark
        )
        assert result.status == "error"

    # ==========================================================================
    # MİZAN VS E-FATURA TESTLERİ
    # ==========================================================================

    def test_mizan_vs_efatura_eslesme(self):
        """Mizan ve e-Fatura eşleştiğinde ok olmalı"""
        result = self.engine.check_mizan_vs_efatura(
            mizan_600=1000000.0,
            efatura_total=1000000.0
        )
        assert result.status == "ok"

    # ==========================================================================
    # TEKNİK KONTROL TESTLERİ - TERS BAKİYE
    # ==========================================================================

    def test_ters_bakiye_kasa_alacak(self):
        """100 Kasa hesabı alacak bakiye verirse hata olmalı"""
        mizan_entries = [
            {
                "hesap_kodu": "100",
                "hesap_adi": "Kasa",
                "borc_bakiye": 0.0,
                "alacak_bakiye": 50000.0  # YANLIŞ - Kasa alacak bakiye veremez
            }
        ]
        results = self.engine.check_ters_bakiye(mizan_entries)
        assert len(results) > 0
        assert results[0].status == "error"
        assert results[0].hesap_kodu == "100"

    def test_ters_bakiye_banka_alacak(self):
        """102 Banka hesabı alacak bakiye verirse hata olmalı"""
        mizan_entries = [
            {
                "hesap_kodu": "102",
                "hesap_adi": "Bankalar",
                "borc_bakiye": 100000.0,
                "alacak_bakiye": 150000.0  # Net alacak = ters bakiye
            }
        ]
        results = self.engine.check_ters_bakiye(mizan_entries)
        assert len(results) > 0

    def test_ters_bakiye_saticlar_borc(self):
        """320 Satıcılar hesabı borç bakiye verirse hata olmalı"""
        mizan_entries = [
            {
                "hesap_kodu": "320",
                "hesap_adi": "Satıcılar",
                "borc_bakiye": 200000.0,
                "alacak_bakiye": 100000.0  # Net borç = ters bakiye
            }
        ]
        results = self.engine.check_ters_bakiye(mizan_entries)
        assert len(results) > 0
        assert results[0].hesap_kodu == "320"

    def test_ters_bakiye_sermaye_borc(self):
        """500 Sermaye hesabı borç bakiye verirse hata olmalı"""
        mizan_entries = [
            {
                "hesap_kodu": "500",
                "hesap_adi": "Sermaye",
                "borc_bakiye": 1000000.0,
                "alacak_bakiye": 0.0  # YANLIŞ - Sermaye alacak bakiyeli olmalı
            }
        ]
        results = self.engine.check_ters_bakiye(mizan_entries)
        assert len(results) > 0
        assert results[0].hesap_kodu == "500"

    def test_ters_bakiye_dogru_kayit(self):
        """Doğru bakiye yönünde kayıt varsa hata olmamalı"""
        mizan_entries = [
            {
                "hesap_kodu": "100",
                "hesap_adi": "Kasa",
                "borc_bakiye": 50000.0,
                "alacak_bakiye": 0.0  # DOĞRU - Kasa borç bakiyeli
            },
            {
                "hesap_kodu": "320",
                "hesap_adi": "Satıcılar",
                "borc_bakiye": 0.0,
                "alacak_bakiye": 100000.0  # DOĞRU - Satıcılar alacak bakiyeli
            }
        ]
        results = self.engine.check_ters_bakiye(mizan_entries)
        assert len(results) == 0

    # ==========================================================================
    # TEKNİK KONTROL TESTLERİ - EKSİ HESAP
    # ==========================================================================

    def test_eksi_hesap_kasa(self):
        """Kasa hesabı eksi olamaz - kritik hata"""
        mizan_entries = [
            {
                "hesap_kodu": "100",
                "hesap_adi": "Kasa",
                "borc_bakiye": 0.0,
                "alacak_bakiye": 50000.0  # -50,000 TL kasa = EKSİ
            }
        ]
        results = self.engine.check_eksi_hesap(mizan_entries)
        assert len(results) > 0
        assert results[0].severity == "critical"

    def test_eksi_hesap_stok(self):
        """Stok hesabı (153) eksi olamaz - kritik hata"""
        mizan_entries = [
            {
                "hesap_kodu": "153",
                "hesap_adi": "Ticari Mallar",
                "borc_bakiye": 0.0,
                "alacak_bakiye": 100000.0  # -100,000 TL stok = EKSİ
            }
        ]
        results = self.engine.check_eksi_hesap(mizan_entries)
        assert len(results) > 0
        assert results[0].severity == "critical"

    def test_eksi_hesap_banka(self):
        """Banka hesabı (102) eksi olmamalı"""
        mizan_entries = [
            {
                "hesap_kodu": "102",
                "hesap_adi": "Bankalar",
                "borc_bakiye": 10000.0,
                "alacak_bakiye": 50000.0  # -40,000 TL banka = EKSİ
            }
        ]
        results = self.engine.check_eksi_hesap(mizan_entries)
        assert len(results) > 0

    def test_eksi_hesap_dogru(self):
        """Pozitif bakiyeli hesaplarda hata olmamalı"""
        mizan_entries = [
            {
                "hesap_kodu": "100",
                "hesap_adi": "Kasa",
                "borc_bakiye": 50000.0,
                "alacak_bakiye": 0.0  # +50,000 TL kasa = DOĞRU
            },
            {
                "hesap_kodu": "153",
                "hesap_adi": "Ticari Mallar",
                "borc_bakiye": 500000.0,
                "alacak_bakiye": 100000.0  # +400,000 TL stok = DOĞRU
            }
        ]
        results = self.engine.check_eksi_hesap(mizan_entries)
        assert len(results) == 0

    # ==========================================================================
    # MİZAN DENKLİK TESTLERİ
    # ==========================================================================

    def test_mizan_denklik_denk(self):
        """Mizan denk olduğunda ok olmalı"""
        result = self.engine.check_mizan_denklik(
            toplam_borc=10000000.0,
            toplam_alacak=10000000.0
        )
        assert result.status == "ok"
        assert result.severity == "info"

    def test_mizan_denklik_denk_degil(self):
        """Mizan denk değilse error olmalı"""
        result = self.engine.check_mizan_denklik(
            toplam_borc=10000000.0,
            toplam_alacak=9999000.0  # 1000 TL fark
        )
        assert result.status == "error"
        assert result.severity == "critical"

    def test_mizan_denklik_tolerans(self):
        """1 kuruşluk fark tolere edilmeli"""
        result = self.engine.check_mizan_denklik(
            toplam_borc=10000000.00,
            toplam_alacak=10000000.01  # 1 kuruş fark
        )
        assert result.status == "ok"

    # ==========================================================================
    # MUHTASAR VS SGK APHB TESTLERİ
    # ==========================================================================

    def test_muhtasar_vs_sgk_eslesme(self):
        """Muhtasar ve SGK eşleştiğinde ok olmalı"""
        result = self.engine.check_muhtasar_vs_sgk(
            muhtasar_brut_ucret=500000.0,
            sgk_aphb_brut_ucret=500000.0
        )
        assert result.status == "ok"

    def test_muhtasar_vs_sgk_fark(self):
        """Fark varsa uyarı/hata olmalı"""
        result = self.engine.check_muhtasar_vs_sgk(
            muhtasar_brut_ucret=500000.0,
            sgk_aphb_brut_ucret=450000.0  # %10 fark
        )
        assert result.status in ["warning", "error"]

    # ==========================================================================
    # VERİ EKSİKLİĞİ UYARI TESTLERİ
    # ==========================================================================

    def test_efatura_eksik_uyari(self):
        """e-Fatura yüklü değilse uyarı mesajı olmalı"""
        result = self.engine.check_efatura_yuklu_mu(efatura_loaded=False)
        assert result is not None
        assert result.status == "no_data"
        assert "yükleyiniz" in result.actions[0].lower() or "yükle" in result.actions[0].lower()

    def test_efatura_yuklu_uyari_yok(self):
        """e-Fatura yüklüyse uyarı olmamalı"""
        result = self.engine.check_efatura_yuklu_mu(efatura_loaded=True)
        assert result is None

    def test_mali_tablo_eksik_uyari(self):
        """Mali tablo yüklü değilse uyarı mesajı olmalı"""
        result = self.engine.check_mali_tablo_yuklu_mu(mali_tablo_loaded=False)
        assert result is not None
        assert result.status == "no_data"

    def test_banka_ekstre_eksik_uyari(self):
        """Banka ekstresi yüklü değilse uyarı mesajı olmalı"""
        result = self.engine.check_banka_ekstre_yuklu_mu(banka_loaded=False)
        assert result is not None
        assert result.status == "no_data"

    # ==========================================================================
    # HESAP BAKIYE KURALLARI TESTLERİ
    # ==========================================================================

    def test_hesap_kurallari_kasa(self):
        """100 Kasa hesabı kuralları doğru olmalı"""
        kural = HESAP_BAKIYE_KURALLARI["100"]
        assert kural["yon"] == "borc"
        assert kural["eksi_olabilir"] == False
        assert kural["grup"] == "donen_varlik"

    def test_hesap_kurallari_sermaye(self):
        """500 Sermaye hesabı kuralları doğru olmalı"""
        kural = HESAP_BAKIYE_KURALLARI["500"]
        assert kural["yon"] == "alacak"
        assert kural["eksi_olabilir"] == False
        assert kural["grup"] == "ozkaynak"

    def test_hesap_kurallari_saticlar(self):
        """320 Satıcılar hesabı kuralları doğru olmalı"""
        kural = HESAP_BAKIYE_KURALLARI["320"]
        assert kural["yon"] == "alacak"
        assert kural["grup"] == "kvyk"

    def test_hesap_kurallari_hesaplanan_kdv(self):
        """391 Hesaplanan KDV hesabı kuralları doğru olmalı"""
        kural = HESAP_BAKIYE_KURALLARI["391"]
        assert kural["yon"] == "alacak"  # Pasif hesap
        assert kural["grup"] == "kvyk"

    def test_hesap_kurallari_indirilecek_kdv(self):
        """191 İndirilecek KDV hesabı kuralları doğru olmalı"""
        kural = HESAP_BAKIYE_KURALLARI["191"]
        assert kural["yon"] == "borc"  # Aktif hesap
        assert kural["grup"] == "donen_varlik"


class TestTekDuzenHesapPlani:
    """Tek Düzen Hesap Planı uyumluluk testleri"""

    def test_aktif_hesaplar_borc_bakiyeli(self):
        """1xx ve 2xx hesaplar borç bakiyeli olmalı (karşılıklar hariç)"""
        borc_olmasi_gerekenler = ["100", "102", "120", "150", "153", "191", "250", "253", "255"]
        for hesap in borc_olmasi_gerekenler:
            if hesap in HESAP_BAKIYE_KURALLARI:
                assert HESAP_BAKIYE_KURALLARI[hesap]["yon"] == "borc", f"{hesap} hesabı borç bakiyeli olmalı"

    def test_pasif_hesaplar_alacak_bakiyeli(self):
        """3xx, 4xx, 5xx hesaplar alacak bakiyeli olmalı (düzeltme hesapları hariç)"""
        alacak_olmasi_gerekenler = ["320", "360", "361", "391", "400", "500", "540", "570"]
        for hesap in alacak_olmasi_gerekenler:
            if hesap in HESAP_BAKIYE_KURALLARI:
                assert HESAP_BAKIYE_KURALLARI[hesap]["yon"] == "alacak", f"{hesap} hesabı alacak bakiyeli olmalı"

    def test_karsilik_hesaplari_ters_yon(self):
        """Karşılık hesapları ters yönde bakiye verebilir"""
        # 128, 129, 257, 268 gibi karşılık hesapları alacak bakiyeli
        karsilik_hesaplari = ["128", "129", "257", "268"]
        for hesap in karsilik_hesaplari:
            if hesap in HESAP_BAKIYE_KURALLARI:
                assert HESAP_BAKIYE_KURALLARI[hesap]["eksi_olabilir"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
