import { formatCurrency } from '../../_lib/format';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import { VDK_RISK_KRITERLERI, ORAN_KATEGORILERI } from './mizanOmurgaConstants';
import type {
  MizanHesap,
  VdkRiskBulgusu,
  OranAnalizi,
  ApiAccount,
  FinansalOranlar,
  MizanResult,
} from './mizanOmurgaTypes';

export function analyzeVdkRiskleri(mizan: MizanHesap[]): VdkRiskBulgusu[] {
  const bulgular: VdkRiskBulgusu[] = [];
  const getHesap = (kod: string) => mizan.find(h => h.kod === kod);

  const toplamAktif = mizan
    .filter(h => h.kod.startsWith('1') || h.kod.startsWith('2'))
    .reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
  const ozkaynaklar = mizan
    .filter(h => h.kod.startsWith('5'))
    .reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
  const satislar = Math.abs(getHesap('600')?.bakiye || 0);
  const smm = Math.abs(getHesap('620')?.bakiye || getHesap('621')?.bakiye || 0);

  const kasa = getHesap('100');
  if (kasa && toplamAktif > 0) {
    const kasaOrani = (Math.abs(kasa.bakiye) / toplamAktif) * 100;
    const kriter = VDK_RISK_KRITERLERI.KASA_AKTIF_ORANI;

    if (kasa.bakiye < 0) {
      bulgular.push({
        kod: kriter.kod,
        baslik: 'Negatif Kasa Bakiyesi',
        hesapKodu: '100',
        hesapAdi: 'Kasa',
        durum: 'kritik',
        mevcutDeger: kasa.bakiye,
        esikDeger: 0,
        birim: '₺',
        mevzuat: 'VUK 227 (Belge Düzeni)',
        aciklama: 'Kasa hesabı negatif bakiye veremez. Kayıt hatası veya belgesiz ödeme.',
        oneri: 'Kasa hareketlerini kontrol edin, eksik tahsilat kaydı yapın.',
        vdkRiski: true,
      });
    } else if (kasaOrani > kriter.esik_kritik) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '100',
        hesapAdi: 'Kasa',
        durum: 'kritik',
        mevcutDeger: kasaOrani,
        esikDeger: kriter.esik_kritik,
        birim: '%',
        mevzuat: kriter.mevzuat,
        aciklama: kriter.aciklama,
        oneri: kriter.oneri,
        vdkRiski: true,
      });
    } else if (kasaOrani > kriter.esik_uyari) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '100',
        hesapAdi: 'Kasa',
        durum: 'uyari',
        mevcutDeger: kasaOrani,
        esikDeger: kriter.esik_uyari,
        birim: '%',
        mevzuat: kriter.mevzuat,
        aciklama: 'Kasa bakiyesi aktif oranının üzerinde, takip edilmeli.',
        oneri: 'Kasa bakiyesini makul seviyede tutun.',
        vdkRiski: false,
      });
    }
  }

  const ortakAlacak131 = Math.abs(getHesap('131')?.bakiye || 0);
  const ortakAlacak231 = Math.abs(getHesap('231')?.bakiye || 0);
  const ortakBorc331 = Math.abs(getHesap('331')?.bakiye || 0);
  const ortakBorc431 = Math.abs(getHesap('431')?.bakiye || 0);
  const netOrtakAlacak = (ortakAlacak131 + ortakAlacak231) - (ortakBorc331 + ortakBorc431);
  const sermaye = Math.abs(getHesap('500')?.bakiye || 0);

  if (netOrtakAlacak > 0 && sermaye > 0) {
    const ortakOrani = (netOrtakAlacak / sermaye) * 100;
    const kriter = VDK_RISK_KRITERLERI.ORTAKLARDAN_ALACAK;

    if (ortakOrani > kriter.esik_kritik) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '131/231',
        hesapAdi: 'Ortaklardan Alacaklar (Net)',
        durum: 'kritik',
        mevcutDeger: ortakOrani,
        esikDeger: kriter.esik_kritik,
        birim: '%',
        mevzuat: kriter.mevzuat,
        aciklama: kriter.aciklama,
        oneri: kriter.oneri,
        vdkRiski: true,
      });
    } else if (ortakOrani > kriter.esik_uyari) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '131/231',
        hesapAdi: 'Ortaklardan Alacaklar (Net)',
        durum: 'uyari',
        mevcutDeger: ortakOrani,
        esikDeger: kriter.esik_uyari,
        birim: '%',
        mevzuat: kriter.mevzuat,
        aciklama: 'Ortaklardan alacaklar sermayeye göre yüksek.',
        oneri: 'Adat faizi hesaplayın ve kaydedin.',
        vdkRiski: true,
      });
    }
  }

  const iliskiliKisiBorclari = mizan
    .filter(h => ['331', '332', '431', '432'].includes(h.kod))
    .reduce((sum, h) => sum + Math.abs(h.bakiye), 0);

  if (iliskiliKisiBorclari > 0 && ozkaynaklar > 0) {
    const borcOran = iliskiliKisiBorclari / ozkaynaklar;
    const kriter = VDK_RISK_KRITERLERI.ORTULU_SERMAYE;

    if (borcOran > kriter.esik_kritik) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '331/431',
        hesapAdi: 'İlişkili Kişi Borçları',
        durum: 'kritik',
        mevcutDeger: borcOran,
        esikDeger: kriter.esik_kritik,
        birim: 'x',
        mevzuat: kriter.mevzuat,
        aciklama: kriter.aciklama,
        oneri: kriter.oneri,
        vdkRiski: true,
      });
    } else if (borcOran > kriter.esik_uyari) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '331/431',
        hesapAdi: 'İlişkili Kişi Borçları',
        durum: 'uyari',
        mevcutDeger: borcOran,
        esikDeger: kriter.esik_uyari,
        birim: 'x',
        mevzuat: kriter.mevzuat,
        aciklama: 'İlişkili kişi borçları özkaynak oranına yaklaşıyor.',
        oneri: 'Örtülü sermaye sınırına dikkat edin.',
        vdkRiski: true,
      });
    }
  }

  const alicilar = Math.abs(getHesap('120')?.bakiye || 0);
  if (alicilar > 0 && satislar > 0) {
    const tahsilatSuresi = (alicilar / satislar) * 365;
    const kriter = VDK_RISK_KRITERLERI.SUPHELI_ALACAK;

    if (tahsilatSuresi > kriter.esik_kritik) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '120',
        hesapAdi: 'Alıcılar',
        durum: 'kritik',
        mevcutDeger: tahsilatSuresi,
        esikDeger: kriter.esik_kritik,
        birim: 'gün',
        mevzuat: kriter.mevzuat,
        aciklama: kriter.aciklama,
        oneri: kriter.oneri,
        vdkRiski: false,
      });
    } else if (tahsilatSuresi > kriter.esik_uyari) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '120',
        hesapAdi: 'Alıcılar',
        durum: 'uyari',
        mevcutDeger: tahsilatSuresi,
        esikDeger: kriter.esik_uyari,
        birim: 'gün',
        mevzuat: kriter.mevzuat,
        aciklama: 'Ortalama tahsilat süresi yüksek.',
        oneri: 'Alacak yaşlandırma analizi yapın.',
        vdkRiski: false,
      });
    }
  }

  const stoklar = Math.abs(getHesap('150')?.bakiye || 0) +
                  Math.abs(getHesap('151')?.bakiye || 0) +
                  Math.abs(getHesap('152')?.bakiye || 0) +
                  Math.abs(getHesap('153')?.bakiye || 0);
  if (stoklar > 0 && smm > 0) {
    const stokGun = (stoklar / smm) * 365;
    const kriter = VDK_RISK_KRITERLERI.STOK_DEVIR;

    if (stokGun > kriter.esik_kritik) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '15x',
        hesapAdi: 'Stoklar',
        durum: 'kritik',
        mevcutDeger: stokGun,
        esikDeger: kriter.esik_kritik,
        birim: 'gün',
        mevzuat: kriter.mevzuat,
        aciklama: kriter.aciklama,
        oneri: kriter.oneri,
        vdkRiski: false,
      });
    } else if (stokGun > kriter.esik_uyari) {
      bulgular.push({
        kod: kriter.kod,
        baslik: kriter.baslik,
        hesapKodu: '15x',
        hesapAdi: 'Stoklar',
        durum: 'uyari',
        mevcutDeger: stokGun,
        esikDeger: kriter.esik_uyari,
        birim: 'gün',
        mevzuat: kriter.mevzuat,
        aciklama: 'Stok devir süresi yüksek.',
        oneri: 'Stok sayımı ve değerleme yapın.',
        vdkRiski: false,
      });
    }
  }

  const saticilar = getHesap('320');
  if (saticilar && saticilar.bakiye > 0) {
    bulgular.push({
      kod: 'MH-01',
      baslik: 'Satıcılar Hesabı Bakiye Yönü',
      hesapKodu: '320',
      hesapAdi: 'Satıcılar',
      durum: 'kritik',
      mevcutDeger: saticilar.bakiye,
      esikDeger: 0,
      birim: '₺',
      mevzuat: 'Tek Düzen Hesap Planı',
      aciklama: 'Satıcılar hesabı BORÇ bakiye veriyor. Normalde ALACAK bakiye olmalı.',
      oneri: 'Muhtemelen fazla ödeme veya avans kaydı. Cari hesabı kontrol edin.',
      vdkRiski: false,
    });
  }

  return bulgular;
}

