import {
  Wallet,
  Building2,
  TrendingUp,
  Target,
} from 'lucide-react';

export const VDK_RISK_KRITERLERI = {
  KASA_AKTIF_ORANI: {
    kod: 'K-09',
    baslik: 'Kasa/Aktif Oranı',
    esik_uyari: 5,
    esik_kritik: 15,
    mevzuat: 'VDK Risk Analiz Kriterleri',
    aciklama: 'Yüksek kasa bakiyesi kayıt dışı gelir şüphesi oluşturur',
    oneri: 'Kasa bakiyesini bankaya aktarın, kasa sayım tutanağı düzenleyin',
  },
  ORTAKLARDAN_ALACAK: {
    kod: 'TF-01',
    baslik: 'Ortaklardan Alacaklar / Sermaye',
    esik_uyari: 10,
    esik_kritik: 25,
    mevzuat: 'KVK 13 (Transfer Fiyatlandırması), TTK 358 (Borçlanma Yasağı)',
    aciklama: 'Ortağa verilen borç örtülü kazanç dağıtımı sayılabilir',
    oneri: 'Adat faizi hesaplayın (TCMB reeskont), Transfer Fiyatlandırması Formu doldurun',
  },
  ORTULU_SERMAYE: {
    kod: 'OS-01',
    baslik: 'İlişkili Kişi Borcu / Özkaynak',
    esik_uyari: 2,
    esik_kritik: 3,
    mevzuat: 'KVK 12 (Örtülü Sermaye)',
    aciklama: 'İlişkili kişilerden alınan borçların özkaynak 3 katını aşan kısmı örtülü sermaye',
    oneri: 'Örtülü sermaye faizleri KKEG yapın, Vergi düzeltmesi gerekebilir',
  },
  SUPHELI_ALACAK: {
    kod: 'SA-01',
    baslik: 'Tahsilat Süresi (Gün)',
    esik_uyari: 90,
    esik_kritik: 365,
    mevzuat: 'VUK 323 (Şüpheli Alacaklar)',
    aciklama: '1 yılı aşan alacaklar için karşılık ayrılmalı',
    oneri: 'Alacak yaşlandırma analizi yapın, VUK 323 şartlarını kontrol edin',
  },
  STOK_DEVIR: {
    kod: 'SD-01',
    baslik: 'Stok Devir Süresi (Gün)',
    esik_uyari: 120,
    esik_kritik: 365,
    mevzuat: 'VUK 274-278 (Stok Değerlemesi)',
    aciklama: 'Düşük devir hızı değer düşüklüğü veya fiktif stok göstergesi',
    oneri: 'Stok sayımı yapın, değer düşüklüğü karşılığı değerlendirin',
  },
};

export const ORAN_KATEGORILERI = {
  LIKIDITE: {
    baslik: 'Likidite Oranları',
    aciklama: 'Kısa vadeli borç ödeme gücü',
    icon: Wallet,
    renk: 'blue',
  },
  MALI_YAPI: {
    baslik: 'Mali Yapı Oranları',
    aciklama: 'Finansal kaldıraç ve sermaye yapısı',
    icon: Building2,
    renk: 'purple',
  },
  FAALIYET: {
    baslik: 'Faaliyet Oranları',
    aciklama: 'Varlık kullanım etkinliği',
    icon: TrendingUp,
    renk: 'green',
  },
  KARLILIK: {
    baslik: 'Karlılık Oranları',
    aciklama: 'Kazanç yaratma kapasitesi',
    icon: Target,
    renk: 'amber',
  },
};

export const MIZAN_SMMM_INFO = {
  title: 'Mizan Analizi - YMM Seviyesi',
  description: 'VDK Risk Kriterleri ve Big 4 Denetim Standartları',
  context: [
    'Mizan, işletmenin tüm hesaplarının dönem sonu bakiyelerini gösterir.',
    'Denge Kontrolü: Toplam Borç = Toplam Alacak (temel muhasebe kuralı)',
    'VDK-RAM sistemi bu verileri otomatik analiz eder ve risk puanı üretir.',
    'Kritik hesaplar: 100 Kasa, 120 Alıcılar, 131 Ortaklardan Alacaklar, 153 Stoklar.',
  ],
  vdkKriterleri: [
    { kod: 'K-09', aciklama: 'Kasa/Aktif oranı >%15 ise inceleme riski' },
    { kod: 'TF-01', aciklama: 'Ortaklardan alacaklar örtülü kazanç riski' },
    { kod: 'OS-01', aciklama: 'İlişkili kişi borcu/özkaynak >3x örtülü sermaye' },
    { kod: 'SA-01', aciklama: '1 yılı aşan alacaklar şüpheli alacak riski' },
  ],
  actions: [
    'VDK risk kriterlerini öncelikli kontrol edin',
    'Kritik hesaplarda adat hesabı yapın (131, 231, 331)',
    'Transfer Fiyatlandırması Formunu hazırlayın',
    'Şüpheli alacak karşılıklarını değerlendirin',
  ],
};
