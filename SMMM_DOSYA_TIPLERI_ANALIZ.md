# LYNTOS - SMMM Dosya Tipleri Kapsamlı Analiz

Bu döküman, Q1.zip dosyasının detaylı analizine dayanarak SMMM'lerin yüklediği tüm dosya tiplerini, muhasebe mantığını ve parse gereksinimlerini belgelemektedir.

## 📁 Q1.zip İçeriği Özeti

| Kategori | Dosya Sayısı | Format | Parse Durumu |
|----------|--------------|--------|--------------|
| Mizan | 1 | XLSX | ✅ Hazır |
| Banka Ekstreleri | 9 | CSV | ❌ Gerekli |
| KDV Beyannameleri | 3 | PDF | ⚠️ Opsiyonel |
| Muhtasar Beyannameleri | 3 | PDF | ⚠️ Opsiyonel |
| Geçici Vergi Beyannamesi | 1 | PDF | ⚠️ Opsiyonel |
| Poşet Beyannamesi | 1 | PDF | ⚠️ Opsiyonel |
| Tahakkuk Fişleri | 8 | PDF | ⚠️ Opsiyonel |
| Yevmiye Defteri | 1 | XLSX | ❌ Gerekli |
| Defteri Kebir | 1 | XLSX | ❌ Gerekli |
| E-Defter Paketleri | 3 klasör | XML/ZIP | ❌ Gerekli |

---

## 1. 📊 MİZAN (Trial Balance)

### Dosya: `özkan kırtasiye mizan.xlsx`

### Muhasebe Mantığı
Mizan, belirli bir dönemdeki tüm hesapların borç ve alacak toplamlarını gösteren özet tablodur. SMMM'ler için en kritik belgedir çünkü:
- Dönem sonu mali durumu gösterir
- Bilanço ve gelir tablosunun temelidir
- VDK (Vergi Denetim Kurulu) risk analizinin ana girdisidir

### Yapı
```
Header satırı: 6 (0-indexed: 5)
Sütunlar:
- HESAP KODU: Tek Düzen Hesap Planı kodu (100, 100.01, 102.01 vb.)
- HESAP ADI: Hesap açıklaması
- PARA_BIRIMI: TL
- BORC: Dönem borç toplamı
- ALACAK: Dönem alacak toplamı
- BORC BAKİYESİ: Net borç bakiye (borç > alacak ise)
- ALACAK BAKİYESİ: Net alacak bakiye (alacak > borç ise)

Toplam satır: 948
```

### Hesap Kodu Hiyerarşisi
- 1 haneli: Ana grup (1=Dönen Varlık, 2=Duran Varlık, 3=Kısa Vade Borç, 4=Uzun Vade Borç, 5=Özkaynaklar, 6=Gelir/Gider, 7=Maliyet)
- 2 haneli: Alt grup (10=Hazır Değerler, 12=Ticari Alacaklar vb.)
- 3 haneli: Hesap (100=Kasa, 102=Bankalar, 320=Satıcılar vb.)
- 6+ haneli: Alt hesap (100.01=Nakit Kasa TL, 102.01=YKB Hesabı vb.)

### Parse Gereksinimleri
- [x] Excel okuma (pandas)
- [x] Header satırını bul (HESAP KODU içeren satır)
- [x] Türkçe sayı formatı (3.456.789,12)
- [x] Grup satırlarını atla (1-2 haneli kodlar)
- [x] TOPLAM satırlarını atla

---

## 2. 🏦 BANKA EKSTRELERİ (Bank Statements)

### Dosyalar
```
Q1 102.01 YKB 01.csv         - Yapı Kredi Ocak
Q1 102.01 YKB 1-2-3.csv      - Yapı Kredi Q1 birleşik
Q1 102.02 AKBANK 1-2-3.csv   - Akbank Q1
Q1 102.04 HALKBANK 1-2-3.csv - Halkbank Q1
Q1 102.09 ZİRAATBANK 1-2-3.csv - Ziraat Bankası Q1
Q1 102.15 ALBARAKA 1-2-3.csv - Albaraka Q1
Q1 102.19 ziraat 01.csv      - Ziraat POS Ocak
Q1 102.19 ziraat 02.csv      - Ziraat POS Şubat
Q1 102.19 ziraat 03.csv      - Ziraat POS Mart
```

