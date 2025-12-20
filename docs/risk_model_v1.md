# Lyntos Risk Model v1

**Amaç:**  
SMMM ofislerinin elindeki veri setleri (mizan, beyanname, banka, e-defter, BA–BS/e-fatura, enflasyon düzeltmesi dosyaları) üzerinden;

- VDK’nın RAS / RADAR / VEDAS / MBR mantığını,
- SMMM veri evrenine uyarlanmış şekilde,
- Formül + veri + eşik temelli, şeffaf bir risk modeline dönüştürmek.

Bu doküman, Lyntos’un **beyni**dir.  
Backend skor fonksiyonları ve dashboard ekranı **bire bir bu model** üzerinden çalışacaktır.

---

## 1. Ana Skorlar

Tüm skorlar **0–100** aralığındadır.

- **0–39** → Yüksek risk  
- **40–69** → Orta risk  
- **70–100** → Düşük risk  

Altı ana skor:

1. **KURGAN Genel Risk Skoru**  
   - Amaç: Firmanın genel mali/vergisel risk profilini tek sayıda özetlemek.  
   - Veri: Mizan, beyanname, banka, e-defter, BA–BS, enflasyon düzeltmesi sonrası bilanço.

2. **Vergi Uyum Skoru**  
   - Amaç: Beyanname verme/ödeme disiplinini, ceza geçmişini ve “vergi uyumlu mükellef” şartlarına yakınlığı ölçmek.  
   - Veri: Beyannameler, tahakkuklar, tahsilatlar, ceza kayıtları (geldikçe).

3. **SMİYB (Sahte / Muhteviyatı İtibariyle Yanıltıcı Belge) Riski Skoru**  
   - Amaç: e-belge, BA–BS, mizan ve banka üzerinden sahte/şüpheli belge risk sinyali üretmek.  
   - Veri: e-defter, BA–BS, KDV beyannamesi, banka, stok/satış verileri.

4. **Finansal Sağlık / RADAR Skoru**  
   - Amaç: Firmanın mali sağlığını ve sürekliliğini (kârlılık, likidite, borçluluk, nakit akım) değerlendirmek.  
   - Veri: Mizan, bilanço, gelir tablosu, banka.

5. **e-Defter & Teknik Uyum Skoru**  
   - Amaç: e-defter ve e-belgelerin teknik doğruluğunu, muhasebe kayıt kalitesini ölçmek.  
   - Veri: e-defter satırları, hesap planı.

6. **Enflasyon Düzeltmesi (INF) Uyum Skoru**  
   - Amaç: Enflasyon muhasebesi uygulamasının mevzuat mantığına ne kadar yakın olduğunu ve risk seviyesini ölçmek.  
   - Veri: Enflasyon öncesi ve sonrası bilanço/mizan, enflasyon düzeltme kayıtları, amortisman ve stok hareketleri.

---

## 2. Analiz Katmanları

Lyntos’ta risk analizi **7 ana katman** üzerinden yapılır:

1. **Dönem Sonu & Bilanço Riskleri**  
   - Kasa, banka, ticari alacak/borç, stok, avans, amortisman, yeniden değerleme, karşılıklar vb.

2. **Vergi Uyum & Beyan–Tahakkuk–Tahsil Zinciri**  
   - Beyan zamanlaması, ödeme disiplini, ceza geçmişi, vergi uyumlu mükellef kriterleriyle uyum.

3. **SMİYB & KURGAN Erken Uyarı (İşlem Bazlı)**  
   - BA–BS / e-fatura vs KDV beyan uyumu, şüpheli satıcı yoğunluğu, tekrarlayan faturalar, POS–hasılat farkları, stok–satış–kârlılık uyumu.

4. **e-Defter / VEDAS Tarzı Dijital Kontroller**  
   - Ters bakiye, yevmiye/fatura numara sekansı, mükerrer kayıtlar, Benford/outlier analizleri.

5. **RADAR / MBR Tarzı Sektör & Dönem Mukayesesi**  
   - Geçmiş dönem trendleri, sektörel bantlarla kıyaslama, devreden KDV/ciro oranı, stok devir hızı, kârlılık trendleri.

6. **Dövizli İşlemler & Kur Farkı Analizi (FX Modülü)**  
   - Dövizli hesapların değerlemesi, kısmi değerleme, net döviz pozisyonu, dövizli krediler, yurtdışı alacaklar, kur farkı davranışı.

7. **Enflasyon Düzeltmesi (INF Modülü)**  
   - Enflasyon düzeltmesinin varlığı, parasal/parasal olmayan ayrımı, enflasyon farklarının doğru hesaplara yazılması, amortisman ve stok düzeltmeleri, geçici vergi uyumu.

