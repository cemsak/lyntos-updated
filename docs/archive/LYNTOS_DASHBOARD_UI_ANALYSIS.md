# LYNTOS Dashboard UI Analiz Raporu
## Frontend Sistem Mimarı Perspektifinden Kapsamlı Analiz

**Tarih:** 22 Ocak 2026
**Amaç:** Yeni ajan için dashboard'un her pikselinin detaylı analizi
**Hedef Kullanıcı:** SMMM/YMM (Serbest Muhasebeci Mali Müşavir / Yeminli Mali Müşavir)

---

## 📐 GENEL LAYOUT MİMARİSİ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TOP BAR (64px)                                  │
│  [Logo] [Client Selector] [Period Selector]              [Profile] [Logout] │
├────────────┬─────────────────────────────────────────────┬──────────────────┤
│            │                                             │                  │
│   LEFT     │              MAIN CONTENT                   │    RIGHT RAIL    │
│  SIDEBAR   │              (Center Area)                  │    (320px)       │
│  (256px)   │                                             │                  │
│            │  ┌─────────────────────────────────────┐   │  ┌────────────┐  │
│  - Menü    │  │ Intelligence Feed (Dönem Özeti)     │   │  │ Aksiyonlar │  │
│  - Nav     │  └─────────────────────────────────────┘   │  │ (Tasks)    │  │
│            │  ┌─────────────────────────────────────┐   │  └────────────┘  │
│            │  │ KPI Strip (8 Cards)                 │   │                  │
│            │  └─────────────────────────────────────┘   │                  │
│            │  ┌─────────────────────────────────────┐   │                  │
│            │  │ Dönem Verileri Panel                │   │                  │
│            │  └─────────────────────────────────────┘   │                  │
│            │  ┌─────────────────────────────────────┐   │                  │
│            │  │ Deep Dive Panels                    │   │                  │
│            │  └─────────────────────────────────────┘   │                  │
│            │  ┌─────────────────────────────────────┐   │                  │
│            │  │ Vergi Analiz Panelleri              │   │                  │
│            │  └─────────────────────────────────────┘   │                  │
│            │                                             │                  │
├────────────┴─────────────────────────────────────────────┴──────────────────┤
│                           BOTTOM BAR (Optional)                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ TOP BAR - Üst Navigasyon Çubuğu

### Dosya Lokasyonu
```
/app/v2/_components/shell/TopBar.tsx
```

### Görsel Yapı (Soldan Sağa)
```
[LYNTOS Logo] | [Client Dropdown ▼] | [Period Dropdown ▼] | ............ | [👤 Profile] | [🚪 Logout]
```

### Bileşenler

#### 1.1 Logo (Sol Köşe)
- **Konum:** `left-0`
- **Boyut:** 120x40px
- **İşlev:** Ana sayfaya yönlendirme
- **SMMM Kullanımı:** Dashboard'a hızlı dönüş

#### 1.2 Client Selector (Müşteri Seçici)
- **Konum:** Logo'nun sağında
- **Tip:** Dropdown/Combobox
- **Veri Kaynağı:** `useDashboardScope().clients`
- **State:** `scope.client_id`
- **İşlev:**
  - SMMM'nin hangi müşteri üzerinde çalıştığını belirler
  - Seçim değiştiğinde TÜM dashboard yeniden render olur
- **SMMM Kullanımı:**
  - Günde ortalama 5-15 farklı müşteri arasında geçiş
  - Müşteri adını yazarak hızlı arama
- **Teknik Detay:**
  ```typescript
  const { scope, setScope } = useDashboardScope();
  // scope.client_id değiştiğinde tüm veri yeniden fetch edilir
  ```

#### 1.3 Period Selector (Dönem Seçici)
- **Konum:** Client Selector'ın sağında
- **Tip:** Dropdown
- **Format:** `YYYY-QN` (örn: 2025-Q1)
- **Veri Kaynağı:** `scope.available_periods`
- **State:** `scope.period`
- **İşlev:**
  - Hangi çeyrek dönem analiz ediliyor
  - VDK risk kriterleri bu döneme göre hesaplanır
