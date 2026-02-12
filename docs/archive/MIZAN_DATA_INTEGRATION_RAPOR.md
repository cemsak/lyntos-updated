# LYNTOS Mizan Data Integration Raporu

**Tarih:** 2026-01-22
**Amaç:** Dashboard'un Özkan Kırtasiye 2025-Q1 gerçek verilerini göstermesi

---

## Yapılan Değişiklikler

### 1. Backend - Yeni API Endpoint

**Dosya:** `/backend/api/v2/mizan_data.py`

Disk'teki hazır mizan CSV'lerini okuyan ve frontend'e sunan yeni API endpoint'leri:

```
GET  /api/v2/mizan-data/available
     - Disk'teki tüm mevcut SMMM/Client/Period kombinasyonlarını listeler

GET  /api/v2/mizan-data/load/{smmm_id}/{client_id}/{period}
     - Belirtilen dönemin mizan verisini okur
     - Validation, summary, VDK data döndürür

GET  /api/v2/mizan-data/analyze/{smmm_id}/{client_id}/{period}
     - Mizan omurga analizi yapar

GET  /api/v2/mizan-data/account/{smmm_id}/{client_id}/{period}/{hesap_kodu}
     - Belirli hesap kodunun detayını döndürür
```

**Router main.py'ye eklendi (satır 33, 152)**

### 2. Frontend - API Client

**Dosya:** `/lyntos-ui/app/v2/_lib/api/mizanData.ts`

Backend API'yi çağıran TypeScript fonksiyonları:
- `fetchAvailableMizanData()` - Mevcut veriyi listele
- `loadMizanData(smmmId, clientId, period)` - Mizan yükle
- `analyzeMizan(smmmId, clientId, period)` - Analiz yap
- `getAccountDetail(smmmId, clientId, period, hesapKodu)` - Hesap detayı

### 3. Frontend - React Hook

**Dosya:** `/lyntos-ui/app/v2/_hooks/useMizanData.ts`

Dashboard bileşenleri için React hook'ları:
- `useMizanData()` - Ana mizan verisi hook'u
- `useMizanAnalysis()` - Analiz hook'u
- `useVdkData()` - VDK risk verileri hook'u

### 4. Frontend - API Proxy Route

**Dosya:** `/lyntos-ui/app/api/v2/mizan-data/[...path]/route.ts`

CORS sorunlarını önlemek için Next.js proxy:
- Browser istekleri `/api/v2/mizan-data/*` -> Backend `http://localhost:8000/api/v2/mizan-data/*`

### 5. Config Güncelleme

**Dosya:** `/lyntos-ui/app/v2/_lib/config/api.ts`

Yeni `mizanData` endpoint'leri eklendi.

---

### 6. Database Loader Script

**Dosya:** `/backend/scripts/load_ozkan_mizan_to_db.py`

Disk'teki mizan CSV'yi database'e yükleyen script:
- Türkçe sayı formatını parse eder (1.234.567,89)
- Mizan denge kontrolü yapar
- Verification raporu gösterir

---

## Özkan Kırtasiye Veri Konumu

```
/backend/data/luca/HKOZKAN/OZKAN_KIRTASIYE/
├── 2025-Q1__SMOKETEST_COPY_FROM_Q2/
│   ├── mizan.csv (76KB, 478 hesap)
│   ├── beyanname/ (11 PDF: KDV, Muhtasar, Geçici Vergi)
│   └── tahakkuk/ (11 PDF)
└── 2025-Q2/
    ├── mizan.csv
    ├── beyanname/
    └── tahakkuk/
```

---

## Test Talimatları

### ⭐ ADIM 0: VERİYİ DATABASE'E YÜKLE (ÖNCELİKLİ!)

Dashboard'un gerçek veri göstermesi için önce bu scripti çalıştır:

```bash
cd /Users/cem/LYNTOS/lyntos/backend
source venv/bin/activate
python scripts/load_ozkan_mizan_to_db.py
```

