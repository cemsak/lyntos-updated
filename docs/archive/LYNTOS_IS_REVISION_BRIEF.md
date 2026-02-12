# LYNTOS V2 — IS Revizyon Planı & Uygulama Briefi
**Tarih:** 2025-02-04
**Hedef:** IS-1, IS-3, IS-4 revizyonları + Vergus & Dönem Sonu bug fix
**Yöntem:** Bu dokümanı oku → kendi incelemeni yap → plan revizyonlarını öner → uygula

---

## KUTSAL KURALLAR (İHLAL EDİLEMEZ)
1. **MOCK DATA YASAK** — Tüm veriler gerçek DB'den gelmeli
2. **HALÜSİNASYON YASAK** — Emin olmadığın şeyi yazma, doğrula
3. **SESİSTZ HATA YASAK** — Her hata loglanmalı ve kullanıcıya gösterilmeli
4. **SMMM/YMM JARGONU** — Tekdüzen Hesap Planı, VDK, mevzuat referansları kullan
5. **KANIT BAZLI** — Her bulgu dosya yolu + satır numarası ile desteklenmeli

---

## PROJE TEKNİK BİLGİLER

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 |
| Backend | Python FastAPI + SQLite (lyntos.db) |
| Test Client | `CLIENT_048_76E7913D`, period `2025-Q1`, 788 mizan kaydı, NACE 476201 |
| API Base | `http://localhost:8000` |
| UI Base | `http://localhost:3000/v2` |

### Scope Sistemi (KRİTİK)
İki ayrı scope mekanizması var — bu birçok bug'ın kök nedeni:

| Sistem | Hook | Kullanan Sayfalar | Kaynak |
|--------|------|-------------------|--------|
| **Eski** | `useLayoutContext()` | vergus, q1-ozet, donem-sonu, mutabakat | Layout context provider |
| **Yeni** | `useDashboardScope()` | KDV Risk, Muhtasar Risk, Kokpit panelleri | ScopeProvider + localStorage `lyntos_scope` |

**Sorun:** Eski sistem `selectedClient`/`selectedPeriod` kullanıyor. Yeni sistem `scope.client_id`/`scope.period` kullanıyor. Birbirleriyle senkronize DEĞİL. Q1 butonuna tıklayınca scope dolmuyor, layout context doğrudan header'dan geliyor.

---

## GÖREV 1: IS-1 REVİZYON — Q1 Beyanname Özet & Risk Kontrolü

### 1.1 Navigation Değişikliği
**Dosya:** `lyntos-ui/app/v2/_components/layout/navigation.ts`
**Satır:** 66-70

**Mevcut:**
```typescript
{
  id: 'q1-ozet',
  label: '📊 Q1 Beyanname Özet',
  href: '/v2/q1-ozet',
  icon: BarChart3,
}
```

**Olması Gereken:**
```typescript
{
  id: 'q1-ozet',
  label: 'Q1 Beyanname Özet & Risk Kontrolü',
  href: '/v2/q1-ozet',
  icon: PieChart,  // veya BarChart3 + Shield combo icon — renkli grafik + risk temalı
}
```

**NOT:** Kullanıcı "hem çizim grafik var renkli grafik" icon istedi. `PieChart` veya `AreaChart` + renk vurgusu ile sidebar'da öne çıkmalı. Emoji (`📊`) kaldırılacak, yerine Lucide icon kullanılacak.

### 1.2 Invalid Date Sorunu
**Dosya:** `lyntos-ui/app/v2/q1-ozet/page.tsx`
**Kök Neden:** Sayfa `useLayoutContext()` kullanıyor (satır 95). `selectedPeriod` objesi `year` ve `periodNumber` alanları içeriyor. API çağrısında `${selectedPeriod.year}-Q${selectedPeriod.periodNumber}` formatına dönüştürülüyor (satır 133-134). "Invalid date" hatası muhtemelen:
- `selectedPeriod.year` veya `selectedPeriod.periodNumber` undefined/null döndüğünde
- Veya API'den gelen tarih alanları doğru parse edilemediğinde

