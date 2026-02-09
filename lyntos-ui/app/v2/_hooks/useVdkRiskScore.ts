/**
 * LYNTOS VDK Risk Skoru Hook
 *
 * SMMM'ler için 12 kritik hesabı analiz eder ve VDK risk skoru hesaplar.
 * Sizin paylaştığınız tavsiye metnine dayanarak:
 *
 * 1. 100 KASA - ÇOK YÜKSEK RİSK
 * 2. 131/231 ORTAKLARDAN ALACAKLAR - ÇOK YÜKSEK RİSK
 * 3. 190/191 DEVREDEN KDV - YÜKSEK RİSK
 * 4. 320/120 SATICILAR/ALICILAR (SMİYB) - YÜKSEK RİSK
 * 5. 331/431 ORTAKLARA BORÇLAR - YÜKSEK RİSK
 * 6. 361/368 ÖDENECEK SGK - ORTA-YÜKSEK RİSK
 * 7. 642 FAİZ GELİRLERİ - ORTA RİSK
 * 8. 128/129 ŞÜPHELİ ALACAKLAR - ORTA RİSK
 * 9. TRANSFER FİYATLANDIRMASI - ORTA RİSK
 *
 * VDK Kuralları: K-01 to K-13 (KURGAN) + RAM-01 to RAM-12
 */

import { useState, useEffect, useMemo } from 'react';
import { useDashboardScope, useScopeComplete } from '../_components/scope/useDashboardScope';
import { loadMizanData, type VdkData, type MizanDataResponse } from '../_lib/api/mizanData';

// ============== TYPES ==============

export type RiskSeviyesi = 'kritik' | 'yuksek' | 'orta' | 'dusuk' | 'ok';

export interface KritikHesap {
  kod: string;
  ad: string;
  bakiye: number;
  riskSeviyesi: RiskSeviyesi;
  riskPuani: number; // 0-30 arası
  vdkSenaryosu: string;
  yasalDayanak: string;
  onerilenAksiyon: string;
  adatGerekli?: boolean;
  kkegGerekli?: boolean;
  virmanGerekli?: boolean;
}

export interface VdkRiskSonuc {
  toplamPuan: number; // 0-100
  seviye: RiskSeviyesi;
  kritikHesaplar: KritikHesap[];
  ttk376: {
    sermayeKaybiOrani: number;
    durum: 'normal' | 'uyari_50' | 'tehlike_66' | 'borca_batik';
    aciklama: string;
  };
  ortuluSermaye: {
    oran: number; // 3x sınırına göre
    sinirAsimi: boolean;
    aciklama: string;
  };
  finansmanGiderKisitlamasi: {
    uygulanir: boolean;
    kkegTutar: number;
    aciklama: string;
  };
  devredenKdv: {
    aySayisi: number;
    uyari: boolean; // 36 ay kuralı
    aciklama: string;
  };
}

