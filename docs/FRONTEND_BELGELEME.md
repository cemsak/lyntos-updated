
---

## 2. FRONTEND KURALLARI ✅ BELGELENDİ

**Toplam: 3,822 satır kural kodu**

### 2.1 useFeedSignals.ts (616 satır) - 12 Kural

| ID | Başlık | Seviye | Hesap |
|----|--------|--------|-------|
| P0-001 | Mizan Dengesi Bozuk | CRITICAL | Borç-Alacak |
| P0-002 | Bilanço Dengesizliği | CRITICAL | Aktif-Pasif |
| P2-VDK-K09-01 | Yüksek Kasa Bakiyesi | HIGH/CRITICAL | 100 |
| P2-VDK-K09-02 | Negatif Kasa Bakiyesi | CRITICAL | 100 |
| P2-VDK-K04-01 | Ortaklardan Alacak - Faiz | CRITICAL | 131 |
| P2-VDK-K08-01 | Negatif Stok Bakiyesi | CRITICAL | 15x |
| P2-VDK-K12-01 | Finansman Gider Kısıtlaması | HIGH | 780 |
| P1-001 | Amortisman Ayrılmamış | HIGH | 25x, 257, 770 |
| P1-006 | Binek Oto Amortisman Limiti | HIGH | 254 |
| P3-001 | KDV Mutabakat Uyumsuzluğu | HIGH | 191, 391, 360, 190 |
| P3-002 | Dönem Sonu Kapatma | MEDIUM | 690 |
| P3-004 | Stopaj/SGK Eksikliği | HIGH | 360, 361 |

**Durum:** BYPASS - useBackendFeed kullanılıyor

### 2.2 Rule Engine V2 (1,969 satır) - 4 Phase

| Phase | Satır | Kurallar |
|-------|-------|----------|
| Phase 0 | 93 | P0-001, P0-002 (Veri Doğrulama) |
| Phase 1 | 434 | P1-001+ (Amortisman, Karşılık) |
| Phase 2 | 197 | VDK K-09, K-04, K-08 (Risk) |
| Phase 3 | 417 | P3-001+ (Çapraz Kontrol) |

**Durum:** MEVCUT ama dashboard kullanmıyor

### 2.3 CrossCheck Engine (1,237 satır) - 9 Kural

| Dosya | Kurallar |
|-------|----------|
| mizanYevmiye.ts | R-YEV-001, R-YEV-002 |
| mizanMuhtasar.ts | R-MUH-001, R-MUH-002 |
| mizanKdv.ts | R-KDV-001, R-KDV-002, R-KDV-003, R-KDV-004 |
| mizanBanka.ts | R-BNK-001 |

**Durum:** MEVCUT ama dashboard kullanmıyor

### 2.4 FRONTEND KURAL ÖZETİ

| Sistem | Satır | Kural Sayısı | Durum |
|--------|-------|--------------|-------|
| useFeedSignals | 616 | 12 | BYPASS |
| Rule Engine V2 | 1,969 | ~20 | MEVCUT |
| CrossCheck | 1,237 | 9 | MEVCUT |
| **TOPLAM** | **3,822** | **~41** | - |


---

## 3. BACKEND KURALLARI ✅ BELGELENDİ

**Toplam: 1,892 satır + 50 YAML dosyası**

### 3.1 analysis_trigger.py (587 satır) - AKTİF

**VDK 13 Kriter:**

| ID | Başlık | Hesap | Seviye |
|----|--------|-------|--------|
| VDK-01 | Kasa Hesabı Negatif | 100 | CRITICAL |
| VDK-02 | Ortaklara Borçlar Yüksek | 331 | CRITICAL |
| VDK-03 | Stok Negatif | 15 | CRITICAL |
| VDK-04 | Şüpheli Alacak Oranı | 128,129 | HIGH |
| VDK-05 | Borç/Özkaynak | 300,500 | HIGH |
| VDK-06 | Devreden KDV Yüksek | 190,191 | HIGH |
| VDK-07 | Finansman Gideri | 780 | MEDIUM |
| VDK-08 | Satış/Maliyet Uyumsuz | 600,620 | MEDIUM |
| VDK-09 | Amortisman Tutarsız | 257,268 | MEDIUM |
| VDK-10 | Gelir/Gider Dengesiz | 6,7 | MEDIUM |
| VDK-11 | Banka Uyumsuz | 102 | HIGH |
| VDK-12 | Alacak Devir Düşük | 120,600 | LOW |
| VDK-13 | Nakit Akış Tutarsız | 100,102,600 | HIGH |

