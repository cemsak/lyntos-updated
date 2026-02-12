# 📋 LYNTOS - Yasal Süreler Modülü Yeniden Tasarım Raporu

**Tarih:** 29 Ocak 2026
**Hazırlayan:** Claude (LYNTOS Geliştirme)
**Konu:** "Yasal Süreler" modülünün SMMM odaklı beyanname takviminden ŞİRKET odaklı yasal yükümlülüklere dönüştürülmesi

---

## 🚨 SORUN TESPİTİ

### Mevcut Durum
1. **Gereksiz Tekrar:** Yasal süreler dashboard'da 2 ayrı yerde gösteriliyor
2. **SMMM İçin Anlamsız:** SMMM'ler zaten beyanname sürelerini bilir - GİB, e-devlet, muhasebe yazılımları sürekli hatırlatma yapıyor
3. **Katma Değer Yok:** KDV beyannamesi, Muhtasar, BA-BS gibi süreler SMMM için rutin işler

### Asıl İhtiyaç
- **Şirket sahipleri** ve **yönetim kurulları** için kritik yasal süreler
- SMMM'nin mükellefi **uyarması gereken** ama **gözden kaçabilen** süreler
- Cezai yaptırımları olan **TTK, SGK, Ticaret Sicili** yükümlülükleri

---

## ✅ ÖNERİLEN YENİ MODÜL: "Şirket Yasal Süreler Takibi"

### 1. TTK (Türk Ticaret Kanunu) Süreleri

| Süre | Açıklama | Süre | Ceza/Sonuç |
|------|----------|------|------------|
| **Olağan Genel Kurul** | Hesap döneminden itibaren | 3 ay içinde | Yönetim kurulu sorumluluğu |
| **Finansal Tabloların İlanı** | Genel kurul sonrası Ticaret Sicil Gazetesi | 30 gün | İdari para cezası |
| **Ticaret Sicili Tescilleri** | Her türlü değişiklik (adres, yönetim kurulu, vb.) | 15 gün | Gecikme cezası |
| **TTK 376 - %50 Kayıp** | Sermayenin yarısı kaybolduğunda | DERHAL | Yönetim kurulu sorumluluğu |
| **TTK 376 - %66 Kayıp** | Sermayenin 2/3'ü kaybolduğunda | DERHAL | Şirket infisah eder |
| **Sermaye Uyumu** | Eski şirketler için minimum sermaye uyumu | 31.12.2026 | Şirket infisah eder |

**Minimum Sermaye (2025):**
- Anonim Şirket: 250.000 TL
- Limited Şirket: 50.000 TL

### 2. SGK Bildirimleri ve Süreleri

