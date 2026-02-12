# LYNTOS - Sonraki Adımlar ve Roadmap

**Son Güncelleme**: 2025-01-02
**Referans**: TDD v1.0 (docs/LYNTOS_Technical_Design_Document_v1.0.md)

---

## Bugün Tamamlanan (2025-01-02)

- [x] Proje hijyeni (376+ dosya temizlendi)
- [x] TDD v1.0 Anayasa revizyonu (Bölüm 6-A: Veri Kaynağı Güvenilirliği)
- [x] AI Provider Config (backend/core/config.py)
- [x] RegWatch Source Registry (backend/services/regwatch_sources.py)
- [x] Güvenlik: backend/data/ git'ten çıkarıldı, dosya sisteminde korundu

---

## Öncelik Sıralaması

### Öncelik 1: Backend Yapısal Düzenleme

**TDD Referansı**: Section "File Structure"

**Mevcut vs Hedef**:
```
MEVCUT:                    HEDEF (TDD):
backend/                   backend/
├── api_v1_contracts.py    ├── api/
├── main.py                │   └── v1/
└── ...                    │       ├── __init__.py
                           │       ├── contracts.py
                           │       ├── dossier.py
                           │       └── regwatch.py
                           ├── core/
                           │   ├── config.py ✓
                           │   └── database.py
                           ├── contracts/
                           │   ├── portfolio.py
                           │   ├── risk_detail.py
                           │   └── kv_bridge.py
                           └── ...
```

**Aksiyonlar**:
1. `backend/api/v1/` klasörü oluştur
2. `api_v1_contracts.py` → `backend/api/v1/contracts.py` taşı
3. Import path'leri güncelle (main.py vb.)
4. Smoke test: `curl http://localhost:8000/api/v1/contracts/portfolio`
5. Git commit

---

### Öncelik 2: Frontend Lib Taşıma

**TDD Referansı**: Section "File Structure"

**Mevcut vs Hedef**:
```
MEVCUT:                    HEDEF (TDD):
lyntos-ui/                 lyntos-ui/
├── app/                   ├── app/
│   └── v1/                │   └── v1/
│       └── _lib/          │       └── _components/
└── ...                    ├── lib/
                           │   ├── contracts.ts
                           │   └── fetcher.ts
                           └── components/
                               └── shared/
```

**Aksiyonlar**:
1. `lyntos-ui/lib/` oluştur
2. `app/v1/_lib/` içeriğini taşı
3. Import path'leri güncelle (tüm dosyalarda)
4. `npm run build` test et
5. Eksik component'leri oluştur

---

### Öncelik 3: RegWatch S3 Implementation

**TDD Referansı**: Section "RegWatch Contract" + "RegWatch S3 Plan"

**Minimum Viable Pipeline**:
```python
# backend/services/regwatch_service.py

class RegWatchService:
    async def fetch_from_source(source_name: str):
        # 1. Validate source (Tier 1 only)
        # 2. Fetch content
        # 3. Calculate hash
        # 4. Compare with DB
        # 5. If changed → create change record
        # 6. Return change or "no_change"
```

**Aksiyonlar**:
1. `regwatch_service.py` oluştur
2. Hash/version tracking implement et
3. Change detection logic ekle
4. Impact map (rule-based, conservative) ekle
5. Manual review queue UI ekle
6. 7/30 day view dashboard panel ekle

---

### Öncelik 4: KV Bridge Table

**TDD Referansı**: Section "KV (Kurumlar Vergisi) Bridge Table"

**Core Schema**:
```typescript
interface KVBridgeContract {
  summary: { commercial_profit, fiscal_profit, tax_liability }
  bridge_table: {
    starting_point,
    additions[],
    deductions[],
    prior_year_losses[],
    ending_point
  }
  analysis: { expert, ai }
}
```

**Aksiyonlar**:
1. `backend/contracts/kv_bridge.py` oluştur
2. Bridge table calculation logic ekle
3. Legal basis mandatory enforcement
4. Evidence refs integration
5. UI: `KVBridgePanel.tsx` oluştur
6. Dossier'a KV section ekle

---

### Öncelik 5: QA Gate Implementation

**TDD Referansı**: Section "QA Strategy & Test Gates"

**S10 QA Gate Checklist**:
```python
# backend/tests/test_s10_qa_gate.py

def test_portfolio_contract_structure():
    # Schema, version, generated_at
    # analysis.expert + analysis.ai
    # data_quality block

def test_portfolio_happy_path():
    # Completeness >= 0.8
    # Expert findings exist
    # AI confidence valid

def test_portfolio_missing_data():
    # Completeness < 0.8
    # missing_docs identified
    # actions_tr present
    # NO dummy scores

def test_risk_detail_contract():
    # Legal basis mandatory
    # Evidence structure
    # Check results valid

def test_dossier_generation():
    # PDF + ZIP created
    # Manifest valid
    # Evidence files copied
```

**Aksiyonlar**:
1. `backend/tests/` klasörü oluştur
2. `test_s10_qa_gate.py` ekle
3. pytest setup yap
4. Happy path + Scenario B testleri yaz
5. CI/CD'ye entegre et (opsiyonel)

---

## Hemen Sonraki Adım (Bugün Yapılabilir)

**En Acil**: Backend yapısal düzenleme

```bash
# Claude Code'a verilebilecek prompt:

GÖREV: Backend Yapısal Düzenleme (TDD Uyumu)

1. backend/api/v1/ klasörü oluştur
2. api_v1_contracts.py → backend/api/v1/contracts.py olarak taşı
3. Import path'leri güncelle (main.py vb.)
4. Smoke test: curl http://localhost:8000/api/v1/contracts/portfolio
5. Git commit: "refactor(backend): Restructure API to match TDD standards"
```

---

## Performans Metrikleri

**Bugünkü Temizlik**:
- 376+ .bak dosyası silindi (~50MB)
- 48 .DS_Store silindi
- 340+ __pycache__ klasörü temizlendi
- 196 _patch_backups dosyası silindi
- Toplam kazanç: ~100MB+ disk alanı

**Kod Kalitesi**:
- .gitignore standartlaştırıldı
- Hassas veri (backend/data/) git'ten çıkarıldı
- AI stratejisi dokümante edildi
- Resmi kaynak registry oluşturuldu

---

## Uzun Vadeli Hedefler

1. **RegWatch Always-Current**: 7/24 mevzuat takibi
2. **KV Bridge Table**: Ticari→Mali kâr otomasyonu
3. **RAG System**: ChromaDB + mevzuat corpus
4. **Cross-Check Engine**: e-Defter + Banka + Beyanname entegrasyonu
5. **Dossier Auto-Generation**: VDK/YMM standardında otomatik dosya

---

## Referanslar

- **TDD**: `docs/LYNTOS_Technical_Design_Document_v1.0.md`
- **Anayasa**: TDD Section 2-7 + 6-A
- **AI Config**: `backend/core/config.py`
- **RegWatch**: `backend/services/regwatch_sources.py`
