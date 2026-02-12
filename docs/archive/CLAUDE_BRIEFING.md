# LYNTOS - Claude Briefing Belgesi
**Tarih**: 2026-02-01
**Versiyon**: V2.0

---

## 1. LYNTOS NEDİR?

LYNTOS, Türkiye'deki SMMM (Serbest Muhasebeci Mali Müşavir) ve YMM'ler (Yeminli Mali Müşavir) için geliştirilmiş **AI destekli VDK (Vergi Denetim Kurulu) risk analizi ve proaktif savunma hazırlık platformu**dur.

### Temel Değer Önerisi
- **Proaktif Risk Tespiti**: VDK incelemesi gelmeden ÖNCE riskleri tespit et
- **KURGAN Sistemi**: 16 farklı VDK inceleme senaryosunu analiz eden yapay zeka
- **AI Danışman**: Claude + OpenAI orkestrasyon ile profesyonel mevzuat danışmanlığı
- **Savunma Hazırlığı**: İzaha davet, inceleme ve dava süreçleri için hazırlık

### Hedef Kullanıcılar
- SMMM'ler (ana kullanıcı grubu)
- YMM'ler
- Mali müşavirlik büroları
- Muhasebe departmanları

---

## 2. TEKNİK MİMARİ

### Backend (Python/FastAPI)
```
/Users/cemsak/lyntos/backend/
├── main.py                 # FastAPI app entry point
├── api/v1/                 # API endpoints
│   └── contracts.py        # VDK analiz endpointleri
├── services/
│   └── ai/
│       ├── router.py       # AI Orchestrator (Claude + OpenAI)
│       ├── claude_provider.py
│       └── openai_provider.py
├── middleware/
│   └── auth.py             # JWT + DEV_HKOZKAN bypass
├── database/
│   └── db.py               # SQLite bağlantısı
└── data_enrichment.py      # TCMB, sektör benchmark verileri
```

### Frontend (Next.js 15 + React 18)
```
/Users/cemsak/lyntos/lyntos-ui/
├── app/
│   └── v2/
│       ├── vdk/            # VDK Risk Yönetimi sayfası
│       │   ├── page.tsx
│       │   └── _components/tabs/
│       │       └── AiDanismanTab.tsx
│       ├── _hooks/
│       │   ├── useAiAnalysis.ts
│       │   └── useVdkFullAnalysis.ts
│       └── _components/
│           └── scope/ScopeProvider.tsx
├── next.config.ts          # Rewrites proxy config
└── .env.local              # NEXT_PUBLIC_DEV_AUTH_BYPASS=1
```

### Veritabanı
- **SQLite**: `/Users/cemsak/lyntos/backend/lyntos.db`
- Tablolar: users, clients, periods, mizan (muhasebe verileri)

### AI Sağlayıcılar
| Provider | Model | Kullanım |
|----------|-------|----------|
| Claude | claude-sonnet-4-20250514 | Detaylı analiz, mevzuat soruları |
| OpenAI | gpt-4o-mini | Hızlı özet, basit sorular |
| OpenAI | gpt-4o | Karmaşık sorular (fallback) |

---

## 3. ANAYASA - KIRMIZI ÇİZGİLER

### 🚫 YASAK LİSTESİ (Asla Yapılmayacaklar)

1. **DEMO MODU YASAK**
   - "Demo" provider LYNTOS için kutsal kitap ihlalidir
   - Fallback zinciri: Claude → GPT-4o → GPT-4o-mini
   - Demo'ya düşmek = sistem arızası demek

2. **HALÜSİNASYON YASAK**
   - AI asla uydurma veri üretmemeli
   - Mizan verileri %100 gerçek DB'den gelmeli
   - Risk skorları KURGAN algoritmasından hesaplanmalı

3. **YANLIŞ RİSK SKORU YASAK**
   - Risk skoru her yerde AYNI olmalı (66/100 vs 85/100 gibi tutarsızlık YASAK)
   - Data enrichment ZORUNLU

4. **GENERİK YANITLAR YASAK**
   - AI "genel tavsiyeler" vermemeli
   - Müvekkil-spesifik, veri-odaklı analiz şart
   - Mevzuat referansları (KVK, VUK, TTK maddeleri) zorunlu

5. **EKSİK VERİ YASAK**
   - `kritik_hesaplar` her zaman dolu olmalı
   - Kasa, 431 hesabı, stok, ciro verileri zorunlu

---

## 4. KUTSAL KİTAP KURALLARI

### 4.1 VDK Risk Analizi Kuralları

```
KURGAN SİSTEMİ - 16 SENARYO
├── KRG-01: Kasa Şişkinliği (100 hesabı)
├── KRG-02: Ortaklara Borç (131 hesabı)
├── KRG-03: Ortaklardan Alacak (231 hesabı)
├── KRG-04: Stok-Satış Uyumsuzluğu ⚠️ (153/620-621)
├── KRG-05: Şüpheli Alacak (128/129 hesabı)
├── KRG-06: Banka Kredisi Uyumu (300/400)
├── KRG-07: KDV İade Riski (190/391)
├── KRG-08: Amortisman Tutarsızlığı (257/268)
├── KRG-09: Personel Gider Oranı (770)
├── KRG-10: Brüt Kar Marjı Analizi
├── KRG-11: KKEG Uyumu (689)
├── KRG-12: Geçici Vergi Tutarlılığı
├── KRG-13: Transfer Fiyatlandırması ⚠️ (431 hesabı)
├── KRG-14: Devreden KDV 36 Ay Kuralı
├── KRG-15: KDV Yükü Analizi
└── KRG-16: SGK Prim Tutarlılığı
```

### 4.2 Risk Skoru Formülü