- **SMMM Kullanımı:**
  - Çeyrek sonlarında yoğun kullanım
  - Geçmiş dönemlerle karşılaştırma

#### 1.4 Profile/User Menu (Sağ Köşe)
- **Konum:** `right-0`
- **İçerik:** SMMM adı, email
- **Alt Menü:** Ayarlar, Profil, Çıkış

---

## 2️⃣ LEFT SIDEBAR - Sol Navigasyon Menüsü

### Dosya Lokasyonu
```
/app/v2/_components/shell/Sidebar.tsx
/app/v2/_components/shell/SidebarNav.tsx
```

### Görsel Yapı
```
┌──────────────────┐
│ 📊 Dashboard     │  ← Aktif (Mavi arka plan)
├──────────────────┤
│ 📤 Yükleme       │
├──────────────────┤
│ 📈 Raporlar      │
├──────────────────┤
│ ⚙️ Ayarlar       │
├──────────────────┤
│                  │
│                  │
│                  │
├──────────────────┤
│ v2.0.0           │  ← Versiyon
└──────────────────┘
```

### Menü Öğeleri

#### 2.1 Dashboard
- **Rota:** `/v2/dashboard`
- **İkon:** `LayoutDashboard` (lucide)
- **İşlev:** Ana analiz ekranı
- **SMMM Kullanımı:** Günün %80'i burada geçer

#### 2.2 Yükleme
- **Rota:** `/v2/upload`
- **İkon:** `Upload`
- **İşlev:** Belge yükleme sayfası
- **SMMM Kullanımı:** Dönem başında yoğun kullanım

#### 2.3 Raporlar
- **Rota:** `/v2/reports`
- **İkon:** `FileText`
- **İşlev:** Hazır raporlar (PDF, Excel)
- **SMMM Kullanımı:** Müşteriye sunum öncesi

#### 2.4 Ayarlar
- **Rota:** `/v2/settings`
- **İkon:** `Settings`
- **İşlev:** Sistem ayarları
- **SMMM Kullanımı:** İlk kurulum, nadiren

### Sidebar State
```typescript
// Collapsed/Expanded state
const [collapsed, setCollapsed] = useState(false);
// Collapsed: 64px width, sadece ikonlar
// Expanded: 256px width, ikonlar + text
```

---

## 3️⃣ MAIN CONTENT AREA - Ana İçerik Alanı

### 3.1 Intelligence Feed (Akıllı Özet Paneli)

#### Dosya Lokasyonu
```
/app/v2/_components/dashboard/IntelligenceFeed.tsx
```

#### Görsel Yapı
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🧠 Dönem Özeti                                        [Detay →]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "ABC Şirketi için 2025-Q1 döneminde 3 kritik risk tespit edildi.  │
│   KDV iade riski yüksek seviyede. Stok devir hızı sektör           │
│   ortalamasının altında. Alacak tahsilat süresi uzamış."           │
│                                                                     │
│  📊 Risk Skoru: 72/100 (Yüksek)                                    │
│  ⚠️ Kritik Bulgular: 3                                              │
│  ✅ Normal Alanlar: 10                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Bileşen Detayı
- **Yükseklik:** ~200px
- **Arka Plan:** Gradient (blue-50 → white)
- **İçerik:** AI tarafından üretilen dönem özeti
- **Veri Kaynağı:** Backend `/api/v2/donem/{client_id}/{period}/summary`
- **İşlev:**
  - Dönemin genel durumunu tek bakışta gösterir
  - SMMM'nin hızlı karar vermesini sağlar
- **SMMM Kullanımı:**
  - Sabah ilk bakılan yer
  - Müşteri toplantısı öncesi hızlı özet

---

### 3.2 KPI Strip (Temel Göstergeler Şeridi)

