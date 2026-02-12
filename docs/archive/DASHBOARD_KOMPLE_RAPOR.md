# LYNTOS DASHBOARD KOMPLE ANALİZ RAPORU

## 📐 GENEL MİMARİ

Dashboard 3 ana bölümden oluşuyor:
1. **SOL MENÜ (Sidebar)** - Navigasyon
2. **ORTA ALAN (Main Content)** - Ana dashboard panelleri
3. **SAĞ PANEL (RightRail)** - Dönem özeti ve hızlı erişim

---

## 1️⃣ SOL MENÜ (SIDEBAR) - 42 SAYFA

### Dosya: `/app/v2/_components/layout/navigation.ts`

| Kategori | Sayfa | URL | Amacı |
|----------|-------|-----|-------|
| **KOKPİT** | Kokpit | `/v2` | Ana dashboard |
| | Q1 Özet | `/v2/q1-ozet` | Çeyrek özet |
| **VERİ** | Veri Yükleme | `/v2/upload` | Dosya yükleme |
| | Mükellefler | `/v2/clients` | Müşteri listesi |
| **DEFTERLER** | Yevmiye | `/v2/yevmiye` | Yevmiye defteri görüntüleme |
| | Kebir | `/v2/kebir` | Defteri kebir görüntüleme |
| | Banka | `/v2/banka` | Banka hareketleri |
| | Banka Mutabakat | `/v2/banka/mutabakat` | Banka-mizan karşılaştırma |
| | Yevmiye-Kebir Kontrol | `/v2/cross-check` | Tutarlılık kontrolü |
| | E-Defter Raporları | `/v2/edefter/rapor` | E-defter özeti |
| **RİSK** | Bekleyen İşlemler | `/v2/risk` | Risk kuyruğu |
| | VDK Risk Analizi | `/v2/vdk` | VDK 13 kriter |
| | Risk Kuralları | `/v2/risk/rules` | Kural tanımları |
| **VERGİ** | Vergi Stratejisti | `/v2/vergus` | AI öneri motoru |
| | Dönem Sonu | `/v2/donem-sonu` | Kapanış işlemleri |
| | Geçici Vergi | `/v2/vergi/gecici` | Çeyreklik vergi |
| | Kurumlar Vergisi | `/v2/vergi/kurumlar` | Yıllık vergi |
| | Beyannameler | `/v2/declarations` | Tüm beyanlar |
| | KDV Beyannameleri | `/v2/beyanname/kdv` | KDV detay |
| | Muhtasar | `/v2/beyanname/muhtasar` | Muhtasar detay |
| | Tahakkuklar | `/v2/beyanname/tahakkuk` | Tahakkuk listesi |
| | Mutabakat | `/v2/mutabakat` | Genel mutabakat |
| **ENFLASYON** | Enflasyon Muhasebesi | `/v2/enflasyon` | TMS 29 düzeltme |
| **MEVZUAT** | Mevzuat Takibi | `/v2/regwatch` | Yönetmelik radarı |
| **ŞİRKETLER** | Şirket İşlemleri | `/v2/corporate` | TTK uyum |
| | Ticaret Sicili | `/v2/registry` | Sicil kayıtları |
| | Chat Asistanı | `/v2/corporate/chat` | AI sohbet |
| **PRATİK** | Tüm Bilgiler | `/v2/pratik-bilgiler` | Referans |
| | Hesaplamalar | `/v2/pratik-bilgiler/hesaplamalar` | Hesap araçları |
| | Kontrol Listeleri | `/v2/pratik-bilgiler/kontrol-listeleri` | Checklist |
| **RAPORLAR** | Raporlar | `/v2/reports` | Dönem raporları |
| | Kanıt Paketi | `/v2/reports/evidence` | Denetim dosyası |
| **SİSTEM** | Ayarlar | `/v2/settings` | Kullanıcı ayarları |
| | Yardım | `/v2/help` | Dokümantasyon |

**Sol menü veri bekLEMİYOR** - sadece statik linkler.

---

## 2️⃣ ORTA ALAN (MAIN CONTENT) - 7 SATIR

### Dosya: `/app/v2/dashboard-v3/page.tsx`

Dashboard V3, 7 satırdan oluşuyor:

---

### SATIR 1: ACİL İŞLER (AksiyonKuyruguPanel)

