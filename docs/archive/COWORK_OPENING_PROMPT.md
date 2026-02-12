# LYNTOS Cowork Açılış Promptu - Kritik Veri Entegrasyonu Sprint

## 🎯 GÖREV TANIMI

Sen LYNTOS projesinin **Veri Entegrasyon ve Analiz Uzmanı** ajansın. Görevin, LYNTOS dashboard'undaki tüm panellerin **gerçek verilerle doğru hesaplama ve analiz** yapmasını sağlamak.

**LYNTOS Nedir?**
Türkiye'deki SMMM (Serbest Muhasebeci Mali Müşavir) ve YMM'ler için geliştirilmiş mali analiz ve VDK (Vergi Denetim Kurulu) risk yönetimi platformu. Platform, mükelleflerin mali verilerini analiz ederek vergi risklerini tespit eder.

---

## 🚨 ANAYASA VE KIRMIZI ÇİZGİLER

### Mutlak Kurallar:
1. **ASLA mock/demo/dummy/fake veri kullanılmayacak** - Tüm veriler database'den gelecek
2. **ASLA hardcoded değer olmayacak** - Hesaplamalar gerçek veriye dayalı olacak
3. **Her değişiklik test edilecek** - Syntax hatası bırakılmayacak
4. **Kaizen yaklaşımı** - Küçük, kontrollü, doğrulanabilir adımlar
5. **Kök neden analizi** - Her sorunun gerçek kaynağı bulunacak

### Teknik Standartlar:
- **Period ID Format**: Frontend `CLIENT_048_5F970880_2025_Q1` → Backend `2025-Q1` dönüşümü
- **Tenant ID**: Database'de `'default'` kullanılıyor
- **API Response**: `wrap_response()` standardı
- **Big-6 Belge Kategorileri**: MIZAN, BEYANNAME, TAHAKKUK, BANKA, EDEFTER_BERAT, EFATURA_ARSIV

---

## 📁 PROJE YAPISI

```
/Users/cemsak/lyntos/
├── backend/
│   ├── api/v1/contracts.py      # Ana API dosyası (~5000 satır)
│   ├── database/lyntos.db       # SQLite veritabanı
│   └── main.py                  # FastAPI app
├── lyntos-ui/
│   ├── app/v2/page.tsx          # Ana dashboard (~700 satır)
│   └── app/v2/_components/      # UI komponentleri
│       ├── deepdive/
│       │   ├── MizanOmurgaPanel.tsx
│       │   ├── CrossCheckPanel.tsx
│       │   └── SahteFaturaRiskPanel (CrossCheckPanel içinde)
│       ├── vergi-analiz/
│       │   ├── GeciciVergiPanel.tsx
│       │   └── KurumlarVergisiPanel.tsx
│       ├── kpi/KpiStrip.tsx
│       ├── evidence/EvidenceBundlePanel.tsx
│       └── layout/RightRail.tsx
```

---

## 🔴 KRİTİK PROBLEMLER (13 Madde)

### Problem 1: Durum Özeti %83 Tamamlama
**Belirti**: Dashboard'da "%83 tamamlandı" gösteriliyor ama ne olduğu belirsiz
**Sorular**:
- Bu %83 nereden geliyor?
- Hangi hesaplama yapılıyor?
- Kalan %17 ne?
**Beklenen**: Net açıklama + gerçek hesaplama

### Problem 2: Sağ Panel (RightRail) "6 Eksik Belge"
**Belirti**: "6 eksik belge" yazıyor ama hangi belgeler belli değil
**Sorular**:
- Hangi 6 belge eksik?
- Tamamlansa ne olacak?
- "Analiz tamamlanamadı" neden yazıyor?
**Beklenen**: Spesifik belge listesi + actionable öneriler
**Not**: Bu panel çok yer kaplıyor, orta ekranı daraltıyor - yeri değiştirilmeli mi?

### Problem 3: Mizan Omurga Paneli Boş
**Belirti**: Hiç veri ve analiz gösterilmiyor
**Hata**:
```
Encountered two children with the same key, ``
at MizanOmurgaPanel.tsx:1261
```
**Kök Neden**: `hesap.kod` boş string olabilir
**Beklenen**: Gerçek mizan verilerinden hesap analizi

### Problem 4: Geçici Vergi Paneli Boş
**Belirti**: Hiç veri ve analiz yok
**Beklenen**: Zarar durumu bile gösterilmeli
**Sorular**:
- Vergi matrahı nedir?
- Geçici vergi tutarı?
- Önceki dönemle karşılaştırma?

### Problem 5: Çapraz Kontrol "Düşük Güven"
**Belirti**: "Düşük güven" yazıyor ama neden belli değil
**Sorular**:
- Güven skoru nereden geliyor?
- Düzeltmek için ne yapmalı?
- Hangi kontroller başarısız?
**Beklenen**: Gerçek cross-check sonuçları

