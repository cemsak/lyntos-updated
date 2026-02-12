# LYNTOS Problem Kataloğu ve Sağlık Raporu

> **Amaç**: Dashboard'da "veri görünmüyor" problemlerinin kök sebeplerini sınıflandırmak, hızlı teşhis ve kalıcı çözüm için referans sağlamak.

---

## 🎯 Hızlı Teşhis Akışı

Veri görünmüyorsa şu sırayla kontrol et:

```
1. Network tab'da istek gidiyor mu? → Hayır: Route/Proxy sorunu (Sınıf 2)
2. Response 401/403 mü? → Evet: Auth sorunu (Sınıf 1)
3. Response 404 mü? → Evet: Endpoint/Route sorunu (Sınıf 2)
4. Response 200 ama boş mu? → Client/Period ID kontrol (Sınıf 7)
5. Response 200 ve dolu ama UI boş? → Contract drift (Sınıf 3) veya Cache (Sınıf 5)
```

---

## 📋 Problem Sınıfları

### Sınıf 1: Auth ve Yetkilendirme Kopukluğu
**Belirti**: Network'te 401/403, UI'da boş state veya loading bitmiyor

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| Token taşınmıyor | Request headers'da `Authorization` yok | `useAuth` hook kontrol, interceptor ekle |
| Dev bypass uyumsuz | FE bypass açık, BE kapalı | `.env` senkronize et |
| Tenant erişim filtresi | Token geçerli ama 403 | `check_client_access` logları kontrol |
| CORS/Cookie | Farklı port/domain'de cookie gitmiyor | CORS config, `withCredentials` |

**LYNTOS'ta Görülme**: ORTA

---

### Sınıf 2: Route / Proxy / Base URL Yanlışlığı
**Belirti**: 404 Not Found, yanlış API'ye gidiyor

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| Next.js vs FastAPI route | `/api/...` Next'e gidiyor | `NEXT_PUBLIC_API_BASE_URL` kontrol |
| Port karışıklığı | 3000 vs 8000 | Proxy config veya explicit URL |
| Path uyumsuzluğu | `axis-d` vs `axis_d` | Contract standardı belirle |

**LYNTOS'ta Görülme**: SIK

**Örnek Vaka**:
```
❌ fetch('/api/v1/axis-d') → Next.js 404
✅ fetch('http://localhost:8000/api/v1/axis-d') → FastAPI 200
```

---

### Sınıf 3: Contract Drift (API Şeması ↔ UI Modeli)
**Belirti**: API 200 dönüyor ama UI render etmiyor, console error var

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| Field rename | `items` → `rows` | TypeScript interface güncelle |
| Enum drift | `LOW` vs `low` | Normalizer fonksiyon |
| Nullability | `.map()` patlar | Optional chaining, default değer |
| Tablo karışıklığı | `edefter_entries` vs `journal_entries` | Tek read model belirle |

**LYNTOS'ta Görülme**: SIK

**Örnek Vaka**:
```typescript
// Backend D/C döndürüyor, UI B/A bekliyor
❌ entry.borc_alacak === 'B' ? 'Borç' : 'Alacak'
✅ entry.borc_alacak === 'B' || entry.borc_alacak === 'D' ? 'Borç' : 'Alacak'
```

---

### Sınıf 4: Filtre ve Parametre Semantiği
**Belirti**: Dönem değişince veri aynı kalıyor, parametre yansımıyor

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| Hardcoded değer | `period_id: '2025-Q1'` sabit | `useDashboardScope()` kullan |
| State yansımıyor | UI state değişiyor, query aynı | useEffect dependency kontrol |
| Format farkı | `2025-Q1` vs `2025Q1` | Normalizer |
| Cache key eksik | Period cache key'de yok | Cache key'e period ekle |

**LYNTOS'ta Görülme**: ÇOK SIK

**Örnek Vaka**:
```typescript
// ❌ YANLIŞ - Hardcoded
const clientId = 'CLIENT_048_5F970880';
const periodId = '2025-Q1';

// ✅ DOĞRU - Scope'tan al
const { scope } = useDashboardScope();
const clientId = scope.client_id;
const periodId = scope.period;
```

---

### Sınıf 5: Cache ve Revalidation
**Belirti**: API doğru dönse bile UI güncellenmez

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| Cache key eksik | Period key'de yok | `queryKey: ['data', clientId, periodId]` |
| Stale data | Eski veri gösteriliyor | `refetchOnWindowFocus`, `staleTime: 0` |
| Next.js fetch cache | Server-side cache | `{ cache: 'no-store' }` |

**LYNTOS'ta Görülme**: ORTA

---

### Sınıf 6: Veri Ingest Pipeline
**Belirti**: Dosya yüklendi ama veri görünmüyor

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| İşleme job fail | Worker çalışmıyor | Background task logları |
| Validation fail | Format hatalı | Parse error logları |
| Yanlış path | tenant/client/period mismatch | Upload path kontrol |
| Derived artifacts yok | manifest üretilmemiş | Pipeline tamamlanma kontrolü |

**LYNTOS'ta Görülme**: ORTA

---

### Sınıf 7: Tenant/Client/Period Mapping (ID Eşlemesi)
**Belirti**: Her şey çalışıyor görünür ama veri yok

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| Farklı client_id | UI vs DB farklı ID | Registry'den canonical ID al |
| Tenant scope hatası | Yanlış tenant'a bakıyor | Token scope kontrol |
| Mapping drift | Hesap kodu eşleşmiyor | Mapping tablosu güncelle |

**LYNTOS'ta Görülme**: ÇOK SIK

**Örnek Vaka**:
```
UI gönderdi:     CLIENT_048_5F970880
DB'de veri var:  CLIENT_048_1EFCED87
Sonuç:           0 kayıt döndü
```

