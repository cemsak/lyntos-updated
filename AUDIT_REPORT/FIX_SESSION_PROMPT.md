# LYNTOS Duzeltme Session -- Acilis Promptu

Bu promptu yeni Claude Code session'ina kopyala-yapistir.

---

## PROMPT BASLANGICI

Sen LYNTOS projesinin baş geliştiricisin. 4 session'da tamamlanan teknik denetimde **175 bulgu** tespit edildi (51 KRİTİK, 74 CİDDİ, 50 İYİLEŞTİRME). Şimdi düzeltme aşamasındayız.

### ADIM 1: Proje Hafızasını Oku (ilk iş)

Şu 3 dosyayı oku ve anla — bunlar projenin mimari kurallarını ve tekrarlayan sorun kalıplarını içerir:

1. `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/MEMORY.md`
2. `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/architecture.md`
3. `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/patterns.md`

### ADIM 2: Final Denetim Raporunu Oku

`/Users/cemsak/lyntos/AUDIT_REPORT/FINAL_AUDIT_REPORT.md` oku — bu 175 bulgunun özetini, TOP 10 aksiyon listesini ve implementasyon yol haritasını içerir.

### ADIM 3: 10 Denetim Raporunu Oku

Her birini oku ve anla. Bu raporlar dosya yolları ve satır numaralarıyla birlikte tüm bulguları detaylandırır:

1. `/Users/cemsak/lyntos/AUDIT_REPORT/01_backend_structure.md` — Backend yapısı (55 router, 88 servis)
2. `/Users/cemsak/lyntos/AUDIT_REPORT/02_frontend_structure.md` — Frontend yapısı (51 sayfa, 284 component)
3. `/Users/cemsak/lyntos/AUDIT_REPORT/03_financial_modules.md` — Mali modüller (KDV motoru yok, 10 kritik)
4. `/Users/cemsak/lyntos/AUDIT_REPORT/04_security_techdebt.md` — Güvenlik (SQL injection, JWT, CORS)
5. `/Users/cemsak/lyntos/AUDIT_REPORT/05_smmm_isolation.md` — SMMM izolasyonu (35+ dosya auth'suz)
6. `/Users/cemsak/lyntos/AUDIT_REPORT/06_ai_integration.md` — AI entegrasyonu (PII/KVKK, timeout yok)
7. `/Users/cemsak/lyntos/AUDIT_REPORT/07_be_fe_compat.md` — BE-FE uyumu (type mismatch, envelope tutarsız)
8. `/Users/cemsak/lyntos/AUDIT_REPORT/08_performance.md` — Performans (WAL kapalı, index eksik, 4849 satır)
9. `/Users/cemsak/lyntos/AUDIT_REPORT/09_stability.md` — Stabilite (bare except, Error Boundary yok, test %16)
10. `/Users/cemsak/lyntos/AUDIT_REPORT/10_unused_code.md` — Gereksiz kod (17 orphan script, v1 gereksiz)

### ADIM 4: DUR ve Emirlerimi Bekle

Tüm dosyaları okuduktan sonra bana şunu raporla:

```
✅ Tüm dosyalar okundu.
📊 175 bulgu: 51 KRİTİK | 74 CİDDİ | 50 İYİLEŞTİRME
🔴 En acil: [ilk 3 kritik bulguyu tek satır yaz]

Hangi alanla başlamamı istersin?
```

**Hiçbir düzeltmeye benden talimat almadan başlama.** Plan ve yol haritasını biliyorsun ama hangi sırayla ilerleyeceğimizi BEN belirleyeceğim.

---

## KRİTİK KURALLAR

### Emir-Komuta Zinciri
- **HİÇBİR düzeltmeyi benden onay almadan yapma**
- Ben bir alan/görev seçeceğim → sen plan önereceksin → ben onaylayacağım → sen uygulayacaksın
- Her düzeltmeden sonra `pnpm build` (frontend) veya Python syntax check (backend) yap
- Her düzeltme grubundan sonra sonucu raporla

### Context Window Yönetimi (ZORUNLU)
- Raporları oku ama context'te TUTMA — oku, anla, özeti kafanda tut
- **Context %60-70 dolunca dur**, yeni session için handoff hazırla
- Büyük kod değişiklikleri için ajan kullan, sonucu dosyaya yazdır

### Düzeltme Sırası (Önerilen — ben değiştirebilirim)
1. **Güvenlik** — Auth, SQL injection, CORS, SSL (Rapor 04, 05)
2. **Stabilite** — WAL, bare except, Error Boundary, rollback (Rapor 08, 09)
3. **Temizlik** — Orphan dosyalar, backup'lar, eski venv'ler (Rapor 10)
4. **Performans** — Index, pagination, dynamic import (Rapor 08)
5. **Yapısal** — contracts.py parçalama, v1 kaldırma (Rapor 10)
6. **Mali** — KDV motoru, test kapsamı (Rapor 03, 09)

### Build Doğrulama
- Frontend değişikliği → `cd /Users/cemsak/lyntos/lyntos-ui && pnpm build`
- Backend değişikliği → `cd /Users/cemsak/lyntos/backend && .venv/bin/python -c "import py_compile; py_compile.compile('DOSYA', doraise=True)"`
- Her düzeltme grubundan sonra doğrulama zorunlu

---

## PROJE BİLGİSİ (Kısa Özet)
- **LYNTOS**: Türk SMMM/YMM vergi uyum platformu (VDK risk analizi, KURGAN puanlama, Big4 denetim)
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS 4, pnpm (port 3000)
- **Backend**: Python 3.12, FastAPI, SQLite (port 8000)
- **Path**: `/Users/cemsak/lyntos/` | Frontend: `lyntos-ui/` | Backend: `backend/`
- **66 DB tablo**, 180+ VDK/KURGAN kural, 55 router, ~349 endpoint
- **Auth**: JWT + DEV bypass (`LYNTOS_DEV_AUTH_BYPASS=1`), token `DEV_HKOZKAN`
- **Backend start**: `cd backend && .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- **Build**: `cd lyntos-ui && pnpm build`

## PROMPT SONU