### Dosya Adı Formatı
```
Q[çeyrek] [hesap_kodu] [banka_adı] [aylar].csv
Örnek: Q1 102.01 YKB 1-2-3.csv
- Q1 = 1. Çeyrek
- 102.01 = Mizan'daki banka alt hesap kodu
- YKB = Yapı Kredi Bankası
- 1-2-3 = Ocak, Şubat, Mart
```

### Muhasebe Mantığı
Banka ekstreleri:
- Nakit akışını takip eder
- Mizan'daki banka bakiyeleriyle mutabakat sağlar
- Muhasebe kayıtlarının doğruluğunu kontrol eder
- VDK analizinde nakit hareketleri incelenir

### Yapı (YKB örneği)
```
Format: CSV, delimiter=';', encoding=windows-1254

Sütunlar:
- Tarih: DD.MM.YYYY
- Aciklama: İşlem açıklaması
- Islem Tutari: +/- tutar (virgül decimal)
- Bakiye: Güncel bakiye

İşlem Tipleri:
- PESIN SATIS: Nakit POS satışı (+)
- TAKSIT SATIS: Taksitli POS satışı (+)
- KATKI PAYI: Banka komisyonu (-)
- UYE ISYERI UCRETI: POS ücreti (-)
- BSMV: Banka vergi kesintisi (-)
- GIDEN EFT/FAST: Giden havale (-)
- GELEN FAST: Gelen havale (+)
```

### Parse Gereksinimleri
- [ ] CSV okuma (delimiter=';')
- [ ] Encoding: windows-1254 veya utf-8-sig
- [ ] Türkçe sayı formatı
- [ ] Hesap kodu dosya adından çıkar
- [ ] Banka adı dosya adından çıkar
- [ ] İşlem tipini açıklamadan çıkar

---

## 3. 📋 BEYANNAMELER (Tax Declarations) - PDF

### KDV Beyannamesi (VAT Return)
```
Dosyalar:
- Q1 OZKAN KIRT_OCAK_KDV(AYLIK).xml_BYN.pdf
- Q1 OZKAN KIRT_SUBAT_KDV(AYLIK).xml_BYN.pdf
- Q1 OZKAN KIRT_MART_KDV(AYLIK).xml_BYN.pdf

Dosya Adı Formatı:
Q[çeyrek] [şirket]_[ay]_KDV(AYLIK).xml_BYN.pdf
```

### Muhtasar Beyanname (Withholding Tax)
```
Dosyalar:
- Q1 OZKAN KIRT_OCAK_Muhtasar(AYLIK).xml_BYN.pdf
- Q1 OZKAN KIRT_SUBAT_Muhtasar(AYLIK).xml_BYN.pdf
- Q1 OZKAN KIRT_MART_Muhtasar(AYLIK).xml_BYN.pdf

İçerik: SGK primleri, stopajlar, personel bilgileri
```

### Geçici Vergi Beyannamesi (Quarterly Corporate Tax)
```
Dosya: Q1 OZKAN KIRT_MART_KGecici(UC_AYLIK).xml_BYN (1).pdf
Periyot: 3 aylık (Q1, Q2, Q3, Q4)
İçerik: Kurumlar/Gelir vergisi ön ödemesi
```

### Poşet Beyannamesi (Plastic Bag Declaration)
```
Dosya: Q1 OZKAN KIRT_OCAK_Poset(UC_AYLIK).xml_BYN.pdf
İçerik: Plastik poşet vergisi
```

### Muhasebe Mantığı
Beyannameler GİB'e (Gelir İdaresi Başkanlığı) sunulan resmi vergi bildirimleridir:
- KDV: Satışlardan hesaplanan KDV - Alışlardan indirilecek KDV = Ödenecek/Devreden KDV
- Muhtasar: Personel maaşlarından kesilen gelir vergisi stopajı
- Geçici Vergi: Çeyreklik kurumlar vergisi ön ödemesi