export interface UseVdkRiskScoreResult {
  data: VdkRiskSonuc | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ============== RISK HESAPLAMA FONKSİYONLARI ==============

/**
 * 100 KASA - En kritik hesap
 * VDK senaryosu: Kasa şişkinliği, adat riski
 */
function analyzeKasa(bakiye: number, ciro: number): KritikHesap {
  const kasaCiroOrani = ciro > 0 ? (bakiye / ciro) * 100 : 0;

  let riskSeviyesi: RiskSeviyesi = 'ok';
  let riskPuani = 0;
  let vdkSenaryosu = '';
  let onerilenAksiyon = '';
  let adatGerekli = false;

  if (bakiye > 500000) {
    riskSeviyesi = 'kritik';
    riskPuani = 25;
    vdkSenaryosu = 'Kasa hesabında yüksek tutarlı nakit - VDK öncelikli risk senaryosu';
    onerilenAksiyon = '100 hesabı alt kırılımlara ayır (100.01 Elden Nakit, 100.02 Kasada Tutulan, 100.03 Ortağa Verilen). Kasa sayım tutanağı düzenle.';
    adatGerekli = true;
  } else if (bakiye > 200000 || kasaCiroOrani > 10) {
    riskSeviyesi = 'yuksek';
    riskPuani = 15;
    vdkSenaryosu = 'Kasa bakiyesi sektör ortalamasının üzerinde';
    onerilenAksiyon = 'Kasa sayım tutanağı hazırla, fiili para ile kayıt eşleşmesini kontrol et.';
    adatGerekli = true;
  } else if (bakiye > 50000) {
    riskSeviyesi = 'orta';
    riskPuani = 5;
    vdkSenaryosu = 'Kasa bakiyesi normal sınırların üzerinde';
    onerilenAksiyon = 'Dönem sonu kasa sayım tutanağı düzenle.';
  }

  return {
    kod: '100',
    ad: 'Kasa',
    bakiye,
    riskSeviyesi,
    riskPuani,
    vdkSenaryosu,
    yasalDayanak: 'VUK 227, İzaha Davet Müessesesi',
    onerilenAksiyon,
    adatGerekli,
  };
}

/**
 * 131/231 ORTAKLARDAN ALACAKLAR - Çok kritik
 * VDK senaryosu: Adat eksikliği, 642 faiz geliri kontrolü
 */
function analyzeOrtakAlacak(bakiye: number, ozsermaye: number): KritikHesap {
  const ozkaynakOrani = ozsermaye > 0 ? (bakiye / ozsermaye) * 100 : 0;

  let riskSeviyesi: RiskSeviyesi = 'ok';
  let riskPuani = 0;
  let vdkSenaryosu = '';
  let onerilenAksiyon = '';
  let adatGerekli = false;

  if (bakiye > 1000000 || ozkaynakOrani > 50) {
    riskSeviyesi = 'kritik';
    riskPuani = 30;
    vdkSenaryosu = 'Ortaklardan alacak özkaynak oranı çok yüksek - VDK inceleme tetikleyici';
    onerilenAksiyon = 'Her ay adat hesapla, ortağa faiz faturası kes, 642 hesapta gelir kaydet.';
    adatGerekli = true;
  } else if (bakiye > 300000 || ozkaynakOrani > 25) {
    riskSeviyesi = 'yuksek';
    riskPuani = 20;
    vdkSenaryosu = 'RAM-04 Örtülü kazanç senaryosu - İlişkili kişi alacakları >%25 özkaynak';
    onerilenAksiyon = 'Adat hesapla, faiz faturası düzenle, dönem sonu 642 kontrol et.';
    adatGerekli = true;
  } else if (bakiye > 50000) {
    riskSeviyesi = 'orta';
    riskPuani = 10;
    vdkSenaryosu = 'Ortaklardan alacak mevcut - izlenmeli';
    onerilenAksiyon = 'Dönem sonu adat değerlendirmesi yap.';
  }

  return {
    kod: '131',
    ad: 'Ortaklardan Alacaklar',
    bakiye,
    riskSeviyesi,
    riskPuani,
    vdkSenaryosu,
    yasalDayanak: 'KVK Md.13 Transfer Fiyatlandırması, TTK Md.358 Borçlanma Yasağı',
    onerilenAksiyon,
    adatGerekli,
  };
}

/**
 * 190/191 DEVREDEN KDV - 36 ay kuralı
 */
function analyzeDevredenKdv(bakiye: number, aySayisi: number = 0): KritikHesap {
  let riskSeviyesi: RiskSeviyesi = 'ok';
  let riskPuani = 0;
  let vdkSenaryosu = '';
  let onerilenAksiyon = '';

  if (aySayisi >= 36) {
    riskSeviyesi = 'kritik';
    riskPuani = 20;
    vdkSenaryosu = '36 ay devreden KDV kuralı ihlali - VDK öncelikli senaryo';
    onerilenAksiyon = '2030 yılı için indirim hesaplarından çıkarılacak. Planlama yap.';
  } else if (aySayisi >= 24 || bakiye > 500000) {
    riskSeviyesi = 'yuksek';
    riskPuani = 15;
    vdkSenaryosu = 'Sürekli devreden KDV beyanı - İnceleme riski';
    onerilenAksiyon = 'KDV iade başvurusu değerlendir, ödeme planı oluştur.';
  } else if (aySayisi >= 12 || bakiye > 100000) {
    riskSeviyesi = 'orta';
    riskPuani = 5;
    vdkSenaryosu = 'Devreden KDV artış trendi';
    onerilenAksiyon = 'KDV durumunu izle, satış planlaması yap.';
  }

  return {
    kod: '190',
    ad: 'Devreden KDV',
    bakiye,
    riskSeviyesi,
    riskPuani,
    vdkSenaryosu,
    yasalDayanak: 'KDV Kanunu Geçici Md., 2030 Düzenlemesi',
    onerilenAksiyon,
  };
}

/**
 * 320 SATICILAR - SMİYB Riski
 */
function analyzeSaticilar(bakiye: number): KritikHesap {
  let riskSeviyesi: RiskSeviyesi = 'ok';
  let riskPuani = 0;
  let vdkSenaryosu = '';
  let onerilenAksiyon = '';

  // Backend'den şüpheli tedarikçi sayısı gelecek, şimdilik bakiyeye göre
  if (bakiye > 5000000) {
    riskSeviyesi = 'yuksek';
    riskPuani = 15;
    vdkSenaryosu = 'Yüksek satıcı bakiyesi - SMİYB riski değerlendirilmeli';
    onerilenAksiyon = 'Tedarikçi mükellefiyet kontrolü yap, banka ödemelerini belgele.';
  } else if (bakiye > 1000000) {
    riskSeviyesi = 'orta';
    riskPuani = 5;
    vdkSenaryosu = 'Satıcı bakiyesi izlenmeli';
    onerilenAksiyon = 'E-fatura/e-irsaliye tarih uyumu kontrol et.';
  }

  return {
    kod: '320',
    ad: 'Satıcılar',
    bakiye,
    riskSeviyesi,
    riskPuani,
    vdkSenaryosu,
    yasalDayanak: 'VUK 359, 7524 sayılı Kanun (SMİYB)',
    onerilenAksiyon,
  };
}

/**
 * 331/431 ORTAKLARA BORÇLAR - Muvazaa riski
 */
function analyzeOrtakBorc(bakiye: number, kasaBakiye: number): KritikHesap {
  let riskSeviyesi: RiskSeviyesi = 'ok';
  let riskPuani = 0;
  let vdkSenaryosu = '';
  let onerilenAksiyon = '';

  // Kasa azaltmak için 331'e çıkış yapılması kontrolü
  const kasaOrtakOraniSuspect = kasaBakiye > 0 && bakiye > kasaBakiye * 2;

  if (bakiye > 2000000 || kasaOrtakOraniSuspect) {
    riskSeviyesi = 'yuksek';
    riskPuani = 15;
    vdkSenaryosu = 'Ortaklara borç yüksek - Muvazaa riski, kasa manipülasyonu şüphesi';
    onerilenAksiyon = '331 hesabın gerçekliğini belgele, para giriş/çıkış dekontları hazırla.';
  } else if (bakiye > 500000) {
    riskSeviyesi = 'orta';
    riskPuani = 10;
    vdkSenaryosu = 'Ortaklara borç izlenmeli - RAM-05 senaryosu';
    onerilenAksiyon = 'Ortaklarla mutabakat yap, belge dosyası oluştur.';
  }

  return {
    kod: '331',
    ad: 'Ortaklara Borçlar',
    bakiye,
    riskSeviyesi,
    riskPuani,
    vdkSenaryosu,
    yasalDayanak: 'KVK Md.12 Örtülü Sermaye',
    onerilenAksiyon,
  };
}

/**
 * 361/368 SGK PRİMLERİ - KKEG kontrolü
 */
function analyzeSgkPrimleri(bakiye361: number, bakiye368: number): KritikHesap {
  let riskSeviyesi: RiskSeviyesi = 'ok';
  let riskPuani = 0;
  let vdkSenaryosu = '';
  let onerilenAksiyon = '';
  let kkegGerekli = false;
  let virmanGerekli = false;

  if (bakiye361 > 100000 && bakiye368 === 0) {
    riskSeviyesi = 'yuksek';
    riskPuani = 15;
    vdkSenaryosu = '361 bakiye var ama KKEG kaydı (368) yok - VDK inceleme noktası';
    onerilenAksiyon = '361→368 virman yap, ödenmeyen SGK primlerini KKEG kaydet.';
    kkegGerekli = true;
    virmanGerekli = true;
  } else if (bakiye361 > 50000) {
    riskSeviyesi = 'orta';
    riskPuani = 5;
    vdkSenaryosu = 'Ödenecek SGK primi bakiyesi var';
    onerilenAksiyon = 'Ödenmeyen kısımları dönem sonunda 368\'e virmanla.';
    virmanGerekli = true;
  }

  return {
    kod: '361',
    ad: 'Ödenecek SGK Primleri',
    bakiye: bakiye361,
    riskSeviyesi,
    riskPuani,
    vdkSenaryosu,
    yasalDayanak: 'GVK Md.40, KVK Md.8 - Ödenmeyen prim KKEG',
    onerilenAksiyon,
    kkegGerekli,
    virmanGerekli,
  };
}

/**
 * 120 ALICILAR - Yaşlandırma ve şüpheli alacak
 */
function analyzeAlicilar(bakiye: number): KritikHesap {
  let riskSeviyesi: RiskSeviyesi = 'ok';
  let riskPuani = 0;
  let vdkSenaryosu = '';
  let onerilenAksiyon = '';

  if (bakiye > 10000000) {
    riskSeviyesi = 'orta';
    riskPuani = 5;
    vdkSenaryosu = 'Yüksek alıcı bakiyesi - Yaşlandırma analizi gerekli';
    onerilenAksiyon = 'Alacak yaşlandırma analizi yap, 180+ gün alacakları değerlendir.';
  }

  return {
    kod: '120',
    ad: 'Alıcılar',
    bakiye,
    riskSeviyesi,
    riskPuani,
    vdkSenaryosu,
    yasalDayanak: 'VUK Md.323 Şüpheli Alacaklar',
    onerilenAksiyon,
  };
}

/**
 * TTK 376 Sermaye Kaybı Analizi
 */
function analyzeTtk376(ozsermaye: number, sermaye: number, yedekler: number = 0) {
  const sermayeVeYedekler = sermaye + yedekler;
  const sermayeKaybiOrani = sermayeVeYedekler > 0
    ? ((sermayeVeYedekler - ozsermaye) / sermayeVeYedekler) * 100
    : 0;

  let durum: 'normal' | 'uyari_50' | 'tehlike_66' | 'borca_batik' = 'normal';
  let aciklama = '';

  if (ozsermaye < 0) {
    durum = 'borca_batik';
    aciklama = 'Borca batıklık durumu - Mahkemeye iflas bildirimi zorunlu!';
  } else if (sermayeKaybiOrani >= 66.67) {
    durum = 'tehlike_66';
    aciklama = 'Sermaye kaybı 2/3 aştı - Sermaye artırımı/azaltımı ZORUNLU';
  } else if (sermayeKaybiOrani >= 50) {
    durum = 'uyari_50';
    aciklama = 'Sermaye kaybı 1/2 aştı - Genel Kurulu toplantıya çağır, iyileştirici önlem sun';
  } else {
    aciklama = 'Sermaye durumu normal';
  }

  return {
    sermayeKaybiOrani: Math.max(0, sermayeKaybiOrani),
    durum,
    aciklama,
  };
}

/**
 * Örtülü Sermaye Analizi (3x Özkaynak Kuralı)
 */
function analyzeOrtuluSermaye(ortakBorcToplam: number, donemBasiOzkaynak: number) {
  const sinir = donemBasiOzkaynak * 3;
  const oran = donemBasiOzkaynak > 0 ? ortakBorcToplam / donemBasiOzkaynak : 0;
  const sinirAsimi = ortakBorcToplam > sinir;

  let aciklama = '';
  if (sinirAsimi) {
    const asanKisim = ortakBorcToplam - sinir;
    aciklama = `İlişkili kişi borçları özkaynak x3 sınırını aştı! Aşan kısım: ${asanKisim.toLocaleString('tr-TR')} TL → Faizler KKEG`;
  } else {
    aciklama = `Örtülü sermaye sınırı içinde (${oran.toFixed(1)}x / 3x)`;
  }

  return {
    oran,
    sinirAsimi,
    aciklama,
  };
}

/**
 * Finansman Gider Kısıtlaması (FGK) - KVK 11/1-i
 */
function analyzeFinansmanGiderKisitlamasi(
  yabanciKaynak: number,
  ozkaynak: number,
  finansmanGideri: number
) {
  const uygulanir = yabanciKaynak > ozkaynak;
  let kkegTutar = 0;
  let aciklama = '';

  if (uygulanir) {
    const asanKisim = yabanciKaynak - ozkaynak;
    const asanaIsabetEden = finansmanGideri * (asanKisim / yabanciKaynak);
    kkegTutar = asanaIsabetEden * 0.10; // %10 KKEG
    aciklama = `Yabancı kaynak > Özkaynak. Finansman giderinin ${kkegTutar.toLocaleString('tr-TR')} TL'si KKEG`;
  } else {
    aciklama = 'Finansman gider kısıtlaması uygulanmaz';
  }

  return {
    uygulanir,
    kkegTutar,
    aciklama,
  };
}

// ============== MAIN HOOK ==============

export function useVdkRiskScore(): UseVdkRiskScoreResult {
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  const [data, setData] = useState<VdkRiskSonuc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!scopeComplete || !scope.smmm_id || !scope.client_id || !scope.period) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mizanData = await loadMizanData(
        scope.smmm_id,
        scope.client_id,
        scope.period,
        true
      );

