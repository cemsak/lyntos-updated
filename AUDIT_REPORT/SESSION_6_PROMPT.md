# LYNTOS Denetim Düzeltme — Session 6 Açılış Promptu

Bu promptu yeni Claude Code session'ına kopyala-yapıştır.

---

## PROMPT BAŞLANGICI

Sen LYNTOS projesinin baş geliştiricisin. 4 session'da 175 bulgu tespit edildi, ardından Session 3-5'te düzeltmelere başlandı. Şimdi Session 6'da kalan işleri analiz edip devam edeceğiz.

### ADIM 1: Proje Hafızasını Oku (ilk iş)

Şu 3 dosyayı oku ve anla:
1. `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/MEMORY.md`
2. `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/architecture.md`
3. `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/patterns.md`

### ADIM 2: Audit Raporunu Oku

`/Users/cemsak/lyntos/AUDIT_REPORT/FINAL_AUDIT_REPORT.md` — 175 bulgunun özeti

### ADIM 3: Kalan İşleri Analiz Et

Aşağıdaki TAMAMLANMIŞ ve KALAN öğeleri dikkatlice oku. Sonra kalan her öğe için **dosyaları gerçekten tara** ve şu bilgileri içeren bir rapor hazırla:

#### ✅ TAMAMLANAN (Session 3-5)

**Güvenlik (Session 3):**
- G-01: v2 API auth middleware (35+ dosya) ✅
- G-02: SQL injection → parameterized query (12+ lokasyon) ✅
- G-03: CORS kısıtlama (wildcard → specific origins) ✅
- G-04: SSL verify=True (ai_analyzer.py) ✅
- G-05: JWT güçlendirme ✅
- G-06: PII/VKN maskeleme (AI promptları) ✅
- G-07: API key .env güvenliği ✅
- G-08: Rate limiting ✅
- G-09: Input validation ✅

**Kod Kalitesi (Session 3-4):**
- KK-01: Bare except → specific exceptions (19 lokasyon) ✅
- KK-02: Context manager kullanımı ✅
- KK-03: React Error Boundary (error.tsx + global-error.tsx) ✅
- KK-04: Transaction rollback ekleme (10+ servis) ✅
- KK-05: Structured logging ✅
- KK-06: Dead code temizliği ✅

**Veri Tutarlılığı (Session 4):**
- VT-01: SQLite WAL modu aktif ✅
- VT-02: DB boyut limiti ✅
- VT-03: 9+ tabloya composite index ✅
- VT-04: KKEG geçici vergiye yansıtma ✅
- VT-05: 5 yıl zarar mahsubu sınırı ✅
- VT-06: Cross-check matrah evidence detayı ✅
- VT-07 → VT-10: Diğer veri tutarlılığı düzeltmeleri ✅

**Performans (Session 4):**
- P-01 → P-12: DB indexes, evidence_bundle optimize, pagination ✅

**UI/UX & Mimari (Session 5):**
- L-02: Centralized API client (`_lib/api/client.ts`) ✅
- H-02: Response envelope standardization (`utils/response.py` + frontend normalize) ✅
- M-04: ApiErrorAlert reusable error component ✅
- H-04: Missing backend endpoints (beyanname_kurumlar, risk-queue, fake-invoice-risk) ✅
- M-08 (kısmi): 13 hook/component migrated to centralized api client ✅

#### ❌ KALAN İŞLER — ANALİZ GEREKLİ

Aşağıdaki her kalem için **gerçek dosyaları tara**, mevcut durumu tespit et ve şu formatla raporla:

| # | Öğe | Açıklama | Mevcut Durum | Fayda | Effort | Öncelik |
|---|-----|----------|-------------|-------|--------|---------|

**Kalan öğeler:**

1. **M-08 (devam)**: ~35 dosya hala hardcoded `fetch()` kullanıyor
   - Tara: `app/v2/` altında `fetch(` kullanıp `api/client` import etmeyen dosyalar
   - Fayda: Tutarlı auth, error handling, timeout; tek noktadan bakım
   - Soru: Hepsi mi yapılmalı yoksa sadece aktif kullanılan v2 dosyalar mı?

2. **H-05**: 51 sayfa + 284 component — aşırı büyük frontend
   - Tara: `app/v2/` altında kaç sayfa ve component var?
   - Fayda: Bakım kolaylığı, daha hızlı build
   - Soru: Bu mimari bir konu — tek session'da yapılamaz. Parçalanabilir mi?

3. **L-01**: Frontend test coverage çok düşük (<%1)
   - Tara: `lyntos-ui/` altında test dosyaları (`*.test.ts`, `*.test.tsx`, `*.spec.*`)
   - Fayda: Refactoring güvenliği, regresyon tespiti
   - Soru: Hangi component/hook'lar için test yazılmalı? Kritik olanlar hangisi?

4. **L-07**: TypeScript strict mode — 174 `any` type
   - Tara: `app/v2/` altında `any` kullanımı (`grep "any"`)
   - Fayda: Type safety, IDE desteği, daha az runtime hata
   - Soru: `tsconfig.json` strict mi? `noImplicitAny` açık mı?