**GV 12 Kontrol:**

| ID | Başlık | Seviye |
|----|--------|--------|
| GV-01 | Banka & Faiz | MEDIUM |
| GV-02 | Kur Değerleme | HIGH |
| GV-03 | Stok & SMM | HIGH |
| GV-04 | Dönemsellik | MEDIUM |
| GV-05 | Amortisman & Binek | MEDIUM |
| GV-06 | Şüpheli Alacak | HIGH |
| GV-07 | KDV Mutabakat | CRITICAL |
| GV-08 | Personel Gider | MEDIUM |
| GV-09 | KKEG | HIGH |
| GV-10 | Transfer Fiyat | CRITICAL |
| GV-11 | Örtülü Sermaye | CRITICAL |
| GV-12 | Geçmiş Yıl Zarar | MEDIUM |

### 3.2 YAML Kurallar (50 dosya)

- Genel (25): R-001 → R-VUK
- VDK KURGAN (13): K-01 → K-13
- VDK RAM (12): RAM-01 → RAM-12

### 3.3 vdk_kurgan_engine.py (670 satır)

Aktif: K-01, K-03, K-04, K-05, K-06, K-09, K-11, RAM-01, RAM-02, RAM-04, RAM-05, RAM-07, RAM-10, RAM-11, RAM-12

### 3.4 v1_rule_engine.py (635 satır)

Finansal analiz kuralları - V1 API

---

## 4. TOPLAM KURAL ENVANTERİ

| Kaynak | Satır | Kural | Durum |
|--------|-------|-------|-------|
| Frontend | 3,822 | ~41 | Bypass/Mevcut |
| Backend | 1,892 | ~90 | Aktif/Mevcut |
| YAML | - | 50 | Mevcut |
| **TOPLAM** | **5,714** | **~181** | - |


---

## 5. HOOKS ✅ BELGELENDİ

**Toplam: 30 hook, 6,467 satır**

### 5.1 Veri Çekme (20 hook)

| Hook | Satır | İşlev |
|------|-------|-------|
| useBackendFeed | 270 | Backend feed API ✅ |
| useQuarterlyAnalysis | 478 | Çeyrek analizi |
| useCorporate | 432 | Şirketler hukuku |
| useDashboardData | 594 | Dashboard verileri |
| useRegistry | 336 | Ticaret sicili |
| useAksiyonlar | 284 | Aksiyon kuyruğu |
| useRegWatchScan | 269 | Mevzuat tarama |
| useRightRailData | 267 | Sağ panel |
| useRiskReviewQueue | 209 | Risk inceleme |
| useCrossCheck | 204 | Çapraz kontrol |
| useInspectorPrep | 174 | Müfettiş hazırlık |
| useTaxCertificate | 173 | Vergi sertifikası |
| useDocumentChecklist | 171 | Belge kontrol |
| useVergusAnalysis | 107 | AI vergi stratejisti |
| useVdkValidation | 96 | VDK doğrulama |
| useVDKSimulator | 89 | VDK simülatör |

### 5.2 State Yönetimi (5 hook)

| Hook | Satır | İşlev |
|------|-------|-------|
| useFeedSignals | 616 | Client-side kurallar (BYPASS) |
| useFeedStore | 255 | Feed state (Zustand) |
| useRegWatchState | 187 | RegWatch state |
| useDonemVerileri | 186 | Dönem verileri |
| useLayoutContext | 173 | Layout context |

### 5.3 Utility (5 hook)

| Hook | Satır | İşlev |
|------|-------|-------|
| useUrlSync | 172 | URL senkron |
| useLayoutData | 148 | Layout data |
| useFailSoftFetch | 137 | Fail-soft fetcher |
| useRuleEngine | 110 | Kural motoru |
| useEvidenceBundle | 193 | Kanıt paketi |


---

## 6. COMPONENTLER ✅ BELGELENDİ

**Toplam: 104 component, 20,439 satır**

### 6.1 Klasörlere Göre Dağılım