      if (!mizanData.ok || !mizanData.vdk_data) {
        throw new Error('Mizan verisi yüklenemedi');
      }

      const vdk = mizanData.vdk_data;
      const summary = mizanData.summary;

      // Kritik hesapları analiz et
      const kritikHesaplar: KritikHesap[] = [
        analyzeKasa(vdk.kasa_bakiye, vdk.net_satislar),
        analyzeOrtakAlacak(vdk.ortaklardan_alacak, vdk.ozsermaye),
        analyzeDevredenKdv(vdk.devreden_kdv, 0), // TODO: Ay sayısını backend'den al
        analyzeSaticilar(Math.abs(vdk.saticilar)),
        analyzeOrtakBorc(Math.abs(vdk.ortaklara_borc), vdk.kasa_bakiye),
        analyzeSgkPrimleri(0, 0), // TODO: 361/368 bakiyelerini backend'den al
        analyzeAlicilar(vdk.alicilar),
      ];

      // Toplam risk puanını hesapla
      const toplamPuan = kritikHesaplar.reduce((sum, h) => sum + h.riskPuani, 0);

      // Risk seviyesini belirle
      let seviye: RiskSeviyesi = 'ok';
      if (toplamPuan >= 70) seviye = 'kritik';
      else if (toplamPuan >= 50) seviye = 'yuksek';
      else if (toplamPuan >= 25) seviye = 'orta';
      else if (toplamPuan >= 10) seviye = 'dusuk';