---

## 3. KPI Tablosu Formatı

Her risk göstergesi (KPI) aşağıdaki alanlarla tanımlanır:

- **Kod:**  
  - Kısa referans (örn. `K1_KASA_CIRO_ORANI`, `INF4_AMORTISMAN_ENFLASYON_TUTARLILIK`).
- **Ad:**  
  - İnsan tarafından okunabilir isim.
- **Katman:**  
  - Hangi analiz katmanı (1–7).
- **Veri Kaynağı:**  
  - Mizan / Beyanname / Banka / E-defter / BA–BS / Enflasyon dosyaları / Diğer.
- **Formül / Mantık:**  
  - Basit anlatım, gerekirse sade formül.
- **Eşikler:**  
  - İyi / Orta / Kötü için sınır mantığı.
- **Etkilediği Skorlar:**  
  - Kurgan / Uyum / SMİYB / RADAR / e-Defter / INF.
- **Ağırlık:**  
  - İlgili skor(lar) içindeki ağırlığı (0–100 ölçeğinde, skor bazında normalize edilecektir).
- **Neden Risk?**  
  - Bu KPI bozulduğunda VDK mantığı açısından neden problem sayılabileceğini açıklayan kısa metin.
- **SMMM Ne Kontrol Etmeli?**  
  - SMMM için 2–5 maddelik pratik kontrol listesi (AI’nin kullanacağı maddeler).
- **Genel Tavsiye:**  
  - “Doğru yaklaşıma” giden yolu tarif eden, ancak kesin hüküm vermeyen kısa açıklama (AI metninin çekirdeği).

Aşağıda, çekirdek KPI’lar örnek formatta verilmiştir.  
Model genişledikçe bu liste detaylanacaktır.

---

## 4. Katman 1 – Dönem Sonu & Bilanço Riskleri

### 4.1. Genel açıklama

Bu katman, “DÖNEM SONU İŞLEMLERİ” ve “VERGİ İNCELEMELERİNDE ELEŞTİRİLEN HUSUSLAR” başlıklarının Lyntos’a uyarlanmış halidir.

Alt başlıklar:

- Hazır Değerler (Kasa + Banka)
- Ticari Alacaklar
- Ticari Borçlar
- Stoklar & Avanslar
- Maddi Duran Varlıklar & Amortisman
- Karşılıklar & Değer Düşüklüğü
- Yeniden Değerleme & Özel Maliyetler

### 4.2. Örnek KPI’lar

#### K1_KASA_CIRO_ORANI

- **Ad:** Kasa / Ciro Oranı  
- **Katman:** 1 – Dönem Sonu & Bilanço  
- **Veri Kaynağı:** Mizan (100/101 kasa), gelir tablosu (600 satış)  
- **Formül / Mantık:**  
  - Kasa Oranı = `Dönem sonu kasa bakiyesi / Yıllık net satışlar`  
- **Eşikler (örnek mantık):**  
  - %0 – %3 → İyi (düşük risk)  
  - %3 – %10 → Orta (izlenmeli)  
  - %10+ → Kötü (yüksek risk – kasa hesabında normalin üzerinde nakit)  
- **Etkilediği Skorlar:**  
  - Kurgan (yüksek), RADAR (orta)  
- **Ağırlık (örnek):**  
  - Kurgan içinde 5 puan  
- **Neden Risk?**  
  - Sürekli yüksek kasa bakiyesi, kayıtdışı tahsilat/harcama, ortaklara örtülü borç verme veya tahsil edilmemiş alacakların kasa üzerinden gösterilmesi gibi risklere işaret edebilir.  
- **SMMM Ne Kontrol Etmeli?**  
  - Kasa hesabı günlük fiili kasa ile uyumlu mu?  
  - Büyük tutarlı kasa hareketleri gerçekten nakit mi yoksa muhasebe transferi mi?  
  - Ortaklara borç verme işlemleri kasa üzerinden dönüyor mu?  
- **Genel Tavsiye:**  
  - Kasa hesabını mümkün olduğunca düşük ve gerçekçi seviyede tutmak, tahsilat ve ödemeleri banka kanalıyla yönetmek, dönem sonu kasa mutabakatlarını sistematik yapmak riskleri azaltır.

#### K2_ORTAKLARA_BORC_OZSERMAYE

- **Ad:** Ortaklara/İlişkili Kişilere Borç / Özsermaye Oranı  
- **Katman:** 1  
- **Veri Kaynağı:** Mizan (131/231/331 vb.), bilanço (özsermaye)  
- **Formül / Mantık:**  
  - Oran = `Ortak/ilişkili kişi alacakları / Özsermaye`  