**Konum:** En üst
**Dosya:** `/app/v2/_components/operations/AksiyonKuyruguPanel.tsx`
**Hook:** `useAksiyonlar()`

| Alan | Tip | Kaynak | Açıklama |
|------|-----|--------|----------|
| aksiyonlar | Array | Hook | İş listesi |
| baslik | string | - | İş başlığı |
| aciklama | string | - | Detay |
| oncelik | "acil" \| "yuksek" \| "normal" | - | Öncelik |
| iliskiliVeri | object | - | Bağlantılı kayıt |

**API ÇAĞIRMIYOR** - Hook içinde statik/mock data var.

**Amacı:** SMMM'ye bugün yapması gereken işleri göstermek.

**VERİ AKIŞI:**
```
useAksiyonlar() hook → AksiyonKuyruguPanel → Dashboard
```

**SORUN:** Aksiyonlar gerçek veriden gelmiyor, backend API bağlantısı yok.

---

### SATIR 2: DÖNEM VERİLERİ (DonemVerileriPanel + MissingDocumentsCard)

**Konum:** 2. satır, 2 kolon
**Dosyalar:**
- `/app/v2/_components/donem-verileri/DonemVerileriPanel.tsx`
- `/app/v2/_components/MissingDocumentsCard.tsx`

**Hook:** `useDashboardData()` - `/app/v2/_hooks/useDashboardData.ts`

| Alan | Tip | API Endpoint | Açıklama |
|------|-----|--------------|----------|
| byDocType | Record | `/api/v2/donem/status/{period}` | Belge türü → dosya listesi |
| totalCount | number | aynı | Toplam yüklü dosya |
| syncedAt | string | aynı | Son senkron tarihi |

**BIG-6 Belge Türleri:**
1. MIZAN
2. BEYANNAME
3. TAHAKKUK
4. BANKA
5. EDEFTER_BERAT
6. EFATURA_ARSIV

**VERİ AKIŞI:**
```
Backend /api/v2/donem/status → useDashboardData() → DashboardV3Page
                                                   ↓
                                      DonemVerileriPanel (sol)
                                      MissingDocumentsCard (sağ)
```

**Amacı:** Dönem için hangi belgelerin yüklendiğini/eksik olduğunu göstermek.

---

### SATIR 3: KPI STRIP (8 Kart)

**Konum:** 3. satır
**Dosya:** `/app/v2/_components/kpi/KpiStrip.tsx`
**Hook:** `useFailSoftFetch()` - Her KPI ayrı endpoint çağırıyor

| KPI | API Endpoint | Beklenen Veri | Gösterilen |
|-----|--------------|---------------|------------|
| Vergi Risk Skoru | `/api/v1/contracts/kurgan-risk` | `data.kurgan_risk.score` (0-100) | "85 puan" |
| Veri Kalitesi | `/api/v1/contracts/data-quality` | `data.score` (0-100) | "%75" |
| Mutabakat | `/api/v1/contracts/cross-check` | `data.summary.errors + warnings` | "2 hata" |
| Geçici Vergi | `/api/v1/contracts/quarterly-tax` | `data.tax_amount` | "12,500 TL" |
| Kurumlar Vergisi | `/api/v1/contracts/corporate-tax` | `data.tax_amount` | "45,000 TL" |
| KV Tahmini | `/api/v1/contracts/corporate-tax-forecast` | `data.forecast_amount` | "180,000 TL" |
| Enflasyon | `/api/v1/contracts/inflation-adjustment` | `data.total_adjustment` | "25,000 TL" |
| Beyan Takvimi | `/api/v1/contracts/regwatch-status` | statik takvim | "31 Oca" |

**VERİ AKIŞI:**
```
8 API endpoint (paralel) → useFailSoftFetch() → KpiStrip → KpiCard x 8
```

**Amacı:** Ana metrikleri tek bakışta göstermek.

**SORUNLAR:**
- Çoğu endpoint veri döndürmüyor veya mock data
- Normalizer fonksiyonları bazen yanlış path kullanıyor

---

### SATIR 4-5: VERGİ ANALİZLERİ (2 Kolon)

**Konum:** 4-5. satır, yan yana
**Dosyalar:**
- `/app/v2/_components/vergi-analiz/GeciciVergiPanel.tsx`
- `/app/v2/_components/vergi-analiz/KurumlarVergisiPanel.tsx`

#### GEÇİCİ VERGİ PANELİ

