# LYNTOS AI Entegrasyon Denetim Raporu

**Tarih:** 2026-02-09
**Kapsam:** Backend AI servisleri, provider'lar, ajanlar
**Branch:** refactor/backend-upload

---

## OZET

| Seviye | Bulgu Sayisi |
|--------|-------------|
| KRITIK | 8 |
| CIDDI | 13 |
| IYILESTIRME | 7 |
| **TOPLAM** | **28** |

**Taranan Dosyalar:** 16 AI-related dosya
**Genel Durum: KRITIK** -- PII (VKN, mukellef bilgileri) filtresiz AI provider'larina gonderiliyor (KVKK ihlali). Hicbir dosyada timeout/retry yok. Prompt injection korumasi yok.

---

## 1. DOSYA BAZLI ANALIZ

### 1.1 claude_provider.py

**Gorev:** Anthropic Claude API provider
| Kriter | Durum |
|--------|-------|
| Timeout | **YOK** |
| Retry | **YOK** |
| Fallback | Router uzerinden |

**Bulgular:**
- **[KRITIK-01] Timeout Yok**: `self.client.messages.create()` cagrisi timeout parametresi olmadan yapiliyor. Claude API yanitlamazsa thread suresiz bekler.
- **[CIDDI-01] Retry Yok**: API baglanti hatalarinda (network timeout, 529 overloaded) yeniden deneme mekanizmasi yok.

### 1.2 openai_provider.py

**Gorev:** OpenAI GPT-4o/GPT-4o-mini API provider
| Kriter | Durum |
|--------|-------|
| Timeout | **YOK** |
| Retry | **YOK** |
| Fallback | Router uzerinden |

**Bulgular:**
- **[KRITIK-02] Timeout Yok**: `self.client.chat.completions.create()` cagrisi timeout olmadan.
- **[CIDDI-02] Retry Yok**: Ayni sorun -- 429 rate limit veya 500 hata durumunda retry yok.

### 1.3 router.py (AI Router)

**Gorev:** Provider yonlendirme ve fallback zinciri.

**Bulgular:**
- **[CIDDI-03] Manuel .env Parse**: .env dosyasini elle parse ediyor, `python-dotenv` yerine. Tirnak isaretleri ve multiline degerlerde sorun cikarabilir.
- **[OLUMLU] Fallback Zinciri**: Claude -> GPT-4o -> GPT-4o-mini -> Demo. Iyi tasarlanmis.
- **[OLUMLU] Task-Based Routing**: TaskType ve Complexity bazli akilli yonlendirme.

### 1.4 orchestrator.py

**Gorev:** Ana AI orkestratoru. Tum AI servislerini koordine eder.

**Bulgular:**
- **[KRITIK-03] VKN Dogrudan Prompt'a**: Mali analiz prompt'larinda mukellef VKN'si filtresiz gonderiliyor. KVKK 6. madde ihlali.
- **[KRITIK-04] Kapsamli PII Sizmasi**: VKN + mukellef adi + sektor + NACE kodu + vergi dairesi + TUM mizan bakiyeleri tek bir prompt'ta birlestirilip AI'a gonderiliyor.
- **[CIDDI-04] AI Response Dogrulamasi YOK**: AI'dan gelen cevaplar hicbir dogrulama veya filtreleme olmadan direkt kullaniciya donduruluyor.
- **[CIDDI-05] Thread-Unsafe Singleton**: `__new__` ile singleton pattern uygulanmis ancak `_initialized` flag'i thread-safe degil. Concurrent request'lerde race condition.

### 1.5 masterchef.py (Ajan Orkestratoru -- 525 satir)

**Bulgular:**
- **[CIDDI-06] JSON Schema Validasyonu Yok**: AI'dan gelen JSON `json.loads()` ile parse ediliyor ama beklenen semanin icerip icermedigi dogrulanmiyor.
- **[IYILESTIRME-01] Kalite Kontrol Varsayilan Kapali**: `deep_quality_check` flag'i varsayilan kapali.

### 1.6 vdk_inspector.py (414 satir)

**Bulgular:**
- **[KRITIK-05] Prompt Injection Korumasi YOK**: `question` parametresi dogrudan prompt'a yerlestirilmekte. "Ignore all previous instructions..." saldirisi mumkun.
- **[IYILESTIRME-02] Hallucination Korumasi Sadece Talimat Bazli**: "Hallucination YASAK" system prompt'ta -- teknik koruma degil.