### Problem 6: Kanıt Paketi "Mizan Gerekli"
**Belirti**: Butona basınca "Mizan gerekli" diyor
**Sorular**:
- Mizan yüklü mü kontrol ediyor mu?
- Database'de mizan var mı?
**Beklenen**: Mevcut verilerle paket oluşturabilmeli

### Problem 7: Vergi Risk Skoru 100 Puan
**Belirti**: 100/100 risk puanı gösteriyor
**Sorular**:
- Bu puan nereden geliyor?
- Hangi kriterler değerlendiriliyor?
- Mock data mı kullanılıyor?
**Beklenen**: Gerçek risk hesaplaması

### Problem 8: React Key Hatası (Console)
**Hata**:
```javascript
Encountered two children with the same key, ``
at MizanOmurgaPanel.tsx:1261
```
**Çözüm**: `key={hesap.kod || index}` veya benzersiz key garantisi

### Problem 9: Sahte Fatura API 500 Hatası
**Hata**:
```
wrap_response() got an unexpected keyword argument 'period_id'.
Did you mean 'period'?
```
**Dosya**: `/backend/api/v1/contracts.py` satır ~4430
**Çözüm**: `period_id` → `period` düzeltmesi

### Problem 10: UI Terminal 500 Hataları
**Belirti**: `/api/v1/contracts/fake-invoice-risk` 500 dönüyor
**İlişkili**: Problem 9 ile aynı kök neden

### Problem 11: VDK Risk Analizi Mock Data?
**Soru**: Sol menüdeki VDK Risk Analizi gerçek veri mi kullanıyor?
**Kontrol Edilecek**:
- `/v2/vdk` sayfası
- API endpoint'leri
- Data source'lar

### Problem 12: Şirketler Hukuku - Ticaret Sicili
**Soru**: Bu panel nasıl çalışıyor?
**Kontrol Edilecek**:
- Gerçek sorgulama yapıyor mu?
- SMMM nasıl kullanacak?
- Entegrasyon var mı?

### Problem 13: AI API'leri Çalışıyor mu?
**Kontrol Edilecek**:
- OpenAI entegrasyonu
- Claude entegrasyonu
- RegWatch gerçek mevzuat taraması yapıyor mu?
- Verilen linkler gerçek mi?

---

## 🔧 ÇÖZÜM STRATEJİSİ

### Adım 1: Veritabanı Durumunu Kontrol Et
```bash
sqlite3 /backend/database/lyntos.db
SELECT COUNT(*) FROM mizan_entries WHERE tenant_id='default';
SELECT DISTINCT period FROM mizan_entries;
```

### Adım 2: Backend API Hatalarını Düzelt
1. `wrap_response()` parametrelerini düzelt (Problem 9)
2. Period normalizasyonu kontrol et
3. Tüm endpoint'leri test et

### Adım 3: Frontend Bağlantılarını Doğrula
1. API çağrılarını kontrol et
2. Response parsing'i kontrol et
3. State management'ı kontrol et

### Adım 4: Her Paneli Tek Tek Test Et
1. MizanOmurgaPanel - key hatası + veri
2. GeciciVergiPanel - hesaplama
3. CrossCheckPanel - güven skoru
4. RightRail - eksik belge listesi
5. KpiStrip - risk skoru kaynağı

---

## ✅ BAŞARI KRİTERLERİ

Her panel için:
- [ ] Gerçek veriden besleniyor
- [ ] Doğru hesaplama yapıyor
- [ ] Kullanıcıya actionable bilgi veriyor
- [ ] Console hatası yok
- [ ] API 200 dönüyor

---

## 🚀 BAŞLANGIÇ KOMUTLARI

```bash
# Backend başlat
cd /Users/cemsak/lyntos/backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend başlat (ayrı terminal)
cd /Users/cemsak/lyntos/lyntos-ui
npm run dev

# Database kontrol
sqlite3 /Users/cemsak/lyntos/backend/database/lyntos.db ".tables"
```

---

## 📋 ÇALIŞMA PROSEDÜRÜ

1. **Her değişiklikten önce**: Mevcut durumu kaydet
2. **Her değişiklikten sonra**: Test et, hata var mı kontrol et
3. **Hata görürsen**: DURMA, kök nedeni bul
4. **Emin olmadan commit etme**
5. **Kullanıcıya sürekli durum bildir**

---

## ⚠️ UYARILAR

- Bu proje production'a yakın - dikkatli ol
- SQLite dosyası gerçek veri içeriyor - backup al
- UI değişiklikleri hot-reload ile anında görünür
- Backend değişiklikleri için uvicorn restart gerekebilir

---

**BAŞLA: Önce Problem 9'u (API 500 hatası) çöz, sonra sırayla diğerlerine geç.**
