# LYNTOS V2 - Oturum Acilis Briefi

> **TALIMAT:** Bu dosyayi oku, icerigini tamamen anla, sonra sadece "Briefi okudum, tum sistemi anladim. Emirlerinizi bekliyorum." yaz ve dur. Planlama veya kod yazma YAPMA. Kullanicidan emir bekle.

---

## 1. LYNTOS Nedir?

LYNTOS, Turkiye'deki SMMM ve YMM'ler (muhasebeciler) icin gelistirilen **vergi risk analizi ve denetim hazirligi platformudur**. Amaci: VDK (Vergi Denetim Kurulu) denetiminde mukellefi proaktif olarak korumak, risk alanlarini tespit etmek ve savunma stratejisi olusturmak.

**Hedef Kullanici:** SMMM/YMM (mali musavirler)
**Platform Amaci:** VDK denetim riskini minimize etmek, mukellefin mali durumunu analiz etmek

---

## 2. Teknoloji Yigini

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 |
| Backend | FastAPI (Python) |
| Veritabani | SQLite (`lyntos.db`) |
| AI | Claude (Anthropic) - MasterChef Agent orkestrasyon |
| Dis Servisler | TCMB EVDS API (sektor verileri), TCMB Gunluk Kur XML |

**Proje Yolu:** `/Users/cemsak/lyntos/`
- Frontend: `/Users/cemsak/lyntos/lyntos-ui/`
- Backend: `/Users/cemsak/lyntos/backend/`

---

## 3. Test Mukellef Bilgileri