### 1.7 mevzuat_takip.py (447 satir)

**Bulgular:**
- **[IYILESTIRME-03] Simule Tarama**: `_simulate_scan()` statik ornek veri donduruyor. Gercek web scraping yok.
- **[IYILESTIRME-04] Sessiz JSON Hatalari**: `json.JSONDecodeError` yakalanip `pass` ile atlaniyor.

### 1.8 rapor.py (502 satir)

**Bulgular:**
- **[CIDDI-07] VKN Rapor Metadata'sinda**: `RaporMetadata` icinde `mukellef_vkn` alani AI prompt'a gonderiliyor.
- **[IYILESTIRME-05] PDF/Word/Excel Export Yok**: `_convert_format()` icinde TODO notu, sadece JSON donduruyor.

### 1.9 ai_alerts.py (68 satir)

**Bulgular:**
- **[KRITIK-06] Module-Level Client Init**: `client = OpenAI(api_key=...)` modul yukleme aninda calisiyor. API key yoksa TUM MODUL IMPORT HATA VERIR.
- **[CIDDI-08] Non-Standard API Key Fallback**: `OPENAI_PROJECT_KEY` standart bir degisken degil.
- **[IYILESTIRME-06] Print Yerine Logger**: `print(f"[AI_ALERTS]...")` kullaniliyor.

### 1.10 ai_analyzer.py (1014 satir)

**Bulgular:**
- **[KRITIK-07] Tax Number AI Prompt'unda**: `analyze_company_change()` icinde vergi numarasi direkt Anthropic API'ye gonderiliyor.
- **[KRITIK-08] SSL Dogrulama Devre Disi**: `check_hostname = False`, `verify_mode = ssl.CERT_NONE`. Man-in-the-middle saldirisi mumkun.
- **[CIDDI-09] Rate Limiting Sadece Batch Modda**: `time.sleep(0.5)` sadece batch'te. Tekil cagrilarda limit yok.

### 1.11 llm_guard.py (25 satir)

**Bulgular:**
- **[KRITIK-09] Yaniltici Isim - Guard Yok**: Dosya adi `llm_guard.py` ancak HICBIR guard fonksiyonu yok. Sadece `chat()` ve `generate_with_fallback()` (sadece uzunluk kontrolu: `len(out) < 120`).
- **[CIDDI-10] Bos String API Key Default**: `os.getenv("OPENAI_API_KEY", "")` bos string default.

### 1.12 regwatch_chat_agent.py (755 satir)

**Bulgular:**
- **[CIDDI-11] Prompt Injection Yok**: Kullanici mesaji direkt prompt'a ekleniyor.
- **[OLUMLU] Demo Mod**: API key yokken demo modu var.

### 1.13 corporate_chat_agent.py (648 satir)

**Bulgular:**
- **[CIDDI-12] Prompt Injection Yok**: Kullanici mesaji direkt prompt'a.
- **[CIDDI-13] DB Icerigi System Prompt'a**: `_load_corporate_context()` DB verilerini system prompt'a yerlestiriyor. DB manipulasyonu ile prompt injection mumkun.
- **[OLUMLU] Deterministik Hesaplama**: `analyze_ttk376()` AI kullanmiyor -- dogru yaklasim.

### 1.14 base_agent.py (213 satir)

Temiz tasarim. AgentTask, AgentResult, AgentCapability, AgentStatus dogru. Sorun yok.

---

## 2. CAPRAZ KARSILASTIRMA MATRISI

```
                     Timeout  Retry  RateLimit  PII      PromptInj  ResponseVal  TrustScore
claude_provider.py   YOK      YOK    YOK        -        -          MINIMAL      YOK
openai_provider.py   YOK      YOK    YOK        -        -          MINIMAL      YOK
router.py            -        -      YOK        -        -          -            -
orchestrator.py      YOK      YOK    YOK        KRITIK   YOK        YOK          YOK
masterchef.py        YOK      YOK    YOK        CIDDI    YOK        ZAYIF        YOK
vdk_inspector.py     YOK      YOK    YOK        CIDDI    YOK        YOK          YOK
mevzuat_takip.py     YOK      YOK    YOK        -        YOK        ZAYIF        YOK
rapor.py             YOK      YOK    YOK        CIDDI    -          YOK          YOK
ai_alerts.py         YOK      YOK    YOK        ?        -          YOK          YOK
ai_analyzer.py       YOK      YOK    KISMI      KRITIK   YOK        KISMI        YOK
llm_guard.py         YOK      YOK    YOK        -        YOK        YOK          YOK
regwatch_chat.py     YOK      YOK    YOK        DUSUK    YOK        YOK          YOK
corporate_chat.py    YOK      YOK    YOK        DUSUK    YOK        YOK          YOK
```