- **Eşikler (mantık):**  
  - 0 – 1 → İyi  
  - 1 – 3 → Orta  
  - 3+ → Kötü (ortaklara sermayenin çok üzerinde borç)  
- **Etkilediği Skorlar:**  
  - Kurgan (yüksek), RADAR (orta)  
- **Ağırlık:**  
  - Kurgan içinde 5 puan  
- **Neden Risk?**  
  - İşletmenin kaynaklarının ortaklara finansman olarak tahsis edilmesi, örtülü kazanç dağıtımı ve transfer fiyatlandırması riskine işaret edebilir.  
- **SMMM Ne Kontrol Etmeli?**  
  - Ortaklara verilen borçların hukuki dayanağı ve geri ödeme planı var mı?  
  - Bu borçlar için emsallere uygun faiz hesaplanıyor mu?  
  - Ortaklara borç verirken işletmenin banka kredisi kullanıp kullanmadığı ve bunun finansman maliyeti.  
- **Genel Tavsiye:**  
  - Ortaklarla olan alacak/borç ilişkisini net ve belgeli yürütmek, mümkünse işletme finansmanını ortaklara borç vermek için değil ticari faaliyet için kullanmak, transfer fiyatlandırması ve örtülü kazanç riskini azaltır.

> Not: Bu formatta Ticari Alacaklar, Ticari Borçlar, Stoklar, Amortisman, Yeniden Değerleme, Karşılıklar vb. için ek KPI’lar Risk Model v1 genişledikçe eklenecektir.

---

## 5. Katman 2 – Vergi Uyum & Beyan–Tahakkuk–Tahsil Zinciri

### 5.1. Genel açıklama

Bu katman, “Vergi Uyumlu Mükellef” kavramı ve vergi incelemelerinde bakılan beyan/ödeme disiplinine odaklanır.

Alt başlıklar:

- Beyanname zamanlaması
- Ödeme disiplini
- Ceza geçmişi
- Vergi uyumlu mükellef kriterlerine yakınlık

### 5.2. Örnek KPI’lar

#### V1_BEYAN_ZAMANLAMA_ORANI

- **Ad:** Zamanında Verilen Beyanname Oranı  
- **Katman:** 2  
- **Veri Kaynağı:** Beyannameler (verilme tarihleri + yasal süre)  
- **Formül / Mantık:**  
  - Oran = `Zamanında verilen beyan sayısı / Toplam beyan sayısı`  
- **Eşikler (örnek):**  
  - %95–100 → İyi  
  - %70–95 → Orta  
  - %0–70 → Kötü  
- **Etkilediği Skorlar:**  
  - Vergi Uyum (yüksek), Kurgan (orta)  
- **Neden Risk?**  
  - Sürekli gecikmeli beyan, usulsüzlük cezaları ve vergi uyumlu mükellef statüsünü kaybetme riskine yol açar.  
- **SMMM Ne Kontrol Etmeli?**  
  - Son 3 yılda hangi beyannamelerin geç verildiği.  
  - Sistematik bir beyan takvimi ve hatırlatma mekanizması olup olmadığı.  
- **Genel Tavsiye:**  
  - Beyan takvimine sıkı uyum ve ofis içi kontrol listeleri ile gecikmeleri minimize etmek, hem ceza riskini hem de mükellef nezdinde güven kaybını azaltır.

#### V2_ODEME_ZINCIRI

- **Ad:** Tahakkuk Eden Vergilerin Süresinde Ödeme Oranı  
- **Katman:** 2  
- **Veri Kaynağı:** Tahakkuk ve tahsilat kayıtları  
- **Formül / Mantık:**  
  - Oran = `Süresinde ödenen vergi tutarı / Toplam tahakkuk eden vergi`  
- **Eşikler:**  
  - %95–100 → İyi  
  - %70–95 → Orta  
  - %0–70 → Kötü  
- **Etkilediği Skorlar:**  
  - Vergi Uyum (yüksek), Kurgan (orta)

> Not: Ceza / ciro oranı, vergi uyumlu mükellef koşullarına yakınlık vb. için ek KPI’lar da bu katmanda tanımlanacaktır.

---

## 6. Katman 3 – SMİYB & KURGAN Erken Uyarı

### 6.1. Genel açıklama

Bu katman, sahte/yanıltıcı belge ve riskli işlemler için **erken uyarı** üretir.

Alt başlıklar:

- BA–BS / e-fatura vs KDV beyan uyumu
- Şüpheli satıcı/müşteri yoğunluğu
- Tekrarlayan/şablon faturalar
- Stok–satış–kârlılık uyumu
- Banka vs hasılat uyumu

