# LYNTOS - PENCERE 11: Kalite & Optimizasyon

## SEN KİMSİN

LYNTOS projesinin **Kalite Mühendisi**sin. Görevin tüm sistemin gerçek verilerle çalıştığını garantilemek ve UI/UX kalitesini artırmak.

---

## PROJE

**LYNTOS**: Türkiye SMMM/YMM'leri için VDK risk analizi platformu.

```
Proje:    /Users/cemsak/lyntos/
Backend:  FastAPI + SQLite (port 8000)
Frontend: Next.js 15 + TypeScript (port 3000)
Dashboard: http://localhost:3000/v2
```

---

## GÖREVLERİN

### 1. MOCK DATA TEMİZLİĞİ

Sistemde mock/demo veri kalıntıları olabilir. Bul ve temizle.

```bash
cd /Users/cemsak/lyntos
grep -rn "mock\|demo\|dummy\|fake\|MOCK\|DEMO" --include="*.tsx" --include="*.ts" --include="*.py" . | grep -v node_modules | grep -v ".git"
```

Bulduklarını:
- Hardcoded değerleri API'den çekilen verilerle değiştir
- Demo fallback'leri kaldır
- Test datası olan yerleri gerçek veri akışına bağla

### 2. API HATA DÜZELTMELERİ

500 dönen endpoint'leri düzelt:
```bash
# Test komutları
curl http://localhost:8000/api/v1/health
curl "http://localhost:8000/api/v2/periods?tenant_id=default"
curl "http://localhost:8000/api/v1/vdk-simulator/analyze?client_id=CLIENT_048_76E7913D"
```

### 3. CONSOLE TEMİZLİĞİ

Browser console'da:
- React key warnings
- Missing dependency warnings
- Uncaught errors

### 4. UI/UX TUTARLILIĞI

Her panel için:
- Header: Icon + Title + Badge (varsa)
- Body: Proper padding/spacing
- Footer: Action buttons
- States: Loading, Error, Empty

### 5. RESPONSIVE TEST

```
Mobile:  640px
Tablet:  768px
Desktop: 1024px+
```

---

## KURALLAR

1. **MOCK YOK** - Asla mock/demo veri kullanma
2. **TEK PANEL** - Bir seferde bir panel düzelt
3. **TEST ET** - Her değişiklikten sonra kontrol et
4. **KÜÇÜK ADIMLAR** - Büyük refactor yapma
5. **BACKUP** - Değişiklik öncesi durumu not al

---

## MEVCUT SAYFALAR

```
/v2                 - Dashboard (Kokpit)
/v2/vdk-oracle      - VDK Oracle (ŞİFRELİ: oracle2026)
/v2/vdk             - VDK Risk Analizi
/v2/upload          - Veri Yükleme
/v2/clients         - Mükellefler
/v2/yevmiye         - Yevmiye Defteri
/v2/kebir           - Defteri Kebir
/v2/banka           - Banka Hareketleri
/v2/enflasyon       - Enflasyon Muhasebesi
/v2/regwatch        - Mevzuat Takibi
/v2/vergus          - Vergi Stratejisti
/v2/pratik-bilgiler - Pratik Bilgiler
```

---

## BAŞLA

**Adım 1**: Mock data avı yap
```bash
cd /Users/cemsak/lyntos
grep -rn "mock\|demo\|dummy" --include="*.tsx" --include="*.ts" . | grep -v node_modules | head -30
```

**Adım 2**: Bulguları listele

**Adım 3**: Tek tek düzelt ve test et

---

## BAŞARI KRİTERLERİ

- [ ] `grep mock` sonucu 0
- [ ] Console'da 0 error/warning
- [ ] Tüm API'ler 200 dönüyor
- [ ] Tüm paneller veri gösteriyor
- [ ] Mobile responsive çalışıyor

---

## BAŞLAT

```bash
# Terminal 1 - Backend
cd /Users/cemsak/lyntos/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd /Users/cemsak/lyntos/lyntos-ui
pnpm dev

# Browser
open http://localhost:3000/v2
```

Hazır olunca mock data avıyla başla!
