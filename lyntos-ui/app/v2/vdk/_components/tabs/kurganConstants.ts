// KURGAN senaryo için gerekli veri kaynakları - YMM/SMMM için şeffaflık
// ⚠️ GERÇEK VERİ SERVİSLERİ AKTİF
export const SENARYO_VERI_GEREKSINIMLERI: Record<string, {
  gerekli_veriler: string[];
  aciklama: string;
  nasil_yuklerim: string;
  gercek_kaynak?: string;  // Yeni: Gerçek veri kaynağı varsa göster
}> = {
  'KRG-01': {
    gerekli_veriler: ['GİB VUK Md.5 Borçlu Listesi', 'e-Fatura Kayıtlı Mükellefler', 'Tedarikçi VKN Listesi'],
    aciklama: 'Riskli satıcıdan alım kontrolü GİB VUK Md.5 (5M+ TL borçlu) listesi ile yapılır.',
    nasil_yuklerim: 'e-Fatura verisi yüklendiğinde tedarikçi VKN\'leri otomatik GİB borçlu listesiyle karşılaştırılır.',
    gercek_kaynak: 'GİB VUK Md.5 Listesi (Public, %100 Güvenilir)'
  },
  'KRG-02': {
    gerekli_veriler: ['GİB Borçlu Listesi', 'Tedarikçi Zincir Analizi'],
    aciklama: 'Zincirleme riskli alım için 2+ riskli tedarikçi tespit edilmesi gerekir.',
    nasil_yuklerim: 'e-Fatura verisi yüklendiğinde tedarikçiler otomatik sorgulanır.',
    gercek_kaynak: 'GİB VUK Md.5 Listesi (Public, %100 Güvenilir)'
  },
  'KRG-03': {
    gerekli_veriler: ['e-Fatura Listesi', 'Stok Giriş Hareketleri'],
    aciklama: 'Mal akışı tutarsızlığı için fatura ve stok hareketlerinin karşılaştırması yapılır.',
    nasil_yuklerim: 'Veri Yükleme > e-Fatura XML ve Stok Hareketleri Excel yükleyin.'
  },
  'KRG-04': {
    gerekli_veriler: ['153 Ticari Mallar', '620 SMM'],
    aciklama: 'Stok/SMM oranı 2x üzerindeyse şişkinlik riski var.',
    nasil_yuklerim: 'Mizan verisi yüklendiyse otomatik kontrol edilir. 153 ve 620 hesapları kontrol edilir.'
  },
  'KRG-05': {
    gerekli_veriler: ['e-Fatura Adetleri', 'e-İrsaliye Adetleri'],
    aciklama: 'Fatura-irsaliye eşleşme oranı %90 altındaysa sevk belgesi eksikliği riski var.',
    nasil_yuklerim: 'Veri Yükleme > e-Fatura ve e-İrsaliye XML dosyalarını yükleyin.'
  },
  'KRG-06': {
    gerekli_veriler: ['100 Kasa', '102 Bankalar', 'Nakit Ödeme Detayları'],
    aciklama: '7.000 TL üstü nakit ödemeler VUK 257/7 tevsik zorunluluğu kapsamında.',
    nasil_yuklerim: 'Mizan verisi yüklendiyse 100 ve 102 hesaplardan kontrol edilir.'
  },
  'KRG-07': {
    gerekli_veriler: ['Cari Hesap Ekstreleri', '120/320 Mutabakatları'],
    aciklama: 'Aynı firma ile hem alacak hem borç varsa karşılıklı ödeme döngüsü riski.',
    nasil_yuklerim: 'Cari hesap mutabakat raporlarını yükleyin.'
  },
  'KRG-08': {
    gerekli_veriler: ['Gelir Tablosu', 'GİB Sektör İstatistikleri (NACE Bazlı)'],
    aciklama: 'Kâr marjı sektör ortalamasından %50 düşükse anomali riski. Sektör verileri GİB istatistiklerinden alınır.',
    nasil_yuklerim: 'Mizan yüklüyse ve NACE kodu varsa GİB sektör istatistiklerinden otomatik kontrol edilir.',
    gercek_kaynak: 'GİB NACE Sektör İstatistikleri (Public, %90 Güvenilir)'
  },
  'KRG-09': {
    gerekli_veriler: ['Ortak/Yönetici Beyan Gelirleri', 'Yaşam Standardı Verileri'],
    aciklama: 'Bu kontrol ortak/yönetici kişisel varlık bilgisi gerektirir.',
    nasil_yuklerim: 'Manuel değerlendirme gerektirir. Sistem bu veriyi otomatik toplayamaz.'
  },
  'KRG-10': {
    gerekli_veriler: ['KDV Beyannamesi', 'e-Fatura KDV Toplamları'],
    aciklama: 'KDV beyanı ile e-fatura toplamları karşılaştırılır.',
    nasil_yuklerim: 'Veri Yükleme > KDV Beyanname XML ve e-Fatura listesi yükleyin.'
  },
  'KRG-11': {
    gerekli_veriler: ['KDV İade Talebi', '191 İndirilecek KDV'],
    aciklama: 'KDV iade talebi indirilecek KDV\'nin %50\'sini aşarsa risk.',
    nasil_yuklerim: 'KDV iade başvuru verilerini yükleyin.'
  },
  'KRG-12': {
    gerekli_veriler: ['GİB Riskli Liste', 'Şüpheli Fatura Analizi', 'Belge Tutarsızlıkları'],
    aciklama: 'Çoklu indikatörlere bakılır: riskli tedarikçi, şüpheli fatura, belge tutarsızlığı.',
    nasil_yuklerim: 'GİB riskli liste, e-fatura ve e-irsaliye verilerini yükleyin.'
  },
  'KRG-13': {
    gerekli_veriler: ['131/231/331/431 Hesaplar', 'Ciro Bilgisi'],
    aciklama: 'İlişkili kişi işlem tutarı cironun %25\'ini aşarsa transfer fiyatlandırması riski.',
    nasil_yuklerim: 'Mizan verisi yüklendiyse ortaklarla ilişkili hesaplardan kontrol edilir.'
  },
  'KRG-14': {
    gerekli_veriler: ['Geçmiş Dönem Beyannameleri (3+ yıl)'],
    aciklama: 'Art arda 3+ dönem zarar beyanı sürekli zarar riski oluşturur.',
    nasil_yuklerim: 'Son 3 yılın kurumlar vergisi beyannamelerini yükleyin.'
  },
  'KRG-15': {
    gerekli_veriler: ['Toplam Vergi Beyanları', 'Ciro', 'GİB Sektör Vergi Yükü (NACE Bazlı)'],
    aciklama: 'Vergi yükü sektör ortalamasının %50 altındaysa düşük vergi yükü riski. Sektör vergi yükü GİB istatistiklerinden alınır.',
    nasil_yuklerim: 'Mizan ve beyanname verileri yüklendiyse GİB sektör verileriyle otomatik karşılaştırılır.',
    gercek_kaynak: 'GİB NACE Sektör İstatistikleri (Public, %90 Güvenilir)'
  },
  'KRG-16': {
    gerekli_veriler: ['Ortak/Yönetici Listesi', 'GİB VUK Md.5 Borçlu Listesi', 'MERSIS Şirket Bilgileri'],
    aciklama: 'Ortak veya yöneticilerin GİB VUK Md.5 borçlu listesinde olup olmadığı kontrol edilir.',
    nasil_yuklerim: 'Ortak/yönetici TC kimlik numaraları sisteme girildiğinde otomatik GİB sorgulama yapılır.',
    gercek_kaynak: 'GİB VUK Md.5 + MERSIS (Public + Tekil Sorgulama)'
  },
};