### Parse Gereksinimleri (Opsiyonel)
PDF'lerden veri çekme zor ve hata eğilimli olduğundan şimdilik opsiyonel:
- [ ] PDF metin çıkarma
- [ ] Tablo yapısını tanıma
- [ ] Anahtar değerleri çıkarma (matrah, vergi tutarı vb.)

---

## 4. 📄 TAHAKKUK FİŞLERİ (Tax Assessment Receipts) - PDF

### Dosyalar (*_THK.pdf)
```
- Q1 OZKAN KIRT_OCAK_KDV(AYLIK).xml_THK.pdf
- Q1 OZKAN KIRT_SUBAT_KDV(AYLIK).xml_THK.pdf
- Q1 OZKAN KIRT_MART_KDV(AYLIK).xml_THK.pdf
- Q1 OZKAN KIRT_OCAK_Muhtasar(AYLIK).xml_THK.pdf
- Q1 OZKAN KIRT_SUBAT_Muhtasar(AYLIK).xml_THK.pdf
- Q1 OZKAN KIRT_MART_Muhtasar(AYLIK).xml_THK.pdf
- Q1 OZKAN KIRT_OCAK_Poset(UC_AYLIK).xml_THK.pdf
- Q1 OZKAN KIRT_MART_KGecici(UC_AYLIK).xml_THK (1).pdf
```

### Muhasebe Mantığı
Tahakkuk fişi, vergi dairesinin beyanname üzerine düzenlediği ödeme belgesidir:
- Ödenecek vergi tutarı
- Vade tarihi
- Gecikme faizi hesaplaması için referans

### Parse Gereksinimleri (Opsiyonel)
- [ ] PDF'den tutar ve vade çıkarma

---

## 5. 📒 YEVMİYE DEFTERİ (Journal/Day Book) - XLSX

### Dosya: `Q1 yevmiye_defteri_ozkan_kirt.xlsx`

### Muhasebe Mantığı
Yevmiye defteri, tüm muhasebe kayıtlarının kronolojik sırayla tutulduğu ana defterdir:
- Her işlem bir "fiş" olarak kaydedilir
- Her fiş birden fazla satır içerir (borç ve alacak)
- Her fişte toplam borç = toplam alacak olmalıdır
- E-Defter zorunluluğu olan firmalar için resmi kayıt

### Yapı
```
Header satırı: 5 (satır 6)
Satır sayısı: 48,446

Sütunlar:
- Fiş bilgisi satırı: "00001-----00001-----AÇILIŞ-----01/01/2025"
- HESAP KODU: 100, 100.01 vb.
- HESAP ADI: Hesap açıklaması
- AÇIKLAMA: İşlem açıklaması (MF xxxx = Muhasebe Fişi)
- DETAY: Alt hesap detayı
- BORÇ: Borç tutarı
- ALACAK: Alacak tutarı
```

### Fiş Yapısı
```
Fiş header: 00001-----00001-----AÇILIŞ-----01/01/2025
            [fiş_no]--[madde_no]--[açıklama]--[tarih]

Fiş satırları:
100       KASA                           71917.64  (BORÇ)
100.01    NAKİT KASASI TL  MF xxxxx                71917.64 (Detay)
102       BANKALAR                       3486593.46 (BORÇ)
102.01    YAPIKREDİ        MF xxxxx      114738.45  (Detay)
...
```

### Parse Gereksinimleri
- [ ] Excel okuma
- [ ] Fiş header satırlarını tanı (-----pattern)
- [ ] Fiş numarası, tarih çıkar
- [ ] Her satır için hesap kodu, borç, alacak
- [ ] Detay satırlarını ana hesaba bağla

---

## 6. 📗 DEFTERİ KEBİR (General Ledger) - XLSX

### Dosya: `Q1 defteri_kebir_ozkan_kirt.xlsx`

### Muhasebe Mantığı
Defteri kebir, her hesabın ayrı ayrı hareketlerini gösteren defterdir:
- Hesap bazında borç/alacak hareketleri
- Kümülatif bakiye takibi
- Mizan'ın detay kaynağı

