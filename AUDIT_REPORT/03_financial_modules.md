# LYNTOS Mali Hesaplama Modulleri - Teknik Denetim Raporu

**Tarih:** 2026-02-09
**Kapsam:** `/Users/cemsak/lyntos/backend/` altindaki tum mali hesaplama modulleri
**Hazirlayan:** Claude Opus 4.6 - Kod Denetim Araci

---

## 1. GECICI VERGI HESAPLAMA MODULU

**Dosya:** `/Users/cemsak/lyntos/backend/services/quarterly_tax_calculator.py`

### 1.1 Formuller / Algoritmalar

| Ceyrek | Yillik Tahmin Formulu | Aciklama |
|--------|----------------------|----------|
| Q1 | Kar(Q1) x 4 | 1 ceyrek x 4 = yillik tahmin |
| Q2 | (Kar(Q1) + Kar(Q2)) x 2 | 2 ceyrek x 2 = yillik tahmin |
| Q3 | (Kar(Q1) + Kar(Q2) + Kar(Q3)) x 1.33 | 3 ceyrek x 4/3 = yillik tahmin |

- Gecici vergi = Yillik tahmin x Vergi Orani
- Odenecek = max(0, Hesaplanan vergi - Onceki odemeler)
- `project_year_end()` ile yil sonu kurumlar vergisi projeksiyonu yapilabilir

### 1.2 Vergi Oranlari

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| TAX_RATE | %25 | **HARDCODED** (sinif degiskeni) |

**SORUN:** Vergi orani `TAX_RATE = 0.25` olarak sinif icinde hardcoded. `config/economic_rates.json` veya `tax_parameters` tablosundan okunmuyor. Ihracat (%20) ve uretim (%24) indirimli oranlari desteklemiyor.

### 1.3 Mevzuat Referansi

