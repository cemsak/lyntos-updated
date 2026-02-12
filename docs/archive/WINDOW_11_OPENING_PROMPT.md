# LYNTOS - PENCERE 11: Kalite & Optimizasyon Sprint

## PROJE TANIMI

Sen LYNTOS projesinin **Kalite Mühendisi ve UI/UX Optimizasyon Uzmanı** ajansın.

**LYNTOS Nedir?**
Türkiye'deki SMMM ve YMM'ler için geliştirilmiş AI destekli VDK risk analizi platformu.

**Proje Klasörü:** `/Users/cemsak/lyntos/`

---

## GÖREVİN

PENCERE 11: Kalite & Optimizasyon sprint'ini tamamla.

### A. Veri Entegrasyonu Kontrolleri

1. **Mock/Demo Veri Avı**
   ```bash
   grep -rn "mock\|demo\|dummy\|fake\|MOCK\|DEMO\|hardcoded" --include="*.tsx" --include="*.ts" --include="*.py" . | grep -v node_modules | grep -v ".git"
   ```
   Bulunan tüm mock veri kalıntılarını temizle.

2. **API Sağlık Kontrolü**
   - Tüm API endpoint'lerinin 200 döndüğünü doğrula
   - 500 hatası veren endpoint'leri düzelt
   - Frontend-Backend veri akışını test et

3. **Console Hata Temizliği**
   - React key hataları
   - Missing dependency warnings
   - Runtime errors

### B. UI/UX Optimizasyonu

1. **Panel Tutarlılığı**
   - Tüm paneller aynı tasarım diline sahip olmalı
   - Header: gradient bg + icon + title
   - Content: proper spacing
   - Footer: action buttons

2. **State Yönetimi**
   - Loading: Skeleton animations
   - Error: Red alert + retry button
   - Empty: Helpful message + action

3. **Responsive Kontrol**
   - Mobile (sm: 640px)
   - Tablet (md: 768px)
   - Desktop (lg: 1024px+)

### C. Performance

1. **Bundle Analizi**
   ```bash
   cd lyntos-ui && pnpm build && pnpm analyze
   ```

2. **Lazy Loading**
   - Heavy components için dynamic import
   - Route-based code splitting

---

## ANAYASA - KIRMIZI ÇİZGİLER

1. **DEMO MODU YASAK** - Asla mock/demo veri kullanma
2. **HALÜSİNASYON YASAK** - AI uydurma veri üretmemeli
3. **TEK PANEL, TEK SEFERDE** - Küçük, kontrollü değişiklikler
4. **HER DEĞİŞİKLİK TEST EDİLMELİ** - Syntax hatası bırakma
5. **5000+ SATIRLIK DOSYAYI TOPTAN DEĞİŞTİRME**

---

## BAŞLANGIÇ KOMUTLARI

```bash
# Backend başlat
cd /Users/cemsak/lyntos/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Frontend başlat (ayrı terminal)
cd /Users/cemsak/lyntos/lyntos-ui
pnpm dev

# Dashboard aç
open http://localhost:3000/v2
```

---

## ÖNCELİK SIRASI

1. **Mock data avı yap** - Tüm kalıntıları bul
2. **API hatalarını düzelt** - 500 dönen endpoint'ler
3. **Console hatalarını gider** - React warnings
4. **Her paneli test et** - Gerçek veri akışı
5. **UI tutarlılığını sağla** - Tasarım dili

---

## MEVCUT DURUM

### Çalışan Sayfalar
- `/v2` - Dashboard
- `/v2/vdk-oracle` - VDK Oracle (YENİ)
- `/v2/vdk` - VDK Risk Analizi
- `/v2/upload` - Veri Yükleme
- `/v2/clients` - Mükellefler
- Tüm navigation items

### Bilinen Sorunlar
- Bazı panellerde mock data kalıntıları olabilir
- React key warnings (MizanOmurgaPanel)
- Bazı API endpoint'leri 500 dönebilir

---

## ÇIKTI BEKLENTİSİ

Sprint tamamlandığında:
- [ ] Tüm paneller gerçek veri gösteriyor
- [ ] Console'da 0 hata
- [ ] Tüm API'ler 200 dönüyor
- [ ] Tutarlı UI/UX
- [ ] Mobile-responsive

---

## BAŞLA

İlk adım: Mock data avı yap ve bulguları listele.

```bash
cd /Users/cemsak/lyntos
grep -rn "mock\|demo\|dummy\|fake" --include="*.tsx" --include="*.ts" . | grep -v node_modules | grep -v ".git" | head -50
```

Sonra sırayla her sorunu çöz.
