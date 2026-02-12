# LYNTOS MİMARİ DÖNÜŞÜM PLANI

**Versiyon:** 1.0
**Tarih:** 2025-01-22
**Hazırlayan:** Claude (Önceki Session)
**Hedef:** Production-Ready SMMM/YMM Platformu

---

## 📋 İÇİNDEKİLER

1. [LYNTOS NEDİR?](#1-lyntos-nedir)
2. [ANAYASA VE KIRMIZI ÇİZGİLER](#2-anayasa-ve-kirmizi-çizgiler)
3. [MEVCUT MİMARİ (AS-IS)](#3-mevcut-mimari-as-is)
4. [SORUNLAR VE TEKNİK BORÇLAR](#4-sorunlar-ve-teknik-borçlar)
5. [HEDEF MİMARİ (TO-BE)](#5-hedef-mimari-to-be)
6. [GEÇİŞ PLANI](#6-geçiş-plani)
7. [DETAYLI UYGULAMA ADIMLARI](#7-detayli-uygulama-adimlari)
8. [TEST KRİTERLERİ](#8-test-kriterleri)
9. [KRİTİK DOSYALAR REHBERİ](#9-kritik-dosyalar-rehberi)
10. [YAPILMIŞ HATALAR VE DERSLER](#10-yapilmiş-hatalar-ve-dersler)
11. [AJAN İÇİN TALİMATLAR](#11-ajan-için-talimatlar)

---

## 1. LYNTOS NEDİR?

### Vizyon
LYNTOS, Türkiye'deki **SMMM (Serbest Muhasebeci Mali Müşavir)** ve **YMM (Yeminli Mali Müşavir)** ler için geliştirilmiş bir **mali analiz ve risk yönetimi platformu**dur.

### Kullanıcılar
- **SMMM:** Mükelleflerin defterlerini tutan muhasebeciler
- **YMM:** Denetim ve tasdik yapan yeminli mali müşavirler
- **Mükellef:** Şirketler (anonim, limited, şahıs)

### Ana İşlevler
1. **Dönem Verisi Yükleme:** Mizan, Yevmiye, Kebir, e-Defter, Beyanname (ZIP)
2. **VDK Risk Analizi:** Vergi Denetim Kurulu'nun 13 kritik kriteri
3. **Çapraz Kontrol:** Mizan vs KDV, Mizan vs Banka, Mizan vs Muhtasar
4. **Mevzuat Takibi:** GİB, Resmi Gazete, TÜRMOB güncellemeleri
5. **Şirketler Hukuku:** TTK 376 analizi, sermaye kontrolü
6. **Kanıt Paketi:** Vergi müfettişi için hazır dosya paketi

### Değer Önerisi
- VDK incelemesi öncesi risk tespiti
- Otomatik belge kontrolü
- Mevzuat değişikliği takibi
- Profesyonel raporlama

---

## 2. ANAYASA VE KIRMIZI ÇİZGİLER

### 🔴 KESİNLİKLE YAPILMAYACAKLAR

```
1. MOCK DATA YASAK
   - Hiçbir yerde sahte/test verisi kullanılmayacak
   - Veri yoksa "VERİ YOK" mesajı gösterilecek
   - Demo mode bile gerçek yapıyla çalışmalı

2. HARDCODED VERİ YASAK
   - Vergi oranları, eşikler database'den gelmeli
   - Kontrol tanımları API'den çekilmeli
   - Tarihler hesaplanmalı, yazılmamalı

3. TÜRKÇE KARAKTER BOZULMASI YASAK
   - Tüm dosyalar UTF-8
   - Database UTF-8
   - API response'ları UTF-8

4. KRİTİK HESAP KODLARI DEĞİŞMEZ
   - 100-108: Kasa
   - 102: Bankalar
   - 120-131: Alıcılar
   - 320-329: Satıcılar
   - 191: İndirilecek KDV
   - 391: Hesaplanan KDV
   - 600-699: Gelirler
   - 500-599: Özkaynaklar

5. DÖNEM FORMATI SABİT
   - Format: YYYY-QN (örn: 2025-Q1)
   - Q1: Ocak-Mart
   - Q2: Nisan-Haziran
   - Q3: Temmuz-Eylül
   - Q4: Ekim-Aralık
```

### 🟢 PRENSİPLER

```
1. TEK VERİ KAYNAĞI (Single Source of Truth)
   - Tüm veri Backend Database'den gelmeli
   - localStorage sadece UI state için
   - Frontend parse ETMEMELİ

2. DÖNEM İZOLASYONU
   - Her dönem birbirinden bağımsız
   - Dönem değişince eski veri görünmemeli
   - client_id + period_id = unique key

3. BACKEND PARSE
   - ZIP parsing Backend'de olmalı
   - Frontend sadece dosya gönderir
   - Analiz Backend'de yapılır

4. EAGER ANALYSIS
   - Upload anında analizler çalışmalı
   - Dashboard'da hesaplama olmamalı
   - Sonuçlar database'de saklanmalı

5. HATA DURUMUNDA
   - Açık hata mesajı göster
   - Türkçe ve anlaşılır
   - Kurtarma yolu öner
```

---

## 3. MEVCUT MİMARİ (AS-IS)

### Teknoloji Stack

```
FRONTEND:
├── Framework: Next.js 15 (App Router)
├── UI: React 18 + TypeScript
├── Styling: Tailwind CSS
├── State: Zustand (persist middleware)
├── Icons: Lucide React
└── Port: 3000

BACKEND:
├── Framework: FastAPI (Python)
├── Database: SQLite
├── Auth: JWT (HS256)
├── AI: Claude/OpenAI (optional)
└── Port: 8000

KLASÖR YAPISI:
/lyntos
├── backend/
│   ├── api/v1/          # 20+ endpoint dosyası
│   ├── api/v2/          # Yeni endpoint'ler
│   ├── services/        # Business logic
│   ├── database/        # SQLite DB
│   └── data/luca/       # Müşteri verileri (CSV)
│
└── lyntos-ui/
    └── app/v2/
        ├── _components/  # 80+ component
        ├── _hooks/       # 8 custom hook
        ├── _lib/
        │   ├── stores/   # Zustand stores
        │   ├── parsers/  # 25+ parser
        │   └── api/      # API clients
        └── upload/       # Upload sayfası
```

### Veri Akışı (MEVCUT - SORUNLU)

```
                    ┌─────────────────┐
                    │   USER UPLOAD   │
                    │    (ZIP)        │
                    └────────┬────────┘
                             │
                             ▼
         ┌───────────────────────────────────┐
         │   FRONTEND (useQuarterlyAnalysis) │
         │   - ZIP Extract                   │
         │   - File Detection                │
         │   - Parse (14+ format)            │ ◄── SORUN: Frontend parse ediyor!
         │   - Cross-Check                   │
         └───────────────┬───────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
    ┌───────────────┐        ┌───────────────┐
    │  localStorage │        │   Backend DB  │
    │  (donemStore) │        │ (mizan_sync)  │
    └───────┬───────┘        └───────┬───────┘
            │                        │
            │    İKİ AYRI KAYNAK!    │ ◄── SORUN: Tutarsızlık!
            │                        │
            ▼                        ▼
    ┌───────────────┐        ┌───────────────┐
    │ DonemVerileri │        │ MizanOmurga   │
    │ Panel         │        │ Panel         │
    └───────────────┘        └───────────────┘
```

### Database Tabloları (55 tablo)

**Kritik Tablolar:**
| Tablo | Satır | Açıklama |
|-------|-------|----------|
| `mizan_entries` | 1962 | Mizan hesapları |
| `yevmiye_entries` | 4049 | Yevmiye kayıtları |
| `yevmiye_excel_entries` | 40344 | Excel yevmiye |
| `kebir_entries` | 1286 | Kebir kayıtları |
| `kebir_excel_entries` | 14613 | Excel kebir |
| `kdv_beyanname` | 3 | KDV beyanname |
| `muhtasar_beyanname` | 3 | Muhtasar beyanname |
| `gecici_vergi_beyanname` | 1 | Geçici vergi |
| `document_uploads` | 614 | Yüklenen dosyalar |
| `audit_log` | 2544 | İşlem geçmişi |
| `banka_islemler` | 2891 | Banka işlemleri |

### Frontend Stores

**donemStore (Zustand + localStorage):**
```typescript
{
  // PERSISTED (localStorage ~5KB)
  meta: { clientId, period, quarter, year, uploadedAt },
  fileSummaries: DetectedFileSummary[],
  stats: { total, detected, parsed, failed },

  // IN-MEMORY (50MB+ olabilir)
  detectedFiles: DetectedFile[],
  parsedData: {
    mizan, yevmiye, kebir, edefter,
    kdv, muhtasar, geciciVergi, banka
  }
}
```

**mizanStore (Zustand):**
```typescript
{
  parsedMizan: ParsedMizan | null,
  accounts: AccountBalance[],
  summary: { aktifToplam, pasifToplam, ozSermaye, ... },
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
}
```

### Backend Endpoint'ler (50+)

**Kritik Endpoint'ler:**
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/v1/contracts/mizan-analysis` | GET | Mizan analizi |
| `/api/v1/contracts/kurgan-risk` | GET | VDK risk skoru |
| `/api/v1/contracts/cross-check` | GET | Çapraz kontrol |
| `/api/v1/contracts/quarterly-tax` | GET | Dönemlik vergi |
| `/api/v2/mizan/sync` | POST | Mizan sync |
| `/api/v2/donem/sync` | POST | Dönem sync |
| `/api/v2/feed/{period}` | GET | Intelligence feed |

---

## 4. SORUNLAR VE TEKNİK BORÇLAR

### 🔴 KRİTİK SORUNLAR

#### 4.1 İki Veri Kaynağı Sorunu
```
SORUN: localStorage (donemStore) ve Backend DB aynı veriyi tutuyor
       ama senkronize DEĞİL!

SEMPTOM:
- Q1 yükle → Q2'ye geç → Hala Q1 verisi görünür
- Refresh sonrası veri kaybolur
- Farklı tarayıcıda farklı veri

ÇÖZÜM: localStorage'ı kaldır, tek kaynak Backend
```

#### 4.2 Frontend Parse Sorunu
```
SORUN: 50MB+ ZIP dosyası tarayıcıda parse ediliyor

SEMPTOM:
- Tarayıcı donuyor
- Bellek hatası
- Mobilde çalışmıyor

ÇÖZÜM: Parse işlemi Backend'e taşınmalı
```

#### 4.3 Dönem İzolasyonu Eksikliği
```
SORUN: Dönem değiştiğinde eski veri temizlenmiyor

SEMPTOM:
- Q1 verisi Q2'de görünüyor
- Karışık analizler
- Yanlış risk skorları

ÇÖZÜM: Period değişiminde tam reset (BU YAPILDI)
```

### 🟡 ORTA SEVİYE SORUNLAR

#### 4.4 Hardcoded Kontroller
```
DOSYA: GeciciVergiPanel.tsx, KurumlarVergisiPanel.tsx
SORUN: Vergi kontrolleri kod içinde tanımlı
ÇÖZÜM: Backend API'den çekilmeli
```

#### 4.5 Parser Duplikasyonu
```
SORUN: Aynı parser hem frontend hem backend'de var
- Frontend: _lib/parsers/
- Backend: services/parsers/

ÇÖZÜM: Sadece Backend'de parser olmalı
```

#### 4.6 Error Handling Eksikliği
```
SORUN: Hata durumunda kullanıcıya bilgi yok
- Console.error ile bırakılmış
- UI'da "bir şeyler ters gitti" yok

ÇÖZÜM: Proper error boundary + toast notifications
```

### 🟢 DÜŞÜK SEVİYE SORUNLAR

- Test coverage düşük
- TypeScript strict mode kapalı
- API documentation eksik
- Logging tutarsız

---

## 5. HEDEF MİMARİ (TO-BE)

### Yeni Veri Akışı

```
                    ┌─────────────────┐
                    │   USER UPLOAD   │
                    │    (ZIP)        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    FRONTEND     │
                    │  (Sadece UI)    │
                    │                 │
                    │  POST /upload   │
                    │  multipart/form │
                    └────────┬────────┘
                             │
                             ▼
         ┌───────────────────────────────────┐
         │          BACKEND                  │
         │                                   │
         │  1. ZIP Extract                   │
         │  2. File Detection                │
         │  3. Parse (14+ format)            │
         │  4. Database'e yaz                │
         │  5. Analizleri çalıştır           │
         │  6. Response dön                  │
         │                                   │
         └───────────────┬───────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   SQLite DATABASE   │
              │                     │
              │  - mizan_entries    │
              │  - yevmiye_entries  │
              │  - analysis_results │
              │  - vdk_findings     │
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   DASHBOARD API     │
              │                     │
              │ GET /api/v2/donem   │
              │ /{client}/{period}  │
              │                     │
              │ Tek endpoint,       │
              │ tüm veri            │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   ALL COMPONENTS    │
              │                     │
              │  - DonemVerileri    │
              │  - MizanOmurga      │
              │  - KpiStrip         │
              │  - VdkExpert        │
              │                     │
              │  TEK VERİ KAYNAĞI   │
              └─────────────────────┘
```

### Yeni Database Şeması (Ek Tablolar)

```sql
-- Dönem ana tablosu
CREATE TABLE donem (
    id TEXT PRIMARY KEY,  -- "OZKAN_KIRTASIYE_2025-Q1"
    smmm_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    period TEXT NOT NULL,  -- "2025-Q1"
    status TEXT DEFAULT 'created',  -- created, uploading, parsing, analyzing, ready, error
    uploaded_at TIMESTAMP,
    analyzed_at TIMESTAMP,
    error_message TEXT,
    UNIQUE(client_id, period)
);

-- Yüklenen dosyalar (mevcut document_uploads genişletilecek)
CREATE TABLE donem_files (
    id TEXT PRIMARY KEY,
    donem_id TEXT REFERENCES donem(id),
    original_name TEXT,
    file_type TEXT,  -- MIZAN_EXCEL, KDV_PDF, etc.
    file_size INTEGER,
    parse_status TEXT DEFAULT 'pending',  -- pending, parsing, success, error
    parse_error TEXT,
    parsed_at TIMESTAMP,
    row_count INTEGER,  -- Parse edilen satır sayısı
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analiz sonuçları (hesaplanmış, cache)
CREATE TABLE analysis_results (
    id INTEGER PRIMARY KEY,
    donem_id TEXT REFERENCES donem(id),
    analysis_type TEXT NOT NULL,  -- vdk_risk, oran_analizi, cross_check
    result_json TEXT,  -- JSON olarak sonuçlar
    calculated_at TIMESTAMP,
    is_stale BOOLEAN DEFAULT 0,  -- Veri değişince true olur
    UNIQUE(donem_id, analysis_type)
);

-- VDK Bulguları (detaylı)
CREATE TABLE vdk_findings (
    id INTEGER PRIMARY KEY,
    donem_id TEXT REFERENCES donem(id),
    kriter_kodu TEXT NOT NULL,  -- K-09, TF-01, OS-01, etc.
    kriter_adi TEXT,
    severity TEXT,  -- kritik, uyari, bilgi
    hesaplanan_deger REAL,
    esik_deger REAL,
    durum TEXT,  -- asim, normal, eksik_veri
    aciklama TEXT,
    oneri TEXT,
    mevzuat_ref TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Yeni API Endpoint'leri

```
POST /api/v2/upload
├── Input: multipart/form-data (ZIP file)
├── Process: Extract → Parse → Save → Analyze
└── Output: { donem_id, status, files_parsed, errors }

GET /api/v2/donem/{client_id}/{period}
├── Input: client_id, period (path params)
├── Process: DB'den tüm veriyi çek
└── Output: {
      meta: { status, uploaded_at, analyzed_at },
      files: [ { name, type, status, row_count } ],
      mizan: { hesaplar, toplamlar, denge },
      analysis: {
        vdk_risks: [ { kriter, severity, deger, esik } ],
        oranlar: [ { oran, deger, benchmark } ],
        cross_check: { status, checks }
      }
    }

DELETE /api/v2/donem/{client_id}/{period}
├── Input: client_id, period
├── Process: Tüm dönem verisini sil
└── Output: { success, deleted_count }
```

### Yeni Frontend Hook

```typescript
// TEK HOOK - TÜM VERİ BURADAN
function useDonemData(clientId: string, period: string) {
  return useQuery({
    queryKey: ['donem', clientId, period],
    queryFn: () => fetchDonemData(clientId, period),
    staleTime: 5 * 60 * 1000, // 5 dk cache
    enabled: !!clientId && !!period,
  });
}

// Kullanım
function Dashboard() {
  const { scope } = useDashboardScope();
  const { data, isLoading, error } = useDonemData(scope.client_id, scope.period);

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  if (!data?.mizan) return <NoData />;

  return (
    <>
      <DonemVerileriPanel files={data.files} />
      <MizanOmurgaPanel mizan={data.mizan} vdk={data.analysis.vdk_risks} />
      <KpiStrip analysis={data.analysis} />
    </>
  );
}
```

---

## 6. GEÇİŞ PLANI

### Faz 0: Hazırlık (1 gün)
- [ ] Mevcut sistemi test et, çalıştığını doğrula
- [ ] Git branch oluştur: `refactor/backend-upload`
- [ ] Backup al

### Faz 1: Backend Upload Endpoint (2-3 gün)
- [ ] `/api/v2/upload` endpoint'i oluştur
- [ ] ZIP extraction backend'e taşı
- [ ] File detection backend'e taşı
- [ ] Parser'ları backend'e taşı (veya mevcut olanları kullan)
- [ ] Database'e yazma
- [ ] Test: Postman ile ZIP upload

### Faz 2: Yeni Dönem API (1-2 gün)
- [ ] `/api/v2/donem/{client}/{period}` endpoint'i
- [ ] Tüm veriyi tek response'da döndür
- [ ] Analysis sonuçlarını dahil et
- [ ] Test: Response yapısı

### Faz 3: Frontend Entegrasyonu (2-3 gün)
- [ ] `useDonemData` hook'u yaz
- [ ] Upload sayfasını yeni API'ye bağla
- [ ] localStorage kullanımını kaldır
- [ ] Tüm componentleri yeni hook'a bağla
- [ ] Test: E2E akış

### Faz 4: Analiz Motoru (2-3 gün)
- [ ] VDK analizlerini upload anında çalıştır
- [ ] Sonuçları `vdk_findings` tablosuna yaz
- [ ] Oran analizlerini hesapla
- [ ] Cross-check'leri çalıştır
- [ ] Test: Analiz sonuçları

### Faz 5: Cleanup ve Optimizasyon (1-2 gün)
- [ ] Eski kod temizliği
- [ ] Error handling
- [ ] Logging
- [ ] Performance optimizasyonu
- [ ] Documentation

**Toplam Süre: 9-14 gün**

---

## 7. DETAYLI UYGULAMA ADIMLARI

### 7.1 Backend Upload Endpoint

**Dosya:** `/backend/api/v2/upload.py`

```python
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import zipfile
import tempfile
from typing import Optional
from services.file_detector import detect_file_type
from services.parsers import parse_file
from database import get_db

router = APIRouter(prefix="/api/v2", tags=["upload"])

@router.post("/upload")
async def upload_donem_zip(
    file: UploadFile = File(...),
    smmm_id: str = Form(...),
    client_id: str = Form(...),
    period: str = Form(...)  # Format: 2025-Q1
):
    """
    Dönem verisi yükle (ZIP)

    1. ZIP'i extract et
    2. Dosyaları tanı
    3. Parse et
    4. Database'e yaz
    5. Analizleri çalıştır
    """

    # Validations
    if not file.filename.endswith('.zip'):
        raise HTTPException(400, "Sadece ZIP dosyası kabul edilir")

    if not re.match(r'^\d{4}-Q[1-4]$', period):
        raise HTTPException(400, "Dönem formatı: YYYY-QN (örn: 2025-Q1)")

    # Create donem record
    donem_id = f"{client_id}_{period}"

    with get_db() as db:
        # Upsert donem
        db.execute("""
            INSERT OR REPLACE INTO donem (id, smmm_id, client_id, period, status, uploaded_at)
            VALUES (?, ?, ?, ?, 'uploading', datetime('now'))
        """, (donem_id, smmm_id, client_id, period))

        # Clear old data for this period
        db.execute("DELETE FROM mizan_entries WHERE client_id = ? AND period_id = ?", (client_id, period))
        db.execute("DELETE FROM donem_files WHERE donem_id = ?", (donem_id,))

    # Process ZIP
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # Save and extract ZIP
            zip_path = Path(tmpdir) / file.filename
            with open(zip_path, 'wb') as f:
                content = await file.read()
                f.write(content)

            # Extract
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(tmpdir)

            # Process files
            results = []
            for fpath in Path(tmpdir).rglob('*'):
                if fpath.is_file() and not fpath.name.startswith('.'):
                    # Detect type
                    file_type = detect_file_type(fpath)

                    # Parse
                    parse_result = parse_file(fpath, file_type)

                    # Save to database
                    save_parsed_data(db, donem_id, client_id, period, file_type, parse_result)

                    results.append({
                        'file': fpath.name,
                        'type': file_type,
                        'status': 'success' if parse_result else 'skipped',
                        'rows': len(parse_result) if parse_result else 0
                    })

        # Run analyses
        run_analyses(donem_id, client_id, period)

        # Update status
        with get_db() as db:
            db.execute("""
                UPDATE donem SET status = 'ready', analyzed_at = datetime('now')
                WHERE id = ?
            """, (donem_id,))

        return {
            "success": True,
            "donem_id": donem_id,
            "period": period,
            "files": results,
            "status": "ready"
        }

    except Exception as e:
        with get_db() as db:
            db.execute("""
                UPDATE donem SET status = 'error', error_message = ?
                WHERE id = ?
            """, (str(e), donem_id))
        raise HTTPException(500, f"Upload hatası: {str(e)}")
```

### 7.2 Dönem API Endpoint

**Dosya:** `/backend/api/v2/donem_data.py`

```python
@router.get("/donem/{client_id}/{period}")
async def get_donem_data(
    client_id: str,
    period: str,
    user: dict = Depends(verify_token)
):
    """
    Dönem verisini getir - TEK ENDPOINT, TÜM VERİ
    """

    with get_db() as db:
        # Get donem meta
        donem = db.execute("""
            SELECT * FROM donem WHERE client_id = ? AND period = ?
        """, (client_id, period)).fetchone()

        if not donem:
            return {"has_data": False, "message": "Bu dönem için veri yüklenmemiş"}

        # Get files
        files = db.execute("""
            SELECT * FROM donem_files WHERE donem_id = ?
        """, (donem['id'],)).fetchall()

        # Get mizan
        mizan_entries = db.execute("""
            SELECT * FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            ORDER BY hesap_kodu
        """, (client_id, period)).fetchall()

        # Get analyses (cached)
        vdk_findings = db.execute("""
            SELECT * FROM vdk_findings WHERE donem_id = ?
        """, (donem['id'],)).fetchall()

        analysis_results = db.execute("""
            SELECT * FROM analysis_results WHERE donem_id = ?
        """, (donem['id'],)).fetchall()

        # Calculate totals
        toplam_borc = sum(m['borc_bakiye'] or 0 for m in mizan_entries)
        toplam_alacak = sum(m['alacak_bakiye'] or 0 for m in mizan_entries)

        return {
            "has_data": True,
            "meta": {
                "donem_id": donem['id'],
                "client_id": client_id,
                "period": period,
                "status": donem['status'],
                "uploaded_at": donem['uploaded_at'],
                "analyzed_at": donem['analyzed_at']
            },
            "files": [dict(f) for f in files],
            "mizan": {
                "hesaplar": [dict(m) for m in mizan_entries],
                "toplam_borc": toplam_borc,
                "toplam_alacak": toplam_alacak,
                "fark": abs(toplam_borc - toplam_alacak),
                "dengeli": abs(toplam_borc - toplam_alacak) < 1
            },
            "analysis": {
                "vdk_risks": [dict(v) for v in vdk_findings],
                "results": {r['analysis_type']: json.loads(r['result_json']) for r in analysis_results}
            }
        }
```

### 7.3 Frontend Hook

**Dosya:** `/lyntos-ui/app/v2/_hooks/useDonemData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { useDashboardScope } from '../_components/scope/useDashboardScope';

interface DonemData {
  has_data: boolean;
  meta?: {
    donem_id: string;
    client_id: string;
    period: string;
    status: 'created' | 'uploading' | 'parsing' | 'analyzing' | 'ready' | 'error';
    uploaded_at: string;
    analyzed_at: string;
  };
  files?: Array<{
    id: string;
    original_name: string;
    file_type: string;
    parse_status: string;
    row_count: number;
  }>;
  mizan?: {
    hesaplar: Array<{
      hesap_kodu: string;
      hesap_adi: string;
      borc_bakiye: number;
      alacak_bakiye: number;
    }>;
    toplam_borc: number;
    toplam_alacak: number;
    fark: number;
    dengeli: boolean;
  };
  analysis?: {
    vdk_risks: Array<{
      kriter_kodu: string;
      kriter_adi: string;
      severity: 'kritik' | 'uyari' | 'bilgi';
      hesaplanan_deger: number;
      esik_deger: number;
      durum: string;
      oneri: string;
    }>;
    results: Record<string, any>;
  };
}

async function fetchDonemData(clientId: string, period: string): Promise<DonemData> {
  const token = getAuthToken();
  const response = await fetch(
    `/api/v2/donem/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export function useDonemData() {
  const { scope } = useDashboardScope();

  return useQuery({
    queryKey: ['donem', scope.client_id, scope.period],
    queryFn: () => fetchDonemData(scope.client_id, scope.period),
    enabled: !!scope.client_id && !!scope.period,
    staleTime: 5 * 60 * 1000, // 5 dakika cache
    retry: 2,
  });
}

// Selector hooks
export function useDonemMeta() {
  const { data } = useDonemData();
  return data?.meta;
}

export function useDonemFiles() {
  const { data } = useDonemData();
  return data?.files || [];
}

export function useDonemMizan() {
  const { data } = useDonemData();
  return data?.mizan;
}

export function useDonemAnalysis() {
  const { data } = useDonemData();
  return data?.analysis;
}

export function useVdkRisks() {
  const { data } = useDonemData();
  return data?.analysis?.vdk_risks || [];
}
```

---

## 8. TEST KRİTERLERİ

### Her Faz Sonunda Kontrol Listesi

#### Faz 1 Testleri (Backend Upload)
```bash
# 1. ZIP upload çalışıyor mu?
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@Q1.zip" \
  -F "smmm_id=HKOZKAN" \
  -F "client_id=OZKAN_KIRTASIYE" \
  -F "period=2025-Q1"

# Beklenen: { "success": true, "files": [...], "status": "ready" }

# 2. Database'e yazıldı mı?
sqlite3 database/lyntos.db "SELECT COUNT(*) FROM mizan_entries WHERE period_id='2025-Q1'"
# Beklenen: 1000+ satır

# 3. Hata durumu
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@invalid.txt" \
  -F "period=2025-Q1"
# Beklenen: 400 Bad Request
```

#### Faz 2 Testleri (Dönem API)
```bash
# 1. Dönem verisi getir
curl http://localhost:8000/api/v2/donem/OZKAN_KIRTASIYE/2025-Q1 \
  -H "Authorization: Bearer TOKEN"

# Beklenen: Tüm veri tek response'da

# 2. Veri yoksa
curl http://localhost:8000/api/v2/donem/OZKAN_KIRTASIYE/2025-Q4
# Beklenen: { "has_data": false, "message": "..." }
```

#### Faz 3 Testleri (Frontend)
```
1. Upload sayfası:
   - ZIP sürükle bırak çalışıyor mu?
   - Progress gösteriliyor mu?
   - Başarı mesajı çıkıyor mu?

2. Dashboard:
   - Dönem seçince veri geliyor mu?
   - Dönem değişince eski veri temizleniyor mu?
   - Loading state düzgün mü?
   - Error state düzgün mü?

3. Tüm paneller:
   - MizanOmurgaPanel veri gösteriyor mu?
   - KpiStrip hesaplamalar doğru mu?
   - DonemVerileriPanel dosyaları listliyor mu?
```

---

## 9. KRİTİK DOSYALAR REHBERİ

### Backend

| Dosya | Açıklama | Dokunulacak mı? |
|-------|----------|-----------------|
| `main.py` | Router registration | EVET - Yeni router ekle |
| `api/v1/contracts.py` | Mevcut endpoint'ler | HAYIR - Dokunma |
| `api/v2/upload.py` | YENİ - Upload endpoint | OLUŞTUR |
| `api/v2/donem_data.py` | YENİ - Dönem API | OLUŞTUR |
| `services/file_detector.py` | Dosya tipi algılama | VAR - Kullan |
| `services/parsers/` | Parser'lar | VAR - Kullan |

### Frontend

| Dosya | Açıklama | Dokunulacak mı? |
|-------|----------|-----------------|
| `_hooks/useDonemData.ts` | YENİ - Ana hook | OLUŞTUR |
| `_lib/stores/donemStore.ts` | localStorage store | SİL/KALDIR |
| `_lib/stores/mizanStore.ts` | Mizan store | SİL/KALDIR |
| `upload/page.tsx` | Upload sayfası | DEĞİŞTİR |
| `page.tsx` | Dashboard | DEĞİŞTİR |
| `_components/donem-verileri/` | Dönem panel | DEĞİŞTİR |
| `_components/deepdive/MizanOmurgaPanel.tsx` | Mizan panel | DEĞİŞTİR |

### Dokunulmayacak Dosyalar

```
❌ api/v1/contracts.py - Mevcut endpoint'ler çalışıyor
❌ _components/layout/ - Layout değişmeyecek
❌ _components/shared/ - UI componentleri değişmeyecek
❌ middleware/auth.py - Auth değişmeyecek
```

---

## 10. YAPILMIŞ HATALAR VE DERSLER

### Hata 1: localStorage Boyut Limiti
```
HATA: 50MB mizan verisi localStorage'a yazılmaya çalışıldı
SONUÇ: QuotaExceededError
DERS: Büyük veri localStorage'da tutulmaz, backend'e gider
```

### Hata 2: Dönem Kontrolü Eksikliği
```
HATA: Q1 yüklenip Q2 seçildiğinde Q1 verisi görünmeye devam etti
SONUÇ: Kullanıcı karışıklığı
DERS: Her dönem değişiminde state temizlenmeli
ÇÖZÜM: useDonemVerileri'ye dönem kontrolü eklendi (BU YAPILDI)
```

### Hata 3: İki Veri Kaynağı
```
HATA: DonemVerileriPanel localStorage'dan, MizanOmurgaPanel backend'den okudu
SONUÇ: Tutarsız veri
DERS: Tek kaynak (Single Source of Truth) şart
```

### Hata 4: Frontend Parse
```
HATA: 50MB ZIP tarayıcıda parse edildi
SONUÇ: Tarayıcı donması, mobilde çökme
DERS: Ağır işler backend'de yapılmalı
```

### Hata 5: Türkçe Karakter
```
HATA: "İndirilecek KDV" → "Ä°ndirilecek KDV"
SONUÇ: Karakter bozulması
DERS: Her yerde UTF-8 kullan, encoding belirt
```

---

## 11. AJAN İÇİN TALİMATLAR

### Sen Kimsin?
Sen LYNTOS projesinde mimari dönüşüm yapacak bir AI asistansın. Önceki session'da detaylı analiz yapıldı ve bu döküman hazırlandı.

### Görevin
1. Bu dökümanı DİKKATLİCE oku
2. Faz sırasıyla ilerle
3. Her adımda TEST ET
4. Sorun varsa DUR, kullanıcıya sor

### Kuralların

```
✅ YAPMALISIN:
- Her değişiklikten önce mevcut kodu oku
- Küçük adımlarla ilerle
- Her adımı test et
- Hata mesajlarını Türkçe yaz
- UTF-8 kullan her yerde
- Git commit at her fazda

❌ YAPMAMALISIN:
- Mevcut çalışan kodu bozma
- Tek seferde büyük değişiklik
- Test etmeden devam etme
- Mock data ekleme
- Hardcoded değer yazma
- localStorage'a büyük veri yazma
```

### Başlarken
1. Önce backend'in çalıştığını doğrula: `curl http://localhost:8000/health`
2. Frontend'in çalıştığını doğrula: `http://localhost:3000`
3. Git branch oluştur: `git checkout -b refactor/backend-upload`
4. Faz 1'den başla

### Sorun Olursa
- Hata mesajını kullanıcıya göster
- Geri dön, son çalışan duruma
- Kullanıcıya ne olduğunu açıkla
- Alternatif çözüm öner

### Başarı Kriteri
```
1. ZIP upload backend'de çalışıyor ✓
2. Tek API ile tüm veri geliyor ✓
3. localStorage kullanılmıyor ✓
4. Tüm paneller veri gösteriyor ✓
5. Dönem değişimi düzgün çalışıyor ✓
6. Hata durumları handle ediliyor ✓
```

---

## 📎 EK: HIZLI REFERANS

### Dönem Formatı
```
2025-Q1 = Ocak-Mart 2025
2025-Q2 = Nisan-Haziran 2025
2025-Q3 = Temmuz-Eylül 2025
2025-Q4 = Ekim-Aralık 2025
```

### VDK Kriterleri
```
K-09: Kasa/Aktif oranı (>%15 kritik)
TF-01: Ortaklardan Alacak/Sermaye (>%25 kritik)
OS-01: İlişkili Kişi Borcu/Özkaynak (>3x kritik)
SA-01: Tahsilat Süresi (>365 gün kritik)
SD-01: Stok Devir Süresi (>365 gün kritik)
```

### Hesap Kodları
```
100-108: Kasa
102: Bankalar
120-131: Alıcılar
150-157: Stoklar
191: İndirilecek KDV
250-268: Maddi Duran Varlıklar
320-329: Satıcılar
391: Hesaplanan KDV
500-599: Özkaynaklar
600-699: Gelirler
700-799: Giderler
```

### API Base URL'leri
```
Backend: http://localhost:8000
Frontend: http://localhost:3000
API v1: /api/v1/...
API v2: /api/v2/...
```

---

**Son Güncelleme:** 2025-01-22
**Durum:** Hazır - Uygulama Bekliyor
