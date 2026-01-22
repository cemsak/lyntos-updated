# LYNTOS MİMARİ DÖNÜŞÜM - DURUM RAPORU

**Tarih:** 2026-01-22
**Hazırlayan:** Claude (Session 2 - Hatalı İlerleme Sonrası)
**Branch:** `refactor/backend-upload`
**Son Commit:** `5c0c043`

---

## 🚨 ÖNEMLİ UYARI

Bu döküman, önceki session'da yapılan **HATALI İLERLEMEYİ** düzeltmek için hazırlandı.

**HATA:** Faz 1 (Backend Upload) atlanıp Faz 2-3'e geçildi.
**SONUÇ:** Hibrit bir sistem oluştu - ne tam eski ne tam yeni.

---

## 📋 İÇİNDEKİLER

1. [HEDEF MİMARİ (Ne Olmalı?)](#1-hedef-mimari)
2. [MEVCUT DURUM (Ne Var?)](#2-mevcut-durum)
3. [YAPILANLAR (Session 2'de)](#3-yapilanlar)
4. [YAPILMASI GEREKENLER](#4-yapilmasi-gerekenler)
5. [DETAYLI GEÇİŞ PLANI](#5-detayli-geçiş-plani)
6. [KRİTİK DOSYALAR](#6-kritik-dosyalar)
7. [TEST KRİTERLERİ](#7-test-kriterleri)
8. [AJAN TALİMATLARI](#8-ajan-talimatlari)

---

## 1. HEDEF MİMARİ

### Vizyon
```
KULLANICI → ZIP UPLOAD → BACKEND PARSE → DATABASE → BACKEND API → FRONTEND DISPLAY
```

### Prensip: TEK VERİ KAYNAĞI (Single Source of Truth)
- **TÜM VERİ** Backend Database'den gelecek
- **localStorage** SADECE UI state için (theme, sidebar açık/kapalı)
- **Frontend** parse ETMEYECEK, sadece gösterecek

### Hedef Veri Akışı
```
┌─────────────────┐
│   USER UPLOAD   │
│    (ZIP)        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│          BACKEND                    │
│                                     │
│  POST /api/v2/upload                │
│  ├── 1. ZIP Extract                 │
│  ├── 2. File Detection              │
│  ├── 3. Parse (14+ format)          │
│  ├── 4. Database'e yaz              │
│  └── 5. Analizleri çalıştır         │
│                                     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│         SQLite DATABASE             │
│                                     │
│  - donem (ana tablo)                │
│  - donem_files                      │
│  - mizan_entries                    │
│  - vdk_findings                     │
│  - analysis_results                 │
│                                     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│     GET /api/v2/donem/{client}/{period}  │
│                                     │
│  Response: {                        │
│    meta, files, mizan, analysis     │
│  }                                  │
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
│                                     │
└─────────────────────────────────────┘
```

---

## 2. MEVCUT DURUM

### ŞU AN OLAN (HİBRİT - YANLIŞ)
```
┌─────────────────┐
│   USER UPLOAD   │
│    (ZIP)        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   FRONTEND (useQuarterlyAnalysis)   │  ◄── SORUN 1: Frontend parse ediyor!
│   ├── ZIP Extract                   │
│   ├── File Detection                │
│   └── Parse (14+ format)            │
└───────────────┬─────────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│ localStorage│   │  Backend DB │  ◄── SORUN 2: İKİ KAYNAK!
│ (donemStore)│   │ (sync API)  │
└──────┬──────┘   └──────┬──────┘
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│DonemVerileri│   │MizanOmurga  │  ◄── SORUN 3: Farklı kaynaklar!
│Panel (ESKİ) │   │Panel        │
└─────────────┘   └─────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  DonemVerileriPanel (YENİ - V2)     │  ◄── Session 2'de yapıldı
│  useDonemVerileriV2 → useDonemData  │      AMA tam entegre değil!
│  Backend'den okuyor                 │
└─────────────────────────────────────┘
```

### Mevcut Sorunlar
1. **Frontend hala parse ediyor** - useQuarterlyAnalysis aktif
2. **İki veri kaynağı** - localStorage + Backend
3. **Upload backend'e gitmiyor** - /api/v2/upload YOK
4. **Kısmen migrate edilmiş** - DonemVerileriPanel V2'ye geçti ama diğerleri eski

---

## 3. YAPILANLAR (Session 2'de)

### ✅ Yapılan İşler

#### 3.1 Backend Endpoint Oluşturuldu
**Dosya:** `/backend/api/v2/donem_complete.py`
**Endpoint:** `GET /api/v2/donem/{client_id}/{period}`

```python
# Response yapısı:
{
    "ok": true,
    "has_data": true,
    "meta": {
        "smmm_id": "HKOZKAN",
        "client_id": "CLIENT_048_5F970880",
        "period": "2025-Q1",
        "status": "partial",
        "has_mizan": true,
        "has_beyanname": false,
        "has_banka": false,
        "file_count": 0,
        "uploaded_at": null,
        "analyzed_at": "2026-01-22T05:43:42"
    },
    "files": [],
    "mizan": {
        "summary": { hesap_sayisi, toplam_borc, toplam_alacak, ... },
        "hesaplar": [ { hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye } ]
    },
    "analysis": {
        "vdk_risks": [
            { kriter_kodu: "K-09", severity, hesaplanan_deger, esik_deger, durum, ... },
            { kriter_kodu: "TF-01", ... },
            { kriter_kodu: "OS-01", ... },
            { kriter_kodu: "SA-01", ... },
            { kriter_kodu: "SD-01", ... },
            { kriter_kodu: "KDV-01", ... }
        ]
    }
}
```

**VDK Kriterleri Hesaplanıyor:**
- K-09: Kasa/Aktif Toplam Oranı (>%15 kritik)
- TF-01: Ortaklardan Alacak/Sermaye (>%25 kritik)
- OS-01: İlişkili Kişilere Borç/Özkaynak (>3x kritik)
- SA-01: Ticari Alacak Devir Süresi (>365 gün kritik)
- SD-01: Stok Devir Süresi (>365 gün kritik)
- KDV-01: KDV Uyumu (fark kontrolü)

#### 3.2 Frontend Hook'lar Oluşturuldu
**Dosya:** `/lyntos-ui/app/v2/_hooks/useDonemData.ts`

```typescript
// Ana hook
export function useDonemData(options?: { includeAccounts?: boolean; enabled?: boolean })

// Selector hooks
export function useDonemMizan()
export function useDonemVdkRisks()
export function useDonemFiles()
export function useDonemMeta()
```

#### 3.3 V2 Wrapper Hook Oluşturuldu
**Dosya:** `/lyntos-ui/app/v2/_components/donem-verileri/useDonemVerileriV2.ts`

- DonemVerileriPanel için backward-compatible wrapper
- Backend doc_types → UI BelgeTipi mapping

#### 3.4 DonemVerileriPanel Migrate Edildi
**Dosya:** `/lyntos-ui/app/v2/_components/donem-verileri/DonemVerileriPanel.tsx`

```typescript
// ESKİ:
import { useDonemVerileri } from './useDonemVerileri';
import { useDonemStore } from '../../_lib/stores/donemStore';

// YENİ:
import { useDonemVerileriV2 } from './useDonemVerileriV2';
import { useDashboardScope } from '../scope/useDashboardScope';
```

#### 3.5 Git Commits
```
5c0c043 refactor: Migrate DonemVerileriPanel to backend-only V2 hook
5d77661 feat: Add unified dönem data endpoint and hooks
```

### ❌ YAPILMAYANLAR (Atlandı!)

| Faz | Görev | Durum |
|-----|-------|-------|
| **Faz 1** | `/api/v2/upload` endpoint | ❌ YAPILMADI |
| **Faz 1** | ZIP extraction backend'e taşı | ❌ YAPILMADI |
| **Faz 1** | File detection backend'e taşı | ❌ YAPILMADI |
| **Faz 1** | Parser'ları backend'e taşı | ❌ YAPILMADI |
| **Faz 3** | Upload sayfasını yeni API'ye bağla | ❌ YAPILMADI |
| **Faz 3** | localStorage kullanımını kaldır | ❌ YAPILMADI |
| **Faz 3** | Tüm componentleri yeni hook'a bağla | ⚠️ KISMI (sadece DonemVerileriPanel) |

---

## 4. YAPILMASI GEREKENLER

### 🔴 KRİTİK - FAZ 1: Backend Upload Endpoint

Bu OLMADAN sistem yarım kalır!

#### 4.1 Oluşturulacak Endpoint
**Dosya:** `/backend/api/v2/upload.py`

```python
@router.post("/upload")
async def upload_donem_zip(
    file: UploadFile = File(...),
    smmm_id: str = Form(...),
    client_id: str = Form(...),
    period: str = Form(...)  # Format: 2025-Q1
):
    """
    1. ZIP'i extract et
    2. Dosyaları tanı (file_detector kullan)
    3. Parse et (mevcut parser'ları kullan)
    4. Database'e yaz
    5. VDK analizlerini çalıştır
    6. Response dön
    """
```

#### 4.2 Mevcut Kaynaklar (Backend'de VAR)
```
backend/services/file_detector.py  → Dosya tipi algılama
backend/data_engine/mizan_parser.py → Mizan parse
backend/services/parsers/ → Diğer parser'lar
```

### 🟡 FAZ 3: Frontend Entegrasyonu (Tamamlanacak)

#### 4.3 Upload Sayfası Değişikliği
**Dosya:** `/lyntos-ui/app/v2/upload/page.tsx`

```typescript
// ESKİ (Frontend parse):
const analysis = useQuarterlyAnalysis();
await analysis.analyzeZip(file);  // Frontend'de parse

// YENİ (Backend'e gönder):
const formData = new FormData();
formData.append('file', file);
formData.append('smmm_id', smmmId);
formData.append('client_id', clientId);
formData.append('period', period);

const response = await fetch('/api/v2/upload', {
    method: 'POST',
    body: formData
});
```

#### 4.4 localStorage Kaldırılacak
**Silinecek/Devre Dışı:**
- `_lib/stores/donemStore.ts` - donemStore kullanımı
- `_lib/stores/mizanStore.ts` - mizanStore kullanımı

**NOT:** Dosyalar silinmeyebilir ama **KULLANILMAMALI**

#### 4.5 Diğer Componentler Migrate Edilecek
| Component | Dosya | Durum |
|-----------|-------|-------|
| DonemVerileriPanel | donem-verileri/ | ✅ V2'ye geçti |
| MizanOmurgaPanel | deepdive/ | ❌ Eski hook kullanıyor |
| VdkExpertPanel | deepdive/ | ❌ Kendi endpoint'i var |
| KpiStrip | kpi/ | ❌ Kendi endpoint'leri var |
| CrossCheckPanel | deepdive/ | ❌ Kendi endpoint'i var |
| InflationPanel | deepdive/ | ❌ Kendi endpoint'i var |

---

## 5. DETAYLI GEÇİŞ PLANI

### Faz 1: Backend Upload Endpoint (2-3 gün) ⬅️ BURADAN BAŞLA

#### Adım 1.1: Upload Endpoint Oluştur
```bash
# Dosya oluştur
touch backend/api/v2/upload.py
```

```python
# backend/api/v2/upload.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import zipfile
import tempfile
import re
from datetime import datetime
from database.db import get_db_connection
from services.file_detector import detect_file_type
from data_engine.mizan_parser import parse_mizan_excel

router = APIRouter(prefix="/api/v2", tags=["upload"])

@router.post("/upload")
async def upload_donem_zip(
    file: UploadFile = File(...),
    smmm_id: str = Form(default="HKOZKAN"),
    client_id: str = Form(...),
    period: str = Form(...)
):
    # Validations
    if not file.filename.endswith('.zip'):
        raise HTTPException(400, "Sadece ZIP dosyası kabul edilir")

    if not re.match(r'^\d{4}-Q[1-4]$', period):
        raise HTTPException(400, "Dönem formatı: YYYY-QN (örn: 2025-Q1)")

    donem_id = f"{client_id}_{period}"

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # Save ZIP
            zip_path = Path(tmpdir) / file.filename
            content = await file.read()
            with open(zip_path, 'wb') as f:
                f.write(content)

            # Extract
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(tmpdir)

            # Process files
            conn = get_db_connection()
            results = []

            # Clear old data
            conn.execute(
                "DELETE FROM mizan_entries WHERE client_id = ? AND period_id = ?",
                (client_id, period)
            )

            for fpath in Path(tmpdir).rglob('*'):
                if fpath.is_file() and not fpath.name.startswith('.'):
                    file_type = detect_file_type(str(fpath))

                    if file_type == 'MIZAN_EXCEL':
                        # Parse mizan
                        mizan_data = parse_mizan_excel(str(fpath))
                        if mizan_data:
                            # Insert to database
                            for idx, hesap in enumerate(mizan_data.get('hesaplar', [])):
                                conn.execute("""
                                    INSERT INTO mizan_entries
                                    (client_id, period_id, hesap_kodu, hesap_adi,
                                     borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye, row_index)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """, (
                                    client_id, period,
                                    hesap.get('hesap_kodu', ''),
                                    hesap.get('hesap_adi', ''),
                                    hesap.get('borc', 0),
                                    hesap.get('alacak', 0),
                                    hesap.get('borc_bakiye', 0),
                                    hesap.get('alacak_bakiye', 0),
                                    idx
                                ))
                            results.append({
                                'file': fpath.name,
                                'type': 'MIZAN_EXCEL',
                                'status': 'success',
                                'rows': len(mizan_data.get('hesaplar', []))
                            })
                    # TODO: Diğer dosya tipleri için parser'lar

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

#### Adım 1.2: Router'ı main.py'e ekle
```python
# backend/main.py
from api.v2.upload import router as upload_router
app.include_router(upload_router)
```

#### Adım 1.3: Test
```bash
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@Q1.zip" \
  -F "smmm_id=HKOZKAN" \
  -F "client_id=TEST_CLIENT" \
  -F "period=2025-Q1"

# Beklenen:
# { "success": true, "files": [...], "uploaded_at": "..." }
```

### Faz 2: Dönem API (TAMAMLANDI ✅)

`/api/v2/donem/{client_id}/{period}` endpoint'i zaten var ve çalışıyor.

### Faz 3: Frontend Entegrasyonu (1-2 gün)

#### Adım 3.1: Upload Sayfası Değişikliği
**Dosya:** `/lyntos-ui/app/v2/upload/page.tsx`

```typescript
// useQuarterlyAnalysis'i KALDIR
// Yerine backend'e POST yap

async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('smmm_id', 'HKOZKAN');
    formData.append('client_id', selectedClient?.id || 'current');
    formData.append('period', `${selectedPeriod?.year}-Q${selectedPeriod?.periodNumber}`);

    const response = await fetch('http://localhost:8000/api/v2/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Upload failed');
    }

    const result = await response.json();

    // Başarılı - Dashboard'a yönlendir
    // useDonemData otomatik refetch yapacak
    router.push('/v2');
}
```

#### Adım 3.2: donemStore Kullanımını Kaldır
```typescript
// upload/page.tsx'den KALDIR:
import { useDonemStore } from '../_lib/stores/donemStore';
const setDonemData = useDonemStore(s => s.setDonemData);

// syncDonemToBackend, syncMizanToBackend KALDIR
// Çünkü upload zaten backend'de yapılıyor
```

#### Adım 3.3: Diğer Panelleri V2'ye Geçir
```typescript
// Her panel için:
// ESKİ: useFailSoftFetch(ENDPOINTS.KURGAN_RISK, ...)
// YENİ: const { analysis } = useDonemData(); analysis?.vdk_risks
```

### Faz 4: Cleanup (1 gün)

- [ ] useQuarterlyAnalysis hook'unu sil veya deprecated yap
- [ ] Frontend parser'ları sil (artık kullanılmıyor)
- [ ] donemStore, mizanStore deprecated yap
- [ ] Test ve documentation

---

## 6. KRİTİK DOSYALAR

### Backend - Değişecek/Oluşacak
| Dosya | İşlem | Durum |
|-------|-------|-------|
| `api/v2/upload.py` | OLUŞTUR | ❌ YOK |
| `api/v2/donem_complete.py` | MEVCUT | ✅ Var |
| `main.py` | GÜNCELLE | ⚠️ upload router ekle |
| `services/file_detector.py` | KULLAN | ✅ Var |
| `data_engine/mizan_parser.py` | KULLAN | ✅ Var |

### Frontend - Değişecek
| Dosya | İşlem | Durum |
|-------|-------|-------|
| `upload/page.tsx` | DEĞİŞTİR | ⚠️ useQuarterlyAnalysis kaldır |
| `_hooks/useDonemData.ts` | MEVCUT | ✅ Var |
| `_hooks/useQuarterlyAnalysis.ts` | SİL/DEPRECATE | ⚠️ Hala aktif |
| `_lib/stores/donemStore.ts` | DEPRECATE | ⚠️ Hala kullanılıyor |
| `_lib/stores/mizanStore.ts` | DEPRECATE | ⚠️ Hala kullanılıyor |
| `donem-verileri/DonemVerileriPanel.tsx` | MEVCUT | ✅ V2 |
| `deepdive/MizanOmurgaPanel.tsx` | DEĞİŞTİR | ❌ Eski |
| `deepdive/VdkExpertPanel.tsx` | DEĞİŞTİR | ❌ Eski |
| `kpi/KpiStrip.tsx` | DEĞİŞTİR | ❌ Eski |

### Dokunulmayacaklar
```
❌ api/v1/* - Eski endpoint'ler, bırak
❌ _components/layout/* - Layout değişmeyecek
❌ _components/shared/* - UI componentleri
❌ middleware/* - Auth değişmeyecek
```

---

## 7. TEST KRİTERLERİ

### Faz 1 Testi (Backend Upload)
```bash
# 1. Upload çalışıyor mu?
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@test.zip" \
  -F "client_id=TEST" \
  -F "period=2025-Q1"
# Beklenen: { "success": true, "files": [...] }

# 2. Database'e yazıldı mı?
# Python ile:
# SELECT COUNT(*) FROM mizan_entries WHERE client_id='TEST' AND period_id='2025-Q1'
# Beklenen: > 0

# 3. Hata durumu
curl -X POST http://localhost:8000/api/v2/upload \
  -F "file=@invalid.txt" \
  -F "period=2025-Q1"
# Beklenen: 400 Bad Request
```

### Faz 3 Testi (Frontend)
```
1. Upload sayfası açılıyor mu?
2. ZIP sürükle-bırak çalışıyor mu?
3. Upload sonrası Dashboard'a yönleniyor mu?
4. Dashboard'da veri görünüyor mu?
5. Dönem değişince veri temizleniyor mu?
```

### E2E Testi
```
1. ZIP yükle → Dashboard'a git → Veri görünsün
2. Q1 yükle → Q2 seç → Q1 verisi GÖRÜNMEMELİ
3. Yeni yükleme → Eski veri silinmeli
4. Hatalı ZIP → Hata mesajı gösterilmeli
```

---

## 8. AJAN TALİMATLARI

### Sen Kimsin?
LYNTOS projesinde mimari dönüşüm yapacak AI asistansın. Önceki session'da **Faz 1 atlandı**, bu hata.

### Görevin
1. **ÖNCE Faz 1'i tamamla** - Backend Upload Endpoint
2. **SONRA Faz 3'ü tamamla** - Frontend Entegrasyonu
3. **EN SON Cleanup** - Eski kod temizliği

### MUTLAKA UYULMASI GEREKEN KURALLAR

```
✅ YAPMALISIN:
1. FAZ SIRASINA UY - Faz 1 → Faz 2 → Faz 3
2. Her adımda TEST ET
3. Küçük adımlarla ilerle
4. Her fazda git commit at
5. Hata mesajlarını Türkçe yaz
6. UTF-8 kullan her yerde

❌ YAPMAMALISIN:
1. FAZ ATLAMA (önceki hata buydu!)
2. Mevcut çalışan kodu bozma
3. Test etmeden devam etme
4. Mock data ekleme
5. localStorage'a büyük veri yazma
6. Tek seferde büyük değişiklik
```

### Başlarken Kontrol Listesi
```bash
# 1. Backend çalışıyor mu?
curl http://localhost:8000/health

# 2. Branch doğru mu?
git branch  # refactor/backend-upload olmalı

# 3. Son commit ne?
git log --oneline -3
# 5c0c043 refactor: Migrate DonemVerileriPanel to backend-only V2 hook
# 5d77661 feat: Add unified dönem data endpoint and hooks
```

### İlk Görev: Faz 1
```
1. /backend/api/v2/upload.py oluştur
2. main.py'e router ekle
3. Test et: curl ile ZIP upload
4. Database'de veri var mı kontrol et
5. Git commit at
```

### Sorun Olursa
- Hata mesajını kullanıcıya göster
- Son çalışan duruma geri dön
- Alternatif çözüm öner
- ASLA faz atlama!

---

## 📎 EK: MEVCUT DOSYA İÇERİKLERİ

### A. Backend Endpoint (MEVCUT)
**Dosya:** `/backend/api/v2/donem_complete.py`
- GET /api/v2/donem/{client_id}/{period}
- VDK risk hesaplamaları
- Mizan özeti ve hesaplar
- ✅ Çalışıyor

### B. Frontend Hook (MEVCUT)
**Dosya:** `/lyntos-ui/app/v2/_hooks/useDonemData.ts`
- useDonemData() - Ana hook
- useDonemMizan() - Mizan selector
- useDonemVdkRisks() - VDK risks selector
- ✅ Oluşturuldu, kullanıma hazır

### C. V2 Wrapper (MEVCUT)
**Dosya:** `/lyntos-ui/app/v2/_components/donem-verileri/useDonemVerileriV2.ts`
- DonemVerileriPanel için backward-compatible
- ✅ Oluşturuldu

### D. DonemVerileriPanel (GÜNCELLENDİ)
**Dosya:** `/lyntos-ui/app/v2/_components/donem-verileri/DonemVerileriPanel.tsx`
- useDonemVerileriV2 kullanıyor
- donemStore bağımlılığı kaldırıldı
- ✅ V2'ye geçirildi

---

## 📊 ÖZET TABLO

| Faz | Görev | Durum | Öncelik |
|-----|-------|-------|---------|
| 0 | Git branch | ✅ | - |
| 1 | Backend /upload endpoint | ❌ | 🔴 ŞİMDİ |
| 2 | Backend /donem endpoint | ✅ | - |
| 3.1 | useDonemData hook | ✅ | - |
| 3.2 | Upload sayfası değiştir | ❌ | 🟡 FAZ 1'DEN SONRA |
| 3.3 | localStorage kaldır | ❌ | 🟡 FAZ 1'DEN SONRA |
| 3.4 | Diğer panelleri geçir | ⚠️ Kısmi | 🟡 FAZ 1'DEN SONRA |
| 4 | Cleanup | ❌ | 🟢 EN SON |

---

**Son Güncelleme:** 2026-01-22
**Sonraki Adım:** Faz 1 - Backend Upload Endpoint