---

## 3. API KEY YONETIMI

| Dosya | Key Okuma Yontemi | Default | Guvenli mi? |
|-------|-------------------|---------|-------------|
| claude_provider.py | `os.getenv("ANTHROPIC_API_KEY")` | None | EVET |
| openai_provider.py | `os.getenv("OPENAI_API_KEY")` | None | EVET |
| router.py | Manuel .env parse | - | SORUNLU |
| ai_alerts.py | `os.getenv(...) or os.getenv("OPENAI_PROJECT_KEY")` | None | RISKLI |
| ai_analyzer.py | `os.getenv("ANTHROPIC_API_KEY")` | None | EVET |
| llm_guard.py | `os.getenv("OPENAI_API_KEY", "")` | `""` bos | **HAYIR** |
| regwatch_chat_agent.py | `os.getenv("ANTHROPIC_API_KEY")` | None | EVET |
| corporate_chat_agent.py | `os.getenv("ANTHROPIC_API_KEY")` | None | EVET |

---

## 4. PII SIZMASI DETAY

| Dosya | PII Turu | Seviye |
|-------|----------|--------|
| orchestrator.py | VKN, mukellef adi, sektor, NACE, vergi dairesi, TUM mizan bakiyeleri | **KRITIK** |
| ai_analyzer.py | tax_number (VKN), sirket adi | **KRITIK** |
| rapor.py | mukellef_vkn, mukellef_adi | CIDDI |
| vdk_inspector.py | alarm_data, risk_data, client_info | CIDDI |
| masterchef.py | Context tamami prompt'a | CIDDI |

**KVKK Uyari:** VKN ve mukellef kimligi en az 5 farkli noktada AI provider'larina (Anthropic, OpenAI) gonderiliyor. AI saglayicilarinin veri isleme sozlesmeleri (DPA) imzalanmali. Mumkunse VKN/isim anonymize/tokenize edilmeli.

---

## 5. POZITIF TESPITLER

1. **Fallback Chain**: Claude -> GPT-4o -> GPT-4o-mini -> Demo zinciri iyi
2. **Demo Mode**: Cogu serviste API key olmadan calisabilen demo modu mevcut
3. **Task-Based Routing**: TaskType ve Complexity bazli akilli yonlendirme
4. **Agent Mimarisi**: BaseAgent, MasterChef, alt ajanlar -- temiz ve genisletilebilir
5. **Deterministik Hesaplamalar**: `analyze_ttk376()` AI disinda tutulmus
6. **Import Safety**: Claude ve OpenAI SDK'lari `try/except ImportError` ile sarmalanmis
7. **Metrik Toplama**: Provider ve agent seviyesinde temel metrikler

---

## 6. ONCELIKLI AKSIYON PLANI

### Acil (1-2 Hafta)
1. Timeout parametresi ekle (30s) -- claude_provider.py, openai_provider.py
2. VKN/PII anonymizasyonu veya tokenizasyonu -- orchestrator.py, ai_analyzer.py
3. Input sanitizasyonu + prompt armoring -- vdk_inspector.py
4. Module-level client'i lazy init'e cevir -- ai_alerts.py
5. SSL dogrulamayi aktif et -- ai_analyzer.py

### Orta Vade (2-4 Hafta)
6. tenacity ile retry mekanizmasi -- tum provider'lar
7. load_dotenv() veya merkezi config -- router.py
8. AI response validation layer -- orchestrator.py
9. Thread-safe singleton (Lock) -- orchestrator.py
10. Prompt injection korumasi -- regwatch/corporate_chat_agent.py
11. Gercek guard fonksiyonlari -- llm_guard.py

### Uzun Vade (1-3 Ay)
12. AIResponse'a trust_score, confidence, disclaimer, evidence_refs alanlari ekle
13. Rate limiting middleware (token bucket) -- tum dosyalar
14. Cikti seviyesinde expert vs ai ayrimi
15. PII filtreleme, prompt injection tespiti, output validation -- llm_guard.py
16. PDF/Word/Excel export -- rapor.py

---

*Rapor Sonu -- 2026-02-09*