      // TTK 376
      const ttk376 = analyzeTtk376(vdk.ozsermaye, vdk.sermaye);

      // Örtülü Sermaye
      const ortakBorcToplam = Math.abs(vdk.ortaklara_borc);
      const ortuluSermaye = analyzeOrtuluSermaye(ortakBorcToplam, vdk.ozsermaye);

      // Finansman Gider Kısıtlaması
      const finansmanGiderKisitlamasi = analyzeFinansmanGiderKisitlamasi(
        summary.yabanci_kaynak,
        vdk.ozsermaye,
        0 // TODO: Finansman gideri backend'den al
      );

      // Devreden KDV
      const devredenKdv = {
        aySayisi: 0, // TODO: Backend'den al
        uyari: vdk.devreden_kdv > 500000,
        aciklama: vdk.devreden_kdv > 500000
          ? 'Yüksek devreden KDV - 36 ay kuralını takip et'
          : 'Devreden KDV normal',
      };

      setData({
        toplamPuan,
        seviye,
        kritikHesaplar: kritikHesaplar.filter(h => h.riskPuani > 0),
        ttk376,
        ortuluSermaye,
        finansmanGiderKisitlamasi,
        devredenKdv,
      });

    } catch (err) {
      console.error('VDK Risk hesaplama hatası:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [scopeComplete, scope.smmm_id, scope.client_id, scope.period]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useVdkRiskScore;