| Alan | Tip | API Endpoint | Açıklama |
|------|-----|--------------|----------|
| Q1-Q4 | object | `/api/v1/contracts/quarterly-tax` | Dönem verileri |
| current_profit | number | - | Cari dönem karı/zararı |
| matrah | number | - | Vergi matrahı |
| calculated_tax | number | - | Hesaplanan vergi |
| payable | number | - | Ödenecek vergi |

**Kontroller (12 adet):**
1. Dönem karı tutarlılığı
2. Matrah hesaplaması
3. Vergi oranı kontrolü
4. Önceki dönem mahsubu
5. Tevkifat kontrolü
6. ... (devamı var)

#### KURUMLAR VERGİSİ PANELİ

| Alan | Tip | API Endpoint | Açıklama |
|------|-----|--------------|----------|
| ticari_kar | object | `/api/v1/contracts/corporate-tax` | Ticari bilanço karı |
| mali_kar | object | - | Mali kar |
| matrah | number | - | KV matrahı |
| hesaplanan_vergi | number | - | %25 hesaplama |
| odenecek_vergi | number | - | Net ödenecek |

**Kontroller (20 adet - 6+6+8):**
- 6 ticari kar kontrolü
- 6 mali kar kontrolü
- 8 beyan kontrolü

---

### SATIR 6: DETAYLI ANALİZ (3 Kolon)

**Konum:** 6. satır, 3 kolon
**Dosyalar:**
- `/app/v2/_components/deepdive/MizanOmurgaPanel.tsx`
- `/app/v2/_components/deepdive/CrossCheckPanel.tsx`
- `/app/v2/_components/deepdive/InflationPanel.tsx`

#### MİZAN ANALİZİ PANELİ (EN DETAYLI)

**Dosya:** 1327 satır kod!

| Alan | Tip | API Endpoint | Açıklama |
|------|-----|--------------|----------|
| hesaplar | Array | `/api/v1/contracts/mizan-analysis` | Hesap listesi |
| accounts | Record | - | Backend raw data |
| summary | object | - | ok/warn/error sayıları |
| totals | object | - | Toplam borç/alacak |

**3 TAB:**
1. **VDK Risk Tab** - 5 kritik kriter analizi
2. **Oran Analizi Tab** - 14 finansal oran
3. **Detaylı Mizan Tab** - Tüm hesapların listesi