| Klasör | Sayı | Ana Componentler |
|--------|------|------------------|
| layout | 12 | Sidebar, TopBar, ScopeSelector, RightRail |
| shared | 10 | Card, Badge, Button, Modal |
| deepdive | 10 | MizanOmurga, Kurgan, VDK, Inflation |
| dashboard | 8 | KpiStrip, TaxAnalysis, RiskSummary |
| risk-review | 8 | RiskReviewDetail, CheckResultCard |
| operations | 6 | RegWatchPanel, AksiyonKuyruguPanel |
| quarterly | 5 | CrossCheckDashboard, FinancialDataForm |
| corporate | 4 | DocumentChecklist, TTK376Widget |
| kpi | 4 | KpiCard, ExplainModal, RiskSkoruDetay |
| feed | 3 | IntelligenceFeed, FeedCard, ContextRail |
| upload | 3 | UploadZone, TaxCertificateUpload |
| Diğer | 31 | Çeşitli özel componentler |

### 6.2 En Büyük Componentler

| Component | Satır | İşlev |
|-----------|-------|-------|
| KurumlarVergisiPanel | 909 | Kurumlar vergisi |
| MizanOmurgaPanel | 862 | Mizan omurga |
| ContextRail | 578 | Context navigasyon |
| KurganAlertPanel | 573 | Kurgan risk uyarıları |
| InflationPanel | 530 | Enflasyon düzeltme |
| CrossCheckPanel | 485 | Çapraz kontrol |
| TaxCertificateUploadModal | 383 | Vergi sertifikası |
| VdkExpertPanel | 374 | VDK uzman |
| RegWatchPanel | 346 | Mevzuat takibi |
| IntelligenceFeed | 245 | Ana feed |


---

## 7. SAYFALAR ✅ BELGELENDİ

**Toplam: 44 sayfa, 7,367 satır**

### 7.1 Versiyon Dağılımı

| Versiyon | Sayı | Satır |
|----------|------|-------|
| V2 | 38 | 7,059 |
| V1 | 4 | 193 |
| Root | 2 | 10 |

### 7.2 V2 Sayfaları

**Kokpit & Veri:**
- /v2 (548) - Ana Dashboard
- /v2/upload (673) - Veri yükleme
- /v2/clients (360) - Mükellef listesi

**Vergi İşlemleri:**
- /v2/vergi/gecici (259) - Geçici vergi
- /v2/vergi/kurumlar (216) - Kurumlar vergisi
- /v2/declarations (201) - Beyannameler
- /v2/donem-sonu (213) - Dönem sonu
- /v2/mutabakat (144) - Mutabakat

**Risk Yönetimi:**
- /v2/risk (199) - Risk kuyruğu
- /v2/risk/rules (381) - Risk kuralları
- /v2/vdk (205) - VDK analizi

**Mevzuat & Şirketler:**
- /v2/regwatch (198) - Mevzuat takibi
- /v2/corporate (67) - Şirketler hukuku
- /v2/registry (100) - Ticaret sicili

**Pratik Bilgiler:**
- /v2/pratik-bilgiler (146) + 7 alt sayfa

**Raporlar & Diğer:**
- /v2/reports (254) - Raporlar
- /v2/enflasyon (123) - Enflasyon
- /v2/settings (190) - Ayarlar
- /v2/help (129) - Yardım

---

## 8. GENEL ÖZET ✅ BELGELEME TAMAMLANDI

| Kategori | Sayı | Satır |
|----------|------|-------|
| Kurallar (Frontend) | ~41 | 3,822 |
| Kurallar (Backend) | ~90 | 1,892 |
| YAML Kurallar | 50 | - |
| Hooks | 30 | 6,467 |
| Componentler | 104 | 20,439 |
| Sayfalar | 44 | 7,367 |
| **TOPLAM** | **~359** | **~40,000** |

---

## 9. YENİDEN YAZIM İÇİN REFERANS

Frontend silindiğinde, yeni sistem şunları içermeli:

### Sayfalar (44 route)
- Tüm /v2/* route'ları korunacak
- Aynı navigasyon yapısı

### Componentler (104 adet)
- Tüm paneller korunacak
- Aynı işlevsellik

### Hooks (30 adet)
- API çağıran hooklar korunacak
- State yönetimi korunacak

### Kurallar (181 adet)
- Tüm kurallar backend'e taşınacak
- Frontend sadece gösterecek

### Veri Akışı
- Tek kaynak: Backend API
- Mock/demo/dummy: SIFIR
- Client-side hesaplama: SIFIR