- 5520 Sayili KVK Madde 32 (docstring'de belirtilmis)
- `legal_basis_refs: ["SRC-0023"]` (dataclass'ta)
- GVK Mukerrer 120 (cross_check_engine icerisinde referans)

### 1.4 EKSIK Hesaplamalar

| Eksik Ozellik | Oncelik | Aciklama |
|---------------|---------|----------|
| KKEG eklenmesi | KRITIK | Gecici vergi matrahinda KKEG hesaba katilmiyor (`tax_base = max(0, annual_estimate)` - yorumda "gecmis zarar simdilik 0" yazilmis) |
| Gecmis donem zarar mahsubu | YUKSEK | `tax_base` hesabinda zarar dusulmuyor, kodda "simdilik 0" notu var |
| Istisna kazanc indirimi | YUKSEK | Istirak kazanci istisnasi, ihracat kazanc istisnasi vb. yok |
| Indirimli KV oranlari | ORTA | Ihracat (%20), uretim (%24) oranlari desteklenmiyor |
| Asgari kurumlar vergisi | KRITIK | KVK md.32/C - %10 asgari KV hesaplamasi tamamen eksik |
| Finansman gider kisitlamasi | YUKSEK | KVK 11/1-i KKEG etkisi gecici vergiye yansitilmiyor |

---

## 2. KURUMLAR VERGISI HESAPLAMA MODULU

**Dosya:** `/Users/cemsak/lyntos/backend/services/corporate_tax_calculator.py`

### 2.1 Formuller / Algoritmalar

Tam beyanname sureci modellenmeye calisilmis (7 adim):

1. **Ticari Kar** - Gelir tablosundan donem kari/zarari
2. **Mali Kar** - Ticari kar + KKEG - Istisna kazanclar - Gecmis donem zarari
3. **Indirimler** - R&D, yatirim, bagis, sponsorluk
4. **Matrah** - max(0, Mali Kar - Toplam Indirim)
5. **Hesaplanan Vergi** - Matrah x %25
6. **Mahsuplar** - Gecici vergi + Yurtdisi vergi
7. **Odenecek/Iade** - Hesaplanan vergi - Toplam mahsup

KKEG alt kalemleri (`_calculate_kkeg`):
- Ortulu sermaye faizi (KVK md.12)
- Ortulu kazanc dagitimi (KVK md.13)
- Karsilik giderleri (asan kisim)
- Para cezalari
- MTV gideri

### 2.2 Vergi Oranlari

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| VERGI_ORANI | %25 | **HARDCODED** (sinif degiskeni) |
| R_AND_D_MAX_RATE | %100 | **HARDCODED** |

**SORUN:** Oranlar sinif degiskeni olarak hardcoded. Oran degisikliklerinde kod degisikligi gerekiyor. `seed_tax_params.py` scriptinde ihracat indirimi (%5), uretim indirimi (%1), asgari KV (%10) tanimlanmis ama hesaplayici bunlari KULLANMIYOR.

### 2.3 Mevzuat Referansi

- 5520 Sayili KVK (genel kaynak)
- KVK Madde 32 (vergi orani)
- GVK Gecici 61 (R&D indirimi)
- KVK Madde 11 (KKEG - kodda yorum)
- Maliye Bakanligi teblligleri (genel)

### 2.4 EKSIK Hesaplamalar

| Eksik Ozellik | Oncelik | Aciklama |
|---------------|---------|----------|
| Asgari Kurumlar Vergisi | KRITIK | KVK md.32/C - %10 asgari KV hesaplamasi YOK. `seed_tax_params.py`'da parametre var ama kullanilmiyor |
| Indirimli KV oranlari | YUKSEK | Ihracat kazanci %20, uretim kazanci %24 oranlari desteklenmiyor |
| Uyumlu mukellef indirimi | ORTA | KVK md.32/C - %5 indirim hakki kontrolu yok |
| Zarar mahsubu 5 yil siniri | YUKSEK | Gecmis donem zarari dusulurken 5 yil siniri kontrolu yok |
| Finansman gider kisitlamasi | YUKSEK | KVK 11/1-i - Yabanci kaynak/ozkaynak > 1 ise arastirma gideri KKEG |
| Kontrol edilen yabanci kurum | DUSUK | KVK md.7 - CFC kurallari |
| Istirak kazanci detayi | ORTA | Sadece tek kalem olarak alinmis, detay kosullar kontrol edilmiyor |
| Vergi ongoru senaryolari | DUSUK | `generate_forecast` fonksiyonu cok basit trend analizi kullaniyor |

---

## 3. KDV HESAPLAMA

**Durum:** Bagimsiz bir KDV hesaplama modulu MEVCUT DEGIL.

KDV ile ilgili islemler dagitik durumda:
- `cross_check_engine.py` - KDV matrah mutabakati (Mizan 600 vs KDV Beyanname)
- `api/v2/beyanname_kdv.py` - KDV beyanname veri gosterimi
- `data_engine/beyanname_parser.py` - KDV beyanname PDF parse
- `risk_model/v1_engine.py` - KDV metrik ozeti (matrah, hesaplanan, indirilecek)

### 3.1 KDV Matrah Formulu (cross_check_engine'de)

```
KDV Matrahi = Mizan 600 (Net Satislar)
            - Mizan 601 (Ihracat / Yurtdisi Satislar)
            - Mizan 602 (Istisna Satislar)
```

### 3.2 Vergi Oranlari

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| KDV Orani | %1, %10, %20 | `v1_rule_engine.py` DEFAULT_CONFIG icinde (`"kdv": {"1": 0.01, "10": 0.10, "20": 0.20}`) |
| KDV Genel Oran | %20 | `kurgan_calculator.py` CEZA_ORANLARI icinde hardcoded |

### 3.3 EKSIK Hesaplamalar

| Eksik Ozellik | Oncelik | Aciklama |
|---------------|---------|----------|
| KDV beyanname hesaplama motoru | KRITIK | Hesaplanan KDV - Indirilecek KDV = Odenecek/Devreden formulu yok |
| KDV iade hesaplayici | YUKSEK | Ihracat, yatirim tesvik, diplomatik istisna vb. iade hesabi yok |
| KDV 2 (Sorumlu sifatiyla) | ORTA | Tevkifat hesaplayicisi yok |
| KDV matrah farki kontrolu | ORTA | Matrah artirimi / duzeltme hesabi yok |
| Indirilemeyen KDV tespiti | YUKSEK | VUK / KDVK'ya gore indirilemeyecek KDV tespiti otomatik yapilmiyor |

---

## 4. YENIDEN DEGERLEME / ENFLASYON DUZELTME

**Dosyalar:**
- `/Users/cemsak/lyntos/backend/services/enflasyon_duzeltme.py` - Enflasyon duzeltme anomali tespit + temel motor
- `/Users/cemsak/lyntos/backend/services/yeniden_degerleme.py` - VUK Muk. 298/C surekli yeniden degerleme

### 4.1 Formuller / Algoritmalar

**Enflasyon Duzeltme (enflasyon_duzeltme.py):**
- Anomali tespiti: 698/648/658 hesaplarinda bakiye kontrolu (VUK Gecici 37)
- Parasal olmayan kalem duzeltmesi: bakiye x (katsayi - 1)
- Katsayi = TUFE_bitis / TUFE_baslangic
- Net parasal pozisyon kayip/kazanc hesabi

**Yeniden Degerleme (yeniden_degerleme.py):**
- Yi-UFE katsayisi: bitis_endeks / baslangic_endeks
- MDV artis: bakiye x (katsayi - 1)
- Amortisman artis: amortisman_bakiye x (katsayi - 1)
- Net artis: MDV artis - Amortisman artis
- Muhasebe kaydi: Borc 25x / Alacak 522 (MDV) ve Borc 522 / Alacak 257 (Amortisman)

### 4.2 Vergi Oranlari / Endeksler

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| Yi-UFE endeksleri | 2024-12: 2832.15, 2025-01: 2876.43, ... | `config/economic_rates.json` **(JSON dosyasindan)** |
| KV orani (vergi etkisi) | %25 | **HARDCODED** (`kv_orani = 0.25`) |
| Yedek Yi-UFE | 1258.43 / 1305.67 | **HARDCODED** (enflasyon_duzeltme.py icinde fallback) |

**OLUMLU:** Yi-UFE endeksleri `economic_rates.json` konfigurasyonundan okunuyor. TUiK resmi verileri gerektiren uyari mevcut.

### 4.3 Mevzuat Referansi

- VUK Gecici Madde 37 (2025-2027 enflasyon duzeltmesi ertelenmesi)
- VUK Mukerrer Madde 298/C (Surekli Yeniden Degerleme)
- VUK Madde 313 (Arazi amortismana tabi degil)
- TDHP: 250-255 MDV, 257 Birikmis Amortisman, 522 MDV Yeniden Degerleme Artislari, 698/648/658

### 4.4 EKSIK Hesaplamalar

| Eksik Ozellik | Oncelik | Aciklama |
|---------------|---------|----------|
| MDV edinim tarihi | YUKSEK | Her ATiK icin edinim tarihi ve bireysel katsayi hesabi yok (grup bazinda yapiliyor) |
| Yi-UFE otomatik guncelleme | ORTA | TUiK API entegrasyonu yok, manuel JSON guncelleme gerekli |
| Altin/gumus isletme istisnasi | DUSUK | VUK Gecici 37 istisna kontrolu sadece uyari seviyesinde |
| VUK 298/C %2 vergi | ORTA | Yeniden degerleme artisi uzerinden %2 ozel vergi hesabi yok |

---

## 5. CAPRAZ KONTROL MOTORU

**Dosya:** `/Users/cemsak/lyntos/backend/services/cross_check_engine.py`

### 5.1 Kontrol Listesi (8 ana kontrol)

| ID | Kontrol | Formul |
|----|---------|--------|
| CC-001 | Mizan 600 vs KDV Beyanname Matrah | Matrah = 600 - 601 - 602 |
| CC-002 | Mizan 391 vs KDV Hesaplanan KDV | Direkt karsilastirma |
| CC-003 | Mizan 191 vs KDV Indirilecek KDV | Direkt karsilastirma |
| CC-004 | Mizan 600 vs E-Fatura Toplam | Direkt karsilastirma |
| CC-005 | Mizan 102 vs Banka Ekstre Bakiye | Direkt karsilastirma |
| CC-006 | Muhtasar vs SGK APHB (brut ucret) | Direkt karsilastirma |
| CC-007 | Mizan Kar/Zarar vs Gecici Vergi Matrahi | Gelir - Gider vs GV matrahi |
| CC-008 | Mizan Donem Kari vs KV Matrahi | 590/591 vs KV matrahi |
| TECH-001 | Mizan Denklik | Toplam Borc = Toplam Alacak |

### 5.2 Teknik Kontroller

- **Ters Bakiye:** Tek Duzen Hesap Planina gore 100+ hesap icin beklenen bakiye yonu kontrolu
- **Eksi Hesap:** 100 (Kasa), 102 (Banka), 150-157 (Stok) hesaplarinda negatif bakiye tespiti
- **Mizan Denklik:** Toplam borc = toplam alacak (1 kurus tolerans)

### 5.3 Tolerans Degerleri

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| TOLERANCE_TL | 100 TL | **HARDCODED** |
| TOLERANCE_PERCENT_WARNING | %5 | **HARDCODED** |
| TOLERANCE_PERCENT_ERROR | %10 | **HARDCODED** |
| Muhtasar/SGK tolerans | %2 | **HARDCODED** |

### 5.4 Mevzuat Referansi

- VUK 175, 177 (Mizan denklik, hesap plani)
- VUK 227 (Mizan vs Beyanname)
- VUK 219 (Banka mutabakat)
- VUK 359 (Sahte belge / eksi kasa)
- KDV Kanunu (391/191 kontrolu)
- KDV Kanunu Md. 29 (Indirilecek KDV)
- GVK 94, 5510 SK 86 (Muhtasar/SGK)
- GVK Muk. 120, KVK 32 (Gecici vergi)
- KVK 6, 10, 32 (Kurumlar vergisi)

### 5.5 EKSIK Kontroller

| Eksik Ozellik | Oncelik | Aciklama |
|---------------|---------|----------|
| E-Fatura detay eslestirme | YUKSEK | Fatura bazinda eslestirme yok, sadece toplam karsilastirma |
| Banka sub-hesap eslestirme | ORTA | 102.01, 102.02 vb. alt hesap bazinda ekstre eslestirmesi yok (v1_rule_engine'de var) |
| SGK APHB veri parse | ORTA | SGK APHB parser yok, veri el ile girilmesi gerekiyor |
| Donem bazli trend analizi | DUSUK | Capraz kontrol sonuclarinin donem ustu trendi izlenmiyor |

---

## 6. MIZAN ANALIZ / OMURGA MODULU

**Dosya:** `/Users/cemsak/lyntos/backend/services/mizan_omurga.py`

### 6.1 Analiz Edilen Hesaplar (20+ hesap)

100, 102, 108, 120, 131, 150, 153, 191, 250, 253, 320, 321, 335, 360, 500, 590, 600, 620, 710, 770

### 6.2 Kontrol Esikleri

| Hesap | Kontrol | Esik | Kaynak |
|-------|---------|------|--------|
| 100 Kasa | Ciro orani | %2 | **HARDCODED** (VUK 229 referansi) |
| 102 Banka | Eksi bakiye | < 0 | **HARDCODED** |
| 102 Banka | Yuksek bakiye | > Ciro x %50 | **HARDCODED** |

### 6.3 Icerik

- Her hesap icin: bakiye, ciro orani, esik, durum, uyari, mevzuat referansi
- Finansal oran hesaplama (cari oran, asit-test, borc/ozkaynak vb.)
- Trust score hesaplama (gercek verilere dayali)
- VDK tabanli anomali tespiti

### 6.4 EKSIK Ozellikler

| Eksik Ozellik | Oncelik | Aciklama |
|---------------|---------|----------|
| Sektor bazli esikler | YUKSEK | Tum hesaplarda ayni esik - NACE koduna gore esik degismeli |
| Donem karsilastirmasi | ORTA | Onceki donemle karsilastirma yok |
| 7xx maliyet hesaplari | ORTA | 7xx hesap grubu analizinin detayi sinirli |

---

## 7. DONEM SONU ISLEMLERI

**Dosya:** `/Users/cemsak/lyntos/backend/api/v2/donem_sonu_islem.py`

### 7.1 Amortisman Hesaplama (VUK Md. 315/316)

**Formuller:**
- Yillik amortisman = MDV bakiye x VUK orani
- Donem amortisman = Yillik x Donem carpani (Q1=3/12, Q2=6/12, Q3=9/12, Q4=12/12)
- Yillik amortisman <= Net defter degeri (tamamen amorti kontrolu)

**VUK Amortisman Oranlari:**

| Grup | Oran | Faydali Omur | Kaynak |
|------|------|-------------|--------|
| 252 Binalar | %2 | 50 yil | **HARDCODED** dict |
| 253 Tesis/Makine | %10 | 10 yil | **HARDCODED** dict |
| 254 Tasitlar | %20 | 5 yil | **HARDCODED** dict |
| 255 Demirbaslar | %20 | 5 yil | **HARDCODED** dict |

**SORUN:** Maliye Bakanligi'nin yayinladigi amortisman listesi (400+ kalem) yerine sadece 4 ana grup orani kullaniliyor.

### 7.2 Reeskont Hesaplama (VUK Md. 281/285)

**Formul:** `reeskont = senet_tutari x reeskont_faizi x (kalan_gun / 365)`

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| Reeskont faizi | %55 | `economic_rates.json` **(JSON'dan - OLUMLU)** |
| Tahmini kalan gun | 90 | **HARDCODED** (gercek senet vadesi bilinmiyor) |

**SORUN:** Senet vadesi bilinmedigi icin 90 gun tahmini yapiliyor. Gercek hesaplama icin her senedin vade tarihi gerekli.

### 7.3 Supheli Alacak Karsiligi (VUK Md. 323)

- 120 Alicilar uzerinden yaslandirma analizi (bakiye buyuklugu + ciro orani)
- Risk siniflandirmasi: Yuksek (>100K TL veya >%5 ciro), Orta (>50K veya >%2), Dusuk
- Olmasi gereken karsilik = Yuksek riskli alacaklarin %50'si

**SORUN:** VUK 323 kosullari (dava/icra, protesto, noter ihtar) fiilen kontrol edilemiyor, bakiye buyuklugune gore proxy kullaniliyor.

### 7.4 EKSIK Donem Sonu Islemleri

| Eksik Ozellik | Oncelik | Aciklama |
|---------------|---------|----------|
| Azalan bakiyeler yontemi | ORTA | VUK 316 - Sadece normal amortisman var |
| Kist amortisman | YUKSEK | Yil icinde alinan varliklarda kist donem hesabi yok |
| Dovizli islem degerleme | KRITIK | VUK 280 - Dovizli alacak/borc kur degerleme modulu yok |
| Stok degerleme | YUKSEK | VUK 274 - FIFO/ortalama maliyet stok degerleme yok |
| Kambiyo kar/zarar | ORTA | 646/656 hesaplarina otomatik kambiyo hesabi yok |
| Kidem tazminati karsiligi | ORTA | 372/472 hesap karsiligi hesaplama yok |
| Senet reeskont detay | ORTA | Her senet icin bireysel vade ve reeskont hesabi yok |

---

## 8. KURAL MOTORU / VDK / KURGAN

### 8.1 KURGAN Risk Calculator

**Dosya:** `/Users/cemsak/lyntos/backend/services/kurgan_calculator.py`

**16 KURGAN Senaryosu:**

| ID | Senaryo | Risk Puani | Aksiyon | Mevzuat |
|----|---------|-----------|---------|---------|
| KRG-01 | Riskli Saticidan Alim | 85 | IZAHA_DAVET | VUK 359, 370 |
| KRG-02 | Zincirleme Riskli Alim | 75 | BILGI_ISTEME | VUK 359, KDV Tebligi |
| KRG-03 | Mal/Hizmet Akisi Tutarsizligi | 80 | IZAHA_DAVET | VUK 359, 3/B |
| KRG-04 | Stok-Satis Uyumsuzlugu | 85 | IZAHA_DAVET | VUK 186, 257, 359 |
| KRG-05 | Sevk Belgesi Eksikligi | 70 | BILGI_ISTEME | VUK 230, 359 |
| KRG-06 | Odeme Yontemi Uyumsuzlugu | 75 | BILGI_ISTEME | VUK 232, 234, 359 |
| KRG-07 | Karsilikli Odeme Dongusu | 80 | IZAHA_DAVET | VUK 359, KVK 13 |
| KRG-08 | Sektorel Karlilik Anomalisi | 65 | TAKIP | VUK 134, KVK 6 |
| KRG-09 | Beyan-Yasam Standardi Uyumsuzlugu | 70 | BILGI_ISTEME | VUK 134, GVK 30 |
| KRG-10 | KDV Beyan-Fatura Uyumsuzlugu | 85 | IZAHA_DAVET | KDVK 29, VUK 341, 344 |
| KRG-11 | Riskli KDV Iade Talebi | 90 | INCELEME | KDVK 32, KDV Tebligi |
| KRG-12 | Sahte Belge Suphesi | 95 | INCELEME | VUK 359 (Kacakcilik) |
| KRG-13 | Transfer Fiyatlandirmasi Riski | 80 | IZAHA_DAVET | KVK 12, 13, TF Tebligi |
| KRG-14 | Surekli Zarar Beyani | 70 | BILGI_ISTEME | VUK 134, KVK 6, TTK 376 |
| KRG-15 | Dusuk Vergi Yuku | 75 | BILGI_ISTEME | VUK 134, KVK 6, GVK 40-41 |
| KRG-16 | Ortak/Yonetici Risk Gecmisi | 80 | IZAHA_DAVET | VUK 359, 3/B |

**Ek Analizler:**
- TTK 376 Sermaye Kaybi Analizi (yarim kayip, ucte iki kayip, borca batik)
- KVK 12 Ortulu Sermaye (3x ozkaynak siniri)
- KVK 11/1-i Finansman Gider Kisitlamasi
- Ceza Hesaplama: VZC %50, gecikme faizi %1.8/ay (VUK 112)

**Esikler (HARDCODED):**

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| Kasa siskinlik uyari | %5 | HARDCODED |
| Kasa siskinlik kritik | %15 | HARDCODED |
| Ortaklar/sermaye uyari | %10 | HARDCODED |
| Ortaklar/sermaye kritik | %30 | HARDCODED |
| Ortulu sermaye katsayi | 3x | HARDCODED |
| Devreden KDV ay siniri | 36 ay | HARDCODED |
| Alacak yaslandirma uyari | 90 gun | HARDCODED |
| Stok devir uyari | 180 gun | HARDCODED |
| Dogrudan gider haddi (2026) | 12.000 TL | HARDCODED |
| Vergi ziyai cezasi | %50 | HARDCODED |
| Gecikme faizi | %1.8/ay | HARDCODED |
| KV orani | %25 | HARDCODED |
| KDV orani | %20 | HARDCODED |

### 8.2 VDK KURGAN YAML Rule Engine

**Dosya:** `/Users/cemsak/lyntos/backend/risk_model/vdk_kurgan_engine.py`

- YAML dosyalarindan kural yukler (`rules/registry/vdk/*.yaml`)
- KURGAN (K-01 -- K-13) ve RAM (RAM-01 -- RAM-12) kurallari
- Her kural icin: rule_id, inputs, thresholds, legal_basis_refs
- Eksik input varsa "pending" durumu donduruyor

### 8.3 v1_rule_engine (Risk Model)

**Dosya:** `/Users/cemsak/lyntos/backend/risk_model/v1_rule_engine.py`

- Beyanname, tahakkuk, mizan metriklerini hesaplar
- KDV, KDV2, Muhtasar, Gecici KV beyanname tiplerini parser
- Banka 102 alt hesap eslestirme (mizan vs banka ekstre)
- Konfigurasyonlu esikler: `DEFAULT_CONFIG` dict'inde

### 8.4 RADAR Engine + Rules

**Dosyalar:**
- `/Users/cemsak/lyntos/backend/services/radar_engine.py` - Kategori bazli risk analizi
- `/Users/cemsak/lyntos/backend/services/radar_rules.py` - Kural tabanli risk degerlendirmesi

RADAR kategorileri:
- Hazir degerler (kasa/banka anomali)
- Ticari alacaklar
- Stok risk
- Karlilik sapma
- Degerleme/Amortisman hatalari

### 8.5 EKSIK Ozellikler

| Eksik Ozellik | Oncelik | Aciklama |
|---------------|---------|----------|
| GIB sorgu entegrasyonu | YUKSEK | GIB Risk Servisi import ediliyor ama bazen yuklenemiyor (fallback modu) |
| TCMB EVDS entegrasyonu | ORTA | Sektor karsilastirma icin TCMB verisi, import edilmis ama opsiyonel |
| Kural versiyonlama | ORTA | YAML kurallari degistiginde eski sonuclarla karsilastirma yok |

---

## 9. DIGER MODULLERI

### 9.1 Vergi Odeme Takip Servisi

**Dosya:** `/Users/cemsak/lyntos/backend/services/vergi_odeme_takip.py`

- Tahakkuk-banka islemi eslestirme
- 6183 Sayili Kanun Madde 51 - Gecikme zammi hesaplama
- Donemsel oran degisiklikleri destekleniyor (2023-2026 oranlari mevcut)

| Donem | Oran | Kaynak |
|-------|------|--------|
| 2023-11 / 2024-05 | %3.5/ay | **HARDCODED** liste |
| 2024-05 / 2025-11 | %4.5/ay | **HARDCODED** liste |
| 2025-11 / ... | %3.7/ay | **HARDCODED** liste |

**NOT:** `config/economic_rates.json`'daki `gecikme_zammi_aylik: %4.4` ile `vergi_odeme_takip.py`'daki oranlar FARKLI. JSON'daki %4.4 gecmis donemin ortalamasiymis gibi gorunuyor, servis kendi donemsel listesini kullaniyor.

### 9.2 Tax Strategist (VERGUS)

**Dosya:** `/Users/cemsak/lyntos/backend/services/tax_strategist.py`

- Mizan bazli otomatik mali profil cikarimi
- NACE kodu bazli strateji filtreleme
- `tax_strategies.json` dosyasindan strateji veritabani
- Potansiyel tasarruf hesaplama

### 9.3 Ekonomik Oranlar Konfigurasyonu

**Dosya:** `/Users/cemsak/lyntos/backend/config/economic_rates.py` + `.json`

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| Politika faizi | %45 | JSON |
| Enflasyon (yillik) | %44.5 | JSON |
| Reeskont faizi | %55 | JSON |
| Gecikme zammi (aylik) | %4.4 | JSON |
| Tecil faizi (yillik) | %36 | JSON |
| USD kuru | 43.50 | JSON (fallback) |
| EUR kuru | 52.00 | JSON (fallback) |

**Son guncelleme:** 2026-01-15
**Kaynak notu:** "TCMB PPK karari Ocak 2026 + TUIK Aralik 2025"

### 9.4 Seed Tax Parameters (2025)

**Dosya:** `/Users/cemsak/lyntos/backend/scripts/seed_tax_params.py`

Veritabanina yazilan ama hesaplayicilarda KULLANILMAYAN parametreler:

| Parametre | Deger | Yasal Dayanak |
|-----------|-------|---------------|
| KV genel oran | %25 | KVK md.32 |
| KV ihracat indirimi | %5 | KVK md.32/7 |
| KV uretim indirimi | %1 | KVK md.32/6 |
| Asgari KV orani | %10 | KVK md.32/C |
| Uyumlu mukellef indirimi | %5 | KVK md.32/C |
| Uyumlu mukellef limiti | 9.9M TL | KVK md.32/C |
| AR-GE stopaj (doktora) | %95 | 5746 md.3 |
| AR-GE stopaj (Y.Lisans) | %90 | 5746 md.3 |

---

## 10. GENEL DEGERLENDIRME VE ONCELIKLI EKSIKLIKLER

### 10.1 Hardcoded vs Config Matrisi

| Modul | Hardcoded | Config (JSON) | DB (tax_params) |
|-------|-----------|---------------|-----------------|
| Gecici Vergi | %25 oran | - | KULLANILMIYOR |
| Kurumlar Vergisi | %25 oran, %100 R&D | - | KULLANILMIYOR |
| KDV | %20 (ceza hesabi) | - | - |
| Yeniden Degerleme | - | Yi-UFE endeksleri | - |
| Reeskont | - | Reeskont faizi | - |
| Amortisman | 4 grup orani | - | - |
| Cross-Check | Tolerans degerleri | - | - |
| KURGAN | Tum esikler, ceza oranlari | - | - |
| Gecikme Zammi | Donemsel oranlar | aylik oran (farkli!) | - |

**KRITIK BULGU:** `seed_tax_params.py` ile veritabanina yazilan asgari KV (%10), ihracat indirimi (%5), uretim indirimi (%1) gibi onemli parametreler HICBIR hesaplayici tarafindan kullanilmiyor.

### 10.2 En Kritik 10 Eksiklik (Oncelik Sirasi)

| # | Eksiklik | Ilgili Modul | Risk |
|---|----------|-------------|------|
| 1 | Asgari Kurumlar Vergisi (%10) hesabi YOK | corporate_tax_calculator | KVK md.32/C ihlali, yanlis beyan |
| 2 | Dovizli islem kur degerleme modulu YOK | donem_sonu_islem | VUK 280, eksik gelir/gider tespiti |
| 3 | KDV hesaplama motoru YOK (bagimsiz) | - | Temel vergi hesabi eksik |
| 4 | Indirimli KV oranlari (ihracat/uretim) YOK | corporate_tax + quarterly | Fazla vergi odeme/eksik beyan |
| 5 | KKEG gecici vergiye yansitilmiyor | quarterly_tax_calculator | Yanlis gecici vergi hesabi |
| 6 | Zarar mahsubu 5 yil siniri kontrolu YOK | corporate_tax_calculator | Hatali matrah tespiti |
| 7 | Stok degerleme modulu YOK | donem_sonu_islem | VUK 274, maliyet hatasi |
| 8 | Amortisman oranlarinda Maliye listesi YOK | donem_sonu_islem | Sadece 4 ana grup, 400+ kalem eksik |
| 9 | Finansman gider kisitlamasi hesabi YOK | corporate_tax + quarterly | KVK 11/1-i, KKEG hatasi |
| 10 | Kist amortisman desteyi YOK | donem_sonu_islem | Yil ici alimlarda hatali amortisman |

### 10.3 Olumlu Bulgular

1. **Cross-check motoru kapsamli:** 8 ana kontrol + teknik kontroller (ters bakiye, eksi hesap) mevcut
2. **Tek Duzen Hesap Plani:** 100+ hesap icin bakiye yonu kurali tanimli
3. **KURGAN 16 senaryo:** VDK genelgesine uygun 16 risk senaryosu modellenmis
4. **Mevzuat referanslari:** Cogu modulde VUK/KVK/GVK madde numaralari belirtilmis
5. **Yi-UFE konfigurasyonu:** Yeniden degerleme icin JSON bazli endeks yonetimi
6. **Gecikme zammi donemsel oranlari:** Farkli donemlerde farkli oranlarin uygulanmasi destekleniyor
7. **Trust score mekanizmasi:** Gercek verilere dayali guven skoru hesaplama altyapisi mevcut
8. **Sahte veri yasagi:** Bircok modulde "SAHTE VERI YASAK" politikasi uygulanmis

---

*Rapor Sonu - 2026-02-09*