**Kalıcı Çözüm**:
1. UI'da client_id hardcode YASAK
2. Her zaman `useDashboardScope()` veya registry API kullan
3. Alias tablosu ile geriye uyumluluk

---

### Sınıf 8: Hata Yönetimi / Gözlemlenebilirlik Eksikliği
**Belirti**: "Demo/dummy kaynıyor" hissi, hatalar maskeleniyor

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| Sessiz hata | 401 → empty state | Error boundary, toast |
| Mock fallback | Hata → demo data | Fallback'i kaldır veya açık göster |
| Correlation ID yok | Request izlenemiyor | Request ID header ekle |

**LYNTOS'ta Görülme**: YÜKSEK

---

### Sınıf 9: Ortam / Sürüm Drift'i
**Belirti**: Dün çalışan bugün patladı

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| Branch farkı | UI/BE farklı branch | Monorepo veya version lock |
| .env drift | Farklı env değerleri | .env.example + validation |
| Migration eksik | Schema değişmiş | Startup migration check |

**LYNTOS'ta Görülme**: ORTA

---

### Sınıf 10: Sessiz Katiller
**Belirti**: Teşhisi zor, beklenmedik davranış

| Alt Sorun | Teşhis | Çözüm |
|-----------|--------|-------|
| Timezone | Dönem sınırı kayıyor | UTC kullan |
| Locale parsing | Virgül/nokta karışıklığı | Explicit locale |
| Large payload | Timeout/abort | Pagination, streaming |

**LYNTOS'ta Görülme**: DÜŞÜK

---

## 🔴 LYNTOS Mevcut Sorunlu Sayfalar

### Taranacak Sayfalar

| Sayfa | Path | Durum | Sorun Sınıfı | Çözüm Durumu |
|-------|------|-------|--------------|--------------|
| Q1 Özet | `/v2/q1-ozet` | ✅ Çözüldü | 4, 7 | scope entegrasyonu yapıldı |
| Yevmiye Defteri | `/v2/yevmiye` | ✅ Çözüldü | 4, 7 | scope entegrasyonu yapıldı |
| Defteri Kebir | `/v2/kebir` | ⏳ Kontrol edilecek | ? | - |
| Banka Hareketleri | `/v2/banka` | ⏳ Kontrol edilecek | ? | - |
| Banka Mutabakat | `/v2/banka/mutabakat` | ⏳ Kontrol edilecek | ? | - |
| Beyanname KDV | `/v2/beyanname/kdv` | ⏳ Kontrol edilecek | ? | - |
| Beyanname Muhtasar | `/v2/beyanname/muhtasar` | ⏳ Kontrol edilecek | ? | - |
| Tahakkuk | `/v2/beyanname/tahakkuk` | ⏳ Kontrol edilecek | ? | - |
| E-Defter Raporları | `/v2/edefter/rapor` | ⏳ Kontrol edilecek | ? | - |
| Cross-Check | `/v2/cross-check` | ⏳ Kontrol edilecek | ? | - |
| VDK Risk Analizi | `/v2/vdk` | ⏳ Kontrol edilecek | ? | - |
| Kokpit | `/v2` (main) | ⏳ Kontrol edilecek | ? | - |

---

## 🛡️ Kalıcı Koruma: Drift Testleri

### Test 1: Client ID Tutarlılığı
```python
def test_client_id_consistency():
    """Portfolio'daki her client için veri tablolarında kayıt olmalı"""
    clients = db.query("SELECT DISTINCT client_id FROM client_portfolio WHERE is_active = 1")
    for client_id in clients:
        # En az bir tabloda veri olmalı
        tables = ['edefter_entries', 'mizan_entries', 'bank_transactions']
        has_data = False
        for table in tables:
            count = db.query(f"SELECT COUNT(*) FROM {table} WHERE client_id = ?", client_id)
            if count > 0:
                has_data = True
                break
        assert has_data, f"No data for active client {client_id}"
```

### Test 2: Endpoint-Table Sözleşmesi
```python
def test_yevmiye_endpoint_returns_data():
    """Yevmiye endpoint'i bilinen client için veri dönmeli"""
    response = client.get("/api/v2/yevmiye/list", params={
        "client_id": "CLIENT_048_1EFCED87",
        "period_id": "2025-Q1"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0, "Expected data for known client/period"
```

### Test 3: UI Scope Kullanımı (Lint Rule)
```javascript
// eslint rule: no-hardcoded-client-id
// Tüm .tsx dosyalarında CLIENT_ ile başlayan string yasak
// Sadece useDashboardScope() veya props'tan gelmeli
```

---

## 📊 Sağlık Skoru

| Metrik | Hedef | Mevcut | Durum |
|--------|-------|--------|-------|
| Scope kullanan sayfa oranı | 100% | ~20% | 🔴 |
| Hardcoded client_id | 0 | 5+ | 🔴 |
| Contract test coverage | 80% | 0% | 🔴 |
| Error boundary coverage | 100% | ~30% | 🟡 |
| Cache key doğruluğu | 100% | ~60% | 🟡 |

---

## 📝 Değişiklik Geçmişi

| Tarih | Değişiklik | Kim |
|-------|------------|-----|
| 2026-01-23 | Doküman oluşturuldu | Claude |
| 2026-01-23 | Q1 Özet çözüldü | Claude |
| 2026-01-23 | Yevmiye Defteri çözüldü | Claude |

---

## 🔗 İlgili Dosyalar

- `/lyntos-ui/app/v2/_components/scope/ScopeProvider.tsx` - Merkezi scope yönetimi
- `/backend/database/db.py` - Veritabanı bağlantısı
- `/backend/api/v2/` - V2 API endpoints