#### Dosya Lokasyonu
```
/app/v2/_components/dashboard/KPIStrip.tsx
/app/v2/_components/dashboard/KPICard.tsx
```

#### Görsel Yapı
```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│  Ciro   │  Kar    │ KDV     │ Nakit   │ Alacak  │  Stok   │ Borç/   │  Risk   │
│ ₺2.5M   │ ₺450K   │ ₺125K   │ ₺890K   │ 45 Gün  │  3.2x   │ Özkyn   │  72     │
│  ↑12%   │  ↑8%    │  ↓5%    │  ↑20%   │  ↑5gün  │  ↓0.3   │  1.8    │  ⚠️     │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

#### 8 KPI Kartı Detayı

##### 3.2.1 Ciro (Net Satışlar)
- **Değer:** Formatlanmış TL (₺1.2M, ₺500K)
- **Trend:** Önceki döneme göre % değişim
- **Renk Kodu:**
  - Yeşil: ↑ artış
  - Kırmızı: ↓ düşüş
- **SMMM Analizi:** Büyüme trendi

##### 3.2.2 Kar (Net Kar)
- **Değer:** Formatlanmış TL
- **Hesaplama:** Gelir - Gider
- **SMMM Analizi:** Karlılık durumu

##### 3.2.3 KDV (KDV Pozisyonu)
- **Değer:** Ödenecek/Devreden KDV
- **Kritik:** VDK Kriter #1 için önemli
- **SMMM Analizi:** KDV iade riski

##### 3.2.4 Nakit (Nakit Pozisyonu)
- **Değer:** Toplam likit varlıklar
- **SMMM Analizi:** Likidite durumu

##### 3.2.5 Alacak Tahsilat Süresi
- **Değer:** Ortalama gün
- **VDK İlgisi:** Kriter #7
- **SMMM Analizi:** Tahsilat performansı

##### 3.2.6 Stok Devir Hızı
- **Değer:** Yıllık devir sayısı
- **VDK İlgisi:** Kriter #8
- **SMMM Analizi:** Stok yönetimi

##### 3.2.7 Borç/Özkaynak Oranı
- **Değer:** Oran (1.5, 2.0 vb)
- **VDK İlgisi:** Kriter #9
- **SMMM Analizi:** Finansal kaldıraç

##### 3.2.8 Risk Skoru
- **Değer:** 0-100 arası
- **Renk Kodu:**
  - 0-30: Yeşil (Düşük Risk)
  - 31-60: Sarı (Orta Risk)
  - 61-100: Kırmızı (Yüksek Risk)
- **SMMM Analizi:** Genel risk durumu

#### KPI Card Bileşeni
```typescript
interface KPICardProps {
  title: string;        // "Ciro"
  value: string;        // "₺2.5M"
  trend?: number;       // 12 (%)
  trendDirection?: 'up' | 'down';
  status?: 'success' | 'warning' | 'danger';
  onClick?: () => void; // Detay modalı aç
}
```

---

### 3.3 Dönem Verileri Panel

#### Dosya Lokasyonu
```
/app/v2/_components/donem-verileri/DonemVerileriPanel.tsx
/app/v2/_components/donem-verileri/BelgeKart.tsx
```

#### Görsel Yapı
```
┌─────────────────────────────────────────────────────────────────────┐
│ 📁 Dönem Verileri                                    [Tümünü Gör]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │ 📄 Mizan    │  │ 📄 KDV      │  │ 📄 e-Defter │  │ 📄 BA-BS    ││
│  │  ✅ Yüklü   │  │  ✅ Yüklü   │  │  ⏳ Bekliyor│  │  ⏳ Bekliyor││
│  │  15.01.2025 │  │  15.01.2025 │  │             │  │             ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │ 📄 Beyanname│  │ 📄 Bilanço  │  │ 📄 Gelir T. │  │ 📄 Nakit A. ││
│  │  ⏳ Bekliyor│  │  ⏳ Bekliyor│  │  ⏳ Bekliyor│  │  ⏳ Bekliyor││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│                                                                     │
│  İlerleme: ████████░░░░░░░░░░░░ 25% (2/8 belge)                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Belge Tipleri (8 Adet)
```typescript
// /app/v2/_components/donem-verileri/types.ts
export type BelgeTipi =
  | 'mizan'           // Mizan
  | 'kdv_beyanname'   // KDV Beyannamesi
  | 'e_defter'        // e-Defter
  | 'ba_bs'           // BA-BS Formları
  | 'vergi_beyanname' // Geçici Vergi Beyannamesi
  | 'bilanco'         // Bilanço
  | 'gelir_tablosu'   // Gelir Tablosu
  | 'nakit_akim';     // Nakit Akım Tablosu
```