### 6.2. Örnek KPI’lar

#### S1_BABS_KDV_FARK_ORANI

- **Ad:** BA–BS / e-Fatura ile KDV Beyanı Fark Oranı  
- **Katman:** 3  
- **Veri Kaynağı:** BA–BS/e-fatura listeleri, KDV beyannamesi  
- **Formül / Mantık:**  
  - Fark Oranı = `|BA–BS toplamı – KDV beyan toplamı| / KDV beyan toplamı`  
- **Eşikler (örnek):**  
  - %0–3 → İyi  
  - %3–10 → Orta  
  - %10+ → Kötü  
- **Etkilediği Skorlar:**  
  - SMİYB (yüksek), Kurgan (orta), Vergi Uyum (orta)

#### S2_TEKRARLAYAN_TUTARLI_FATURALAR

- **Ad:** Tekrarlayan Tutar ve Aynı Satıcılı Faturalar Sinyali  
- **Katman:** 3  
- **Veri Kaynağı:** e-Fatura / BA–BS listeleri  
- **Formül / Mantık:**  
  - Aynı satıcıdan, kısa aralıklarla, aynı tutarda çok sayıda fatura varsa, yüksek risk sinyali.  
- **Etkilediği Skorlar:**  
  - SMİYB (yüksek), Kurgan (orta)

#### S3_BANKA_POS_HASILAT_FARKI

- **Ad:** POS ve Banka Tahsilatları ile Hasılat Beyanı Uyumu  
- **Katman:** 3  
- **Veri Kaynağı:** Banka hareketleri (özellikle POS), gelir tablosu/hasılat, KDV beyannamesi  
- **Formül / Mantık:**  
  - Fark Oranı = `|POS tahsilatları – Hasılat| / Hasılat`  
- **Eşikler:**  
  - Benzer şekilde %0–3 / %3–10 / %10+ bantları  
- **Etkilediği Skorlar:**  
  - SMİYB (yüksek), RADAR (orta), Kurgan (orta)

---

## 7. Katman 4 – e-Defter / VEDAS Tarzı Dijital Kontroller

### 7.1. Genel açıklama

Bu katman, VEDAS tipi dijital denetim mantığını Lyntos’a taşır:

- Ters bakiye analizleri
- Yevmiye ve belge numara sıralaması
- Mükerrer kayıt tespiti
- Basit Benford/outlier analizleri

### 7.2. Örnek KPI’lar

#### E1_TERS_BAKIYE_ORANI

- **Ad:** Ters Bakiye Veren Hesapların Oranı  
- **Katman:** 4  
- **Veri Kaynağı:** e-Defter (büyük defter), hesap planı  
- **Formül / Mantık:**  
  - Oran = `Ters bakiye veren hesap sayısı / Toplam hesap sayısı`  
- **Etkilediği Skorlar:**  
  - e-Defter (yüksek), Kurgan (orta)

#### E2_YEVMİYE_NUMARA_ATLAMALARI

- **Ad:** Yevmiye Kayıtlarında Numara Atlama Sinyali  
- **Katman:** 4  
- **Veri Kaynağı:** e-Defter (yevmiye)  
- **Formül / Mantık:**  
  - Yevmiye numaralarının sıralı olup olmadığı kontrol edilir; büyük boşluklar veya tutarsızlıklar risk sinyali olarak işaretlenir.  
- **Etkilediği Skorlar:**  
  - e-Defter (yüksek), SMİYB (orta)

#### E3_MUKERRER_KAYIT_ORANI

- **Ad:** Mükerrer Kayıt İhtimali  
- **Katman:** 4  
- **Veri Kaynağı:** e-Defter, e-Fatura  
- **Formül / Mantık:**  
  - Aynı tarih + aynı tutar + aynı karşı taraf kombinasyonlarının tekrar sayısı.  
- **Etkilediği Skorlar:**  
  - e-Defter (yüksek), SMİYB (orta), Kurgan (orta)

---

## 8. Katman 5 – RADAR / MBR Tarzı Sektör & Dönem Mukayesesi

### 8.1. Genel açıklama

RADAR/MBR mantığı gereği, tek dönem ve tek sayı yetmez; sektör ve geçmiş dönemle mukayese gerekir.

Alt başlıklar:

- Geçmiş dönem trend analizi (3–4 dönem)
- Sektör bandı ile karşılaştırma (manuel/otomatik)
- Devreden KDV ve KDV iadesi risk sinyalleri

### 8.2. Örnek KPI’lar

#### R1_NET_KAR_MARJI_TRENDI

