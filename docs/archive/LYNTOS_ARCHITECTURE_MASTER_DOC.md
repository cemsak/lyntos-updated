# LYNTOS MİMARİ MASTER DÖKÜMAN

**Versiyon:** 2.0 (Kapsamlı Revizyon)
**Tarih:** 2026-01-22
**Hazırlayan:** Claude (Detaylı Sistem Analizi Sonrası)
**Amaç:** Yeni ajan için tam bilgi transferi

---

# 📋 İÇİNDEKİLER

1. [LYNTOS NEDİR?](#bölüm-1-lyntos-nedir)
2. [ANAYASA VE KIRMIZI ÇİZGİLER](#bölüm-2-anayasa-ve-kirmizi-çizgiler)
3. [MEVCUT MİMARİ (AS-IS)](#bölüm-3-mevcut-mimari)
4. [HEDEF MİMARİ (TO-BE)](#bölüm-4-hedef-mimari)
5. [YAPILAN İŞLER (Session 2)](#bölüm-5-yapilan-işler)
6. [YAPILMASI GEREKENLER](#bölüm-6-yapilmasi-gerekenler)
7. [DETAYLI UYGULAMA PLANI](#bölüm-7-detayli-uygulama-plani)
8. [KRİTİK DOSYALAR REHBERİ](#bölüm-8-kritik-dosyalar)
9. [TEST KRİTERLERİ](#bölüm-9-test-kriterleri)
10. [YAPILAN HATALAR VE DERSLER](#bölüm-10-yapilan-hatalar)
11. [AJAN TALİMATLARI](#bölüm-11-ajan-talimatlari)

---

# BÖLÜM 1: LYNTOS NEDİR?

## 1.1 Vizyon

LYNTOS, Türkiye'deki **SMMM (Serbest Muhasebeci Mali Müşavir)** ve **YMM (Yeminli Mali Müşavir)** ler için geliştirilmiş bir **mali analiz ve risk yönetimi platformu**dur.

**Temel Amaç:** VDK (Vergi Denetim Kurulu) incelemesi öncesi riskleri tespit etmek ve SMMM'lere profesyonel analiz araçları sunmak.

## 1.2 Kullanıcılar

| Kullanıcı | Tanım | İhtiyaç |
|-----------|-------|---------|
| **SMMM** | Serbest Muhasebeci Mali Müşavir | Mükelleflerin defterlerini tutar, risk analizi yapar |
| **YMM** | Yeminli Mali Müşavir | Denetim ve tasdik yapar |
| **Mükellef** | Şirketler (AŞ, LTD, Şahıs) | Vergi mükellefiyeti olan işletmeler |

## 1.3 Ana İşlevler

```
1. DÖNEM VERİSİ YÜKLEME
   └── ZIP içinde: Mizan, Yevmiye, Kebir, e-Defter, Beyanname, Banka Ekstresi
   └── Otomatik dosya tipi algılama (40+ format)
   └── Parse ve veritabanına kayıt

2. VDK RİSK ANALİZİ
   └── KURGAN: 13 ana kriter (K-01 ~ K-13)
   └── RAM: 12 ek kriter (RAM-01 ~ RAM-12)
   └── Toplam 25 VDK kriteri

3. ÇAPRAZ KONTROL
   └── Mizan ↔ KDV Beyanname
   └── Mizan ↔ Banka Ekstresi
   └── Mizan ↔ Muhtasar

4. MEVZUAT TAKİBİ (RegWatch)
   └── GİB güncellemeleri
   └── Resmi Gazete takibi
   └── TÜRMOB duyuruları

5. ŞİRKETLER HUKUKU
   └── TTK 376 analizi (sermaye kaybı)
   └── Borca batıklık kontrolü

6. KANIT PAKETİ
   └── Vergi müfettişi için hazır dosya
   └── PDF dossier oluşturma
```

## 1.4 Değer Önerisi

- **VDK incelemesi öncesi** risk tespiti
- **Otomatik belge kontrolü** (40+ format)
- **Mevzuat değişikliği** takibi
- **Profesyonel raporlama** (executive brief, dossier)
- **SMMM güveni** - her veri kaynağı belgelenmiş

## 1.5 Teknoloji Stack

```
FRONTEND:
├── Framework: Next.js 15 (App Router)
├── UI: React 18 + TypeScript
├── Styling: Tailwind CSS + shadcn/ui
├── State: Zustand (persist middleware)
├── Icons: Lucide React
└── Port: 3000

BACKEND:
├── Framework: FastAPI (Python)
├── Database: SQLite (55 tablo)
├── Auth: JWT (HS256, 4 saat expiry)
├── AI: Claude/OpenAI (opsiyonel)
└── Port: 8000
```

---

# BÖLÜM 2: ANAYASA VE KIRMIZI ÇİZGİLER

## 2.1 🔴 KESİNLİKLE YAPILMAYACAKLAR

```
1. MOCK DATA YASAK
   ├── Hiçbir yerde sahte/test verisi kullanılmayacak
   ├── Veri yoksa "VERİ YOK" mesajı gösterilecek
   └── Demo mode bile gerçek yapıyla çalışmalı

2. HARDCODED VERİ YASAK
   ├── Vergi oranları database'den gelmeli
   ├── Eşikler/limitler API'den çekilmeli
   └── Tarihler hesaplanmalı, yazılmamalı

3. TÜRKÇE KARAKTER BOZULMASI YASAK
   ├── Tüm dosyalar UTF-8
   ├── Database UTF-8
   └── API response'ları UTF-8

4. KRİTİK HESAP KODLARI DEĞİŞMEZ
   ├── 100-108: Kasa
   ├── 102: Bankalar
   ├── 120-131: Alıcılar
   ├── 150-157: Stoklar
   ├── 191: İndirilecek KDV
   ├── 250-268: Maddi Duran Varlıklar
   ├── 320-329: Satıcılar
   ├── 391: Hesaplanan KDV
   ├── 500-599: Özkaynaklar
   ├── 600-699: Gelirler
   └── 700-799: Giderler

5. DÖNEM FORMATI SABİT
   ├── Format: YYYY-QN (örn: 2025-Q1)
   ├── Q1: Ocak-Mart
   ├── Q2: Nisan-Haziran
   ├── Q3: Temmuz-Eylül
   └── Q4: Ekim-Aralık
```

## 2.2 🟢 PRENSİPLER

```
1. TEK VERİ KAYNAĞI (Single Source of Truth)
   ├── Tüm veri Backend Database'den gelmeli
   ├── localStorage sadece UI state için (theme, sidebar)
   └── Frontend parse ETMEMELİ, sadece göstermeli

2. DÖNEM İZOLASYONU
   ├── Her dönem birbirinden bağımsız
   ├── Dönem değişince eski veri görünmemeli
   └── client_id + period_id = unique key

3. BACKEND PARSE
   ├── ZIP parsing Backend'de olmalı
   ├── Frontend sadece dosya gönderir
   └── Analiz Backend'de yapılır, sonuç döner

4. EAGER ANALYSIS
   ├── Upload anında analizler çalışmalı
   ├── Dashboard'da hesaplama olmamalı
   └── Sonuçlar database'de saklanmalı

5. HATA DURUMUNDA
   ├── Açık hata mesajı göster
   ├── Türkçe ve anlaşılır
   └── Kurtarma yolu öner
```

## 2.3 VDK KRİTERLERİ (25 Kriter)

### KURGAN Kriterleri (K-01 ~ K-13)
| Kod | Kriter | Eşik | Açıklama |
|-----|--------|------|----------|
| K-09 | Kasa/Aktif Oranı | >%15 | Yüksek nakit = şüpheli |
| TF-01 | Ortaklardan Alacak/Sermaye | >%25 | Transfer fiyatlandırması riski |
| OS-01 | İlişkili Borç/Özkaynak | >3x | Örtülü sermaye riski |
| SA-01 | Alacak Devir Süresi | >365 gün | Tahsilat sorunu |
| SD-01 | Stok Devir Süresi | >365 gün | Stok eritme sorunu |
| KDV-01 | KDV Uyumu | Fark >%5 | Beyanname-mizan uyumsuzluğu |

### RAM Kriterleri (RAM-01 ~ RAM-12)
- Detaylı işlem bazlı inceleme kriterleri
- VDK Risk Analiz Modeli kapsamında

---

# BÖLÜM 3: MEVCUT MİMARİ

## 3.1 Backend Yapısı

```
backend/
├── main.py                      # FastAPI giriş noktası (383 satır)
├── api/
│   ├── v1/                     # Legacy endpoint'ler (28 dosya)
│   │   ├── contracts.py        # Muhasebe kontratları
│   │   ├── documents.py        # Döküman yönetimi
│   │   ├── audit.py            # Denetim
│   │   ├── chat.py             # AI chat
│   │   ├── corporate.py        # Kurumsal
│   │   ├── vdk_simulator.py    # VDK simülasyonu
│   │   └── ...
│   ├── v2/                     # Modern endpoint'ler (13 dosya)
│   │   ├── mizan_sync.py       # Mizan senkronizasyonu
│   │   ├── donem_sync.py       # Dönem senkronizasyonu
│   │   ├── donem_complete.py   # TEK ENDPOINT - TÜM VERİ ✓
│   │   ├── feed.py             # Intelligence feed
│   │   ├── cross_check.py      # Çapraz kontrol
│   │   └── ...
│   └── auth/
│       └── routes.py           # JWT auth
├── database/
│   ├── db.py                   # SQLite init (940 satır)
│   └── lyntos.db               # 55 tablo
├── data_engine/                # Parser'lar
│   ├── mizan_parser.py         # Mizan Excel parser
│   ├── banka_parser.py         # Banka parser
│   └── ...
├── risk_model/                 # Risk hesaplama (19 dosya)
│   ├── v1_engine.py            # Ana motor (1400+ satır)
│   ├── vdk_kurgan_engine.py    # VDK kuralları
│   └── ...
└── services/
    └── file_detector.py        # Dosya tipi algılama
```

## 3.2 Frontend Yapısı

```
lyntos-ui/app/v2/
├── _lib/
│   ├── parsers/                # Frontend parser'lar (SİLİNECEK)
│   │   ├── core/
│   │   │   ├── zipHandler.ts   # ZIP extraction
│   │   │   └── fileDetector.ts # Dosya algılama (1067 satır)
│   │   ├── excel/
│   │   │   ├── mizanParser.ts  # Mizan parser
│   │   │   └── ...
│   │   └── ...
│   ├── stores/                 # Zustand stores
│   │   ├── donemStore.ts       # Dönem verisi (localStorage)
│   │   └── mizanStore.ts       # Mizan verisi (localStorage)
│   └── api/
│       ├── donemSync.ts        # Backend sync client
│       └── mizanSync.ts        # Mizan sync client
├── _hooks/
│   ├── useQuarterlyAnalysis.ts # Frontend analiz (KALDIRILACAK)
│   ├── useDonemData.ts         # Backend tabanlı hook (YENİ) ✓
│   └── ...
├── _components/
│   ├── donem-verileri/
│   │   ├── DonemVerileriPanel.tsx  # Ana panel (V2'ye geçti) ✓
│   │   ├── useDonemVerileri.ts     # Eski hook
│   │   └── useDonemVerileriV2.ts   # Yeni hook ✓
│   ├── deepdive/
│   │   ├── MizanOmurgaPanel.tsx    # Mizan detay
│   │   ├── VdkExpertPanel.tsx      # VDK analiz
│   │   └── ...
│   └── kpi/
│       └── KpiStrip.tsx            # KPI kartları
├── upload/
│   └── page.tsx                # Upload sayfası (DEĞİŞECEK)
└── page.tsx                    # Dashboard
```

## 3.3 Database Tabloları (Kritik Olanlar)

```sql
-- Mizan verileri
mizan_entries (
    client_id, period_id,
    hesap_kodu, hesap_adi,
    borc_toplam, alacak_toplam,
    borc_bakiye, alacak_bakiye,
    UNIQUE(tenant_id, client_id, period_id, hesap_kodu)
)

-- Dönem dosyaları
document_uploads (
    id, client_id, period_id,
    doc_type, parse_status,
    content_hash_sha256
)

-- KDV beyanname
kdv_beyanname_data (
    client_id, period_id,
    matrah, hesaplanan_kdv,
    indirilecek_kdv, odenecek_kdv
)

-- Banka işlemleri
banka_islemler (
    client_id, period_id,
    banka_adi, hesap_no,
    islem_tarihi, tutar
)
```

## 3.4 MEVCUT VERİ AKIŞI (SORUNLU)

```
┌─────────────────┐
│   USER UPLOAD   │
│    (ZIP)        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   FRONTEND (useQuarterlyAnalysis)   │  ◄── SORUN 1: Frontend parse ediyor!
│   ├── ZIP Extract                   │      50MB+ tarayıcıda işleniyor
│   ├── File Detection (1067 satır)   │
│   └── Parse (14+ format)            │
└───────────────┬─────────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│ localStorage│   │  Backend DB │      ◄── SORUN 2: İKİ KAYNAK!
│ (donemStore)│   │ (sync API)  │          Tutarsızlık riski
└──────┬──────┘   └──────┬──────┘
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│DonemVerileri│   │MizanOmurga  │      ◄── SORUN 3: Farklı kaynaklar!
│Panel        │   │Panel        │          Veri uyumsuzluğu
└─────────────┘   └─────────────┘
```

---

# BÖLÜM 4: HEDEF MİMARİ

## 4.1 Yeni Veri Akışı

```
┌─────────────────┐
│   USER UPLOAD   │
│    (ZIP)        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│          FRONTEND                   │
│   (Sadece dosya gönderir)           │
│                                     │
│   POST /api/v2/upload               │
│   multipart/form-data               │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│          BACKEND                    │
│                                     │
│  1. ZIP Extract                     │
│  2. File Detection                  │
│  3. Parse (14+ format)              │
│  4. Database'e yaz                  │
│  5. VDK analizlerini çalıştır       │
│  6. Response dön                    │
│                                     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│         SQLite DATABASE             │
│                                     │
│  - mizan_entries                    │
│  - document_uploads                 │
│  - vdk_findings (YENİ)              │
│  - analysis_results (YENİ)          │
│                                     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  GET /api/v2/donem/{client}/{period}│
│                                     │
│  Response: {                        │
│    meta, files, mizan, analysis     │
│  }                                  │
│                                     │
│  TEK ENDPOINT - TÜM VERİ            │
│                                     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│         FRONTEND                    │
│                                     │
│  useDonemData() hook                │
│  ├── DonemVerileriPanel             │
│  ├── MizanOmurgaPanel               │
│  ├── VdkExpertPanel                 │
│  └── KpiStrip                       │
│                                     │
│  TEK KAYNAK - BACKEND API           │
│  localStorage KULLANILMIYOR         │
│                                     │
└─────────────────────────────────────┘
```

## 4.2 Yeni API Endpoint'leri

### POST /api/v2/upload (OLUŞTURULACAK)
```python
Input: multipart/form-data
  - file: ZIP dosyası
  - smmm_id: "HKOZKAN"
  - client_id: "OZKAN_KIRTASIYE"
  - period: "2025-Q1"

Process:
  1. ZIP extract
  2. Her dosya için tip algıla
  3. Parse et
  4. Database'e yaz
  5. VDK analizlerini çalıştır

Output: {
  success: true,
  donem_id: "OZKAN_KIRTASIYE_2025-Q1",
  files: [
    { file: "MIZAN.xlsx", type: "MIZAN_EXCEL", status: "success", rows: 500 }
  ],
  uploaded_at: "2025-01-22T10:30:00Z"
}
```

### GET /api/v2/donem/{client_id}/{period} (MEVCUT ✓)
```python
Output: {
  ok: true,
  has_data: true,
  meta: {
    smmm_id, client_id, period, status,
    has_mizan, has_beyanname, has_banka,
    uploaded_at, analyzed_at
  },
  files: [...],
  mizan: {
    summary: { hesap_sayisi, toplam_borc, toplam_alacak, ... },
    hesaplar: [ { hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye } ]
  },
  analysis: {
    vdk_risks: [
      { kriter_kodu: "K-09", severity, hesaplanan_deger, esik_deger, durum }
    ]
  }
}
```

---

# BÖLÜM 5: YAPILAN İŞLER (Session 2)

## 5.1 ✅ Tamamlanan İşler

### 5.1.1 Backend Endpoint Oluşturuldu
**Dosya:** `/backend/api/v2/donem_complete.py`
**Commit:** `5d77661`

```python
GET /api/v2/donem/{client_id}/{period}

# Özellikler:
- Tek endpoint, tüm dönem verisi
- VDK risk kriterleri hesaplanıyor (6 kriter):
  - K-09: Kasa/Aktif Oranı
  - TF-01: Ortaklardan Alacak/Sermaye
  - OS-01: İlişkili Borç/Özkaynak
  - SA-01: Alacak Devir Süresi
  - SD-01: Stok Devir Süresi
  - KDV-01: KDV Uyumu
- Mizan özeti ve hesap listesi
- Dönem metadata

# Test:
curl "http://localhost:8000/api/v2/donem/CLIENT_048_5F970880/2025-Q1?include_accounts=true"
# Sonuç: has_data: true, mizan.hesaplar: 500+ hesap
```

### 5.1.2 Frontend Hook'lar Oluşturuldu
**Dosya:** `/lyntos-ui/app/v2/_hooks/useDonemData.ts`
**Commit:** `5d77661`

```typescript
// Ana hook
export function useDonemData(options?: {
  includeAccounts?: boolean;
  enabled?: boolean;
}): UseDonemDataReturn

// Selector hooks
export function useDonemMizan()
export function useDonemVdkRisks()
export function useDonemFiles()
export function useDonemMeta()

// Kullanım:
const { data, isLoading, error, refetch } = useDonemData();
```

### 5.1.3 V2 Wrapper Hook Oluşturuldu
**Dosya:** `/lyntos-ui/app/v2/_components/donem-verileri/useDonemVerileriV2.ts`

- DonemVerileriPanel için backward-compatible
- Backend doc_types → UI BelgeTipi mapping

### 5.1.4 DonemVerileriPanel Migrate Edildi
**Dosya:** `/lyntos-ui/app/v2/_components/donem-verileri/DonemVerileriPanel.tsx`
**Commit:** `5c0c043`

```typescript
// ESKİ:
import { useDonemVerileri } from './useDonemVerileri';
import { useDonemStore } from '../../_lib/stores/donemStore';

// YENİ:
import { useDonemVerileriV2 } from './useDonemVerileriV2';
import { useDashboardScope } from '../scope/useDashboardScope';
```

## 5.2 ❌ YAPILMAYANLAR (ATLANMIŞ!)

| Faz | Görev | Durum | Açıklama |
|-----|-------|-------|----------|
| **Faz 1** | `/api/v2/upload` endpoint | ❌ YOK | **KRİTİK EKSİK!** |
| **Faz 1** | ZIP extraction backend'e taşı | ❌ | Frontend hala yapıyor |
| **Faz 1** | File detection backend'e taşı | ❌ | Frontend hala yapıyor |
| **Faz 1** | Parser'ları backend'e taşı | ❌ | Frontend hala yapıyor |
| **Faz 3** | Upload sayfasını değiştir | ❌ | useQuarterlyAnalysis hala aktif |
| **Faz 3** | localStorage kaldır | ❌ | donemStore hala kullanılıyor |
| **Faz 3** | Diğer panelleri geçir | ⚠️ | Sadece DonemVerileriPanel |

## 5.3 Git Commit Geçmişi

```
5c0c043 refactor: Migrate DonemVerileriPanel to backend-only V2 hook
5d77661 feat: Add unified dönem data endpoint and hooks
af8f3d1 feat: Sprint 4 + CrossCheck kuralları backend'e taşındı
```

---

# BÖLÜM 6: YAPILMASI GEREKENLER

## 6.1 🔴 KRİTİK: FAZ 1 - Backend Upload Endpoint

**Bu OLMADAN sistem yarım kalır!**

### 6.1.1 Oluşturulacak Endpoint
**Dosya:** `/backend/api/v2/upload.py`

```python
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import zipfile
import tempfile
import re
from datetime import datetime

router = APIRouter(prefix="/api/v2", tags=["upload"])

@router.post("/upload")
async def upload_donem_zip(
    file: UploadFile = File(...),
    smmm_id: str = Form(default="HKOZKAN"),
    client_id: str = Form(...),
    period: str = Form(...)  # Format: 2025-Q1
):
    """
    Dönem verisi yükle (ZIP)

    1. Validasyon
    2. ZIP extract
    3. Dosya tipi algıla
    4. Parse et
    5. Database'e yaz
    6. VDK analizlerini çalıştır
    7. Response dön
    """

    # 1. Validasyon
    if not file.filename.endswith('.zip'):
        raise HTTPException(400, "Sadece ZIP dosyası kabul edilir")

    if not re.match(r'^\d{4}-Q[1-4]$', period):
        raise HTTPException(400, "Dönem formatı: YYYY-QN (örn: 2025-Q1)")

    donem_id = f"{client_id}_{period}"

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # 2. ZIP kaydet ve aç
            zip_path = Path(tmpdir) / file.filename
            content = await file.read()
            with open(zip_path, 'wb') as f:
                f.write(content)

            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(tmpdir)

            # 3. Eski veriyi temizle
            conn = get_db_connection()
            conn.execute(
                "DELETE FROM mizan_entries WHERE client_id = ? AND period_id = ?",
                (client_id, period)
            )

            results = []

            # 4. Her dosyayı işle
            for fpath in Path(tmpdir).rglob('*'):
                if fpath.is_file() and not fpath.name.startswith('.'):
                    # Tip algıla
                    file_type = detect_file_type(str(fpath))

                    # Parse et
                    if file_type == 'MIZAN_EXCEL':
                        mizan_data = parse_mizan_excel(str(fpath))
                        if mizan_data:
                            # Database'e yaz
                            for idx, hesap in enumerate(mizan_data.get('hesaplar', [])):
                                conn.execute("""
                                    INSERT INTO mizan_entries
                                    (client_id, period_id, hesap_kodu, hesap_adi,
                                     borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                """, (
                                    client_id, period,
                                    hesap.get('hesap_kodu'),
                                    hesap.get('hesap_adi'),
                                    hesap.get('borc', 0),
                                    hesap.get('alacak', 0),
                                    hesap.get('borc_bakiye', 0),
                                    hesap.get('alacak_bakiye', 0)
                                ))
                            results.append({
                                'file': fpath.name,
                                'type': 'MIZAN_EXCEL',
                                'status': 'success',
                                'rows': len(mizan_data.get('hesaplar', []))
                            })

                    # TODO: Diğer dosya tipleri (KDV, Banka, etc.)

            conn.commit()
            conn.close()

            return {
                "success": True,
                "donem_id": donem_id,
                "period": period,
                "client_id": client_id,
                "files": results,
                "uploaded_at": datetime.now().isoformat()
            }

    except Exception as e:
        raise HTTPException(500, f"Upload hatası: {str(e)}")
```

### 6.1.2 main.py'e Ekle
```python
# backend/main.py
from api.v2.upload import router as upload_router
app.include_router(upload_router)
```

## 6.2 🟡 FAZ 3: Frontend Entegrasyonu

### 6.2.1 Upload Sayfası Değişikliği
**Dosya:** `/lyntos-ui/app/v2/upload/page.tsx`

```typescript
// KALDIRILACAK:
import { useQuarterlyAnalysis } from '../_hooks/useQuarterlyAnalysis';
const analysis = useQuarterlyAnalysis();
await analysis.analyzeZip(file);  // Frontend parse YASAK

// YENİ:
async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('smmm_id', 'HKOZKAN');
    formData.append('client_id', selectedClient?.id || 'current');
    formData.append('period', `${year}-Q${quarter}`);

    const response = await fetch('http://localhost:8000/api/v2/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }

    // Başarılı - Dashboard'a yönlendir
    router.push('/v2');
}
```

### 6.2.2 localStorage Kullanımı Kaldırılacak
```typescript
// KALDIRILACAK (upload/page.tsx'den):
import { useDonemStore } from '../_lib/stores/donemStore';
const setDonemData = useDonemStore(s => s.setDonemData);
syncDonemToBackend(payload);
syncMizanToBackend(payload);
```

### 6.2.3 Diğer Paneller Migrate Edilecek
| Panel | Dosya | İşlem |
|-------|-------|-------|
| MizanOmurgaPanel | deepdive/ | useDonemData().mizan kullan |
| VdkExpertPanel | deepdive/ | useDonemData().analysis.vdk_risks kullan |
| KpiStrip | kpi/ | Kendi endpoint'leri var, useDonemData entegrasyonu |
| CrossCheckPanel | deepdive/ | useDonemData entegrasyonu |

---

# BÖLÜM 7: DETAYLI UYGULAMA PLANI

## 7.1 Faz Sırası (KESİNLİKLE UYULMALI!)

```
FAZ 1: Backend Upload Endpoint (2-3 gün)
    ↓
FAZ 2: Dönem API ✓ (TAMAMLANDI)
    ↓
FAZ 3: Frontend Entegrasyonu (2-3 gün)
    ↓
FAZ 4: Cleanup ve Test (1-2 gün)
```

## 7.2 Faz 1: Backend Upload Endpoint

### Adım 1.1: Dosya Oluştur
```bash
touch backend/api/v2/upload.py
```

### Adım 1.2: Endpoint Yaz
- Yukarıdaki kod örneğini kullan
- detect_file_type() fonksiyonunu services/file_detector.py'den import et
- parse_mizan_excel() fonksiyonunu data_engine/mizan_parser.py'den import et

### Adım 1.3: Router Ekle
```python
# backend/main.py - router imports bölümüne ekle:
from api.v2.upload import router as upload_router

# router registration bölümüne ekle:
app.include_router(upload_router)
```

### Adım 1.4: Test Et
```bash
# Backend çalışıyor mu?
curl http://localhost:8000/health

# Upload endpoint çalışıyor mu?
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@test.zip" \
  -F "client_id=TEST_CLIENT" \
  -F "period=2025-Q1"

# Database'e yazıldı mı?
# Python ile kontrol et
```

### Adım 1.5: Git Commit
```bash
git add backend/api/v2/upload.py backend/main.py
git commit -m "feat: Add backend ZIP upload endpoint

- POST /api/v2/upload - accepts ZIP, parses, saves to DB
- Mizan parser integration
- Period validation (YYYY-QN format)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 7.3 Faz 3: Frontend Entegrasyonu

### Adım 3.1: Upload Sayfası Değiştir
**Dosya:** `/lyntos-ui/app/v2/upload/page.tsx`

```typescript
// 1. useQuarterlyAnalysis import'unu KALDIR
// 2. donemStore import'larını KALDIR
// 3. Yeni handleUpload fonksiyonu ekle (yukarıdaki örnek)
// 4. UI'ı güncelle - progress gösterimi backend'den gelecek
```

### Adım 3.2: Test Et
```
1. npm run dev ile frontend başlat
2. /v2/upload sayfasına git
3. ZIP yükle
4. Dashboard'a yönlendirme olduğunu doğrula
5. Veri görünüyor mu kontrol et
```

### Adım 3.3: Git Commit
```bash
git commit -m "refactor: Migrate upload page to backend-only flow

- Remove useQuarterlyAnalysis (frontend parsing)
- Remove donemStore usage
- POST to /api/v2/upload instead

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 7.4 Faz 4: Cleanup

### Adım 4.1: Deprecated Dosyaları İşaretle
```typescript
// useQuarterlyAnalysis.ts
/**
 * @deprecated Backend upload kullanın: POST /api/v2/upload
 * Bu hook frontend parse yapıyor - KULLANMAYIN
 */
```

### Adım 4.2: Test Suite
- E2E: ZIP upload → Dashboard → Veri görünsün
- Dönem izolasyonu: Q1 → Q2 geçişi
- Hata durumları: Geçersiz ZIP, boş dosya

---

# BÖLÜM 8: KRİTİK DOSYALAR

## 8.1 Backend Dosyaları

| Dosya | İşlem | Durum |
|-------|-------|-------|
| `api/v2/upload.py` | **OLUŞTUR** | ❌ YOK |
| `api/v2/donem_complete.py` | Mevcut | ✅ |
| `main.py` | Router ekle | ⚠️ |
| `services/file_detector.py` | Kullan | ✅ Var |
| `data_engine/mizan_parser.py` | Kullan | ✅ Var |

## 8.2 Frontend Dosyaları

| Dosya | İşlem | Durum |
|-------|-------|-------|
| `upload/page.tsx` | **DEĞİŞTİR** | ⚠️ Eski kod |
| `_hooks/useDonemData.ts` | Mevcut | ✅ |
| `_hooks/useQuarterlyAnalysis.ts` | Deprecate | ⚠️ Hala aktif |
| `_lib/stores/donemStore.ts` | Deprecate | ⚠️ Hala kullanılıyor |
| `donem-verileri/DonemVerileriPanel.tsx` | Mevcut | ✅ V2 |
| `deepdive/MizanOmurgaPanel.tsx` | Migrate | ❌ Eski |
| `deepdive/VdkExpertPanel.tsx` | Migrate | ❌ Eski |

## 8.3 DOKUNMA!

```
❌ api/v1/* - Legacy, çalışıyor, bırak
❌ _components/layout/* - Layout değişmeyecek
❌ _components/shared/* - UI componentleri
❌ middleware/* - Auth değişmeyecek
❌ _lib/parsers/* - Şimdilik bırak, sonra sil
```

---

# BÖLÜM 9: TEST KRİTERLERİ

## 9.1 Faz 1 Testleri

```bash
# 1. Endpoint var mı?
curl http://localhost:8000/api/v2/upload
# Beklenen: 405 Method Not Allowed (GET desteklenmiyor)

# 2. Upload çalışıyor mu?
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@Q1.zip" \
  -F "client_id=TEST" \
  -F "period=2025-Q1"
# Beklenen: { "success": true, "files": [...] }

# 3. Database'e yazıldı mı?
python3 -c "
import sqlite3
conn = sqlite3.connect('backend/database/lyntos.db')
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM mizan_entries WHERE client_id=\"TEST\" AND period_id=\"2025-Q1\"')
print(cur.fetchone()[0])
"
# Beklenen: > 0

# 4. Hata durumu
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@invalid.txt" \
  -F "period=INVALID"
# Beklenen: 400 Bad Request
```

## 9.2 Faz 3 Testleri

```
1. Upload sayfası açılıyor mu?
   → http://localhost:3000/v2/upload

2. ZIP sürükle-bırak çalışıyor mu?
   → Dosya seç, progress göster

3. Upload sonrası Dashboard'a yönleniyor mu?
   → /v2'ye redirect

4. Dashboard'da veri görünüyor mu?
   → DonemVerileriPanel, MizanOmurgaPanel

5. Dönem değişince veri temizleniyor mu?
   → Q1 → Q2 geçişi
```

## 9.3 E2E Test Senaryoları

```
Senaryo 1: Normal Akış
1. /v2/upload'a git
2. Q1.zip yükle
3. Dashboard'a yönlen
4. Veri görünsün
5. VDK riskleri gösterilsin

Senaryo 2: Dönem İzolasyonu
1. Q1 yükle → Veri görünsün
2. Q2 seç → Q1 verisi GÖRÜNMEMELİ
3. Q1 seç → Q1 verisi tekrar görünsün

Senaryo 3: Hata Durumu
1. Geçersiz ZIP yükle
2. Hata mesajı gösterilsin (Türkçe)
3. Kurtarma yolu önerilsin
```

---

# BÖLÜM 10: YAPILAN HATALAR VE DERSLER

## 10.1 Session 2'de Yapılan Hata

```
HATA: Faz 1 (Backend Upload) atlanıp Faz 2-3'e geçildi

SONUÇ: Hibrit sistem oluştu
- Backend endpoint var ama upload yok
- Frontend hala parse ediyor
- localStorage hala kullanılıyor

DERS: FAZ SIRASINA UYMAK ZORUNLU!
```

## 10.2 Önceki Session'larda Yapılan Hatalar

### Hata 1: localStorage Boyut Limiti
```
Problem: 50MB mizan verisi localStorage'a yazıldı
Sonuç: QuotaExceededError
Çözüm: Büyük veri localStorage'da tutulmaz
```

### Hata 2: Dönem Kontrolü Eksikliği
```
Problem: Q1 yüklenip Q2 seçildiğinde Q1 verisi görünmeye devam etti
Sonuç: Kullanıcı karışıklığı
Çözüm: Her dönem değişiminde state temizlenmeli
```

### Hata 3: İki Veri Kaynağı
```
Problem: DonemVerileriPanel localStorage'dan, MizanOmurgaPanel backend'den okudu
Sonuç: Tutarsız veri
Çözüm: Tek kaynak - Backend
```

### Hata 4: Frontend Parse
```
Problem: 50MB ZIP tarayıcıda parse edildi
Sonuç: Tarayıcı donması, mobilde çökme
Çözüm: Parse backend'de yapılmalı
```

---

# BÖLÜM 11: AJAN TALİMATLARI

## 11.1 Sen Kimsin?

LYNTOS projesinde mimari dönüşüm yapacak bir AI asistansın. Bu döküman sana önceki session'ların tüm bilgisini aktarıyor.

**Kritik:** Önceki session'da **Faz 1 atlandı**. Bu döküman bu hatayı düzeltmek için hazırlandı.

## 11.2 Görevin

```
1. ÖNCE Faz 1'i tamamla - Backend Upload Endpoint
2. SONRA Faz 3'ü tamamla - Frontend Entegrasyonu
3. EN SON Cleanup - Eski kod temizliği

SIRA DEĞİŞMEZ!
```

## 11.3 Kurallar

### ✅ YAPMALISIN:
```
1. FAZ SIRASINA KESİNLİKLE UY
   - Faz 1 bitmeden Faz 3'e GEÇME
   - Her adımı test et

2. Küçük adımlarla ilerle
   - Bir dosya değiştir → test et → commit at

3. Her fazda git commit at
   - Açıklayıcı mesajlar
   - Co-Authored-By ekle

4. Hata mesajlarını Türkçe yaz
   - "Upload hatası: Geçersiz dönem formatı"

5. UTF-8 kullan HER YERDE
   - Dosyalarda, database'de, response'larda
```

### ❌ YAPMAMALISIN:
```
1. FAZ ATLAMA
   - Önceki session'da yapılan hata buydu!

2. Mevcut çalışan kodu bozma
   - api/v1/* dokunma
   - layout/* dokunma

3. Test etmeden devam etme
   - curl ile test et
   - Database'i kontrol et

4. Mock data ekleme
   - Veri yoksa "VERİ YOK" göster

5. localStorage'a büyük veri yazma
   - Backend'e gönder

6. Tek seferde büyük değişiklik
   - Küçük adımlar, sık commit
```

## 11.4 Başlarken Checklist

```bash
# 1. Backend çalışıyor mu?
curl http://localhost:8000/health
# Beklenen: {"status": "ok"}

# 2. Doğru branch'te misin?
git branch
# Beklenen: * refactor/backend-upload

# 3. Son commit'ler
git log --oneline -5
# Beklenen:
# 5c0c043 refactor: Migrate DonemVerileriPanel...
# 5d77661 feat: Add unified dönem data endpoint...

# 4. Mevcut dosyalar
ls backend/api/v2/
# Beklenen: donem_complete.py, donem_sync.py, ...
# upload.py OLMAMALI (senin oluşturacağın)
```

## 11.5 İlk Görevin

```
FAZ 1 - Backend Upload Endpoint

1. /backend/api/v2/upload.py oluştur
2. POST /api/v2/upload endpoint'i yaz
3. main.py'e router ekle
4. Test et:
   curl -X POST http://localhost:8000/api/v2/upload \
     -F "file=@test.zip" \
     -F "client_id=TEST" \
     -F "period=2025-Q1"
5. Database'de veri var mı kontrol et
6. Git commit at

BUNLAR BİTMEDEN FAZ 3'E GEÇME!
```

## 11.6 Sorun Olursa

```
1. Hata mesajını kullanıcıya göster
2. Son çalışan duruma geri dön:
   git checkout -- <dosya>
3. Kullanıcıya ne olduğunu açıkla
4. Alternatif çözüm öner
5. ASLA faz atlama!
```

## 11.7 Başarı Kriterleri

```
[ ] Faz 1: /api/v2/upload çalışıyor
[ ] Faz 1: ZIP upload → Database'e yazılıyor
[ ] Faz 3: Upload sayfası backend'e gönderiyor
[ ] Faz 3: localStorage kullanılmıyor
[ ] Faz 3: Tüm paneller backend'den okuyor
[ ] Test: E2E akış çalışıyor
[ ] Test: Dönem izolasyonu çalışıyor
```

---

# 📊 ÖZET TABLO

| Faz | Görev | Durum | Öncelik |
|-----|-------|-------|---------|
| 0 | Git branch | ✅ refactor/backend-upload | - |
| 1 | Backend /upload endpoint | ❌ **YOK** | 🔴 **ŞİMDİ** |
| 2 | Backend /donem endpoint | ✅ Var | - |
| 3.1 | useDonemData hook | ✅ Var | - |
| 3.2 | Upload sayfası değiştir | ❌ | 🟡 Faz 1'den sonra |
| 3.3 | localStorage kaldır | ❌ | 🟡 Faz 1'den sonra |
| 3.4 | Diğer panelleri geçir | ⚠️ Kısmi | 🟡 Faz 1'den sonra |
| 4 | Cleanup | ❌ | 🟢 En son |

---

**Son Güncelleme:** 2026-01-22
**Sonraki Adım:** FAZ 1 - Backend Upload Endpoint
**Branch:** refactor/backend-upload
**Son Commit:** 5c0c043