#### Belge Kartı Durumları
```typescript
type BelgeDurumu =
  | 'bekleniyor'   // ⏳ Gri, yüklenmemiş
  | 'yukleniyor'   // 🔄 Mavi, işleniyor
  | 'hazir'        // ✅ Yeşil, kullanıma hazır
  | 'hata';        // ❌ Kırmızı, hata var
```

#### BelgeKart Bileşeni
```typescript
interface BelgeKartProps {
  belgeTipi: BelgeTipi;
  durum: BelgeDurumu;
  yuklemeTarihi?: string;
  dosyaAdi?: string;
  onClick: () => void;  // Upload modal aç
}
```

#### SMMM İş Akışı
1. Dönem başında bu panele gelir
2. Her belge kartına tıklayarak dosya yükler
3. İlerleme çubuğundan durumu takip eder
4. Tüm belgeler yüklendiğinde analiz başlar

---

### 3.4 Deep Dive Panels (Detaylı Analiz Panelleri)

#### Dosya Lokasyonu
```
/app/v2/_components/dashboard/DeepDiveSection.tsx
/app/v2/_components/dashboard/DeepDiveCard.tsx
```

#### Görsel Yapı
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔍 Detaylı Analizler                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📊 Finansal Oran Analizi                         [Genişlet]  │   │
│  │ Likidite, karlılık ve faaliyet oranları...                   │   │
│  │ ▶ Cari Oran: 1.8 (Sağlıklı)                                 │   │
│  │ ▶ Asit-Test: 1.2 (Normal)                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📈 Trend Analizi                                 [Genişlet]  │   │
│  │ Son 4 çeyrek karşılaştırma...                                │   │
│  │ [Mini Grafik: ▁▂▅▇]                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🏭 Sektör Karşılaştırma                          [Genişlet]  │   │
│  │ Sektör ortalamaları ile kıyaslama...                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Deep Dive Kartları

##### 3.4.1 Finansal Oran Analizi
- **İçerik:** 15+ finansal oran
- **Kategoriler:** Likidite, Karlılık, Faaliyet, Kaldıraç
- **Görselleştirme:** Gauge charts, comparison bars
- **VDK İlgisi:** Kriterlerin çoğu buradan hesaplanır

##### 3.4.2 Trend Analizi
- **İçerik:** Son 4-8 çeyrek karşılaştırma
- **Görselleştirme:** Line charts, area charts
- **SMMM Kullanımı:** Yıllık değerlendirme

##### 3.4.3 Sektör Karşılaştırma
- **İçerik:** NACE koduna göre sektör ortalamaları
- **Görselleştirme:** Radar chart, benchmark bars
- **Veri Kaynağı:** Backend sektör verileri

---

### 3.5 Vergi Analiz Panelleri (VDK 13 Kriter)

#### Dosya Lokasyonu
```
/app/v2/_components/dashboard/VDKPanel.tsx
/app/v2/_components/dashboard/VDKKriterCard.tsx
```