- **Ad:** Net Kâr Marjı Trend Analizi  
- **Katman:** 5  
- **Veri Kaynağı:** Gelir tablosu (son birkaç dönem)  
- **Formül / Mantık:**  
  - Son 3–4 dönemde net kâr marjının yönü (yükselen, stabil, düşen).  
- **Etkilediği Skorlar:**  
  - RADAR (yüksek), Kurgan (orta)

#### R2_STOK_DEVIR_HIZI

- **Ad:** Stok Devir Hızı  
- **Katman:** 5  
- **Veri Kaynağı:** Stok hesabı, satış maliyeti  
- **Formül / Mantık:**  
  - Stok Devir Hızı = `Satılan malın maliyeti / Ortalama stok`  
- **Etkilediği Skorlar:**  
  - RADAR (yüksek), Kurgan (orta), SMİYB (orta)

#### R3_DEVREDEN_KDV_CIRO_ORANI

- **Ad:** Devreden KDV / Ciro Oranı  
- **Katman:** 5  
- **Veri Kaynağı:** KDV beyannamesi, gelir tablosu  
- **Formül / Mantık:**  
  - Oran = `Devreden KDV / Ciro`  
- **Etkilediği Skorlar:**  
  - Kurgan (orta), Vergi Uyum (orta), RADAR (orta)

---

## 9. Katman 6 – Dövizli İşlemler & Kur Farkı Analizi (FX Modülü)

### 9.1. Genel açıklama

Bu katman, dövizli işlemler ve kur farkı kayıtlarının riskini değerlendirir.

Alt başlıklar:

- Dövizli alacak/borç ve hesapların değerlemesi
- Net döviz pozisyonu ve borçluluk
- Kur farkı gelir/giderlerinin büyüklüğü ve davranışı
- Yurtdışı alacaklar ve karşılık uygulamaları

### 9.2. Örnek KPI’lar

#### FX1_DOVIZLI_HESAP_DEGERLEME

- **Ad:** Dövizli Hesapların Dönem Sonlarında Değerlenme Sinyali  
- **Katman:** 6  
- **Veri Kaynağı:** Mizan, e-Defter  
- **Formül / Mantık:**  
  - Geçici vergi sonları ve yıl sonlarında dövizli hesaplarda kur farkı kayıtları (646/656 vb.) var mı?  
  - Hiç yoksa, “değerleme yapılmamış olabilir” risk sinyali.  
- **Etkilediği Skorlar:**  
  - Kurgan (yüksek), Vergi Uyum (orta)

#### FX2_KISMI_DEGERLEME_IHTIMALI

- **Ad:** Kısmi Değerleme İhtimali (Alacak/Borç Asimetrisi)  
- **Katman:** 6  
- **Veri Kaynağı:** Mizan  
- **Formül / Mantık:**  
  - Dövizli hesapların bir kısmında kur farkı hareketi varken diğer kısmında hiç yoksa, kısmi değerleme ihtimali.  
- **Etkilediği Skorlar:**  
  - Kurgan (orta), Vergi Uyum (orta)

#### FX3_NET_FX_OZSERMAYE_ORANI

- **Ad:** Net Döviz Pozisyonu / Özsermaye Oranı  
- **Katman:** 6  
- **Veri Kaynağı:** Mizan  
- **Formül / Mantık:**  
  - Net Döviz Pozisyonu = Dövizli varlıklar – Dövizli borçlar  
  - Oran = `Net Döviz Pozisyonu / Özsermaye`  
- **Etkilediği Skorlar:**  
  - RADAR (yüksek), Kurgan (orta)

#### FX4_DOVIZLI_KREDI_AKTIF_ORANI

- **Ad:** Dövizli Krediler / Toplam Aktif Oranı  
- **Katman:** 6  
- **Veri Kaynağı:** Mizan  
- **Formül / Mantık:**  
  - Oran = `Dövizli kredi tutarı / Toplam aktif`  
- **Etkilediği Skorlar:**  
  - RADAR (yüksek), Kurgan (orta)

#### FX5_YURTDISI_ALACAK_KARSILIK

- **Ad:** Yurtdışı/Dövizli Alacaklar ve Karşılık Uygulamaları  
- **Katman:** 6  
- **Veri Kaynağı:** Mizan, alacak analizleri  
- **Formül / Mantık:**  
  - Uzun süredir tahsil edilmeyen dövizli/yurtdışı alacaklar ve bunlara karşılık ayrılıp ayrılmadığı kontrol edilir.  
- **Etkilediği Skorlar:**  
  - Kurgan (orta), RADAR (orta), Vergi Uyum (orta)

---

## 10. Katman 7 – Enflasyon Düzeltmesi (INF Modülü)

### 10.1. Genel açıklama