5. **Rapor 10 kalıntıları**: Orphan dosyalar, v1 API, backup'lar
   - Tara: `backend/` altında orphan script'ler (kullanılmayan .py dosyaları)
   - Tara: v1 vs v2 overlap — v1 hâlâ kullanılıyor mu?
   - Tara: `.backups/`, `LEGACY/`, `BACKUP/` dizinleri
   - Tara: 3 venv klasörü (venv/, venv_new/, .venv/) — sadece .venv mi kalmalı?

6. **Rapor 03 kalıntıları**: Mali modüller
   - KDV motoru bağımsız mı? Stub seviyesinde mi?
   - E-defter/e-fatura parser gerçekten çalışıyor mu?
   - Kurumlar vergisi hesaplama doğrulanmış mı (Session 4'te VT-4/5/6 yapıldı ama tam audit)?

7. **Rapor 06 kalıntıları**: AI entegrasyonu
   - Timeout/retry/fallback mekanizması yeterli mi?
   - Prompt injection koruması var mı?
   - AI maliyet takibi var mı?

8. **Rapor 08 kalıntıları**: Performans
   - contracts.py kaç satır? Parçalandı mı?
   - kurgan_calculator.py kaç satır? Parçalandı mı?
   - Bundle boyutu: MUI + AG Grid + pdfjs + xlsx + jspdf — dynamic import var mı?
   - Frontend re-render sorunları var mı?

### ADIM 4: Fizibilite Raporu Hazırla

Her kalan öğe için şu bilgileri ver:

```
### [Öğe Adı]
- **Ne**: Kısa açıklama
- **Nasıl**: Teknik yaklaşım (1-3 cümle)
- **Fayda**: Yapılırsa ne kazanılır
- **Yapılmazsa Risk**: Yapılmazsa ne olur
- **Effort**: Düşük/Orta/Yüksek + tahmini süre
- **Session**: Kaç Claude Code session gerekir
- **Öncelik**: KRİTİK / CİDDİ / İYİLEŞTİRME
- **Bağımlılık**: Başka öğeye bağlı mı?
```

### ADIM 5: Session Planı Öner

Tüm analiz bittikten sonra şunu hazırla:

```
## SESSION PLANI

| Session | İçerik | Tahmini Dosya Sayısı | Risk |
|---------|--------|---------------------|------|
| 6       | ...    | ...                 | ...  |
| 7       | ...    | ...                 | ...  |
| ...     | ...    | ...                 | ...  |

Toplam Kalan Session: X
Context Window Stratejisi: ...
```

Context window şişmesini önlemek için:
- Her session tek bir odak alanına sahip olsun
- Büyük toplu değişiklikler Task agent'larla yapılsın
- Dosya okumak için Explore agent kullanılsın
- Session başında sadece ilgili rapor(lar) okunasun, hepsi değil

### ADIM 6: DUR ve Raporunu Sun

Analiz tamamlandığında bana şunu göster:
1. Kalan öğelerin detaylı fizibilite tablosu
2. Önerilen session planı
3. "Hangi session'dan başlayalım?" sorusu

**Hiçbir düzeltmeye benden talimat almadan başlama.**

---

## KRİTİK KURALLAR

### Emir-Komuta Zinciri
- **HİÇBİR düzeltmeyi benden onay almadan yapma**
- Bu session'da ÖNCE analiz, SONRA rapor, SONRA onay, SONRA implementasyon
- Her düzeltmeden sonra `pnpm build` (frontend) veya Python syntax check (backend)

### Context Window Yönetimi (ZORUNLU)
- Raporları teker teker oku, hepsini birden context'e yükleme
- Task agent'ları paralel kullan (grep/glob/explore)
- **Context %60-70 dolunca dur**, yeni session için handoff hazırla
- Büyük kod değişiklikleri için Task agent kullan

### Build Doğrulama
- Frontend: `cd /Users/cemsak/lyntos/lyntos-ui && pnpm build`
- Backend: `cd /Users/cemsak/lyntos/backend && .venv/bin/python -c "import py_compile; py_compile.compile('DOSYA', doraise=True)"`

---

## PROJE BİLGİSİ (Kısa Özet)
- **LYNTOS**: Türk SMMM/YMM vergi uyum platformu (VDK risk analizi, KURGAN puanlama, Big4 denetim)
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS 4, pnpm (port 3000)
- **Backend**: Python 3.12, FastAPI, SQLite (port 8000)
- **Path**: `/Users/cemsak/lyntos/` | Frontend: `lyntos-ui/` | Backend: `backend/`
- **66 DB tablo**, 180+ VDK/KURGAN kural, 55 router, ~349 endpoint
- **Auth**: JWT + DEV bypass (`LYNTOS_DEV_AUTH_BYPASS=1`), token `DEV_HKOZKAN`
- **Centralized API Client**: `app/v2/_lib/api/client.ts` — `api.get/post/put/patch/delete`
- **Backend start**: `cd backend && .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- **Build**: `cd lyntos-ui && pnpm build`

## PROMPT SONU