#### Görsel Yapı
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏛️ VDK Risk Analizi (13 Kriter)                   Risk: 72/100 ⚠️  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │ #1 KDV İade Riski    │  │ #2 Karlılık Sapması  │                │
│  │ ████████████░░ 85%   │  │ ████████░░░░░░ 60%   │                │
│  │ ⚠️ YÜKSEK RİSK       │  │ ⚠️ ORTA RİSK         │                │
│  └──────────────────────┘  └──────────────────────┘                │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │ #3 Stopaj Oranı      │  │ #4 Gider/Gelir Oranı │                │
│  │ ██████░░░░░░░░ 45%   │  │ ████░░░░░░░░░░ 30%   │                │
│  │ ✅ NORMAL            │  │ ✅ DÜŞÜK RİSK        │                │
│  └──────────────────────┘  └──────────────────────┘                │
│                                                                     │
│  ... (13 kriter devam eder)                                        │
│                                                                     │
│  [Detaylı Rapor İndir]  [VDK Simülasyonu Çalıştır]                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 13 VDK Kriteri
```typescript
const VDK_KRITERLERI = [
  { id: 1, ad: 'KDV İade Riski', aciklama: 'KDV iade taleplerinin denetim riski' },
  { id: 2, ad: 'Karlılık Sapması', aciklama: 'Sektör ortalamasından sapma' },
  { id: 3, ad: 'Stopaj Oranı', aciklama: 'Beyan edilen stopaj tutarları' },
  { id: 4, ad: 'Gider/Gelir Oranı', aciklama: 'Anormal gider yapısı' },
  { id: 5, ad: 'Ba-Bs Uyumsuzluğu', aciklama: 'Alış-satış bildirim farkları' },
  { id: 6, ad: 'Kasa Fazlası', aciklama: 'Anormal kasa bakiyesi' },
  { id: 7, ad: 'Alacak Tahsilat', aciklama: 'Uzun vadeli ticari alacaklar' },
  { id: 8, ad: 'Stok Devir Hızı', aciklama: 'Sektör altı stok devri' },
  { id: 9, ad: 'Borç/Özkaynak', aciklama: 'Aşırı kaldıraç kullanımı' },
  { id: 10, ad: 'Transfer Fiyatlandırma', aciklama: 'İlişkili taraf işlemleri' },
  { id: 11, ad: 'Amortisman Politikası', aciklama: 'Anormal amortisman' },
  { id: 12, ad: 'Dönem Kayması', aciklama: 'Gelir/gider dönem uyumsuzluğu' },
  { id: 13, ad: 'E-Belge Uyumu', aciklama: 'E-fatura/defter uyumsuzlukları' },
];
```

#### Kriter Kartı Bileşeni
```typescript
interface VDKKriterCardProps {
  kriter: VDKKriter;
  skor: number;           // 0-100
  durum: 'dusuk' | 'orta' | 'yuksek';
  detay?: string;
  onClick: () => void;    // Detay modalı
}
```

#### SMMM Kullanımı
- Her kriter için risk skoru görür
- Kırmızı/yüksek risk olan kriterlere öncelik verir
- "VDK Simülasyonu" ile tam denetim senaryosu çalıştırır

---

## 4️⃣ RIGHT RAIL - Sağ Panel (320px)

### Dosya Lokasyonu
```
/app/v2/_components/shell/RightRail.tsx
/app/v2/_components/aksiyonlar/AksiyonlarPanel.tsx
```

### Görsel Yapı
```
┌──────────────────────┐
│ 📋 Aksiyonlar        │
│ (Görev Kuyruğu)      │
├──────────────────────┤
│                      │
│ ┌──────────────────┐ │
│ │ ⚠️ Kritik (2)    │ │
│ ├──────────────────┤ │
│ │ □ KDV beyanı     │ │
│ │   kontrol et     │ │
│ │   📅 Bugün       │ │
│ ├──────────────────┤ │
│ │ □ Ba-Bs uyumu    │ │
│ │   doğrula        │ │
│ │   📅 Yarın       │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ 📌 Normal (5)    │ │
│ ├──────────────────┤ │
│ │ □ Mizan kontrolü │ │
│ │ □ Stok sayımı    │ │
│ │ □ ...            │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ ✅ Tamamlanan(3) │ │
│ └──────────────────┘ │
│                      │
│ [+ Yeni Aksiyon]     │
│                      │
└──────────────────────┘
```