Bu katman, enflasyon muhasebesi (enflasyon düzeltmesi) uygulamasının:

- Zorunlu olduğu dönemlerde yapılıp yapılmadığını,
- Parasal/parasal olmayan ayrımının doğruluğunu,
- Enflasyon farklarının doğru hesaplarda izlenip izlenmediğini,
- Amortisman ve stok düzeltmelerinin tutarlılığını,
- Geçici vergi dönemleriyle uyumunu

değerlendirir.

Alt başlıklar:

- Zorunlu enflasyon düzeltmesinin varlığı
- Parasal vs parasal olmayan ayrımı
- Enflasyon farklarının nereye yazıldığı
- Amortismanların enflasyon sonrası değere göre hesaplanması
- Stok düzeltmesi ve katsayı uygulaması
- Geçici vergi dönemleri ile tutarlılık
- Matrah ile enflasyon farklarının uyumu (analiz notu)

### 10.2. INF KPI’ları (çekirdek)

#### INF1_ZORUNLU_DUZELTME_VAR_MI

- **Ad:** Zorunlu Enflasyon Düzeltmesi Yapılmış mı?  
- **Katman:** 7  
- **Veri Kaynağı:** Enflasyon öncesi ve sonrası bilanço/mizan, mükellef türü ve dönem bilgisi  
- **Formül / Mantık:**  
  - İlgili dönem için enflasyon düzeltmesi zorunlu olduğu halde, Lyntos’a enflasyon sonrası bilanço/mizan yüklenmemişse veya enflasyon düzeltme hesapları hiç yoksa → yüksek risk.  
- **Etkilediği Skorlar:**  
  - Vergi Uyum (çok yüksek), Kurgan (yüksek)  
- **Neden Risk?**  
  - Zorunlu olduğu halde enflasyon düzeltmesi yapılmaması, matrah farkı ve ceza riskini doğrudan artırır.  
- **SMMM Ne Kontrol Etmeli?**  
  - Bu mükellefin ilgili dönem için enflasyon düzeltmesi kapsamına girip girmediğini.  
  - Enflasyon düzeltmesi yapılmışsa, bunun mizan/bilanço kayıtlarına yansıyıp yansımadığını.  
- **Genel Tavsiye:**  
  - Enflasyon düzeltmesi kapsamındaki mükellefler için, düzeltme yapılıp yapılmadığını ve ilgili kayıtların doğru dosyalara işlendiğini sistematik kontrol etmek, hem bilinçsiz ihmal hem de ceza riskini azaltır.

#### INF2_PARASAL_NONPARASAL_TUTARLILIK

- **Ad:** Parasal / Parasal Olmayan Ayrımının Tutarlılığı  
- **Katman:** 7  
- **Veri Kaynağı:** Enflasyon öncesi/sonrası bilanço, hesap sınıfları  
- **Formül / Mantık:**  
  - Kasa, ticari alacaklar, ticari borçlar gibi parasal hesaplarda, enflasyon düzeltmesine benzer şişmeler gözleniyorsa;  
  - Stok, maddi duran varlık, özkaynak gibi parasal olmayan hesaplarda enflasyon farkı hiç yok veya çok azsa → ayrım hatalı olabilir.  
- **Etkilediği Skorlar:**  
  - Kurgan (orta-yüksek), Vergi Uyum (orta), INF (yüksek)  
- **Neden Risk?**  
  - Parasal/parasal olmayan ayrımındaki hata, hem bilanço gerçekliğini hem de vergi matrahını ciddi şekilde bozabilir.  
- **SMMM Ne Kontrol Etmeli?**  
  - Enflasyon düzeltmesi hesaplama dosyasındaki parasal/parasal olmayan listeyi.  
  - Düzeltmeye tabi tutulan hesapların resmi örneklere uygun olup olmadığını.  
- **Genel Tavsiye:**  
  - Parasal ve parasal olmayan kalemleri, mevzuattaki tanımlara göre net listeleyip bu liste üzerinden enflasyon düzeltmesi yapmak, karmaşayı ve hata riskini azaltır.

#### INF3_ENFLASYON_FARK_HESAPLARI

- **Ad:** Enflasyon Farklarının Hesaplanışı ve Nereye Yazıldığı  
- **Katman:** 7  
- **Veri Kaynağı:** Mizan, enflasyon düzeltme kayıtları, özkaynak hesapları  
- **Formül / Mantık:**  
  - Enflasyon farklarının ağırlıklı olarak özkaynak ve özel fon hesaplarında mı, yoksa doğrudan gelir/gider hesaplarında mı izlendiği kontrol edilir.  