| Alan | Deger |
|------|-------|
| Mukellef | ALANYA OZKAN KIRTASIYE |
| Client ID | CLIENT_048_76E7913D |
| VKN | 0480525636 |
| NACE | 476201 (Perakende - Kirtasiye) |
| Donem | 2025-Q1 |
| Mizan | 788 gercek hesap kaydi (DB'de) |
| Veri Kaynagi | %100 gercek veri (mock/demo yok) |

---

## 4. KUTSAL KURALLAR (Ihlal Edilemez)

1. **MOCK/DEMO VERi YASAK** - Hicbir sekilde sahte, ornek veya placeholder veri uretilmez
2. **HALUSINASYON YASAK** - Olmayan veri uydurulmaz. Veri yoksa `null` veya "Veri yok" yazilir
3. **SESSIZ HATA YASAK** - Hatalar loglanir ve kullaniciya bildirilir, sessizce yutulamaz
4. **SMMM/YMM JARGONU** - Turkce muhasebe terminolojisi kullanilir (hesap plani, mizan, beyanname vs.)
5. **KANIT TABANLI** - Her bulgu icin kanit referansi (hesap, bakiye, donem, mevzuat) verilir

---

## 5. Mimari Yapi

### 5.1 KURGAN Sistemi (Cift Motorlu Risk Analizi)

| Motor | Olcek | Anlam | Dosya |
|-------|-------|-------|-------|
| **Calculator** (Saglik Skoru) | 0-100 | Yuksek = SAGLIKLII | `backend/services/kurgan_calculator.py` |
| **Simulator** (Risk Puani) | 0-100 | Yuksek = RISKLI | `backend/services/kurgan_simulator.py` |

> **DIKKAT:** Iki motor TERS olcek kullanir! Calculator'da 100 = en iyi, Simulator'da 100 = en kotu.

### 5.2 MasterChef Agent Orkestrasyon

```
BaseAgent → MasterChef → AIOrchestrator → Router
                ↓
    ┌───────────┼───────────┐
    VdkInspector  MevzuatTakip  RaporAgent
```

- **MasterChef:** Gorev yonlendirme ve kalite kontrol
- **VdkInspector:** VDK denetim perspektifinden analiz
- **MevzuatTakip:** Mevzuat degisikliklerini izleme
- **RaporAgent:** Rapor uretme

### 5.3 Frontend Provider Hiyerarsisi

```
LayoutProvider (selectedClient, selectedPeriod, user)
  → ScopeProvider (scope: {smmm_id, client_id, period})
    → ToastProvider
      → Dashboard Components
```

- `useLayoutContext()` → client/period/user bilgisi
- `useDashboardScope()` → scope bilgisi (smmm_id, client_id, period)

---

## 6. Sol Menu Yapisi (Navigation)

```
KOKPIT
├── Kokpit (/v2)                          → Ana dashboard
└── Q1 Beyanname Ozet (/v2/q1-ozet)      → Donem ozeti

VERI & DEFTERLER
├── Veri Yukleme (/v2/upload)
├── Mukellefler (/v2/clients)
├── Yevmiye Defteri (/v2/yevmiye)
├── Defteri Kebir (/v2/kebir)
├── Banka Hareketleri (/v2/banka)
├── Banka Mutabakat (/v2/banka/mutabakat)
├── Yevmiye-Kebir Kontrol (/v2/cross-check)
└── E-Defter Raporlari (/v2/edefter/rapor)

RISK & ANALIZ
├── VDK Risk Analizi (/v2/vdk)            → KURGAN sistemi
└── Kural Kutuphanesi (/v2/risk/rules)

VERGI & BEYANNAME
├── Vergi Stratejisti (/v2/vergus)
├── Donem Sonu Islemleri (/v2/donem-sonu)
├── Gecici Vergi (/v2/vergi/gecici)
├── Kurumlar Vergisi (/v2/vergi/kurumlar)
├── KDV Beyannamesi (/v2/beyanname/kdv)
├── Muhtasar (/v2/beyanname/muhtasar)
├── Cari Mutabakat (/v2/mutabakat)
└── Enflasyon Muhasebesi (/v2/enflasyon)

MEVZUAT & KURUMSAL
├── Mevzuat Takibi (/v2/regwatch)
├── Sirket Islemleri (/v2/corporate)
├── Ticaret Sicili (/v2/registry)
└── Chat Asistani (/v2/corporate/chat)

PRATIK BILGILER
├── Tum Bilgiler (/v2/pratik-bilgiler)
├── Hesaplamalar (/v2/pratik-bilgiler/hesaplamalar)
└── Kontrol Listeleri (/v2/pratik-bilgiler/kontrol-listeleri)

RAPORLAR
├── Raporlar (/v2/reports)
└── Kanit Paketi (/v2/reports/evidence)

SISTEM
├── Ayarlar (/v2/settings)
└── Yardim (/v2/help)
```

---

## 7. Kritik Dosya Haritasi

### Backend
| Dosya | Islem |
|-------|-------|
| `backend/api/v1/contracts.py` | ANA VDK endpoint'leri (kurgan-risk, vdk-oracle) ~3700 satir |
| `backend/api/v1/tax_strategist.py` | Vergi stratejisti endpoint'leri |
| `backend/api/v2/period_summary.py` | Q1 donem ozeti |
| `backend/api/v2/donem_complete.py` | Donem sonu tek endpoint |
| `backend/api/v2/beyanname_kdv.py` | KDV beyanname |
| `backend/api/v2/beyanname_muhtasar.py` | Muhtasar beyanname |
| `backend/api/v2/banka_mutabakat.py` | Banka mutabakat |
| `backend/api/v2/mizan_data.py` | Mizan veri yukleme/analiz |
| `backend/api/v2/cross_check.py` | Capraz kontrol |
| `backend/services/kurgan_calculator.py` | KURGAN saglik skoru motoru |
| `backend/services/kurgan_simulator.py` | KURGAN risk simulator motoru |
| `backend/services/mizan_omurga.py` | Mizan omurga analiz servisi (1310 satir) |
| `backend/services/enflasyon_duzeltme.py` | Enflasyon duzeltme motoru |
| `backend/services/tax_strategist.py` | Vergi strateji servisi |
| `backend/services/cross_check_engine.py` | Capraz kontrol motoru |
| `backend/services/data_enrichment.py` | Veri zenginlestirme |
| `backend/services/tcmb_evds_service.py` | TCMB EVDS API entegrasyonu |
| `backend/services/ai/agents/masterchef.py` | MasterChef ajan orkestrasyon |
| `backend/config/economic_rates.json` | Ekonomik oranlar (faiz, doviz fallback) |
| `backend/config/economic_rates.py` | Oran yukleyici (60s cache) |
| `backend/config/sector_averages.json` | 85 NACE kodu sektor ortalamalari |
| `backend/config/sector_data.py` | Sektor veri yukleyici (300s cache) |
| `backend/data/tax_strategies.json` | 50+ vergi optimizasyon stratejisi |

### Frontend
| Dosya | Islem |
|-------|-------|
| `lyntos-ui/app/v2/page.tsx` | Kokpit ana dashboard |
| `lyntos-ui/app/v2/q1-ozet/page.tsx` | Q1 Beyanname Ozet sayfasi |
| `lyntos-ui/app/v2/vergus/page.tsx` | Vergi Stratejisti |
| `lyntos-ui/app/v2/donem-sonu/page.tsx` | Donem Sonu Islemleri (812 satir) |
| `lyntos-ui/app/v2/beyanname/kdv/page.tsx` | KDV Beyannamesi |
| `lyntos-ui/app/v2/beyanname/muhtasar/page.tsx` | Muhtasar |
| `lyntos-ui/app/v2/mutabakat/page.tsx` | Mutabakat ana sayfa (4 tip) |
| `lyntos-ui/app/v2/mutabakat/cari/page.tsx` | Cari Mutabakat |
| `lyntos-ui/app/v2/enflasyon/page.tsx` | Enflasyon Muhasebesi |
| `lyntos-ui/app/v2/vdk/page.tsx` | VDK Risk Analizi |
| `lyntos-ui/app/v2/_components/layout/navigation.ts` | Sol menu yapilandirmasi |
| `lyntos-ui/app/v2/_components/layout/types.ts` | Client, Period, User tipleri |
| `lyntos-ui/app/v2/_components/layout/useLayoutContext.tsx` | Layout context provider |
| `lyntos-ui/app/v2/_components/scope/ScopeProvider.tsx` | Scope provider |
| `lyntos-ui/app/v2/_components/deepdive/MizanOmurgaPanel.tsx` | Mizan Analiz paneli (1620 satir) |
| `lyntos-ui/app/v2/_hooks/useVdkFullAnalysis.ts` | VDK analiz hook + tipler |
| `lyntos-ui/app/v2/vdk/_components/VdkHeader.tsx` | VDK header (mukellef + TCMB) |
| `lyntos-ui/app/v2/vdk/_components/tabs/GenelBakisTab.tsx` | Risk Radar + kategori |

---

## 8. Tamamlanan Isler (Onceki Oturum)

### Y3-Y5 + O1-O6 (9 gorev tamamlandi)

| Gorev | Aciklama | Durum |
|-------|----------|-------|
| Y3 | Ekonomik oranlar config'e tasindi (`economic_rates.json`) | ✅ |
| Y4 | 85 NACE sektor ortalamalari JSON'a tasindi | ✅ |
| Y5 | Simulator'daki sahte `sector_average = threshold * 0.6` gercek EVDS verisiyle degistirildi | ✅ |
| O1 | Sahte AI suggestion blogu kaldirildi (`"ai": None`) | ✅ |
| O2 | Risk skor etiketleri netlesti (yuksek=iyi vs yuksek=kotu) | ✅ |
| O3 | MasterChef case-insensitive routing | ✅ |
| O4 | sektor_devreden_kdv_ortalama NACE bazli | ✅ |
| O5 | TCMB fallback uyarisi (sari border + banner) | ✅ |
| O6 | KRG-09 "aktif degil" etiketi | ✅ |

### Bug Fix'ler (5 fix tamamlandi)

| Fix | Aciklama | Durum |
|-----|----------|-------|
| FIX-1 | Mukellef adi gosterimi (CLIENT_048 yerine isim) | ✅ |
| FIX-2 | Tarih label netlestirme (Faiz Oranlari: tarih) | ✅ |
| FIX-3 | Risk Radar "Veri Yok" → "Sorun Yok" badge | ✅ |
| FIX-4 | **KRITIK:** VDK Oracle `sektor_bilgisi` undefined bug | ✅ |
| FIX-5 | Silent error handling duzeltmesi (0 yerine None) | ✅ |

### Onemli Teknik Notlar
- `gecikme_faizi` farklilik BUG DEGILDIR: contracts.py 0.044 (6183 gecikme zammi) vs kurgan_calculator.py 0.018 (VUK 112 gecikme faizi) yasal olarak farkli oranlardir
- TCMB EVDS API: Aktif, API key `77lXIAV7kc`, endpoint `https://evds2.tcmb.gov.tr/service/evds`
- Build durumu: Backend Python + Frontend TypeScript + Next.js build = TEMIZ

---

## 9. PLANLANACAK ISLER (Bu Oturumda)

### IS-1: Q1 Beyanname Ozet Analizi
- **Sorun:** Isim gelecek donemlere uygun mu? (Q2/Q3/Q4 verileri geldiginde ne olacak?)
- **Sorun:** Odeme tarihinde "invalid date" uyarisi var - sebebi nedir?
- **Sorun:** %100 gercek veri akisi var mi?
- **Sorun:** Hesaplamalar ve analizler %100 dogru mu?
- **Kontrol edilecek dosyalar:**
  - Frontend: `lyntos-ui/app/v2/q1-ozet/page.tsx`
  - Backend: `backend/api/v2/period_summary.py`

### IS-2: Vergi Stratejisi Detayli Analiz
- Gercek veri akisi var mi? Sorunlar ve cozumleri
- **Kontrol edilecek dosyalar:**
  - Frontend: `lyntos-ui/app/v2/vergus/page.tsx`
  - Backend: `backend/api/v1/tax_strategist.py`, `backend/services/tax_strategist.py`
  - Data: `backend/data/tax_strategies.json`

### IS-3: Donem Sonu Islemleri Detayli Analiz
- Veri akisi problemi var! Calisma ve analiz prensipleri nelerdir?
- Mizan Kontrolu entegrasyonu
- **Kontrol edilecek dosyalar:**
  - Frontend: `lyntos-ui/app/v2/donem-sonu/page.tsx` (812 satir)
  - Backend: `backend/api/v2/donem_complete.py`

### IS-4: KDV Beyannamesi & Muhtasar - Gerekli mi?
- SMMM/YMM zaten muhasebe programlarinda bunlari ayrintili goruyor
- Bu bolumlere gercekten ihtiyac var mi? Alternatif cozum ne olmali?
- **Kontrol edilecek dosyalar:**
  - Frontend: `lyntos-ui/app/v2/beyanname/kdv/page.tsx`, `lyntos-ui/app/v2/beyanname/muhtasar/page.tsx`
  - Backend: `backend/api/v2/beyanname_kdv.py`, `backend/api/v2/beyanname_muhtasar.py`

### IS-5: Cari Mutabakat Revizyonu
- Sadece cari mutabakat olmali, diger mutabakatlar baska yerde yapiliyor
- SMMM'ye mukelleften alacagi cari hesap ekstrelerinin girilmesi istenmeli
- Mizan zaten sistemde yuklu - kontrol ve analiz et
- **Kontrol edilecek dosyalar:**
  - Frontend: `lyntos-ui/app/v2/mutabakat/page.tsx`, `lyntos-ui/app/v2/mutabakat/cari/page.tsx`
  - Backend: `backend/api/v2/banka_mutabakat.py`, cross_check_engine.py

### IS-6: Enflasyon Muhasebesi → Yeniden Degerleme Revizyonu
- **MEVZUAT DEGISIKLIGI (25 Aralik 2025):** VUK Gecici 37 ile 2025-2026-2027 donemlerinde enflasyon duzeltmesi YAPILMAYACAK (istisna: surekli islenmis altin/gumus)
- Bolumun ismi ve icerigi buna gore revize edilmeli
- "Yeniden Degerleme / Surekli Yeniden Degerleme" (VUK Muk. 298/C) artik pratik arac
- 698/648/658 hesaplari artik "anomali/istisna gostergesi" olmali (enflasyon duzeltmesi kontrolu degil)
- **Kontrol edilecek dosyalar:**
  - Frontend: `lyntos-ui/app/v2/enflasyon/page.tsx`, `lyntos-ui/app/v2/enflasyon/upload/page.tsx`
  - Backend: `backend/services/enflasyon_duzeltme.py`
  - Config: Navigation (`navigation.ts` - isim degisikligi)

### IS-7: Mizan Kontrol & Analiz Modulu (TAVSIYE MEKTUBU)

Bu en kapsamli is kalemidir. Asagidaki "Tavsiye Mektubu" detayli bir modül tasarim raporudur.

#### Modülün Amaci:
Mizan → Risk → Kanit → Aksiyon hattini kurmak. SMMM'nin muhasebe programinda zaten gordugu mizani tekrar gostermek DEGIL; inceleme riskini buyuten tutarsizliklari, denetim izlerini, donemsel kirilmalari ve beyan/defter uyumsuzlugu ihtimallerini kanitlanabilir sekilde yakalayip aksiyon uretmek.

#### Mevcut Durum:
- **Kokpit'te:** `MizanOmurgaPanel` (1620 satir) - 3 tab (VDK Risk, Oran Analizi, Detayli Mizan)
- **Kokpit'te:** `CrossCheckPanel` - Mutabakat Matrisi
- **Backend:** `mizan_omurga.py` (1310 satir) - 18+ hesap analizi + finansal oranlar
- **Donem Sonu Step 1:** Mizan Kontrolu referansi

#### Tavsiye Mektubu Ozeti (11 Baslik):

**0) Tasarim Ilkeleri:** Mock/demo yok, evidence-gated, fail-soft, SMMM jargonu

