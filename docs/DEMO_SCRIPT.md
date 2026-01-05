# LYNTOS V1 Demo Script

> **TÜRMOB / Maliye Bakanlığı Sunum Senaryosu**
> Süre: 10 Dakika | Hedef: Teknik karar vericiler

---

## Sunum Öncesi Hazırlık

### Sistem Kontrolü (5 dakika önce)

```bash
# Terminal 1: Backend
cd /Users/cemsak/lyntos/backend
python main.py
# Beklenen: "Uvicorn running on http://0.0.0.0:8000"

# Terminal 2: Frontend
cd /Users/cemsak/lyntos/lyntos-ui
pnpm dev
# Beklenen: "Ready on http://localhost:3000"

# Test endpoint'leri
curl -s http://localhost:8000/health | jq
curl -s http://localhost:3000/v1 -o /dev/null -w "%{http_code}"
```

### Tarayıcı Sekmeleri (Hazır Açık)

1. **Tab 1:** `http://localhost:3000/v1` - Ana Dashboard
2. **Tab 2:** `http://localhost:3000/v1/quarterly-cockpit` - Dönemsel Veri
3. **Tab 3:** `http://localhost:8000/docs` - Swagger UI
4. **Tab 4:** VSCode - Kod gösterimi için

### Demo Verisi Doğrulama

```bash
# Dönem tamamlanma durumu
curl -s "http://localhost:8000/api/v1/documents/period-completeness?client_id=OZKAN_KIRTASIYE&period_id=2025-Q2" \
  -H "Authorization: DEV_HKOZKAN" | jq '.data.is_complete'
# Beklenen: true
```

---

## Sunum Akışı

### Dakika 0-1: Giriş

**[Tab 1: Ana Dashboard]**

> "Merhaba, bugün size LYNTOS'u tanıtacağım - SMMM'ler için geliştirdiğimiz risk odaklı müşteri yönetim platformu.
>
> LYNTOS, muhasebecilerin günlük işlerini otomatikleştirirken, aynı zamanda yapay zeka destekli analizlerle risk tespiti yapıyor.
>
> Şu an gördüğünüz ÖZKAN KIRTASİYE isimli bir demo müşterimizin 2025 Q2 dönemi."

**Göster:**
- Müşteri adı ve dönem seçici
- Genel sayfa düzeni

---

### Dakika 1-2: Vergi Kartları

**[Tab 1: Ana Dashboard - Kartlar]**

> "Dashboard'da her müşteri için otomatik hesaplanan vergi kartlarını görüyorsunuz.
>
> Geçici Vergi kartına bakın - Q2 için 2.500 TL ödenecek görünüyor. Bu hesaplama tamamen otomatik, mizan verilerinden türetiliyor.
>
> Yanında Kurumlar Vergisi tahmini var - yıl sonu projeksiyonu 50.000 TL gösteriyor."

**Göster:**
- Geçici Vergi kartı (2.500 TL)
- Kurumlar Vergisi kartı (50.000 TL)
- Risk Özeti kartı

---

### Dakika 2-3: Expert Analizi

**[Tab 1: Ana Dashboard - Expert Panel]**

> "Her hesaplamanın altında iki analiz paneli var. İlki EXPERT ANALİZİ.
>
> Bu panel tamamen deterministic - yani matematiksel ve yasal kurallara dayalı. Burada 5520 sayılı Kurumlar Vergisi Kanunu Madde 32'ye referans görüyorsunuz.
>
> Güven skoru %100, çünkü bu bir tahmin değil, hesaplama. Ve kaynaklar - hangi belgelerden türetildiği açıkça belirtiliyor."

**Göster:**
- Expert analiz paneli
- Yasal dayanak referansı (SRC-0023)
- Güven skoru (%100)
- Kaynak belgeler listesi

---

### Dakika 3-4: AI Analizi

**[Tab 1: Ana Dashboard - AI Panel]**

> "İkinci panel AI ANALİZİ. Burası farklı - Claude Sonnet 4 modeli kullanıyor.
>
> Dikkat ederseniz güven skoru %45 ve altında bir disclaimer var: 'Bu bir AI tahminidir. Doğrulanmamış bilgi içerebilir.'
>
> AI diyor ki: 'Q2 karı Q1'den %10 yüksek görünüyor, gider faturalarının dönem uyumu kontrol edilebilir.' Bu bir ÖNERI, hesaplama değil.
>
> LYNTOS'ta biz Expert ve AI'ı kesin olarak ayırıyoruz - muhasebeci hangisine güveneceğini bilir."