```
Risk Skoru = 100 - (Kategori Risk Ortalaması) - (Tetiklenen KURGAN × 5)

Örnek: 100 - 24 - (2 × 5) = 66/100
```

### 4.3 İnceleme Olasılığı Formülü

```
İnceleme Olasılığı = (100 - Risk Skoru) + (Tetiklenen Senaryo × 10)

Örnek: (100 - 66) + (2 × 10) = 54%
```

### 4.4 AI Orchestrator Kuralları

```python
TASK_TYPE_ROUTING = {
    "quick_summary": "gpt-4o-mini",      # Hızlı, ucuz
    "detailed": "claude",                 # Detaylı analiz
    "question": "claude",                 # Mevzuat soruları
    "complex_analysis": "claude"          # Karmaşık senaryolar
}

FALLBACK_CHAIN = ["claude", "gpt-4o", "gpt-4o-mini"]
# DEMO YOK!
```

---

## 5. KRİTİK DOSYALAR

### Backend
| Dosya | Açıklama |
|-------|----------|
| `api/v1/contracts.py` | VDK analiz endpointleri, KURGAN hesaplama |
| `services/ai/router.py` | AI orchestrator, provider routing |
| `data_enrichment.py` | TCMB verileri, sektör benchmarkları |
| `middleware/auth.py` | JWT doğrulama, DEV bypass |

### Frontend
| Dosya | Açıklama |
|-------|----------|
| `app/v2/vdk/page.tsx` | VDK Risk Yönetimi ana sayfası |
| `_components/tabs/AiDanismanTab.tsx` | AI Danışman tab'ı |
| `_hooks/useAiAnalysis.ts` | AI API hook'ları |
| `_hooks/useVdkFullAnalysis.ts` | KURGAN veri hook'u |
| `_lib/auth.ts` | Frontend auth helper |

---

## 6. MEVCUT DURUM (2026-02-01)

### ✅ Çalışan Özellikler
- VDK Risk Analizi sayfası
- KURGAN 16 senaryo analizi
- AI Danışman (Claude + OpenAI)
- Hızlı Özet (GPT-4o-mini)
- Detaylı Analiz (Claude)
- Risk Radar görselleştirme
- Kritik Uyarılar listesi
- Proaktif uyarı sistemi

### 🔧 Bilinen Sorunlar (Çözüldü)
- ~~HTTP 500 hatası~~ → Next.js rewrites vs catch-all route çakışması (ÇÖZÜLDİ)
- ~~Risk skoru tutarsızlığı~~ → Data enrichment eklendi (ÇÖZÜLDİ)
- ~~API key yükleme sorunu~~ → Early .env loading (ÇÖZÜLDİ)

---

## 7. İYİLEŞTİRME ÇALIŞMASI - HEDEFLER

### 7.1 VDK Risk Analizi Sayfası
- [ ] UI/UX iyileştirmeleri
- [ ] Performance optimizasyonu
- [ ] Yeni KURGAN senaryoları
- [ ] Rapor export (PDF/Excel)

### 7.2 Sol Dikey Menü
- [ ] Menü yapısı iyileştirme
- [ ] Aktif sayfa gösterimi
- [ ] Responsive tasarım
- [ ] Icon ve label tutarlılığı

### 7.3 AI Danışman
- [ ] Streaming response
- [ ] Conversation history
- [ ] Token kullanım optimizasyonu

---

## 8. GELİŞTİRME KURALLARI

### Commit Mesajları
```
feat: Yeni özellik
fix: Bug düzeltme
refactor: Kod iyileştirme
docs: Dokümantasyon
style: Stil değişiklikleri
```

### Test Gereksinimleri
- Backend: pytest
- Frontend: Jest + React Testing Library
- E2E: Playwright

### PR Kuralları
- Kod review zorunlu
- Test coverage %80+
- Lint hatasız

---

## 9. ÖRNEK MÜVEKKİL VERİSİ

```
Müvekkil: ALANYA ÖZKAN KIRTASİYE MATBAACILIK
Client ID: CLIENT_048_76E7913D
VKN: 0480525636
Dönem: 2025-Q1
NACE: 4761 (Kırtasiye perakende)

Risk Durumu:
- Risk Skoru: 66/100 (ORTA)
- İnceleme Olasılığı: %54
- Tetiklenen KURGAN: KRG-04, KRG-13

Kritik Hesaplar:
- Kasa (100): 90,274 TL
- Ortaklara Borç (431): 7,009,638 TL ⚠️
- Stok (153): 26,569,999 TL
- Ciro: 9,023,364 TL
- Sermaye (500): 350,000 TL
```

---

## 10. BAŞLANGIÇ KOMUTLARI

### Backend
```bash
cd /Users/cemsak/lyntos/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd /Users/cemsak/lyntos/lyntos-ui
pnpm dev
```

### Test
```bash
# Backend API test
curl http://localhost:8000/api/v1/contracts/kurgan-risk?client_id=CLIENT_048_76E7913D&period=2025-Q1

# Frontend
open http://localhost:3000/v2/vdk?smmm=HKOZKAN&client=CLIENT_048_76E7913D&period=2025-Q1
```

---

## 11. ÖNCELİKLİ GÖREVLER

Yeni oturumda yapılacaklar:

1. **MCP ile VDK sayfasını incele** - Mevcut durumu analiz et
2. **Sol menüyü incele** - Yapısal sorunları tespit et
3. **Problem raporu hazırla** - Bulguları listele
4. **İyileştirme planı oluştur** - Öncelik sıralaması yap

---

**NOT**: Bu belge yeni Claude oturumu için hazırlanmıştır. Tüm kurallar ve kısıtlamalar geçerlidir.
