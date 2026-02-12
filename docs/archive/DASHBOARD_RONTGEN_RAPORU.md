# LYNTOS DASHBOARD TAM RÖNTGEN RAPORU

**Tarih:** 21 Ocak 2026
**Analiz Yapan:** Claude (Cowork)
**Analiz Türü:** Frontend kaynak kodu derinlemesine inceleme
**Kapsam:** Sol menü + Ana ekran + Sağ panel + Tüm hook'lar + Tüm paneller

---

## ÖZET TABLO: DASHBOARD'UN GERÇEK DURUMU

| Alan | API Bekliyor mu? | API Endpoint | Gerçek Veri Gelirse Çalışır mı? | Durumu |
|------|------------------|--------------|----------------------------------|--------|
| **Aksiyonlar (Bugün Ne Yapmalıyım)** | ✅ EVET | `/api/v1/contracts/actionable-tasks` | ✅ EVET | Hazır |
| **Dönem Verileri (11 Belge)** | ✅ EVET | `/api/v2/donem/status/{period}` | ✅ EVET | Hazır |
| **KPI Strip (8 Kart)** | ✅ EVET | 8 farklı endpoint | ⚠️ KISMEN | Transform'lar var |
| **Geçici Vergi (12 Kontrol)** | ❌ HAYIR | - | ❌ HAYIR | MOCK - Backend yok |
| **Kurumlar Vergisi (20 Kontrol)** | ❌ HAYIR | - | ❌ HAYIR | MOCK - Backend yok |
| **Mizan Analizi** | ✅ EVET | `/api/v1/contracts/mizan-analysis` | ⚠️ KISMEN | VDK kriterleri FRONTEND'de |
| **Mutabakat Matrisi** | ✅ EVET | `/api/v1/contracts/cross-check` | ⚠️ KISMEN | Transform'lar var |
| **Enflasyon Muhasebesi** | ✅ EVET | `/api/v1/contracts/inflation-adjustment` | ⚠️ KISMEN | API gerçek veri dönmüyor |
| **RegWatch** | ✅ EVET | `/api/v1/contracts/regwatch-status` | ⚠️ KISMEN | Statik beyan takvimi |
| **Sağ Panel (Right Rail)** | ✅ EVET | 3 API paralel | ✅ EVET | Hazır |

---

## 1. SOL MENÜ ANALİZİ (navigation.ts)

### GERÇEK: 42 Menü Öğesi Tanımlı

**Kategoriler:**
1. **Kokpit** (2 öğe): Dashboard, Q1 Özet
2. **Veri** (2 öğe): Veri Yükleme, Mükellefler
3. **Defterler** (6 öğe): Yevmiye, Kebir, Banka, Banka Mutabakat, Cross-Check, e-Defter
4. **Risk Yönetimi** (3 öğe): Bekleyen İşlemler, VDK Risk, Risk Kuralları
5. **Vergi İşlemleri** (9 öğe): Vergus, Dönem Sonu, Geçici Vergi, Kurumlar Vergisi, Beyannameler, KDV, Muhtasar, Tahakkuk, Mutabakat
6. **Enflasyon** (1 öğe): Enflasyon Muhasebesi
7. **Mevzuat** (1 öğe): Mevzuat Takibi
8. **Şirketler Hukuku** (3 öğe): Şirket İşlemleri, Ticaret Sicili, Chat Asistanı
9. **Pratik Bilgiler** (3 öğe): Tüm Bilgiler, Hesaplamalar, Kontrol Listeleri
10. **Raporlar** (2 öğe): Raporlar, Kanıt Paketi
11. **Sistem** (2 öğe): Ayarlar, Yardım

### ⚠️ KRİTİK BULGU:
**42 menü öğesinin ÇOĞUNUN sayfası YOK veya BOŞ!**
- Sadece `/v2` (dashboard) gerçek veri alıyor
- Diğer sayfalar ya placeholder ya da henüz geliştirilmemiş

---

## 2. ANA EKRAN (DASHBOARD) ANALİZİ

### ROW 1: ACİL İŞLER (AksiyonKuyruguPanel)

**Kaynak Dosya:** `useAksiyonlar.ts`

**API Çağrısı:**
```
GET /api/v1/contracts/actionable-tasks?smmm_id=X&client_id=Y&period=Z
Authorization: {token}
```

**GERÇEK DURUM:**
- ✅ Backend'e GERÇEK istek atıyor
- ✅ Token kontrolü var
- ✅ Scope kontrolü var
- ✅ Response mapping yapılıyor
- ⚠️ Backend gerçek task üretmezse BOŞ gösterir (mock fallback YOK)

**Veri Akışı:**
```
Backend API → mapApiTaskToAksiyon() → AksiyonItem[] → AksiyonKuyruguPanel
```

---