### Aksiyon Yapısı
```typescript
interface Aksiyon {
  id: string;
  baslik: string;
  aciklama?: string;
  oncelik: 'kritik' | 'yuksek' | 'normal' | 'dusuk';
  durum: 'bekliyor' | 'devam_ediyor' | 'tamamlandi';
  sonTarih?: Date;
  ilgiliKriter?: number;  // VDK kriter bağlantısı
  olusturan: 'sistem' | 'kullanici';
}
```

### Aksiyon Kaynakları
1. **Sistem Üretimi:** VDK analizi sonucu otomatik
2. **Kullanıcı Ekleme:** Manuel görev ekleme
3. **Takvim Bazlı:** Beyanname tarihleri

### SMMM İş Akışı
- Sabah aksiyonları kontrol eder
- Kritik olanları önce tamamlar
- Tamamlananları işaretler
- Yeni görevler ekler

---

## 5️⃣ BOTTOM BAR - Alt Bilgi Çubuğu (Opsiyonel)

### Dosya Lokasyonu
```
/app/v2/_components/shell/BottomBar.tsx
```

### Görsel Yapı
```
┌─────────────────────────────────────────────────────────────────────┐
│ Son güncelleme: 22.01.2026 14:35  |  Versiyon: 2.0.0  |  © LYNTOS  │
└─────────────────────────────────────────────────────────────────────┘
```

### İçerik
- Son veri güncelleme zamanı
- Sistem versiyonu
- Telif hakkı

---

## 6️⃣ MODAL ve OVERLAY BİLEŞENLERİ

### 6.1 Upload Modal

#### Dosya Lokasyonu
```
/app/v2/_components/modals/UploadModal.tsx
```

#### Görsel Yapı
```
┌─────────────────────────────────────────┐
│ Belge Yükle: Mizan                   ✕ │
├─────────────────────────────────────────┤
│                                         │
│  Mizan dosyası, hesap bazında bakiye    │
│  bilgilerini içermelidir.               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │     📤 Dosyayı sürükleyin      │   │
│  │        veya                     │   │
│  │     [Dosya Seç]                │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Desteklenen: PDF, XLSX, CSV, XML       │
│                                         │
│              [İptal]  [Yükle]           │
└─────────────────────────────────────────┘
```

#### State Akışı
```typescript
// Upload durumları
const [uploading, setUploading] = useState(false);
const [uploaded, setUploaded] = useState(false);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [validationError, setValidationError] = useState<string | null>(null);
const [uploadError, setUploadError] = useState<string | null>(null);
```

### 6.2 Detay Modalları
- KPI Detay Modal
- VDK Kriter Detay Modal
- Aksiyon Detay Modal

### 6.3 Toast Notifications
```
/app/v2/_components/shared/Toast.tsx
```

---

## 7️⃣ SCOPE ve CONTEXT SİSTEMİ

### 7.1 Dashboard Scope

#### Dosya Lokasyonu
```
/app/v2/_components/scope/useDashboardScope.tsx
/app/v2/_components/scope/DashboardScopeProvider.tsx
```

#### Scope Yapısı
```typescript
interface DashboardScope {
  smmm_id: string;      // "HKOZKAN"
  client_id: string;    // "ABC_SIRKETI"
  period: string;       // "2025-Q1"
  clients: Client[];    // Müşteri listesi
  available_periods: string[];  // Mevcut dönemler
}
```

#### Scope Hiyerarşisi
```
SMMM (Hasan Kaan ÖZKAN)
├── Client 1 (ABC Şirketi)
│   ├── 2024-Q1
│   ├── 2024-Q2
│   ├── 2024-Q3
│   ├── 2024-Q4
│   └── 2025-Q1  ← Aktif
├── Client 2 (XYZ Ltd)
│   └── ...
└── Client 3 (123 AŞ)
    └── ...
```