**1) 4 Katman:**
1. Data Quality & Normalize (Mizan Saglik)
2. Core Analytics (Mali Analiz Motoru) - tek/cok donem
3. Cross-Checks (Capraz Kontrol Motoru) - hesaplar arasi mantik
4. Risk Packaging (VDK Risk Paketleme) - bulgu + kanit + aksiyon

**2) Hesap Karti (Account Card):** Her hesap icin davranis + risk gostergeleri

**3) Tek Mizan Mali Analizi:** Likidite/karlilik/finansman/vergisel sinyaller + denetim sorusu uretimi

**4) Cok Donem Analizi:** Trend (QoQ/YoY), kirilma (structural shift), one-off sisma

**5) Yatay Analiz:** % degisim + "neden" aciklama motoru + materiality esik yonetimi

**6) Dikey Analiz:** Bilanco + gelir tablosu common-size + denetim yorumu

**7) Capraz Kontroller (Kontrol Matrisi):**
- 7.1: Yon/ters bakiye kontrolleri (100/120/320/191/391)
- 7.2: Hesaplar arasi mantik (Satis-Alacak-Banka ucgeni, Stok-SMM-Satici, Gider kompozisyonu, Ortaklar cari)
- 7.3: Vergi odakli kontroller (KDV davranisi, Stopaj/SGK, Kurumlar)
- 7.4: **YENIDEN DEGERLEME sinyalleri** (enflasyon duzeltmesi ertelendi):
  - 7.4.1: Rejim tespiti (2025-2027 enflasyon duzeltmesi yok)
  - 7.4.2: 698/648/658 artik anomali/istisna gostergesi
  - 7.4.3: ATIK + 257 es anli sicrama paterni
  - 7.4.4: Surekli yeniden degerleme kontrol paketi (Eligibility + Consistency + Impact Gate)

