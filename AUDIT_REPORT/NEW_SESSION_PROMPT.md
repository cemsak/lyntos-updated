# LYNTOS Denetim Session 4 -- Acilis Promptu

Bu promptu yeni Claude Code session'ina kopyala-yapistir.

---

## PROMPT BASLANGICI

Sen LYNTOS projesinin teknik denetcisisin. Onceki 3 session'da 10 denetim alaninin 7'si tamamlandi, 3'u kaldi.

### ADIM 1: Proje Hafizasini Oku (ilk is)
Su 3 dosyayi oku ve anla:
1. `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/MEMORY.md`
2. `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/architecture.md`
3. `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/patterns.md`

### ADIM 2: Devir Dosyasini Oku
`/Users/cemsak/lyntos/AUDIT_REPORT/00_session_handoff.md` oku -- 7 tamamlanmis rapor ve 3 eksik rapor listesi var.

### ADIM 3: Kalan 3 Denetim Alanini Tara
Sirasi ile su 3 raporu olustur (her birini AYRI bir ajan ile tarayip dosyaya yaz):

**Rapor 8 -- Performans:**
Dosya: `/Users/cemsak/lyntos/AUDIT_REPORT/08_performance.md`
Tara: DB index eksiklikleri, N+1 query, bundle boyutu, cache stratejisi, SQLite WAL modu, buyuk fonksiyonlar (contracts.py 4849 satir), frontend re-render, pagination eksigi

**Rapor 9 -- Stabilite & Hata Dayanikliligi:**
Dosya: `/Users/cemsak/lyntos/AUDIT_REPORT/09_stability.md`
Tara: bare except, transaction yonetimi, ErrorBoundary, input validation, test kapsami (4 test dosyasi cok az), edge case'ler (bos dosya upload, buyuk dosya, tum AI fail)

**Rapor 10 -- Gereksiz Dosya & Kod:**
Dosya: `/Users/cemsak/lyntos/AUDIT_REPORT/10_unused_code.md`
Tara: dead code (upload.py/bulk_upload.py deprecated), v1 vs v2 overlap, unused imports, contracts.py parcalanmali, duplicate code, orphan dosyalar, kullanilmayan dependency'ler

### ADIM 4: Final Rapor Olustur
Tum 10 raporu oku ve su dosyayi olustur:
`/Users/cemsak/lyntos/AUDIT_REPORT/FINAL_AUDIT_REPORT.md`

Icerik:
- Yonetici Ozeti (1 sayfa)
- Bulgu Dagilimi (KRITIK/CIDDI/IYILESTIRME tablosu)
- TOP 10 Oncelikli Aksiyon (hemen yapilmasi gereken)
- 10 denetim alaninin ozet tablolari
- Implementasyon Yol Haritasi (1 hafta / 1 ay / 3 ay)

### ADIM 5: 00_session_handoff.md Guncelle
Tum is bittikten sonra handoff dosyasini "10/10 tamamlandi + final rapor hazir" olarak guncelle.

---

## KRITIK KURALLAR

### Hicbir Duzeltme Yapma!
- Bu sadece DENETIM (audit). Hicbir kodu degistirme.
- "Hicbir duzeltmeyi bana sormadan yapma. Once raporla, onay al, sonra uygula."
- Sadece rapor yaz, bulgu listele, oncelik belirle.

### Context Window Yonetimi (ZORUNLU)
- **Ajan ciktilari DOSYAYA yazilsin**, context'e ALINMASIN
- Her ajan calistirdiginda, ajanin SONUCU dosyaya yazilmali, context'e yuklenmemeli
- Ajandan sadece "X bulgu buldum, Y dosyasina yazdim" seklinde 1-2 satirlik ozet al
- **Ayni anda en fazla 3 ajan calistir** (paralel)
- **Context %60-70 dolunca dur**, yeni session icin handoff hazirla

### Ajan Calistirma Stratejisi
- `Task` tool ile `general-purpose` ajan kullan
- Ajanin prompt'unda acikca dosya yolunu ver: "Sonuclari /Users/cemsak/lyntos/AUDIT_REPORT/08_performance.md dosyasina yaz"
- Ajan bittikten sonra dosyanin VARLIGINI ve BOYUTUNU kontrol et (`ls -la`)
- Dosya yazilmadiysa, ajan ciktisindaki icerigi kendin `Write` tool ile yaz

### Rapor Formati
Her rapor su yapida olmali:
```
# Baslik
## OZET (tablo: KRITIK/CIDDI/IYILESTIRME sayilari)
## 1-N. Bulgu Kategorileri (dosya yolu, satir numarasi, aciklama)
## ONCELIKLI AKSIYON PLANI (3 asama)
```

---

## PROJE BILGISI (Kisa Ozet)
- **LYNTOS**: Turk SMMM/YMM vergi uyum platformu (VDK risk analizi, KURGAN puanlama, Big4 denetim)
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS 4, pnpm (port 3000)
- **Backend**: Python 3.12, FastAPI, SQLite (port 8000)
- **Path**: /Users/cemsak/lyntos/ | Frontend: lyntos-ui/ | Backend: backend/
- **66 DB tablo**, 180+ VDK/KURGAN kural, 55 router, ~349 endpoint
- **Auth**: JWT + DEV bypass, tek dogru v2 implementasyon: ingest.py
- **#1 Sorun**: v2 API'nin %95'i auth'suz (KRITIK guvenlik acigi)

## PROMPT SONU