### 7.2 Context Provider Yapısı
```typescript
// Uygulama sarmalı
<DashboardScopeProvider>
  <ToastProvider>
    <ThemeProvider>
      <DashboardShell>
        {children}
      </DashboardShell>
    </ThemeProvider>
  </ToastProvider>
</DashboardScopeProvider>
```

---

## 8️⃣ DATA FLOW (Veri Akışı)

### 8.1 Backend → Frontend Akışı

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backend   │ ──► │   React     │ ──► │    UI       │
│   FastAPI   │     │   Hooks     │     │ Components  │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                   │
     │                    │                   │
     ▼                    ▼                   ▼
/api/v2/donem/    useDonemVerileriV2()   DonemVerileriPanel
{client}/{period}                         KPIStrip
                                          VDKPanel
```

### 8.2 API Endpoint Listesi
```typescript
const API_ENDPOINTS = {
  // Dönem verileri
  donemData: '/api/v2/donem/{client_id}/{period}',
  donemSummary: '/api/v2/donem/{client_id}/{period}/summary',

  // Upload
  upload: '/api/v2/upload',

  // VDK
  vdkAnalysis: '/api/v2/vdk/{client_id}/{period}',

  // Clients
  clients: '/api/v2/clients',
  clientPeriods: '/api/v2/clients/{client_id}/periods',
};
```

### 8.3 React Hook Yapısı
```typescript
// useDonemVerileriV2 örneği
export function useDonemVerileriV2() {
  const { scope } = useDashboardScope();
  const [data, setData] = useState<DonemVerileri | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(
        `${API_BASE}/api/v2/donem/${scope.client_id}/${scope.period}`
      );
      const result = await response.json();
      setData(result);
    };
    fetchData();
  }, [scope.client_id, scope.period]);

  return { data, loading, error };
}
```

---

## 9️⃣ RESPONSIVE DESIGN

### Breakpoint'ler
```css
/* Tailwind breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Layout Değişimleri
```
Desktop (1280px+):
├── Sidebar: 256px (expanded)
├── Main: flex-1
└── RightRail: 320px

Tablet (768px - 1279px):
├── Sidebar: 64px (collapsed, icons only)
├── Main: flex-1
└── RightRail: Hidden (modal olarak açılır)

Mobile (< 768px):
├── Sidebar: Hidden (hamburger menu)
├── Main: full width
└── RightRail: Hidden (bottom sheet)
```

---

## 🔟 PERFORMANS ÖZELLİKLERİ

### 10.1 Loading States
```typescript
// Skeleton loading
<Skeleton className="h-4 w-full" />
<Skeleton className="h-20 w-full" />

// Spinner
<Loader2 className="animate-spin" />

// Progressive loading
{loading ? <KPISkeleton /> : <KPIStrip data={data} />}
```

### 10.2 Error Boundaries
```typescript
// Her major section için
<ErrorBoundary fallback={<ErrorFallback />}>
  <VDKPanel />
</ErrorBoundary>
```

### 10.3 Memoization
```typescript
// Expensive calculations
const vdkScores = useMemo(() =>
  calculateVDKScores(donemData),
  [donemData]
);

// Callback memoization
const handleUpload = useCallback(async (file) => {
  // ...
}, [clientId, period]);
```

---

## 1️⃣1️⃣ DOSYA ORGANİZASYONU

```
/app/v2/
├── _components/
│   ├── dashboard/              # Dashboard bileşenleri
│   │   ├── IntelligenceFeed.tsx
│   │   ├── KPIStrip.tsx
│   │   ├── KPICard.tsx
│   │   ├── DeepDiveSection.tsx
│   │   ├── VDKPanel.tsx
│   │   └── VDKKriterCard.tsx
│   │
│   ├── donem-verileri/         # Dönem verileri
│   │   ├── DonemVerileriPanel.tsx
│   │   ├── BelgeKart.tsx
│   │   ├── types.ts
│   │   ├── useDonemVerileri.ts     # Eski (localStorage)
│   │   ├── useDonemVerileriV2.ts   # Yeni (Backend)
│   │   └── index.ts
│   │
│   ├── aksiyonlar/             # Görev kuyruğu
│   │   ├── AksiyonlarPanel.tsx
│   │   ├── AksiyonCard.tsx
│   │   └── types.ts
│   │
│   ├── shell/                  # Layout bileşenleri
│   │   ├── DashboardShell.tsx
│   │   ├── TopBar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── RightRail.tsx
│   │   └── BottomBar.tsx
│   │
│   ├── modals/                 # Modal bileşenleri
│   │   ├── UploadModal.tsx
│   │   ├── KPIDetailModal.tsx
│   │   └── VDKDetailModal.tsx
│   │
│   ├── scope/                  # Context & Scope
│   │   ├── DashboardScopeProvider.tsx
│   │   └── useDashboardScope.tsx
│   │
│   └── shared/                 # Paylaşılan bileşenler
│       ├── Toast.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Skeleton.tsx
│       └── ErrorBoundary.tsx
│
├── dashboard/
│   └── page.tsx                # Ana dashboard sayfası
│
├── upload/
│   └── page.tsx                # Yükleme sayfası
│
├── layout.tsx                  # V2 root layout
└── page.tsx                    # V2 index (redirect)
```

---

## 1️⃣2️⃣ YENİ AJAN İÇİN ÖNEMLİ NOTLAR

### ⚠️ Dikkat Edilmesi Gerekenler

1. **Scope Bağımlılığı:** Tüm veri bileşenleri `useDashboardScope()` hook'una bağımlıdır. Scope değiştiğinde tüm veriler yeniden fetch edilir.

2. **Backend-Only Mimari:** localStorage KULLANILMAMALI. Tüm veri backend'den gelmeli. Mevcut `useDonemVerileri` (localStorage kullanan) kaldırılacak, sadece `useDonemVerileriV2` kalacak.

3. **VDK Kriterleri:** 13 kriter Türk vergi mevzuatına özgüdür. Hesaplama formülleri backend'de olmalı.

4. **Türkçe UI:** Tüm metin Türkçe. Label'lar `label_tr` field'ından geliyor.

5. **Error Handling:** Her API çağrısı için loading/error state yönetimi zorunlu.

### 🎯 Hedef Kullanıcı Profili

**SMMM (Serbest Muhasebeci Mali Müşavir)**
- Ortalama 20-50 müşterisi var
- Her dönem (çeyrek) sonunda yoğun çalışır
- VDK denetim riskini minimize etmek ister
- Hızlı karar verme ihtiyacı (özet paneller önemli)
- Türkçe terminoloji kullanır

### 📋 UI/UX Öncelikleri

1. **Hız:** Dashboard yüklenme < 2 saniye
2. **Netlik:** Risk durumu tek bakışta anlaşılmalı
3. **Aksiyon Odaklı:** Ne yapılması gerektiği net olmalı
4. **Mobil Uyum:** Tablet'te kullanılabilir olmalı

---

## 1️⃣3️⃣ SONUÇ

Bu rapor, LYNTOS Dashboard'un her pikselini detaylıca analiz etmektedir. Yeni ajan, bu dökümanı referans alarak:

1. Mevcut UI yapısını tam anlayabilir
2. Her bileşenin amacını ve işlevini öğrenebilir
3. SMMM iş akışını kavrayabilir
4. Backend-only mimariye geçişi doğru şekilde tamamlayabilir

**Rapor Sonu**

---

*Hazırlayan: Claude (Opus 4.5)*
*Tarih: 22 Ocak 2026*
*Versiyon: 1.0*