### Yapı
```
Header satırı: 0
Satır sayısı: 14,614

Sütunlar:
- KEBİR HESAP: Ana hesap kodu (100, 102, vb.)
- [Hesap Adı]: KASA, BANKALAR vb.
- TARİH: İşlem tarihi
- MADDE NO: Yevmiye madde numarası
- FİŞ NO: Muhasebe fiş numarası
- EVRAK NO: Belge numarası
- EVRAK TARİHİ: Belge tarihi
- HESAP KODU: Alt hesap kodu (100.01 vb.)
- HESAP ADI: Alt hesap adı
- AÇIKLAMA: İşlem açıklaması
- BORÇ: Borç tutarı
- ALACAK: Alacak tutarı
- BAKİYE: Kümülatif bakiye
- [B/A]: Bakiye yönü (B=Borç, A=Alacak)
```

### Parse Gereksinimleri
- [ ] Excel okuma
- [ ] Hesap gruplaması
- [ ] Hareket detayları
- [ ] Bakiye kontrolü

---

## 7. 📂 E-DEFTER PAKETLERİ (E-Ledger Packages) - XML

### Klasörler
```
Q1 E DEFTER 01/  (Ocak 2025)
Q1 E DEFTER 02/  (Şubat 2025)
Q1 E DEFTER 03/  (Mart 2025)
```

### Dosya Tipleri ve Adlandırma
```
Format: [VKN]-[YYYYMM]-[TİP]-[SIRA].xml

VKN: 0480525636 (Vergi Kimlik Numarası)
YYYYMM: 202501 (Yıl-Ay)
TİP:
  - Y  = Yevmiye Defteri (~10 MB)
  - K  = Kebir Defteri (~9 MB)
  - YB = Yevmiye Beratı (~22 KB) - GİB onay belgesi
  - KB = Kebir Beratı (~21 KB) - GİB onay belgesi
  - DR = Defter Raporu (~87 KB) - Özet rapor

GIB- öneki: GİB tarafından imzalanmış versiyon
```

### Muhasebe Mantığı
E-Defter, Türkiye'de belirli ciroya sahip firmaların tutması zorunlu elektronik defterdir:
- GİB sistemine yüklenir
- Mali mühür ile imzalanır
- Berat = GİB'in onay belgesi
- Yasal defter niteliğindedir

### XML Yapısı (XBRL GL Standardı)
```xml
<edefter:defter>
  <xbrli:xbrl>
    <gl-cor:accountingEntries>
      <gl-cor:entityInformation>
        <!-- Şirket bilgileri -->
        <organizationIdentifier>ALANYA OZKAN...</organizationIdentifier>
        <xbrli:identifier>0480525636</xbrli:identifier>
      </gl-cor:entityInformation>

      <gl-cor:entryHeader>
        <!-- Fiş başlığı -->
        <gl-cor:entryNumber>00001</gl-cor:entryNumber>
        <gl-cor:enteredDate>2025-01-01</gl-cor:enteredDate>

        <gl-cor:entryDetail>
          <!-- Fiş satırı -->
          <gl-cor:lineNumber>1</gl-cor:lineNumber>
          <gl-cor:account>
            <gl-cor:accountMainID>100</gl-cor:accountMainID>
            <gl-cor:accountSubID>100.01</gl-cor:accountSubID>
          </gl-cor:account>
          <gl-cor:amount>71917.64</gl-cor:amount>
          <gl-cor:debitCreditCode>D</gl-cor:debitCreditCode>
        </gl-cor:entryDetail>
      </gl-cor:entryHeader>
    </gl-cor:accountingEntries>
  </xbrli:xbrl>
</edefter:defter>
```

### Parse Gereksinimleri
- [ ] XML namespace handling
- [ ] entryHeader -> fiş
- [ ] entryDetail -> satır
- [ ] accountMainID, accountSubID
- [ ] amount, debitCreditCode (D/C)
- [ ] Berat dosyalarından onay bilgisi

---

## 8. 🎯 PARSE ÖNCELİK SIRASI