- **Etkilediği Skorlar:**  
  - Kurgan (yüksek), Vergi Uyum (yüksek), e-Defter (orta), INF (yüksek)  
- **Neden Risk?**  
  - Enflasyon farklarının yanlış hesap sınıflarında izlenmesi, matrahın yanlış oluşmasına ve finansal tabloların gerçeği yansıtmamasına yol açar.  
- **SMMM Ne Kontrol Etmeli?**  
  - Enflasyon düzeltme hesaplarının (örneğin 698/697 vb.) dönem sonunda hangi özkaynak hesaplarına aktarıldığını.  
  - Gelir/gider hesaplarında kalıcı enflasyon farkı bakiyesi bırakılıp bırakılmadığını.  
- **Genel Tavsiye:**  
  - Enflasyon farklarını geçici hesaplarda toplayıp dönem sonunda ilgili özkaynak hesaplarına aktarmak, vergi ve finansal raporlama açısından daha sağlıklı bir yaklaşımdır.

#### INF4_AMORTISMAN_ENFLASYON_TUTARLILIK

- **Ad:** Amortismanların Enflasyon Sonrası Değere Göre Hesaplanması  
- **Katman:** 7  
- **Veri Kaynağı:** Maddi duran varlık hesapları, amortisman giderleri, enflasyon öncesi/sonrası bilançolar  
- **Formül / Mantık:**  
  - Duran varlıkların enflasyon sonrası brüt değerindeki artış ile amortisman giderlerindeki artışın aynı yönde ve mantıklı oranda olup olmadığı kontrol edilir.  
- **Etkilediği Skorlar:**  
  - Kurgan (orta-yüksek), Vergi Uyum (orta), RADAR (orta), INF (orta-yüksek)  
- **Neden Risk?**  
  - Enflasyon sonrası değer üzerinden amortisman ayrılmaması, hem vergi matrahını hem de varlık değerlemesini bozar.  
- **SMMM Ne Kontrol Etmeli?**  
  - 2023–2024 gibi kritik dönemlerde duran varlık brüt değeri ile amortisman gideri artışını yan yana.  
  - Amortisman planlarının yeni maliyet değerlerine göre güncellenip güncellenmediğini.  
- **Genel Tavsiye:**  
  - Enflasyon sonrası maliyet değerlerini amortisman planlarına yansıtmak, mali tabloların doğruluğu ve vergi uyumu açısından önemlidir.

#### INF5_STOK_DUZELTME_KONTROLU

- **Ad:** Stok Düzeltmesi ve Katsayı Uygulaması  
- **Katman:** 7  
- **Veri Kaynağı:** Stok hesapları, enflasyon öncesi/sonrası stok bakiyeleri  
- **Formül / Mantık:**  
  - Stok bakiyesinin, ilgili dönem için beklenen enflasyon düzeltme katsayılarına göre makul bir oranda artıp artmadığı kontrol edilir.  
- **Etkilediği Skorlar:**  
  - Kurgan (orta), RADAR (orta), SMİYB (düşük-orta), INF (orta)  
- **Neden Risk?**  
  - Stokların yanlış veya eksik düzeltilmesi, hem kâr/zararı hem de vergi matrahını doğrudan etkiler.  
- **SMMM Ne Kontrol Etmeli?**  
  - Stok düzeltmesi yapılan kalemlerin maliyet tarihleri ve kullanılan katsayılar.  
  - Düzeltme sonrası stok değerinin satış fiyatına göre mantıklı olup olmadığı.  
- **Genel Tavsiye:**  
  - Stokların enflasyon düzeltmesini, maliyet esasına göre ve resmi endeks/katsayı tablolarına uygun yapmak, hem enflasyon kazancını doğru hesaplamaya hem de stok manipülasyonu riskini azaltmaya yardımcı olur.

#### INF6_GECICI_VERGI_TUTARLILIK

- **Ad:** Geçici Vergi Dönemleri ile Enflasyon Düzeltmesi Tutarlılığı  
- **Katman:** 7  
- **Veri Kaynağı:** Geçici vergi mizanı, enflasyon düzeltme kayıtları  
- **Formül / Mantık:**  
  - Enflasyon düzeltmesinin yapılmaması gereken geçici vergi dönemlerinde, enflasyon düzeltme hesaplarının var olup olmadığı kontrol edilir.  
- **Etkilediği Skorlar:**  
  - Vergi Uyum (yüksek), Kurgan (orta), INF (yüksek)  
- **Neden Risk?**  
  - Enflasyon düzeltmesinin yanlış dönemlerde uygulanması, gereksiz karmaşa ve yanlış matrah doğurabilir.  