**8) Skorlama:** 3 bilesen (Materiality + Anomali + Vergi Etkisi) → Severity: Low/Medium/High

**9) UI/UX:** Kokpit KPI seridi (5-7 kart), 3 ana tablo/grafik, her bulguda aksiyon kutusu

**10) Ciktilar:** Executive Summary + Denetim Bulgulari + Calisma Kagidi Ekleri

**11) v1 Cekirdek Set:** Ters bakiye, trend kirilmasi, Satis-Alacak-Banka, gider kompozisyonu, ortaklar cari, 698/648/658

#### Entegrasyon Noktalari:
- Kokpit'teki Mizan Analiz + Mutabakat Matrisi bolumleri
- Donem Sonu Islemlerdeki Mizan Kontrolu bolumu
- Ozel Mizan Analiz Ajani (yoksa olusturulacak)

---

## 10. TCMB EVDS API Bilgileri

| Alan | Deger |
|------|-------|
| API URL | `https://evds2.tcmb.gov.tr/service/evds` |
| API Key | `77lXIAV7kc` |
| Durum | AKTIF (2024 sektor verisi donuyor) |
| TCMB Kur XML | `https://www.tcmb.gov.tr/kurlar/today.xml` |
| Doviz Fallback | USD: 43.50, EUR: 52.00, GBP: 54.00 |