| Bildirim | Süre | 2025 Cezası (Asgari Ücret: 26.005,50 TL) |
|----------|------|------------------------------------------|
| **İşe Giriş Bildirgesi** | İşe başlamadan 1 gün önce | 26.005,50 TL (1 asgari ücret) |
| **İşten Çıkış Bildirgesi** | Çıkıştan 10 gün içinde | 2.600,55 TL (asgari ücretin 1/10'u) |
| **İşyeri Bildirgesi** | En geç çalıştırma tarihinde | 26.005 - 78.016 TL (defter türüne göre) |
| **İş Kazası Bildirimi** | Kazadan sonra 3 iş günü içinde | Asgari ücretin yarısı |
| **APHB Geç Verilmesi** | - | Sigortalı başına asgari ücretin 1/5'i |
| **Kayıt Dışı Çalışan** | Denetimde tespit | 52.011 TL (asgari ücretin 2 katı) |

### 3. Diğer Kritik Süreler

| Alan | Süre | Açıklama |
|------|------|----------|
| **KVKK Veri İhlali** | 72 saat | Veri ihlali tespit edilirse Kurul'a bildirim |
| **İş Kanunu - İhbar Süresi** | 2-8 hafta | Kıdeme göre değişir |
| **Kıdem Tazminatı Ödemesi** | Fesih günü | Gecikmede yasal faiz işler |
| **Yıllık İzin Kullandırma** | Yıl içinde | Kullandırılmazsa tazminat |

---

## 🎯 LYNTOS'A ÖNERİLEN UYGULAMA

### Panel Yapısı: "Şirket Yasal Yükümlülükler"

```
┌─────────────────────────────────────────────────────────────┐
│ 🏢 Şirket Yasal Yükümlülükler                              │
│ TTK, SGK ve İş Kanunu süreleri                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TTK 376      │  │ SGK          │  │ Ticaret      │      │
│  │ Durumu       │  │ Bildirimleri │  │ Sicili       │      │
│  │              │  │              │  │              │      │
│  │ ✅ NORMAL    │  │ ⚠️ 2 BEKLEYEN │  │ 📅 15 GÜN   │      │
│  │ %23 kayıp    │  │ İşe giriş    │  │ YK değişiklik│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Genel Kurul  │  │ Sermaye      │  │ Personel     │      │
│  │ Toplantısı   │  │ Uyumu        │  │ İşlemleri    │      │
│  │              │  │              │  │              │      │
│  │ 📅 45 GÜN    │  │ ✅ UYUMLU    │  │ 🔴 1 GECİKMİŞ│      │
│  │ Son: 31 Mar  │  │ 500K TL      │  │ İşten çıkış  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Veri Kaynakları

1. **TTK 376 Hesaplama:** Mizan verisinden otomatik hesaplanıyor (mevcut)
2. **Genel Kurul:** Şirket hesap dönemi + 3 ay kuralı
3. **SGK Bildirimleri:** E-Bildirge entegrasyonu gerekli (gelecek sprint)
4. **Ticaret Sicili:** Manuel giriş veya MERSİS entegrasyonu
5. **Personel İşlemleri:** SGK çalışan listesinden

---

## 📊 KARŞILAŞTIRMA: ESKİ vs YENİ

| Özellik | ESKİ (Beyanname Takvimi) | YENİ (Şirket Yasal Süreler) |
|---------|-------------------------|----------------------------|
| **Hedef Kitle** | SMMM | Şirket Yönetimi + SMMM |
| **Katma Değer** | Düşük (zaten biliniyor) | Yüksek (gözden kaçabilir) |
| **Cezai Yaptırım** | Vergi cezası | Şirket infisahı, kişisel sorumluluk |
| **Veri Kaynağı** | Sabit takvim | Dinamik hesaplama |
| **Aciliyet** | Rutin | Kritik |

---

## 🔧 UYGULAMA ADIMLARI

### Faz 1: Mevcut Dashboard Temizliği
- [x] SmmmRiskOzetiPanel içindeki "Yasal Süreler" kartı kalsın (beyanname odaklı)
- [ ] page.tsx'teki ayrı "Yasal Süreler" kartını kaldır (tekrar)
- [ ] Yerine "Şirket Yasal Yükümlülükler" paneli ekle

### Faz 2: Yeni Panel Geliştirme
- [ ] TTK 376 durumu kartı (mevcut hook kullanılabilir)
- [ ] Genel Kurul takvimi hesaplama
- [ ] Sermaye uyumu kontrolü (31.12.2026 deadline)
- [ ] Ticaret Sicili tescil takibi

### Faz 3: SGK Entegrasyonu (Gelecek Sprint)
- [ ] İşe giriş/çıkış bildirimi takibi
- [ ] APHB durumu
- [ ] Personel listesi senkronizasyonu

---

## 📚 KAYNAKLAR

- [TTK 376 Sermaye Kaybı Uygulaması](https://www.musavirrotasi.com/blog/sermaye-kaybi-ttk-376-kapsaminda-ne-anlama-geliyor-sirketler-2025te-ne-yapmali)
- [2025 SGK İdari Para Cezaları](https://www.eleman.net/is-rehberi/mevzuatlar/2025-yili-idari-para-cezalari-h6522)
- [TTK Değişiklikleri 2025](https://www.musavirrotasi.com/blog/ttk-degisiklikleri-2025-yilinda-neleri-kapsiyor-sirketleri-bekleyen-yenilikler-neler)
- [SGK İşveren Yükümlülükleri](https://www.sgk.gov.tr/Content/Post/d9d838d8-6585-40f5-bbcc-47bd43c59bb4/Isverenin-Yukumlulukleri-2022-05-15-06-17-29)
- [Kur Farkı İstisnası Uzatımı](https://tr.andersen.com/tr/mevzuat-sirkulerleri/detay/56-Turk-Ticaret-Kanununun-376nci-Maddesi-Uygulamasina-Iliskin-Tebligin-Gecici-1nci-Maddesinin-Y/12/101/0)

---

## 💡 SONUÇ

SMMM'lere beyanname takvimi hatırlatmak **gereksiz tekrar**.

Şirketler için TTK, SGK ve Ticaret Sicili sürelerini takip etmek **gerçek katma değer**.

LYNTOS'un "Koruyucu Melek" konseptine uygun olarak, şirket yönetimini **infisah, kişisel sorumluluk ve idari para cezalarından** koruyan bir modül çok daha değerli olacaktır.