**Çözüm:**
1. `selectedPeriod` null check'lerini güçlendir
2. API response'taki tarih alanlarını `new Date()` ile parse etmeden önce validate et
3. Fallback değerler ekle: tarih gösterilemiyorsa "—" göster, "Invalid Date" DEĞİL

### 1.3 KDV + Muhtasar Risk Kontrolü Entegrasyonu (EN BÜYÜK GÖREV)
**Hedef:** KDV Risk Kontrol ve Muhtasar Risk Kontrol sayfalarını Q1 Beyanname Özet sayfasına TAB olarak entegre et.

**Kaynak Dosyalar:**
- `lyntos-ui/app/v2/beyanname/kdv/page.tsx` — KDV Risk Kontrol (tam sayfa, `useDashboardScope` kullanıyor, satır 97)
- `lyntos-ui/app/v2/beyanname/muhtasar/page.tsx` — Muhtasar Risk Kontrol (tam sayfa, `useDashboardScope` kullanıyor, satır 90)

**Hedef Dosya:**
- `lyntos-ui/app/v2/q1-ozet/page.tsx` — mevcut Q1 özet sayfası

**Entegrasyon Planı:**
1. Q1 Özet sayfasına 3 tab ekle:
   - **Beyanname Özet** (mevcut içerik — KDV/Muhtasar/Tahakkuk özet tabloları)
   - **KDV Risk Kontrol** (kdv/page.tsx'in içeriğini bileşen olarak al)
   - **Muhtasar Risk Kontrol** (muhtasar/page.tsx'in içeriğini bileşen olarak al)

2. **DİKKAT — Scope Uyumsuzluğu:**
   - Q1 Özet: `useLayoutContext()` → `selectedClient.id`, `selectedPeriod`
   - KDV/Muhtasar: `useDashboardScope()` → `scope.client_id`, `scope.period`
   - **ÇÖZÜM:** KDV ve Muhtasar bileşenlerini refactor ederken, props üzerinden `clientId` ve `period` alacak şekilde düzenle. Böylece parent (Q1 Özet) kendi context'inden gelen değerleri prop olarak geçebilir.

3. **Bileşen Refactoring:**
   - `beyanname/kdv/page.tsx` → İçerik kısmını `_components/beyanname/KDVRiskPanel.tsx` olarak ayır
   - `beyanname/muhtasar/page.tsx` → İçerik kısmını `_components/beyanname/MuhtasarRiskPanel.tsx` olarak ayır
   - Her iki bileşen `clientId: string` ve `period: string` props alsın
   - Orijinal sayfa dosyaları bu bileşenleri wrapper olarak kullansın (backward compat)

4. **SMMM/YMM Mantığı:**
   - Tab yapısı: Beyanname Özet → KDV Risk → Muhtasar Risk sırası mantıklı
   - SMMM önce özeti görür, sonra detaylı risk kontrollerine geçer
   - Her tab'da risk skoru ve uyarı sayısı badge olarak gösterilmeli

---

## GÖREV 2: IS-4 — VERGİ & BEYANNAME → VERGİ & ANALİZ

### 2.1 Navigation Bölüm Adı Değişikliği
**Dosya:** `lyntos-ui/app/v2/_components/layout/navigation.ts`
**Satır:** 162

**Mevcut:** `label: 'Vergi & Beyanname'`
**Olması Gereken:** `label: 'Vergi & Analiz'`

### 2.2 KDV & Muhtasar Nav Item'larını Kaldır
**Dosya:** `lyntos-ui/app/v2/_components/layout/navigation.ts`
**Satır:** 188-199

**Kaldırılacak items:**
```typescript
{
  id: 'beyanname-kdv',
  label: 'KDV Risk Kontrol',
  href: '/v2/beyanname/kdv',
  icon: FilePlus,
},
{
  id: 'beyanname-muhtasar',
  label: 'Muhtasar Risk Kontrol',
  href: '/v2/beyanname/muhtasar',
  icon: FilePlus,
},
```

**NOT:** Sayfa dosyaları (`beyanname/kdv/page.tsx`, `beyanname/muhtasar/page.tsx`) SİLME — backward compatibility için bırak. Sadece nav'dan kaldır. URL ile direkt erişim hala çalışsın.

---

## GÖREV 3: IS-3 — Dönem Sonu Mizan Kontrolü Entegrasyonu

### 3.1 Eksik 1: Step 1 href Düzeltmesi
**Dosya:** `lyntos-ui/app/v2/donem-sonu/page.tsx`
**Satır:** 441

**Mevcut:** `href: '/v2/upload'`

**Sorun:** Step 1 "Mizan Kontrolü" butonu kullanıcıyı veri yükleme sayfasına gönderiyor. Oysa mizan zaten yüklü olabilir ve asıl yapılması gereken defter kontrolü (C1-C4).

**Çözüm:**
- Step 1 click handler'ını değiştir: Eğer mizan verisi varsa → `/v2/defter-kontrol` veya inline olarak C1-C4 kontrollerini çağır
- Eğer mizan yoksa → `/v2/upload` yönlendirmesi doğru
- **Backend endpoint'leri (hazır):**
  - `GET /api/v2/defter-kontrol/full?client_id=X&period=Y` — Tüm C1-C4 kontrolleri
  - `GET /api/v2/defter-kontrol/summary?client_id=X&period=Y` — Hızlı özet

### 3.2 Eksik 2: Step Geçiş Validasyonu
**Dosya:** `lyntos-ui/app/v2/donem-sonu/page.tsx`
**Satır:** 426-431, 488-492

**Mevcut mantık:**
```typescript
const getStepStatus = (stepId: number): 'completed' | 'current' | 'pending' => {
  if (completedSteps.includes(stepId)) return 'completed';
  if (stepId === 1) return 'current';
  if (completedSteps.includes(stepId - 1)) return 'current';
  return 'pending';
};
```

**Sorun:** `handleMarkComplete` (satır 488) kullanıcının manual olarak "tamamla" demesini bekliyor. Hiçbir veri doğrulaması yok. Kullanıcı mizan kontrolü yapmadan Step 2'ye geçebilir.

**Çözüm:**
1. Step 1 tamamlanmadan önce C1-C4 kontrollerini çalıştır
2. C1+C4 (denge kontrolleri) geçerse → Step 1 otomatik tamamlansın
3. C1 veya C4 başarısızsa → Uyarı göster, kullanıcıya düzeltme öner
4. Step 2'ye geçiş için Step 1'in tamamlanmış olmasını ZORLA (sadece alert değil, gerçek engel)

### 3.3 KRİTİK BUG: "Veri Yok" Sorunu
**Dosya:** `lyntos-ui/app/v2/donem-sonu/page.tsx`
**Satır:** 408-411

**Kök Neden:** Sayfa mizan varlığını SADECE localStorage'dan kontrol ediyor:
```typescript
const uploadedData = localStorage.getItem('lyntos_uploaded_data');
const clients = localStorage.getItem('lyntos_clients');
setHasData(!!uploadedData || (clients?.length ?? 0) > 2);
```

**Gerçek:** DB'de 788 mizan kaydı var (`mizan_entries` tablosu, `CLIENT_048_76E7913D`, `2025-Q1`).

**Çözüm:**
1. localStorage kontrolünü kaldır
2. Yerine backend API çağrısı ekle:
   ```typescript
   // Seçenek A (ÖNERİLEN): Period status endpoint
   GET /api/v2/periods/{client_id}/{period_code}/status
   // response.uploaded_doc_types.includes('MIZAN') → hasData = true

   // Seçenek B: Mizan data load
   GET /api/v2/mizan-data/load/{smmm_id}/{client_id}/{period}
   // 200 OK → hasData = true, 404 → hasData = false
   ```
3. **DİKKAT:** Bu sayfa `useLayoutContext()` kullanıyor. `selectedClient` ve `selectedPeriod` yoksa API çağrısı yapılamaz. Scope bekle, sonra API çağır.

---

## GÖREV 4: Vergus "Analiz Yapılıyor" Bug Fix

### 4.1 Sorunun Tam Anatomisi
**Dosya:** `lyntos-ui/app/v2/vergus/page.tsx`
**Satır:** 264

**Mevcut (HARDCODED):**
```tsx
<p className="text-[10px] text-white/60">Potansiyel Tasarruf</p>
<p className="text-2xl font-bold">Analiz Yapılıyor...</p>
```

**Kök Neden:** Bu metin statik. Hiçbir zaman güncellenmez. VergusStrategistPanel bileşeni içeride tasarruf hesaplıyor ama parent'a geri değer dönmüyor.

**VergusStrategistPanel detayları:**
- **Dosya:** `lyntos-ui/app/v2/_components/vergus-strategist/VergusStrategistPanel.tsx`
- İçeride `analysis.total_potential_saving` hesaplıyor (satır 135)
- **Ama** parent'a callback/prop ile dönmüyor
- Props: sadece `clientId`, `clientName`, `period` alıyor

**Çözüm:**
1. VergusStrategistPanel'e `onAnalysisComplete?: (totalSaving: number) => void` callback prop ekle
2. Analiz tamamlandığında callback'i çağır
3. Parent (vergus/page.tsx) state'e kaydet ve header'da göster
4. Loading durumunda "Analiz Yapılıyor...", tamamlandığında gerçek tutarı göster
5. **Format:** `₺45.250` gibi TL formatında göster

### 4.2 Scope Sorunu
**Satır:** 119: `const { selectedClient, selectedPeriod } = useLayoutContext();`

**Sorun:** Eğer `useLayoutContext` scope vermezse sayfa "Mükellef Seçilmedi" gösteriyor. Bu scope'un nasıl dolduğunu incele:
- Layout header'daki client/period seçici
- URL parametreleri
- Kokpit'teki Q1 butonu

**NOT:** Bu scope sorunu IS-1 KDV/Muhtasar entegrasyonundaki uyumsuzlukla aynı kök nedene sahip. Tüm sayfalar tutarlı scope mekanizması kullanmalı.

### 4.3 VergusStrategistPanel API Kontrol
- **API:** `POST /api/v1/vergus/analyze` (DİKKAT: v1 endpoint!)
- Request: `{ client_id, period, financial_data? }`
- Response: `TaxAnalysisResult` → `total_potential_saving`, `opportunities[]`
- **Hook:** `useVergusAnalysis.ts` (satır 33)
- Bu endpoint'in çalıştığını doğrula: `curl -X POST http://localhost:8000/api/v1/vergus/analyze -d '{"client_id":"CLIENT_048_76E7913D","period":"2025-Q1"}'`

---

## GÖREV 5: IS-5 Doğrulama (Sadece Kontrol)

### 5.1 Mevcut Durum
**MCP İnceleme Sonucu:** Mutabakat sayfası SADECE Cari Mutabakat gösteriyor. ✅

**Dosyalar:**
- `lyntos-ui/app/v2/mutabakat/page.tsx` — Sadece Cari Mutabakat tab'ı
- `lyntos-ui/app/v2/mutabakat/cari/page.tsx` — `/v2/mutabakat`'a redirect (backward compat)

**Sonuç:** IS-5 revizyonu TAMAMLANMIŞ. Ek işlem gerekmez.

### 5.2 Banka Mutabakat Nav Item
**Dosya:** `lyntos-ui/app/v2/_components/layout/navigation.ts`
**Satır:** 112-117

Banka Mutabakat hala nav'da var:
```typescript
{
  id: 'banka-mutabakat',
  label: 'Banka Mutabakat',
  href: '/v2/banka/mutabakat',
  icon: FileCheck,
}
```

**Karar:** Bu kalmalı mı kaldırılmalı mı? Banka mutabakatı Cari mutabakatından farklı bir işlev. Kullanıcıya sor veya mevcut haliyle bırak.

---

## UYGULAMA SIRASI (ÖNCELİK)

| Sıra | Görev | Öncelik | Tahmini Süre | Bağımlılıklar |
|------|-------|---------|--------------|----------------|
| 1 | **Görev 2** — Nav rename (Vergi & Analiz) | KOLAY | 5 dk | Yok |
| 2 | **Görev 2** — KDV/Muhtasar nav item kaldır | KOLAY | 5 dk | Yok |
| 3 | **Görev 1.1** — Q1 Özet nav label + icon | KOLAY | 5 dk | Yok |
| 4 | **Görev 3.3** — Dönem Sonu "Veri Yok" fix | ORTA | 30 dk | Backend API erişimi |
| 5 | **Görev 4** — Vergus "Analiz Yapılıyor" fix | ORTA | 45 dk | VergusStrategistPanel refactor |
| 6 | **Görev 1.2** — Invalid Date fix | ORTA | 20 dk | Scope incelemesi |
| 7 | **Görev 1.3** — KDV+Muhtasar tab entegrasyonu | BÜYÜK | 90 dk | Bileşen refactoring |
| 8 | **Görev 3.1** — Step 1 href düzeltme | ORTA | 30 dk | API kontrol |
| 9 | **Görev 3.2** — Step validasyonu | ORTA | 30 dk | Görev 3.1 |

**Toplam tahmini süre:** ~4-5 saat

---

## KRİTİK DOSYA HARİTASI

### Frontend (lyntos-ui/app/v2/)
```
_components/
  layout/
    navigation.ts          ← Nav yapısı (Görev 1.1, 2.1, 2.2)
    useLayoutContext.ts     ← Eski scope sistemi
  scope/
    ScopeProvider.tsx       ← Yeni scope sistemi
  beyanname/
    KDVRiskPanel.tsx        ← OLUŞTURULACAK (Görev 1.3)
    MuhtasarRiskPanel.tsx   ← OLUŞTURULACAK (Görev 1.3)
  vergus-strategist/
    VergusStrategistPanel.tsx ← Callback eklenecek (Görev 4)
    useVergusAnalysis.ts      ← API hook
    WhatIfAnalysis.tsx        ← What-if senaryolar

q1-ozet/
  page.tsx                 ← Tab yapısı eklenecek (Görev 1.3), date fix (Görev 1.2)
vergus/
  page.tsx                 ← Header fix (Görev 4)
donem-sonu/
  page.tsx                 ← Veri Yok fix (Görev 3.3), step fix (Görev 3.1, 3.2)
beyanname/
  kdv/page.tsx             ← Bileşen ayırma kaynağı (Görev 1.3)
  muhtasar/page.tsx        ← Bileşen ayırma kaynağı (Görev 1.3)
mutabakat/
  page.tsx                 ← IS-5 ✅ tamamlanmış
```

### Backend (backend/)
```
api/v2/
  defter_kontrol.py        ← C1-C4 kontrolleri (Görev 3.1)
  mizan_data.py            ← Mizan varlık kontrolü
  periods.py               ← Period status endpoint (Görev 3.3)
  donem_sync.py            ← Dönem sync durumu
  mizan_analiz.py          ← Hesap kartı, yatay, dikey analiz
services/
  mizan_omurga.py          ← MizanOmurgaAnalyzer (IS-7, tamamlanmış)
api/v1/
  vergus_*.py              ← Vergus API (v1!) - kontrol et
```

---

## İNCELEME KONTROL LİSTESİ (YENİ PENCERE İÇİN)

Uygulamaya başlamadan ÖNCE şu kontrolleri yap:

### A. Backend API Doğrulama
```bash
# 1. Defter kontrol endpoint'leri çalışıyor mu?
curl http://localhost:8000/api/v2/defter-kontrol/health
curl "http://localhost:8000/api/v2/defter-kontrol/summary?client_id=CLIENT_048_76E7913D&period=2025-Q1"

# 2. Period status endpoint çalışıyor mu?
curl "http://localhost:8000/api/v2/periods/CLIENT_048_76E7913D/2025-Q1/status"

# 3. Mizan data var mı?
curl "http://localhost:8000/api/v2/mizan-data/load/default/CLIENT_048_76E7913D/2025-Q1"

# 4. Vergus API çalışıyor mu? (DİKKAT: v1 endpoint)
curl -X POST http://localhost:8000/api/v1/vergus/analyze \
  -H "Content-Type: application/json" \
  -d '{"client_id":"CLIENT_048_76E7913D","period":"2025-Q1"}'
```

### B. Frontend Scope Akışı
1. `http://localhost:3000/v2` → Kokpit aç
2. Q1 butonuna tıkla → Scope doluyor mu?
3. Sol menüden Q1 Beyanname Özet'e git → Veri geliyor mu?
4. Vergus'a git → "Mükellef Seçilmedi" mi gösteriyor?

### C. Dosya Okuma (Zorunlu)
Bu dosyaları MUTLAKA oku ve mevcut yapıyı anla:
1. `navigation.ts` — Tam yapı
2. `q1-ozet/page.tsx` — Mevcut tab yapısı var mı?
3. `beyanname/kdv/page.tsx` — Hangi bileşenler kullanılıyor?
4. `beyanname/muhtasar/page.tsx` — Hangi bileşenler kullanılıyor?
5. `vergus/page.tsx` — Header ve VergusStrategistPanel kullanımı
6. `donem-sonu/page.tsx` — Step yapısı ve hasData kontrolü
7. `VergusStrategistPanel.tsx` — Props ve callback yapısı
8. `useVergusAnalysis.ts` — API call detayları

### D. Plan Revizyonu Kontrolü
Bu planı okuduktan ve yukarıdaki kontrolleri yaptıktan sonra:
1. Herhangi bir endpoint çalışmıyorsa → Önce backend fix gerekir
2. Scope sistemi değiştiyse → Plan revizyonu gerekir
3. Dosya yapısı farklıysa → Dosya yollarını güncelle
4. Ek bağımlılıklar varsa → Sıralama değişebilir

---

## DOĞRULAMA KRİTERLERİ (Her görev sonrası)

### Build & Syntax
```bash
# TypeScript kontrol
cd lyntos-ui && npx tsc --noEmit

# Next.js build
cd lyntos-ui && npx next build

# Python syntax (backend değişiklik varsa)
python -m py_compile backend/api/v2/dosya.py
```

### Fonksiyonel Kontrol
1. **Görev 1.1:** Nav'da "Q1 Beyanname Özet & Risk Kontrolü" görünüyor, yeni icon var
2. **Görev 1.2:** Tarih alanlarında "Invalid Date" YOK, gerçek tarihler gösteriliyor
3. **Görev 1.3:** Q1 sayfasında 3 tab var, KDV ve Muhtasar tab'ları gerçek veri gösteriyor
4. **Görev 2:** Nav'da "Vergi & Analiz" yazıyor, KDV/Muhtasar nav item'ları YOK
5. **Görev 3.1:** Dönem Sonu Step 1 tıklanınca C1-C4 kontrol sonuçları gösteriliyor
6. **Görev 3.2:** Step 1 tamamlanmadan Step 2'ye GEÇİLEMİYOR
7. **Görev 3.3:** Dönem Sonu sayfasında "Veri Yok" YOK, mizan verisi tanınıyor
8. **Görev 4:** Vergus header'da gerçek tasarruf tutarı gösteriliyor (₺ formatında)

---

## NOTLAR

### WhatIfAnalysis Durumu
- Bileşen fonksiyonel ama API hatası sessizce yutulur (`.catch(() => {})`)
- Mizan verisi yoksa tüm senaryolar 0 TL gösterir
- Bu sprint'te düzeltme kapsamı dışında ama not edildi

### Scope Birleştirme (Gelecek Sprint)
- `useLayoutContext` ve `useDashboardScope` birleştirilmeli
- Tüm sayfalar tek bir scope mekanizması kullanmalı
- Bu sprint'te sadece prop-based geçiş çözümü uygulanacak (KDV/Muhtasar entegrasyonu için)

### Banka Mutabakat
- Nav'da hala var (satır 112-117)
- Kaldırılması gerekiyorsa kullanıcıya sor
- Bu sprint kapsamında DEĞİL (IS-5 tamamlanmış)