**Göster:**
- AI analiz paneli
- Düşük güven skoru
- Disclaimer metni
- Expert vs AI farkı

---

### Dakika 4-5: Explain Modal

**[Tab 1: "Nasıl Hesaplandı?" butonuna tıkla]**

> "Her kart 'Nasıl Hesaplandı?' butonuna sahip. Tıklayalım.
>
> Modal açıldı - burada hesaplama metodolojisini görüyorsunuz. Q1'de 47.500 TL ödenmişti, Q2'de kümülatif hesapla 50.000 TL'ye ulaştık, fark 2.500 TL.
>
> Tüm girdi değerleri, formül ve sonuç şeffaf. Maliye denetiminde bu ekranı açıp gösterebilirsiniz."

**Göster:**
- Modal içeriği
- Q1/Q2 karşılaştırma tablosu
- Hesaplama formülü
- Kaynak belgeler

---

### Dakika 5-6: Yasal Dayanak

**[Modal'da SRC-0023 linkine tıkla]**

> "Yasal dayanak linkine tıklıyorum - SRC-0023.
>
> Burada 5520 KVK Madde 32'nin tam metnini görüyorsunuz. LYNTOS, tüm mevzuatı dahili olarak barındırıyor.
>
> Muhasebeci hesaplamadan yasal metne bir tıkla ulaşıyor. Karar verirken referansı hemen kontrol edebilir."

**Göster:**
- Yasal dayanak görüntüleyici
- Mevzuat metni
- Metadata (kaynak ID, son güncelleme)

---

### Dakika 6-7: Quarterly Cockpit

**[Tab 2: Quarterly Cockpit]**

> "Şimdi Dönemsel Veri Merkezine geçelim.
>
> Bu ekran belge yükleme ve dönem tamamlanma durumunu gösteriyor. Üstte yeşil banner - 'Dönem Tamamlandı' diyor.
>
> 6 belge türü var - 2 zorunlu (MİZAN, BANKA), 4 opsiyonel. Zorunlular yüklü, opsiyonellerden bazıları eksik ama dönem yine de 'tamamlanmış' sayılıyor."

**Göster:**
- Completeness banner (yeşil)
- 6 belge kartı
- Zorunlu vs opsiyonel ayrımı
- Durum rozetleri

---

### Dakika 7-8: Time Shield

**[Tab 2: EDEFTER_BERAT kartına tıkla]**

> "Time Shield özelliğini göstermek istiyorum.
>
> EDEFTER_BERAT kartına bakın - kırmızı 'REJECT' rozeti var. Çünkü bu berat dosyası Q1 dönemine ait (Ocak-Mart), ama biz Q2'ye yüklemişiz.
>
> LYNTOS otomatik olarak döküman tarihlerini kontrol ediyor ve uyumsuzlukları tespit ediyor. BERAT ve BEYANNAME için bu kesin red - yanlış dönem belgesi kabul edilmiyor."

**Göster:**
- REJECT rozeti
- Time Shield açıklaması
- Tarih uyumsuzluğu mesajı

---

### Dakika 8-9: Upload Demo

**[Tab 2: MİZAN kartında "Yükle" butonuna tıkla]**

> "Belge yükleme nasıl çalışıyor göstereyim.
>
> Drag-drop veya tıklayarak dosya seçebilirsiniz. CSV, XLSX, XML destekleniyor.
>
> [Dosya seç veya sürükle]
>
> Format Detective otomatik olarak dosya türünü tespit ediyor. Parser çalışıp metadata çıkarıyor. Time Shield tarih kontrolü yapıyor. Tümü saniyeler içinde."

**Göster:**
- Upload zone
- Desteklenen formatlar
- (Mümkünse) gerçek yükleme demo'su

---

### Dakika 9-10: API Response & Kapanış

**[Tab 3: Swagger UI]**

> "Son olarak API yapısını göstereyim.
>
> Tüm endpoint'ler ResponseEnvelope formatında dönüyor - schema, meta, data, errors, warnings. Bu tutarlılık frontend geliştirmeyi kolaylaştırıyor.
>
> [quarterly-tax endpoint'ini aç, Try it out yap]
>
> Gördüğünüz gibi her yanıt versiyonlu, izlenebilir ve hata durumları standart."

**Göster:**
- Endpoint listesi
- ResponseEnvelope örneği
- Schema versiyonlama

---

### Kapanış

> "LYNTOS V1 ile SMMM'ler:
>
> 1. Otomatik vergi hesaplamaları alıyor
> 2. AI destekli risk tespiti yapıyor
> 3. Tüm hesaplamaları yasal dayanaklarıyla görüyor
> 4. Dönemsel belge yönetimini merkezi yapıyor
> 5. Yanlış dönem belgelerini otomatik engelliyor
>
> Sorularınız var mı?"

---

## Olası Sorular ve Cevaplar

### S: AI yanlış analiz yaparsa ne olur?

> "AI analizleri her zaman disclaimer ile işaretli ve düşük güven skorlu gösteriliyor. Muhasebeci bunun bir öneri olduğunu biliyor. Nihai karar her zaman Expert analizine ve muhasebecinin mesleki yargısına kalıyor."

### S: Veriler nerede saklanıyor?

> "Şu anda yerel SQLite veritabanında. Prod'da PostgreSQL veya müşteri tercihine göre on-premise çözüm olabilir. Tüm veriler KVKK uyumlu şekilde tenant bazlı izole ediliyor."

### S: Mevzuat güncellemeleri nasıl yapılıyor?

> "Sources tablosunda yasal metinler versiyonlu saklanıyor. Mevzuat değiştiğinde yeni versiyon ekleniyor, eski hesaplamalar orijinal referansı koruyor."

### S: Hangi belge türleri destekleniyor?

> "Big-6: MİZAN, BANKA, BEYANNAME, TAHAKKUK, EDEFTER_BERAT, EFATURA_ARSIV. Her biri için özel parser var. Format Detective otomatik sınıflandırma yapıyor."

### S: Entegrasyon imkanları?

> "REST API ile her sistem entegre olabilir. ResponseEnvelope standart format. OAuth 2.0 desteği planlı. e-Defter ve GİB entegrasyonları yol haritasında."

---

## Acil Durum Prosedürleri

### Backend çöktüyse

```bash
# Hızlı restart
cd /Users/cemsak/lyntos/backend
pkill -f "python main.py"
python main.py &
```

### Frontend çöktüyse

```bash
# Hızlı restart
cd /Users/cemsak/lyntos/lyntos-ui
pkill -f "next"
pnpm dev &
```

### Demo verisi bozulduysa

```bash
# Database reset ve yeniden yükleme
cd /Users/cemsak/lyntos/backend
rm lyntos.db
python -c "from database.db import init_db; init_db()"
# Ardından demo verilerini tekrar yükle
```

### API timeout veriyorsa

```bash
# API sağlık kontrolü
curl -s http://localhost:8000/health | jq

# Yavaş endpoint tespiti
time curl -s "http://localhost:8000/api/v1/contracts/quarterly-tax?client_id=OZKAN_KIRTASIYE&period=2025-Q2" \
  -H "Authorization: DEV_HKOZKAN" > /dev/null
```

---

## Demo Verileri Özet

| Veri | Değer | Kaynak |
|------|-------|--------|
| Müşteri | ÖZKAN KIRTASİYE LTD. ŞTİ. | Demo seed |
| Dönem | 2025-Q2 | Demo seed |
| Mizan Hesap Sayısı | 40 | mizan_2025_Q2.csv |
| Banka İşlem Sayısı | 34 | banka_garanti_2025_Q2.csv |
| Kasa Bakiyesi | 180.548 TL | 100 hesabı |
| Banka Bakiyesi | 3.515.535 TL | 102 hesabı |
| Q2 Geçici Vergi | 2.500 TL | Otomatik hesaplama |
| Yıl Sonu KV Tahmini | 50.000 TL | Otomatik hesaplama |

---

## Kontrol Listesi

### Sunum Günü Sabahı

- [ ] Backend çalışıyor
- [ ] Frontend çalışıyor
- [ ] Demo verisi yüklü
- [ ] Tüm endpoint'ler yanıt veriyor
- [ ] Tarayıcı sekmeleri hazır
- [ ] Yedek laptop hazır
- [ ] Internet bağlantısı test edildi (API için gerekmez ama olur da)

### Sunum Öncesi 5 Dakika

- [ ] Diğer uygulamalar kapatıldı
- [ ] Bildirimler kapatıldı
- [ ] Ekran paylaşımı test edildi
- [ ] Mikrofon test edildi
- [ ] Su var mı?

---

*Son güncelleme: 2026-01-04*
