# LYNTOS Kaizen Kök Neden Analizi

**Tarih:** 2026-01-21
**Sorun:** Q1 verisi yüklendiği halde dashboard "belge bekleniyor" gösteriyor

---

## 1. Problem Tanımı

Kullanıcı Q1.zip dosyasını yüklemesine rağmen:
- Dashboard panelleri boş görünüyor
- "Belge bekleniyor" mesajları gösteriliyor
- Analizler ve hesaplamalar çalışmıyor
- Sistem entegre değil gibi davranıyor

---

## 2. Kök Neden Analizi (5 Why)

```
WHY 1: Dashboard neden boş?
→ Backend API'den veri gelmiyor

WHY 2: Backend neden veri döndürmüyor?
→ Backend'de dönem verisi yok

WHY 3: Backend'e veri neden ulaşmıyor?
→ syncDonemToBackend() fonksiyonu ÇAĞRILMIYOR

WHY 4: Sync fonksiyonu neden çağrılmıyor?
→ UploadModal sadece setTimeout ile "fake upload" yapıyor

WHY 5: Neden fake upload var?
→ Geliştirme sırasında placeholder bırakılmış, gerçek entegrasyon yapılmamış
```

---

## 3. Ishikawa (Balık Kılçığı) Diyagramı

```
                    ┌─────────────────────────────────────────┐
                    │     DASHBOARD BOŞ GÖSTERİYOR           │
                    └──────────────────┬──────────────────────┘
                                       │
     ┌─────────────────┬───────────────┼───────────────┬─────────────────┐
     │                 │               │               │                 │
   KOD              VERİ AKIŞI      ENTEGRASYON    MİMARİ           İLETİŞİM
     │                 │               │               │                 │
  UploadModal      localStorage     API çağrısı    Store ile        Frontend/
  setTimeout()     → memory only    yapılmıyor     backend          Backend
  (fake)                            disconnect     arasında gap     kopuk
```

---

## 4. Tespit Edilen Sorunlar

### 4.1 UploadModal.tsx (KRİTİK)

**Konum:** `/app/v2/_components/modals/UploadModal.tsx`
**Satır:** 50-51

```typescript
// ESKİ KOD (SORUNLU):
// Simulate upload (in production, this would be actual API call)
await new Promise(resolve => setTimeout(resolve, 1500));
setUploading(false);
setUploaded(true);
```

**Problem:** Gerçek API çağrısı YOK, sadece 1.5 saniye bekleyip "başarılı" diyor.

### 4.2 Upload Page (/v2/upload/page.tsx)

**Konum:** `/app/v2/upload/page.tsx`
**Satır:** 142-169

Store'a kayıt yapılıyor AMA backend'e sync YAPILMIYOR.

### 4.3 Veri Akış Kopukluğu

```
MEVCUT AKIŞ (BOZUK):
┌──────────┐    ┌───────────┐    ┌──────────────┐
│ ZIP      │ → │ Parser    │ → │ donemStore   │ ──╳──→ Backend YOK
│ Upload   │    │ (çalışır) │    │ (localStorage)│
└──────────┘    └───────────┘    └──────────────┘
                                        │
                                        ↓
                                 Dashboard BOŞTA
                                 (API'den okur ama
                                  backend boş)
```

---

## 5. Uygulanan Düzeltmeler

### 5.1 UploadModal.tsx Düzeltmesi

```typescript
// YENİ KOD:
import { syncDonemToBackend, buildSyncPayload } from '../../_lib/api/donemSync';
import { useDonemStore } from '../../_lib/stores/donemStore';

// Store'dan veri al
const meta = useDonemStore(s => s.meta);
const fileSummaries = useDonemStore(s => s.fileSummaries);
const stats = useDonemStore(s => s.stats);

// handleUpload içinde:
if (meta && fileSummaries.length > 0) {
  const payload = buildSyncPayload(meta, fileSummaries, stats, 'default');
  const result = await syncDonemToBackend(payload);
  // ... hata kontrolü
}
```

### 5.2 Upload Page Düzeltmesi

```typescript
// Parse tamamlandığında backend'e de sync et:
const payload = buildSyncPayload(meta, fileSummaries, analysis.fileStats, 'default');
syncDonemToBackend(payload)
  .then(result => {
    if (result.success) {
      console.log('[UploadPage] Backend sync başarılı');
    }
  });
```

---

## 6. Düzeltilmiş Veri Akışı

```
YENİ AKIŞ (ÇALIŞIR):
┌──────────┐    ┌───────────┐    ┌──────────────┐    ┌─────────────┐
│ ZIP      │ → │ Parser    │ → │ donemStore   │ → │ Backend     │
│ Upload   │    │ (çalışır) │    │ (localStorage)│    │ (PostgreSQL)│
└──────────┘    └───────────┘    └──────────────┘    └─────────────┘
                                        │                   │
                                        ↓                   ↓
                                 Anında UI         Dashboard API'den
                                 Güncellemesi      veri çeker
```

---

## 7. Önlem Önerileri (Kaizen)

### 7.1 Kısa Vadeli
- [ ] Tüm upload noktalarında backend sync kontrolü
- [ ] Sync başarısız olursa kullanıcıya bildirim
- [ ] Console.log yerine proper logging

### 7.2 Orta Vadeli
- [ ] E2E test: Upload → Backend → Dashboard akışı
- [ ] Health check endpoint: Veri akış durumu
- [ ] Retry mekanizması (sync başarısız olursa)

### 7.3 Uzun Vadeli
- [ ] Event-driven architecture (upload events)
- [ ] Real-time sync status (WebSocket)
- [ ] Offline-first PWA desteği

---

## 8. Doğrulama Adımları

1. Q1.zip yükle
2. Console'da `[UploadPage] Backend sync başarılı` mesajını kontrol et
3. Dashboard'a git
4. Panellerin dolu olduğunu doğrula

---

## 9. Etkilenen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `app/v2/_components/modals/UploadModal.tsx` | Backend sync eklendi |
| `app/v2/upload/page.tsx` | Backend sync eklendi |

---

**Analiz:** Claude Opus
**Kaizen Metodu:** 5 Why, Ishikawa, PDCA