### ROW 2: DÖNEM VERİLERİ (DonemVerileriPanel + MissingDocumentsCard)

**Kaynak Dosya:** `useDonemVerileri.ts`, `useDashboardData.ts`

**API Çağrısı:**
```
GET /api/v2/donem/status/{period}?tenant_id=X&client_id=Y
```

**GERÇEK DURUM:**
- ✅ Backend'e GERÇEK istek atıyor
- ✅ Big-6 belge tiplerini kontrol ediyor: MIZAN, BEYANNAME, TAHAKKUK, BANKA, EDEFTER_BERAT, EFATURA_ARSIV
- ✅ Yükleme durumu gösteriyor
- ✅ Eksik belge sayısı gösteriyor

**Kategoriler (BELGE_KATEGORILERI_UI):**
1. Mizan (zorunlu)
2. Beyanname (zorunlu)
3. Tahakkuk (zorunlu)
4. Banka (zorunlu)
5. e-Defter (zorunlu)
6. e-Fatura (zorunlu)
7. Diğer (opsiyonel)

---

### ROW 3: KPI STRIP (8 Kart)

**Kaynak Dosya:** `KpiStrip.tsx`

**GERÇEK DURUM - HER KPI AYRI API ÇAĞRISI YAPIYOR:**

| KPI | Endpoint | Normalize Fonksiyonu | Veri Gelmezse |
|-----|----------|---------------------|---------------|
| Vergi Risk Skoru | `/api/v1/contracts/kurgan-risk` | `normalizeKurganRisk` | "Risk analizi için mizan yükleyin" |
| Veri Kalitesi | `/api/v1/contracts/data-quality` | `normalizeDataQuality` | "Veri kalitesi için belge yükleyin" |
| Mutabakat | `/api/v1/contracts/cross-check` | `normalizeCrossCheck` | "Çapraz kontrol için mizan ve beyanname yükleyin" |
| Geçici Vergi | `/api/v1/contracts/quarterly-tax` | `normalizeQuarterlyTax` | "Geçici vergi hesabı için mizan yükleyin" |
| Kurumlar Vergisi | `/api/v1/contracts/corporate-tax` | `normalizeCorporateTax` | "Kurumlar vergisi hesaplaması için mizan yükleyin" |
| KV Tahmini | `/api/v1/contracts/corporate-tax-forecast` | `normalizeCorporateTaxForecast` | "Tahmin için en az 3 dönem mizan verisi gerekli" |
| Enflasyon | `/api/v1/contracts/inflation-adjustment` | `normalizeInflation` | "Enflasyon düzeltmesi için bilanço yükleyin" |
| Beyan Takvimi | `/api/v1/contracts/regwatch-status` | `normalizeRegwatch` | Statik `getSonrakiBeyan()` kullanıyor |

**⚠️ KRİTİK BULGU:**
- Her KPI `useFailSoftFetch` kullanıyor - hata durumunda UI çökmüyor
- AMA gerçek veri gelmezse "empty" state gösteriyor
- Beyan Takvimi STATIK - backend'den değil, frontend'deki `vergiTakvimi.ts`'den geliyor

---

### ROW 4-5: VERGİ ANALİZLERİ

#### Geçici Vergi Panel

**Kaynak Dosya:** `GeciciVergiPanel.tsx`, `types.ts` (GECICI_VERGI_KONTROLLER)

**⛔ KRİTİK BULGU: TAMAMEN FRONTEND STATIK DATA!**

```typescript
const GECICI_VERGI_KONTROLLER = [
  { id: 'GV-01', baslik: '...', ... },
  { id: 'GV-02', baslik: '...', ... },
  // ... 12 kontrol statik olarak tanımlı
];
```

**GERÇEK DURUM:**
- ❌ Backend API çağrısı YOK
- ❌ Gerçek kontrol yapılmıyor
- ❌ Sadece UI gösteriliyor
- ⚠️ `kontrolDurumlari` prop'u geçilmezse hepsi "bekliyor" görünüyor
- ⚠️ `onKontrolClick` sadece console.log yapıyor

**Kontrol Noktaları (statik):**
- GV-01: Dönem Karı/Zararı
- GV-02: KKEG İlaveler
- GV-03: İstisna ve İndirimler
- ... (12 toplam)

---

#### Kurumlar Vergisi Panel

**Kaynak Dosya:** `KurumlarVergisiPanel.tsx`

**⛔ KRİTİK BULGU: AYNI SORUN - TAMAMEN FRONTEND STATIK DATA!**

- ❌ Backend API çağrısı YOK
- ❌ 20 kontrol (6+6+8) statik tanımlı
- ❌ Gerçek hesaplama yapılmıyor

---

### ROW 6: DETAYLI ANALİZ (3 Kolon)

#### Mizan Analizi (MizanOmurgaPanel)