Bu script:
- `data/luca/HKOZKAN/OZKAN_KIRTASIYE/2025-Q1__SMOKETEST_COPY_FROM_Q2/mizan.csv` dosyasını okur
- `database/lyntos.db` içindeki `mizan_entries` tablosuna yükler
- Mizan dengesini kontrol eder ve sonuçları gösterir

### 1. Backend'i Başlat

```bash
cd /Users/cem/LYNTOS/lyntos/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 2. API'yi Test Et

```bash
# Mevcut veriyi listele
curl http://localhost:8000/api/v2/mizan-data/available

# Özkan Kırtasiye Q1 verisini yükle
curl "http://localhost:8000/api/v2/mizan-data/load/HKOZKAN/OZKAN_KIRTASIYE/2025-Q1"

# Analiz yap
curl "http://localhost:8000/api/v2/mizan-data/analyze/HKOZKAN/OZKAN_KIRTASIYE/2025-Q1"

# Kasa hesabı detayı
curl "http://localhost:8000/api/v2/mizan-data/account/HKOZKAN/OZKAN_KIRTASIYE/2025-Q1/100"
```

### 3. Frontend'i Başlat

```bash
cd /Users/cem/LYNTOS/lyntos/lyntos-ui
npm run dev
```

### 4. Dashboard'u Aç

1. http://localhost:3000/v2 adresine git
2. Header'dan seçim yap:
   - SMMM: HKOZKAN
   - Mükellef: OZKAN_KIRTASIYE
   - Dönem: 2025-Q1
3. Dashboard gerçek veriyi göstermeli

---

## Entegrasyon Notları

### MizanOmurgaPanel Kullanımı

Mevcut panel `useFailSoftFetch` kullanıyor ve `/api/v1/contracts/mizan-analysis` endpoint'ini çağırıyor.

Yeni hook'u kullanmak için panel güncellenebilir:

```tsx
// Eski:
const envelope = useFailSoftFetch<MizanResult>(
  scopeComplete ? ENDPOINTS.MIZAN_ANALYSIS : null,
  normalizeMizan
);

// Yeni (alternatif):
import { useMizanData, useVdkData } from '../../_hooks/useMizanData';
const { data, isLoading, error, vdkData, summary } = useMizanData();
```

### Scope Mapping

Frontend scope değerleri backend formatına dönüştürülmeli:
- `scope.smmm_id` -> `HKOZKAN`
- `scope.client_id` -> `OZKAN_KIRTASIYE`
- `scope.period` -> `2025-Q1`

useMizanData hook'unda bu mapping zaten yapılıyor (satır 69-79).

---

## Sonraki Adımlar

1. [ ] Backend'i yeniden başlat
2. [ ] API endpoint'lerini test et
3. [ ] Frontend'de useMizanData hook'unu panellere entegre et
4. [ ] Dashboard'un gerçek veri gösterdiğini doğrula
5. [ ] VDK validation endpoint'ini frontend ile entegre et
6. [ ] Cross-check kurallarını implement et

---

## Teknik Detaylar

### Mizan CSV Formatı

```csv
HESAP KODU;HESAP ADI;;BORÇ;ALACAK;BORÇ BAKİYESİ;ALACAK BAKİYESİ
100;KASA;;2.277.554,76;2.205.291,34;72.263,42;
102;BANKALAR;;33.543.566,19;32.441.131,32;1.102.434,87;
...
```

Parser: `/backend/data_engine/mizan_parser.py`
- Türkçe sayı formatı (3.983.434,26) destekleniyor
- Mizan denge kontrolü yapılıyor
- Validation warnings ekleniyor

### VDK Data Çıkartma

`extract_vdk_data()` fonksiyonu mizandan şunları çıkarıyor:
- Kasa bakiyesi (100)
- Banka (102)
- Alıcılar (120)
- Ortaklardan alacak (131)
- Stoklar (15x)
- Devreden KDV (190)
- Satıcılar (320)
- Sermaye (500)
- Aktif/Pasif toplamları
- Brüt kar marjı
- Cari oran