- **SMMM Ne Kontrol Etmeli?**  
  - Hangi dönemlerde enflasyon düzeltmesi yapıldığını.  
  - Geçici vergi dönem mizanınında enflasyon hesaplarının bulunup bulunmadığını.  
- **Genel Tavsiye:**  
  - Enflasyon düzeltmesini sadece mevzuatın zorunlu kıldığı hesap dönemlerinde uygulamak ve geçici vergi dönemlerinde dikkatsizce karıştırmamak, gereksiz vergi ihtilaflarını önler.

#### INF7_MATRAH_ENFLASYON_UYUM_ANALIZ

- **Ad:** Vergi Matrahı ile Enflasyon Farklarının Uyumu (Analiz Notu)  
- **Katman:** 7  
- **Veri Kaynağı:** Kurumlar vergisi beyannamesi, enflasyon düzeltme hesapları, özkaynak hareketleri  
- **Formül / Mantık:**  
  - Enflasyon düzeltme sonucu oluşan kazanç/zarar kalemleri ile beyan edilen kurumlar vergisi matrahı arasında büyük uyumsuzluklar varsa, AI tarafından “dikkat edilmesi gereken” analitik not üretilir.  
- **Etkilediği Skorlar:**  
  - INF Skoru’nda açıklama düzeyinde, sayısal etkisi sınırlı; Kurgan ve Vergi Uyum skorlarına dolaylı etki.  
- **Neden Risk?**  
  - Enflasyon kazancı/zararı ile vergi matrahı arasında açıklanamayan farklar, hesaplama hatası veya mevzuata aykırı yorum riskine işaret edebilir.  
- **SMMM Ne Kontrol Etmeli?**  
  - Enflasyon farklarının hangi kalemler üzerinden matraha yansıtıldığını veya yansıtılmadığını.  
  - Kurumlar vergisi beyannamesindeki ilgili satır ve dipnot açıklamalarını.  
- **Genel Tavsiye:**  
  - Enflasyon düzeltmesi ve kurumlar vergisi beyanı arasındaki ilişkiyi, tutarlı bir hikâye halinde kurgulamak (hangi farklar matraha dahil, hangileri değil), olası vergi incelemelerinde savunma zeminini güçlendirir.

---

## 11. AI Açıklama Alanları ve Tavsiye Prensipleri

Lyntos’ta AI katmanı:

- **Skorları HESAPLAMAZ**, yalnızca **açıklar ve yorumlar**.  
- Her KPI için tanımlanan:
  - “Neden Risk?”  
  - “SMMM Ne Kontrol Etmeli?”  
  - “Genel Tavsiye”  
  alanlarını kullanarak SMMM’ye:

  1. Risk özetini,
  2. Kontrol etmesi gereken noktaları,
  3. Doğruya giden genel yolu

  metin olarak sunar.

**AI’nin yapacağı:**

- Bozuk/orta durumda olan KPI’ları tespit edip, ilgili alanları birleştirerek:

  - “VDK Uzmanı Gözüyle Özet”  
  - “Ne Kontrol Etmelisiniz?” (checklist)  
  - “Genel Tavsiye”  

  bloklarını üretmek.

**AI’nin yapmayacağı:**

- Kesin vergi hükmü vermek (“bu uygulama kesin yanlıştır”, “şu kadar vergi/ceza çıkar” gibi).  
- Net matrah/tutar hesaplamak ve “tek doğru çözüm” önermek.  
- Mevzuatın yerine geçerek yasal yorumda bulunmak.

Her AI çıktısında kısa bir uyarı metni yer alacaktır:

> “Bu analiz otomatik üretilmiş bir risk değerlendirme ve genel bilgilendirme niteliğindedir.  
> Kesin bir vergi görüşü değildir; karar verirken yürürlükteki mevzuat ve kendi mesleki değerlendirmeniz esastır.”

---

## 12. Versiyonlama ve Notlar

- **RISK_MODEL_VERSION:** `v1`  
- Bu dokümandaki eşik ve ağırlıklar, Lyntos Risk Model v1 için temel referanstır.
- İleride v2/v3 çıktığında:
  - Bu dosyanın yeni versiyonları oluşturulacaktır (`risk_model_v2.md` vb.),
  - Backend tarafında `RISK_MODEL_VERSION` alanı güncellenecektir,
  - API cevaplarında hangi versiyonla hesaplandığı açıkça belirtilecektir.

Bu doküman, Lyntos backend’inde:

- `metrics.py` (ham metrik hesapları),
- `scoring.py` (skor fonksiyonları),
- `model_config.py` (KPI meta ve ağırlıklar),
- `/analyze` benzeri API endpoint’leri

için ana tasarım referansıdır.