**Kaynak Dosya:** `MizanOmurgaPanel.tsx` (1327 satır!)

**API Çağrısı:**
```
GET /api/v1/contracts/mizan-analysis?smmm_id=X&client_id=Y&period=Z
```

**⚠️ KRİTİK BULGU: VDK RİSK KRİTERLERİ FRONTEND'DE HESAPLANIYOR!**

```typescript
const VDK_RISK_KRITERLERI = {
  KASA_AKTIF_ORANI: {
    kod: 'K-09',
    esik_uyari: 5,    // %5 üzeri uyarı
    esik_kritik: 15,  // %15 üzeri kritik
  },
  ORTAKLARDAN_ALACAK: {
    kod: 'TF-01',
    esik_uyari: 10,
    esik_kritik: 25,
  },
  // ...
};

function analyzeVdkRiskleri(mizan: MizanHesap[]): VdkRiskBulgusu[] {
  // TÜM HESAPLAMA FRONTEND'DE!
}
```

**VDK Kriterleri (Frontend'de hesaplanıyor):**
- K-09: Kasa/Aktif Oranı
- TF-01: Ortaklardan Alacaklar / Sermaye
- OS-01: Örtülü Sermaye (3x kuralı)
- SA-01: Şüpheli Alacak (tahsilat süresi)
- SD-01: Stok Devir Süresi

**14 Finansal Oran (Frontend'de hesaplanıyor):**
- Cari Oran, Asit-Test, Nakit Oranı
- Borç/Özkaynak, Finansal Kaldıraç
- Alacak Devir, Stok Devir, Aktif Devir
- Brüt Kar, Net Kar, ROA, ROE

**SONUÇ:**
- ✅ Backend'den mizan verisi çekiyor
- ⚠️ AMA TÜM ANALİZ FRONTEND'DE yapılıyor
- ⚠️ Backend sadece ham hesap listesi veriyor

---

#### Mutabakat Matrisi (CrossCheckPanel)

**Kaynak Dosya:** `CrossCheckPanel.tsx`

**API Çağrısı:**
```
GET /api/v1/contracts/cross-check?smmm_id=X&client_id=Y&period=Z
```

**GERÇEK DURUM:**
- ✅ Backend'e istek atıyor
- ✅ `normalizeCrossCheck` ile dönüştürüyor
- ⚠️ Backend gerçek karşılaştırma yapmıyorsa BOŞ gösterir

**Beklenen Kontroller:**
- Mizan 600 vs KDV-1 Matrah
- Mizan 153 vs e-Fatura Alış
- Mizan 191 vs KDV İndirilecek
- Mizan 391 vs KDV Hesaplanan
- Mizan 102 vs Banka Ekstresi
- MPHB vs SGK APHB
- e-Fatura Satış vs KDV Teslim
- e-Fatura Alış vs KDV İndirim

**⚠️ ÖNCEKİ KRİTİK BULGU:**
Cross-check hesaplaması YANLIŞ - Mizan 600 (brüt satış) ile KDV Matrahı (net satış) karşılaştırıyordu!

---

#### Enflasyon Muhasebesi (InflationPanel)

**API Çağrısı:**
```
GET /api/v1/contracts/inflation-adjustment?smmm_id=X&client_id=Y&period=Z
```

**GERÇEK DURUM:**
- ✅ Backend'e istek atıyor
- ⚠️ Backend genelde veri dönmüyor
- ⚠️ UI hazır ama veri yok

---

### ROW 7: REGWATCH

**Kaynak Dosya:** `RegWatchPanel.tsx`

**API Çağrısı:**
```
GET /api/v1/contracts/regwatch-status?smmm_id=X&client_id=Y&period=Z
```

**GERÇEK DURUM:**
- ✅ Backend'e istek atıyor
- ⚠️ AMA Beyan Takvimi kısmı STATIK (`vergiTakvimi.ts`)
- ⚠️ 8 kaynak listesi statik

---

## 3. SAĞ PANEL (RIGHT RAIL) ANALİZİ

**Kaynak Dosya:** `RightRail.tsx`, `useRightRailData.ts`

**API Çağrıları (3 paralel):**
```javascript
Promise.all([
  // 1. Right Rail Summary
  fetch(`/api/v1/contracts/right-rail-summary?period=X&smmm_id=Y&client_id=Z`),

  // 2. Dönem Status
  fetch(`/api/v2/donem/status/{period}?tenant_id=X&client_id=Y`),

  // 3. Data Quality
  fetch(`/api/v1/contracts/data-quality?period=X&smmm_id=Y&client_id=Z`),
]);
```

**Gösterilen Veriler:**
1. **Dönem Durumu** - Header'da
2. **Açık Kritikler** - `criticalCount` API'den
3. **Yüksek Öncelik** - `highCount` API'den
4. **Eksik Belgeler** - Big-6 kontrolünden
5. **Öneriler** - API'den veya hesaplanan
6. **Kanıt Paketi** - API'den veya hesaplanan
7. **Hızlı İşlemler** - Statik linkler

**GERÇEK DURUM:**
- ✅ 3 API paralel çağrılıyor
- ✅ Fail-soft: API hata verse de UI çökmüyor
- ✅ Default değerler var
- ⚠️ API veri dönmezse hesaplanan/statik değerler gösterilir

---

## 4. TÜM API ENDPOINT'LERİ (endpoints.ts)

```typescript
export const ENDPOINTS = {
  TAXPAYERS: '/api/v1/tenants/{tenantId}/taxpayers',
  PERIODS: '/api/v1/tenants/{tenantId}/taxpayers/{taxpayerId}/periods',
  PORTFOLIO: '/api/v1/contracts/portfolio',
  KURGAN_RISK: '/api/v1/contracts/kurgan-risk',
  DATA_QUALITY: '/api/v1/contracts/data-quality',
  ACTIONABLE_TASKS: '/api/v1/contracts/actionable-tasks',
  CORPORATE_TAX: '/api/v1/contracts/corporate-tax',
  CORPORATE_TAX_FORECAST: '/api/v1/contracts/corporate-tax-forecast',
  QUARTERLY_TAX: '/api/v1/contracts/quarterly-tax',
  MIZAN_ANALYSIS: '/api/v1/contracts/mizan-analysis',
  INFLATION_ADJUSTMENT: '/api/v1/contracts/inflation-adjustment',
  CROSS_CHECK: '/api/v1/contracts/cross-check',
  REGWATCH_STATUS: '/api/v1/contracts/regwatch-status',
  PERIOD_COMPLETENESS: '/api/v1/documents/period-completeness',
  SOURCES: '/api/v1/contracts/sources',
  EVIDENCE_RULES: '/api/v1/evidence/rules',
  EXPORT_PDF: '/api/v1/contracts/export-pdf',
  FAKE_INVOICE_RISK: '/api/v1/contracts/fake-invoice-risk',
};
```

**TOPLAM: 18 endpoint tanımlı**

---

## 5. FRONTEND KAPASİTESİ DEĞERLENDİRMESİ

### ✅ HAZIR OLANLAR:

1. **Component Yapısı:** Modüler, tekrar kullanılabilir
2. **State Management:** useDashboardScope, stores
3. **API Entegrasyonu:** useFailSoftFetch pattern
4. **Error Handling:** Fail-soft UI çökmüyor
5. **Empty States:** Veri yokken kullanıcıya bilgi veriyor
6. **Loading States:** Yükleniyor göstergeleri var
7. **Type Safety:** TypeScript ile tip güvenliği

### ⚠️ SORUNLU OLANLAR:

1. **Geçici Vergi Panel:** Backend YOK - tamamen statik
2. **Kurumlar Vergisi Panel:** Backend YOK - tamamen statik
3. **VDK Risk Kriterleri:** Frontend'de hesaplanıyor - backend'de olmalı
4. **Oran Analizleri:** Frontend'de hesaplanıyor - backend'de olmalı
5. **Beyan Takvimi:** Statik - dinamik olmalı
6. **42 Menü Öğesi:** Çoğunun sayfası yok

### ❌ EKSİK OLANLAR:

1. Backend'de gerçek vergi hesaplama
2. Backend'de VDK risk analizi
3. Backend'de çapraz kontrol doğru hesaplama
4. Sol menüdeki sayfaların implementasyonu

---

## 6. SONUÇ VE ÖNERİLER

### Dashboard'un GERÇEK Durumu:

| Özellik | Durum |
|---------|-------|
| **UI/UX** | ✅ Profesyonel görünüm |
| **Component Yapısı** | ✅ İyi organize edilmiş |
| **API Entegrasyonu** | ⚠️ Kısmi - bazı paneller statik |
| **Gerçek Hesaplama** | ❌ Backend'de eksik |
| **Gerçek Veri** | ⚠️ Sadece mizan ve belge durumu |

### Öncelikli Yapılması Gerekenler:

1. **Backend'de Geçici Vergi API'si** - 12 kontrol gerçek hesaplama
2. **Backend'de Kurumlar Vergisi API'si** - 20 kontrol gerçek hesaplama
3. **Backend'de VDK Risk Hesaplama** - Frontend'den taşınmalı
4. **Backend'de Cross-Check Düzeltme** - Doğru karşılaştırma
5. **Sol Menü Sayfaları** - Gerçek implementasyon

### Risk:

⚠️ Şu anda dashboard **GÖRÜNTÜ** olarak çalışıyor ama **GERÇEK VERİ** ile hesaplama yapamıyor. Bir SMMM/YMM bu verilere güvenirse yanlış kararlar alabilir.

---

**Rapor Sonu**