---

## 11. Dogrulama Komutlari

```bash
# Backend syntax kontrolu
cd /Users/cemsak/lyntos/backend
python3 -c "import py_compile; py_compile.compile('api/v1/contracts.py', doraise=True)"

# Frontend TypeScript kontrolu
cd /Users/cemsak/lyntos/lyntos-ui
npx tsc --noEmit

# Full production build
npx next build

# Config test
cd /Users/cemsak/lyntos/backend
python3 -c "from config.economic_rates import get_faiz_oranlari; print(get_faiz_oranlari())"
python3 -c "from config.sector_data import get_sector_for_nace; print(get_sector_for_nace('47'))"
```

---

## 12. Onemli Hatirlatmalar

1. **Q1 ismi:** Q2/Q3/Q4 geldiginde ne olacak? Dinamik "Donem Beyanname Ozet" mi olmali?
2. **Enflasyon Muhasebesi ismi:** Gecici 37 ile degismeli → "Yeniden Degerleme & Enflasyon Duzeltmesi" veya "Deger Guncelleme Islemleri"
3. **KDV/Muhtasar:** SMMM'ler bunu zaten muhasebe programinda goruyor - LYNTOS'ta farkli bir deger katmali (capraz kontrol, risk sinyali) veya kaldirilmali
4. **Cari Mutabakat:** 4 tip var ama sadece cari mutabakat kalmali, digerler baska yerlerde
5. **Mizan Analiz Ajani:** Henuz ozel bir mizan analiz ajani yok - olusturulmali (MasterChef altinda)
6. **698/648/658 hesaplari:** Artik "enflasyon duzeltmesi" degil, "rejim uyum + yanlis kayit tespiti" olarak islenmeli