### Kritik (Hemen Yapılmalı)
1. **Mizan** ✅ - VDK analizinin temeli
2. **Banka Ekstreleri** - Nakit akış analizi, mutabakat

### Önemli (Kısa Vadede)
3. **Yevmiye Defteri** - İşlem detayları
4. **Defteri Kebir** - Hesap hareketleri
5. **E-Defter XML** - Resmi kayıtlar

### Opsiyonel (İlerleyen Dönemde)
6. **Beyanname PDF** - Vergi tutarları
7. **Tahakkuk PDF** - Ödeme bilgileri

---

## 9. 📋 VERİTABANI TABLOLARI ÖNERİSİ

### Mevcut Tablolar
- `mizan_entries` ✅

### Önerilen Yeni Tablolar
```sql
-- Banka hareketleri
CREATE TABLE bank_transactions (
    id INTEGER PRIMARY KEY,
    tenant_id TEXT,
    client_id TEXT,
    period_id TEXT,
    hesap_kodu TEXT,        -- 102.01, 102.02 vb.
    banka_adi TEXT,         -- YKB, AKBANK vb.
    tarih DATE,
    aciklama TEXT,
    islem_tipi TEXT,        -- POS_SATIS, EFT, KOMISYON vb.
    tutar REAL,             -- +/-
    bakiye REAL,
    source_file TEXT,
    created_at TIMESTAMP
);

-- Yevmiye fişleri
CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY,
    tenant_id TEXT,
    client_id TEXT,
    period_id TEXT,
    fis_no TEXT,
    madde_no TEXT,
    tarih DATE,
    aciklama TEXT,
    hesap_kodu TEXT,
    hesap_adi TEXT,
    borc REAL,
    alacak REAL,
    source_file TEXT,
    created_at TIMESTAMP
);

-- E-Defter kayıtları
CREATE TABLE edefter_entries (
    id INTEGER PRIMARY KEY,
    tenant_id TEXT,
    client_id TEXT,
    period_id TEXT,
    vkn TEXT,
    donem TEXT,             -- 202501
    defter_tipi TEXT,       -- Y, K
    fis_no TEXT,
    satir_no INTEGER,
    tarih DATE,
    hesap_kodu TEXT,
    hesap_adi TEXT,
    tutar REAL,
    borc_alacak TEXT,       -- D/C
    belge_no TEXT,
    belge_tarihi DATE,
    source_file TEXT,
    created_at TIMESTAMP
);
```

---

## 10. 🔄 DOSYA TİPİ TANIMA KURALLARI

```python
DOC_PATTERNS_ORDERED = [
    # En spesifik önce
    ("MIZAN", [r"mizan", r"MİZAN"]),
    ("YEVMIYE", [r"yevmiye_defteri", r"yevmiye"]),
    ("KEBIR", [r"defteri_kebir", r"kebir"]),
    ("POSET", [r"poset", r"Poset"]),
    ("GECICI_VERGI", [r"KGecici", r"gecici"]),
    ("BEYANNAME", [r"_BYN\.pdf", r"BYN"]),
    ("TAHAKKUK", [r"_THK\.pdf", r"THK"]),
    ("BANKA", [r"102\.", r"YKB", r"AKBANK", r"HALKBANK", r"ZİRAAT", r"ALBARAKA"]),
    ("EDEFTER", [r"E.?DEFTER", r"\d{10}-\d{6}-[YKD]"]),
]
```

---

## 11. 🚀 SONRAKI ADIMLAR

1. **Banka parser'ı yaz** - CSV formatını parse et
2. **Yevmiye parser'ı yaz** - Excel formatını parse et
3. **Kebir parser'ı yaz** - Excel formatını parse et
4. **E-Defter parser'ı yaz** - XML formatını parse et
5. **Veritabanı tablolarını oluştur**
6. **Upload endpoint'i genişlet**
7. **Frontend'de yeni dosya tiplerini göster**

---

*Bu döküman, gerçek Q1.zip dosyasının analizi sonucunda oluşturulmuştur.*
*Tarih: 2026-01-22*