export function calculateOranlar(mizan: MizanHesap[], backendOranlar?: FinansalOranlar): OranAnalizi[] {
  let cariOran: number;
  let likiditeOrani: number;
  let nakitOrani: number;
  let borcOzkaynak: number;
  let finansalKaldirac: number;
  let alacakDevir: number;
  let tahsilatSuresi: number;
  let stokDevir: number;
  let stokGun: number;
  let aktifDevir: number;
  let brutKarMarji: number;
  let netKarMarji: number;
  let aktifKarliligi: number;
  let ozkaynaklKarliligi: number;

  if (backendOranlar?.oranlar) {
    const { likidite, mali_yapi, faaliyet, karlilik } = backendOranlar.oranlar;

    cariOran = likidite.cari_oran;
    likiditeOrani = likidite.asit_test;
    nakitOrani = likidite.nakit_oran;
    borcOzkaynak = mali_yapi.borc_ozkaynak;
    finansalKaldirac = mali_yapi.finansal_kaldirac;
    alacakDevir = faaliyet.alacak_devir;
    tahsilatSuresi = faaliyet.tahsilat_suresi;
    stokDevir = faaliyet.stok_devir;
    stokGun = faaliyet.stok_gun;
    aktifDevir = faaliyet.aktif_devir;
    brutKarMarji = karlilik.brut_kar_marji;
    netKarMarji = karlilik.net_kar_marji;
    aktifKarliligi = karlilik.aktif_karliligi;
    ozkaynaklKarliligi = karlilik.ozkaynak_karliligi;
  } else {
    const getHesap = (kod: string) => mizan.find(h => h.kod === kod);

    const donenVarliklar = mizan.filter(h => h.kod.startsWith('1')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
    const duranVarliklar = mizan.filter(h => h.kod.startsWith('2')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
    const toplamAktif = donenVarliklar + duranVarliklar;
    const kisaVadeliBorc = mizan.filter(h => h.kod.startsWith('3')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
    const uzunVadeliBorc = mizan.filter(h => h.kod.startsWith('4')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
    const ozkaynaklar = mizan.filter(h => h.kod.startsWith('5')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);

    const brutSatislar = Math.abs(getHesap('600')?.bakiye || 0) +
                         Math.abs(getHesap('601')?.bakiye || 0) +
                         Math.abs(getHesap('602')?.bakiye || 0);
    const satisIndirimleri = Math.abs(getHesap('610')?.bakiye || 0) +
                             Math.abs(getHesap('611')?.bakiye || 0) +
                             Math.abs(getHesap('612')?.bakiye || 0);
    const satislar = brutSatislar - satisIndirimleri;

    const smm = Math.abs(getHesap('620')?.bakiye || 0) +
                Math.abs(getHesap('621')?.bakiye || 0) +
                Math.abs(getHesap('622')?.bakiye || 0) +
                Math.abs(getHesap('623')?.bakiye || 0);

    const stoklar = mizan.filter(h => h.kod.startsWith('15')).reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
    const alicilar = Math.abs(getHesap('120')?.bakiye || 0);
    const kasaVal = Math.abs(getHesap('100')?.bakiye || 0);
    const bankalar = Math.abs(getHesap('102')?.bakiye || 0);
    const hazirDegerler = kasaVal + bankalar;

    const brutKar = satislar - smm;
    const faaliyetGiderleri = mizan.filter(h => h.kod.startsWith('63') || h.kod.startsWith('64') || h.kod.startsWith('65'))
      .reduce((sum, h) => sum + Math.abs(h.bakiye), 0);
    const faaliyetKari = brutKar - faaliyetGiderleri;

    cariOran = kisaVadeliBorc > 0 ? donenVarliklar / kisaVadeliBorc : 0;
    likiditeOrani = kisaVadeliBorc > 0 ? (donenVarliklar - stoklar) / kisaVadeliBorc : 0;
    nakitOrani = kisaVadeliBorc > 0 ? hazirDegerler / kisaVadeliBorc : 0;
    borcOzkaynak = ozkaynaklar > 0 ? (kisaVadeliBorc + uzunVadeliBorc) / ozkaynaklar : 0;
    finansalKaldirac = ozkaynaklar > 0 ? toplamAktif / ozkaynaklar : 0;
    alacakDevir = alicilar > 0 ? satislar / alicilar : 0;
    tahsilatSuresi = satislar > 0 ? (alicilar / satislar) * 365 : 0;
    stokDevir = stoklar > 0 ? smm / stoklar : 0;
    stokGun = smm > 0 ? (stoklar / smm) * 365 : 0;
    aktifDevir = toplamAktif > 0 ? satislar / toplamAktif : 0;
    brutKarMarji = satislar > 0 ? (brutKar / satislar) * 100 : 0;
    netKarMarji = satislar > 0 ? (faaliyetKari / satislar) * 100 : 0;
    aktifKarliligi = toplamAktif > 0 ? (faaliyetKari / toplamAktif) * 100 : 0;
    ozkaynaklKarliligi = ozkaynaklar > 0 ? (faaliyetKari / ozkaynaklar) * 100 : 0;
  }

  return [
    {
      kategori: 'LIKIDITE',
      ad: 'Cari Oran',
      formul: 'Dönen Varlıklar / KVYK',
      deger: cariOran,
      birim: 'x',
      normalAralik: { min: 1.5, max: 2.5 },
      durum: cariOran >= 1.5 ? 'normal' : cariOran >= 1 ? 'uyari' : 'kritik',
      yorum: 'Kısa vadeli borçları ödeme kapasitesi. Banker oranı olarak bilinir.',
      sektorOrtalama: 1.8,
    },
    {
      kategori: 'LIKIDITE',
      ad: 'Asit-Test Oranı',
      formul: '(Dönen Varlıklar - Stoklar) / KVYK',
      deger: likiditeOrani,
      birim: 'x',
      normalAralik: { min: 1, max: 1.5 },
      durum: likiditeOrani >= 1 ? 'normal' : likiditeOrani >= 0.8 ? 'uyari' : 'kritik',
      yorum: 'Stoklar hariç likidite gücü. Daha keskin ölçüm.',
      sektorOrtalama: 1.2,
    },
    {
      kategori: 'LIKIDITE',
      ad: 'Nakit Oranı',
      formul: 'Hazır Değerler / KVYK',
      deger: nakitOrani,
      birim: 'x',
      normalAralik: { min: 0.2, max: 0.4 },
      durum: nakitOrani >= 0.2 ? 'normal' : nakitOrani >= 0.1 ? 'uyari' : 'kritik',
      yorum: 'Anlık ödeme kapasitesi.',
      sektorOrtalama: 0.25,
    },
    {
      kategori: 'MALI_YAPI',
      ad: 'Borç/Özkaynak Oranı',
      formul: 'Toplam Borç / Özkaynaklar',
      deger: borcOzkaynak,
      birim: 'x',
      normalAralik: { min: 0.5, max: 2 },
      durum: borcOzkaynak <= 2 ? 'normal' : borcOzkaynak <= 3 ? 'uyari' : 'kritik',
      yorum: 'Finansal kaldıraç düzeyi. >3x örtülü sermaye riski.',
      sektorOrtalama: 1.5,
    },
    {
      kategori: 'MALI_YAPI',
      ad: 'Finansal Kaldıraç',
      formul: 'Toplam Aktif / Özkaynaklar',
      deger: finansalKaldirac,
      birim: 'x',
      normalAralik: { min: 1.5, max: 3 },
      durum: finansalKaldirac <= 3 ? 'normal' : finansalKaldirac <= 4 ? 'uyari' : 'kritik',
      yorum: 'Varlıkların ne kadarı borçla finanse edilmiş.',
      sektorOrtalama: 2.5,
    },
    {
      kategori: 'FAALIYET',
      ad: 'Alacak Devir Hızı',
      formul: 'Net Satışlar / Ticari Alacaklar',
      deger: alacakDevir,
      birim: 'x',
      normalAralik: { min: 4, max: 12 },
      durum: alacakDevir >= 4 ? 'normal' : alacakDevir >= 2 ? 'uyari' : 'kritik',
      yorum: 'Alacakların yılda kaç kez tahsil edildiği.',
      sektorOrtalama: 6,
    },
    {
      kategori: 'FAALIYET',
      ad: 'Ortalama Tahsilat Süresi',
      formul: '365 / Alacak Devir Hızı',
      deger: tahsilatSuresi,
      birim: 'gun',
      normalAralik: { min: 30, max: 90 },
      durum: tahsilatSuresi <= 90 ? 'normal' : tahsilatSuresi <= 180 ? 'uyari' : 'kritik',
      yorum: 'Alacakların ortalama tahsilat süresi. >90 gün şüpheli alacak riski.',
      sektorOrtalama: 60,
    },
    {
      kategori: 'FAALIYET',
      ad: 'Stok Devir Hızı',
      formul: 'SMM / Ortalama Stok',
      deger: stokDevir,
      birim: 'x',
      normalAralik: { min: 4, max: 12 },
      durum: stokDevir >= 4 ? 'normal' : stokDevir >= 2 ? 'uyari' : 'kritik',
      yorum: 'Stokların yılda kaç kez satıldığı.',
      sektorOrtalama: 6,
    },
    {
      kategori: 'FAALIYET',
      ad: 'Stok Tutma Süresi',
      formul: '365 / Stok Devir Hızı',
      deger: stokGun,
      birim: 'gun',
      normalAralik: { min: 30, max: 90 },
      durum: stokGun <= 90 ? 'normal' : stokGun <= 180 ? 'uyari' : 'kritik',
      yorum: 'Stokların ortalama elde tutma süresi.',
      sektorOrtalama: 60,
    },
    {
      kategori: 'FAALIYET',
      ad: 'Aktif Devir Hızı',
      formul: 'Net Satışlar / Toplam Aktif',
      deger: aktifDevir,
      birim: 'x',
      normalAralik: { min: 0.8, max: 2 },
      durum: aktifDevir >= 0.8 ? 'normal' : aktifDevir >= 0.5 ? 'uyari' : 'kritik',
      yorum: 'Varlık kullanım etkinliği.',
      sektorOrtalama: 1.2,
    },
    {
      kategori: 'KARLILIK',
      ad: 'Brüt Kar Marjı',
      formul: 'Brüt Kar / Net Satışlar',
      deger: brutKarMarji,
      birim: '%',
      normalAralik: { min: 15, max: 40 },
      durum: brutKarMarji >= 15 ? 'normal' : brutKarMarji >= 5 ? 'uyari' : 'kritik',
      yorum: 'Satış başına brüt kazanç yüzdesi.',
      sektorOrtalama: 25,
    },
    {
      kategori: 'KARLILIK',
      ad: 'Net Kar Marjı',
      formul: 'Net Kar / Net Satışlar',
      deger: netKarMarji,
      birim: '%',
      normalAralik: { min: 5, max: 20 },
      durum: netKarMarji >= 5 ? 'normal' : netKarMarji >= 0 ? 'uyari' : 'kritik',
      yorum: 'Satış başına net kazanç yüzdesi.',
      sektorOrtalama: 10,
    },
    {
      kategori: 'KARLILIK',
      ad: 'Aktif Karlılığı (ROA)',
      formul: 'Net Kar / Toplam Aktif',
      deger: aktifKarliligi,
      birim: '%',
      normalAralik: { min: 5, max: 15 },
      durum: aktifKarliligi >= 5 ? 'normal' : aktifKarliligi >= 0 ? 'uyari' : 'kritik',
      yorum: 'Varlıkların kazanç yaratma kapasitesi.',
      sektorOrtalama: 8,
    },
    {
      kategori: 'KARLILIK',
      ad: 'Özkaynak Karlılığı (ROE)',
      formul: 'Net Kar / Özkaynaklar',
      deger: ozkaynaklKarliligi,
      birim: '%',
      normalAralik: { min: 10, max: 25 },
      durum: ozkaynaklKarliligi >= 10 ? 'normal' : ozkaynaklKarliligi >= 0 ? 'uyari' : 'kritik',
      yorum: 'Ortakların kazanç oranı.',
      sektorOrtalama: 15,
    },
  ];
}

export function getAccountGroup(kod: string): string {
  const prefix = kod.charAt(0);
  switch (prefix) {
    case '1': return 'Dönen Varlıklar';
    case '2': return 'Duran Varlıklar';
    case '3': return 'Kısa Vadeli Yabancı Kaynaklar';
    case '4': return 'Uzun Vadeli Yabancı Kaynaklar';
    case '5': return 'Özkaynaklar';
    case '6': return 'Gelirler';
    case '7': return 'Giderler';
    case '8': return 'Maliyet Hesapları';
    case '9': return 'Nazım Hesaplar';
    default: return 'Diğer';
  }
}

export function getBakiyeYonu(kod: string, bakiye: number): 'B' | 'A' {
  const prefix = kod.charAt(0);
  if (['1', '2', '7', '8'].includes(prefix)) {
    return bakiye >= 0 ? 'B' : 'A';
  } else {
    return bakiye <= 0 ? 'A' : 'B';
  }
}

function mapApiAccountToMizanHesap(account: ApiAccount): MizanHesap {
  const bakiye = account.bakiye;
  const bakiyeYonu = getBakiyeYonu(account.hesap, bakiye);
  const borc = bakiyeYonu === 'B' ? Math.abs(bakiye) : 0;
  const alacak = bakiyeYonu === 'A' ? Math.abs(bakiye) : 0;

  return {
    kod: account.hesap,
    ad: account.ad,
    grup: getAccountGroup(account.hesap),
    borc,
    alacak,
    bakiye: bakiyeYonu === 'B' ? Math.abs(bakiye) : -Math.abs(bakiye),
    bakiyeYonu,
  };
}

export function normalizeMizan(raw: unknown): PanelEnvelope<MizanResult> {
  return normalizeToEnvelope<MizanResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;

    const isV2 = 'ok' in obj && 'smmm_id' in obj;
    const accountsObj = isV2
      ? (obj.accounts || {}) as Record<string, unknown>
      : ((obj.data as Record<string, unknown> | undefined)?.accounts || {}) as Record<string, unknown>;
    const summaryRaw = isV2
      ? (obj.summary || {}) as Record<string, unknown>
      : ((obj.data as Record<string, unknown> | undefined)?.summary || {}) as Record<string, unknown>;

    const totalsRaw = (obj.totals || {}) as Record<string, unknown>;
    const backendToplamBorc = typeof totalsRaw.toplam_borc === 'number' ? totalsRaw.toplam_borc : null;
    const backendToplamAlacak = typeof totalsRaw.toplam_alacak === 'number' ? totalsRaw.toplam_alacak : null;
    const backendDengeOk = typeof totalsRaw.denge_ok === 'boolean' ? totalsRaw.denge_ok : null;

    const hesapDetaylari = (obj.hesap_detaylari || []) as Array<Record<string, unknown>>;

    let hesaplar: MizanHesap[] = [];

    if (hesapDetaylari.length > 0) {
      hesaplar = hesapDetaylari
        .filter(h => h.hesap_kodu && String(h.hesap_kodu).trim() !== '')
        .map(h => {
          const kod = String(h.hesap_kodu || '');
          const borc = typeof h.borc === 'number' ? h.borc : 0;
          const alacak = typeof h.alacak === 'number' ? h.alacak : 0;
          const bakiyeBorc = typeof h.bakiye_borc === 'number' ? h.bakiye_borc : 0;
          const bakiyeAlacak = typeof h.bakiye_alacak === 'number' ? h.bakiye_alacak : 0;

          let bakiye: number;
          let bakiyeYonu: 'B' | 'A';

          if (kod.startsWith('1') || kod.startsWith('2') || kod.startsWith('7')) {
            bakiye = bakiyeBorc - bakiyeAlacak;
            bakiyeYonu = bakiye >= 0 ? 'B' : 'A';
          } else {
            bakiye = bakiyeAlacak - bakiyeBorc;
            bakiyeYonu = bakiye >= 0 ? 'A' : 'B';
          }

          return {
            kod,
            ad: String(h.hesap_adi || ''),
            grup: getAccountGroup(kod),
            borc,
            alacak,
            bakiye: Math.abs(bakiye),
            bakiyeYonu,
          };
        })
        .sort((a, b) => a.kod.localeCompare(b.kod));
    } else {
      const accountsRaw: ApiAccount[] = Object.entries(accountsObj).map(([kod, a]) => {
        const acc = a as Record<string, unknown>;
        return {
          hesap: String(acc.hesap || kod || ''),
          ad: String(acc.ad || acc.hesap_adi || ''),
          bakiye: typeof acc.bakiye === 'number' ? acc.bakiye : 0,
          status: (acc.status as 'ok' | 'warning' | 'error') || 'ok',
          reason_tr: acc.reason_tr ? String(acc.reason_tr) : undefined,
          required_actions: Array.isArray(acc.required_actions) ? acc.required_actions as string[] : [],
        };
      });

      const validAccounts = accountsRaw.filter(a => a.hesap && a.hesap.trim() !== '');
      validAccounts.sort((a, b) => a.hesap.localeCompare(b.hesap));
      hesaplar = validAccounts.map(mapApiAccountToMizanHesap);
    }

    const toplamBorc = backendToplamBorc !== null
      ? backendToplamBorc
      : hesaplar.reduce((sum, h) => sum + h.borc, 0);
    const toplamAlacak = backendToplamAlacak !== null
      ? backendToplamAlacak
      : hesaplar.reduce((sum, h) => sum + h.alacak, 0);
    const fark = Math.abs(toplamBorc - toplamAlacak);
    const dengeOk = backendDengeOk !== null ? backendDengeOk : fark < 1;

    const criticalCount = Object.values(accountsObj).filter(
      (a) => (a as Record<string, unknown>).status === 'error'
    ).length;

    const finansalOranlarRaw = obj.finansal_oranlar as Record<string, unknown> | undefined;
    let finansalOranlar: FinansalOranlar | undefined;

    if (finansalOranlarRaw && typeof finansalOranlarRaw === 'object') {
      const rawValues = finansalOranlarRaw.raw_values as Record<string, number> | undefined;
      const oranlarObj = finansalOranlarRaw.oranlar as Record<string, Record<string, number>> | undefined;
      const smmmUyarilari = finansalOranlarRaw.smmm_uyarilari as Array<{
        kod: string;
        mesaj: string;
        oneri: string;
        seviye: 'kritik' | 'uyari';
      }> | undefined;

      if (rawValues && oranlarObj) {
        finansalOranlar = {
          raw_values: {
            donen_varliklar: rawValues.donen_varliklar || 0,
            duran_varliklar: rawValues.duran_varliklar || 0,
            toplam_aktif: rawValues.toplam_aktif || 0,
            kvyk: rawValues.kvyk || 0,
            uvyk: rawValues.uvyk || 0,
            ozkaynaklar: rawValues.ozkaynaklar || 0,
            stoklar: rawValues.stoklar || 0,
            alicilar: rawValues.alicilar || 0,
            hazir_degerler: rawValues.hazir_degerler || 0,
            ciro: rawValues.ciro || 0,
            smm: rawValues.smm || 0,
            brut_kar: rawValues.brut_kar || 0,
          },
          oranlar: {
            likidite: {
              cari_oran: oranlarObj.likidite?.cari_oran || 0,
              asit_test: oranlarObj.likidite?.asit_test || 0,
              nakit_oran: oranlarObj.likidite?.nakit_oran || 0,
            },
            mali_yapi: {
              borc_ozkaynak: oranlarObj.mali_yapi?.borc_ozkaynak || 0,
              finansal_kaldirac: oranlarObj.mali_yapi?.finansal_kaldirac || 0,
            },
            faaliyet: {
              alacak_devir: oranlarObj.faaliyet?.alacak_devir || 0,
              tahsilat_suresi: oranlarObj.faaliyet?.tahsilat_suresi || 0,
              stok_devir: oranlarObj.faaliyet?.stok_devir || 0,
              stok_gun: oranlarObj.faaliyet?.stok_gun || 0,
              aktif_devir: oranlarObj.faaliyet?.aktif_devir || 0,
            },
            karlilik: {
              brut_kar_marji: oranlarObj.karlilik?.brut_kar_marji || 0,
              net_kar_marji: oranlarObj.karlilik?.net_kar_marji || 0,
              aktif_karliligi: oranlarObj.karlilik?.aktif_karliligi || 0,
              ozkaynak_karliligi: oranlarObj.karlilik?.ozkaynak_karliligi || 0,
            },
          },
          smmm_uyarilari: smmmUyarilari || [],
        };
      }
    }

    return {
      hesaplar,
      accounts_raw: accountsObj as Record<string, ApiAccount>,
      summary: {
        total_accounts: typeof summaryRaw.total_accounts === 'number' ? summaryRaw.total_accounts : hesaplar.length,
        ok: typeof summaryRaw.ok === 'number' ? summaryRaw.ok : 0,
        warning: typeof summaryRaw.warning === 'number' ? summaryRaw.warning : 0,
        error: typeof summaryRaw.error === 'number' ? summaryRaw.error : 0,
        overall_status: String(summaryRaw.overall_status || 'ok'),
        total_actions: typeof summaryRaw.total_actions === 'number' ? summaryRaw.total_actions : 0,
      },
      totals: {
        toplam_borc: toplamBorc,
        toplam_alacak: toplamAlacak,
        fark,
        denge_ok: dengeOk,
      },
      critical_count: criticalCount,
      finansal_oranlar: finansalOranlar,
    };
  });
}

export function formatValue(val: number, birim: string) {
  if (birim === '%') return `%${val.toFixed(1)}`;
  if (birim === 'gun' || birim === 'gün') return `${val.toFixed(0)} gün`;
  if (birim === 'x') return `${val.toFixed(2)}x`;
  if (birim === '₺') return formatCurrency(val, { decimals: 0 });
  return val.toFixed(2);
}