**VDK RİSK KRİTERLERİ (Frontend'de hesaplanan!):**

| Kod | Kriter | Eşik Uyarı | Eşik Kritik | Mevzuat |
|-----|--------|------------|-------------|---------|
| K-09 | Kasa/Aktif Oranı | %5 | %15 | VDK Risk Analiz |
| TF-01 | Ortaklardan Alacak/Sermaye | %10 | %25 | KVK 13, TTK 358 |
| OS-01 | İlişkili Kişi Borcu/Özkaynak | 2x | 3x | KVK 12 |
| SA-01 | Tahsilat Süresi | 90 gün | 365 gün | VUK 323 |
| SD-01 | Stok Devir Süresi | 120 gün | 365 gün | VUK 274-278 |

**FİNANSAL ORANLAR (14 adet):**
- Likidite: Cari Oran, Asit-Test, Nakit Oranı
- Mali Yapı: Borç/Özkaynak, Finansal Kaldıraç
- Faaliyet: Alacak/Stok Devir, Tahsilat/Stok Süresi, Aktif Devir
- Karlılık: Brüt/Net Kar Marjı, ROA, ROE

**KRİTİK NOT:** Bu analizler FRONTEND'de hesaplanıyor, backend'den gelen veriye göre. Backend sadece ham mizan verisi gönderiyor.

#### CROSS-CHECK PANELİ

| Alan | Tip | API Endpoint | Açıklama |
|------|-----|--------------|----------|
| checks | Array | `/api/v1/contracts/cross-check` | Kontrol sonuçları |
| type | string | - | "mizan_vs_kdv", "banka_vs_mizan" |
| status | string | - | "ok", "warning", "error" |
| difference | number | - | Fark tutarı |
| reason | string | - | Açıklama |

**3 KONTROL:**
1. Mizan ↔ KDV Beyanname
2. Mizan ↔ E-Fatura
3. Mizan ↔ Banka

#### ENFLASYON PANELİ

| Alan | Tip | API Endpoint | Açıklama |
|------|-----|--------------|----------|
| tufe_data | object | `/api/v1/contracts/inflation-adjustment` | TÜFE verileri |
| coefficient | number | - | Düzeltme katsayısı |
| adjustment | number | - | Düzeltme tutarı |
| entries | Array | - | Düzeltme kayıtları |

---

### SATIR 7: MEVZUAT TAKİBİ (RegWatchPanel)

**Konum:** En alt
**Dosya:** `/app/v2/_components/operations/RegWatchPanel.tsx`

| Alan | Tip | API Endpoint | Açıklama |
|------|-----|--------------|----------|
| events | Array | `/api/v1/contracts/regwatch-status` | Yönetmelik değişiklikleri |
| title | string | - | Başlık |
| source | string | - | "GC", "VDI", "MMYK" |
| severity | string | - | "high", "medium", "low" |
| date | string | - | Yayın tarihi |

**8 GÜVENİLİR KAYNAK:**
1. Resmi Gazete
2. GİB
3. VDK
4. SGK
5. TÜRMOB
6. SPK
7. BDDK
8. Hazine

---

## 3️⃣ SAĞ PANEL (RightRail)

### Dosya: `/app/v2/_components/layout/RightRail.tsx`
### Hook: `/app/v2/_hooks/useRightRailData.ts`

**3 API Çağrısı (Paralel):**
1. `/api/v1/contracts/right-rail-summary` - Özet veriler
2. `/api/v2/donem/status/{period}` - Belge durumu
3. `/api/v1/contracts/data-quality` - Veri kalitesi

| Bölüm | Veri | Kaynak | Amacı |
|-------|------|--------|-------|
| Dönem Durumu Header | acilToplam | API | Kaç acil iş var |
| Açık Kritikler | kritikSayisi | API | Kritik risk sayısı |
| Yüksek Öncelik | yuksekSayisi | API | Yüksek öncelikli sayı |
| Eksik Belgeler | missingDocCount | API | Eksik belge sayısı (6-presentDocCount) |
| Öneriler | topRecommendations | API/Hesaplanan | 3 öneri listesi |
| Kanıt Paketi | evidenceBundleStatus | Hesaplanan | "hazır", "eksik", "bekliyor" |
| Hızlı İşlemler | statik | - | 3 link |

**Amacı:** Dönemin genel durumunu özetlemek ve hızlı erişim sağlamak.

---

## 📊 VERİ AKIŞ DİYAGRAMI

```
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND APIs                             │
├─────────────────────────────────────────────────────────────────┤
│  /api/v1/contracts/                                              │
│    ├── kurgan-risk          → KPI Strip [Vergi Risk Skoru]      │
│    ├── data-quality         → KPI Strip [Veri Kalitesi]         │
│    ├── cross-check          → KPI Strip [Mutabakat]             │
│    │                        → CrossCheckPanel                    │
│    ├── quarterly-tax        → KPI Strip [Geçici Vergi]          │
│    │                        → GeciciVergiPanel                   │
│    ├── corporate-tax        → KPI Strip [Kurumlar Vergisi]      │
│    │                        → KurumlarVergisiPanel               │
│    ├── corporate-tax-forecast → KPI Strip [KV Tahmini]          │
│    ├── inflation-adjustment → KPI Strip [Enflasyon]             │
│    │                        → InflationPanel                     │
│    ├── mizan-analysis       → MizanOmurgaPanel                  │
│    ├── regwatch-status      → KPI Strip [Beyan Takvimi]         │
│    │                        → RegWatchPanel                      │
│    └── right-rail-summary   → RightRail                         │
│                                                                  │
│  /api/v2/donem/             │
│    └── status/{period}      → DonemVerileriPanel                │
│                             → MissingDocumentsCard              │
│                             → RightRail                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND HOOKS                           │
├─────────────────────────────────────────────────────────────────┤
│  useFailSoftFetch()   → KPI Strip (8 ayrı çağrı)                │
│  useDashboardData()   → Dönem Verileri                          │
│  useRightRailData()   → Sağ Panel                               │
│  useAksiyonlar()      → Acil İşler (MOCK DATA!)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DASHBOARD UI                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┬───────────────────────────────┬────────────┐   │
│  │   SIDEBAR   │         MAIN CONTENT          │ RIGHT RAIL │   │
│  │   (42 link) │  Row 1: Acil İşler            │ Dönem Özeti│   │
│  │             │  Row 2: Dönem Verileri (2 col)│ Kritikler  │   │
│  │             │  Row 3: KPI Strip (8 kart)    │ Eksikler   │   │
│  │             │  Row 4-5: Vergi (2 col)       │ Öneriler   │   │
│  │             │  Row 6: Detay (3 col)         │ Kanıt Pak. │   │
│  │             │  Row 7: RegWatch              │ Hızlı Link │   │
│  └─────────────┴───────────────────────────────┴────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ KRİTİK SORUNLAR

### 1. VERİ KAYNAĞINDA TUTARSIZLIK
- Bazı veriler backend'den geliyor
- Bazı veriler frontend'de hesaplanıyor (MizanOmurgaPanel VDK kriterleri)
- Bazı veriler tamamen mock (useAksiyonlar)

### 2. CROSS-CHECK HESAPLAMASI YANLIŞ
Backend'de:
```python
"mizan_600": ciro  # Bu Mizan 600 hesabı bakiyesi
"kdv_beyan_satis": portfolio.get("kdv_matrah", 0)  # Bu KDV matrahı
```
Bu ikisi FARKLI KAVRAMLAR:
- Mizan 600 = Brüt satışlar (iadeler dahil)
- KDV Matrahı = Net satışlar (vergisiz tutar)

### 3. KPI STRIP VERİSİ EKSİK
- 8 KPI'dan sadece 1-2 tanesi gerçek veri gösteriyor
- Diğerleri "Veri yükleyin" diyor veya hiç gelmiyor

### 4. AKSİYONLAR TAMAMEN MOCK
`useAksiyonlar()` hook'u backend'e bağlı değil, hardcoded veri döndürüyor.

### 5. RIGHT-RAIL-SUMMARY ENDPOINT EKSİK
Backend'de `/api/v1/contracts/right-rail-summary` endpoint'i yok veya eksik.

---

## 📋 ÖZET TABLO: HER ALAN NEREDEN VERİ BEKLİYOR

| # | Alan | API Endpoint | Beklenen Veri | Amacı |
|---|------|--------------|---------------|-------|
| 1 | Acil İşler | ❌ YOK | aksiyonlar[] | Bugün yapılacaklar |
| 2 | Dönem Verileri | `/api/v2/donem/status` | byDocType{} | Yüklü belgeler |
| 3 | KPI: Risk Skoru | `/api/v1/contracts/kurgan-risk` | score (0-100) | VDK risk puanı |
| 4 | KPI: Veri Kalitesi | `/api/v1/contracts/data-quality` | score (0-100) | Veri tamlığı |
| 5 | KPI: Mutabakat | `/api/v1/contracts/cross-check` | errors + warnings | Uyumsuzluk sayısı |
| 6 | KPI: Geçici Vergi | `/api/v1/contracts/quarterly-tax` | tax_amount | Dönemlik vergi |
| 7 | KPI: Kurumlar V. | `/api/v1/contracts/corporate-tax` | tax_amount | Yıllık vergi |
| 8 | KPI: KV Tahmini | `/api/v1/contracts/corporate-tax-forecast` | forecast_amount | Tahmin |
| 9 | KPI: Enflasyon | `/api/v1/contracts/inflation-adjustment` | adjustment | TMS 29 |
| 10 | KPI: Beyan Takv. | `/api/v1/contracts/regwatch-status` | events[] | Sonraki beyan |
| 11 | Geçici Vergi Panel | `/api/v1/contracts/quarterly-tax` | Q1-Q4 detay | 12 kontrol |
| 12 | Kurumlar V. Panel | `/api/v1/contracts/corporate-tax` | ticari/mali kar | 20 kontrol |
| 13 | Mizan Analizi | `/api/v1/contracts/mizan-analysis` | accounts[] | VDK + Oranlar |
| 14 | Cross-Check | `/api/v1/contracts/cross-check` | checks[] | 3 mutabakat |
| 15 | Enflasyon | `/api/v1/contracts/inflation-adjustment` | entries[] | Düzeltme |
| 16 | RegWatch | `/api/v1/contracts/regwatch-status` | events[] | Mevzuat |
| 17 | RightRail | 3 endpoint paralel | özet veriler | Dönem durumu |

---

**RAPOR SONU**

Hazırlayan: Claude
Tarih: 2026-01-21
