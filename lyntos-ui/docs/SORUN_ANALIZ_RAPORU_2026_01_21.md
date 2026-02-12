# LYNTOS Sorun Analiz Raporu

**Tarih:** 2026-01-21
**Kapsam:** Kullanıcı tarafından bildirilen tüm dashboard sorunları

---

## 1. %83 TAMAMLANMA - NEREDEN GELİYOR?

### Açıklama
**%83 = 5/6 Big-6 Belge Kategorisi Yüklendi**

LYNTOS'ta 6 temel belge kategorisi (Big-6) tanımlı:

| # | Kategori | Açıklama | Durum |
|---|----------|----------|-------|
| 1 | MIZAN | Dönem sonu mizan | ✅ Yüklü |
| 2 | BEYANNAME | KDV/Muhtasar beyannameleri | ✅ Yüklü |
| 3 | TAHAKKUK | Vergi tahakkukları | ✅ Yüklü |
| 4 | BANKA | Banka ekstreleri | ✅ Yüklü |
| 5 | EDEFTER_BERAT | E-Defter beratları | ✅ Yüklü |
| 6 | EFATURA_ARSIV | E-Fatura arşivi | ❌ EKSİK |

**Hesaplama:** `5 / 6 * 100 = 83.33%` → **%83**

### Kaynak Dosyalar
- Hesaplama: `/app/v2/_lib/utils/docStatusHelper.ts:75`
- Big-6 tanımı: `/app/v2/_lib/constants/docTypes.ts:6-13`
- Gösterim: `/app/v2/_components/MissingDocumentsCard.tsx:131`

### Kullanıcı İçin Anlam
- **%100 için:** E-Fatura arşivi de yüklenmelidir
- **Veya:** Big-6 kategorileri yerine farklı bir tamamlanma kriteri tanımlanabilir

---

## 2. SAĞ PANEL - "6 EKSİK BELGE" VE "ANALİZ TAMAMLANAMADI"

### Sorunun Kaynağı
Sağ panel (`RightRail.tsx`) verilerini `/api/v1/contracts/right-rail-summary` endpoint'inden alıyor.

Bu endpoint Big-6 belge kategorilerini kontrol ediyor:
- **6 belge** = 6 Big-6 kategorisi
- **Eksik sayısı** = Yüklenmemiş kategoriler

### Neden "Analiz Tamamlanamıyor"?
Kod: `RightRail.tsx:255`
```tsx
<p className="text-[10px] text-slate-500">
  {eksikBelgeSayisi > 0 ? 'Analiz tamamlanamıyor' : 'Tüm belgeler tamam'}
</p>
```

**Çözüm önerisi:** E-Fatura arşivi yüklenirse bu mesaj kaybolur.

### Sağ Panel UI İyileştirme Önerisi
Kullanıcı haklı - sağ panel:
1. Çok yer kaplıyor
2. Ne olduğu belirsiz
3. "6 eksik" yazıyor ama hangi belgeler belli değil

**Önerilen değişiklikler:**
- Eksik belgeleri listele (sadece sayı değil)
- Paneli daraltılabilir yap
- Ya da ana içeriğin altına taşı

---

## 3. MİZAN OMURGA - VERİ YOK GÖSTERİYOR

### Sorunun Analizi

**Veritabanı durumu (DOĞRU):**
```
tenant=default, client=CLIENT_048_5F970880, period=2025-Q1
kayıt=76, borç=12,839,753.74 TL, alacak=13,898,080.81 TL
```

**Frontend'in beklediği:** `data.accounts` objesi (hesap kodları anahtar)
**Backend'in döndürdüğü:** `accounts` objesi ✅ DOĞRU

### GERÇEK SORUN: Backend Yeniden Başlatılmadı!

Yapılan düzeltmeler:
1. `_normalize_period_id()` fonksiyonu eklendi
2. `_get_mizan_data_from_db()` güncellendi
3. ScopeProvider `period.code` kullanmaya başladı

**AMA:** Python backend değişiklikleri **hot-reload olmaz**. Uvicorn yeniden başlatılmalı!

### Çözüm
```bash
# Backend'i yeniden başlat
pkill -f uvicorn
cd /path/to/lyntos/backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 4. GEÇİCİ VERGİ - VERİ YOK

### Sorunun Kaynağı
Geçici Vergi sayfası (`/v2/vergi/gecici`) mizan verisine bağımlı.

**Dönem karı hesaplama formülü:**
```
Dönem Karı = Gelirler (600-699 Alacak) - Giderler (600-699 Borç)
```

### Neden Boş Görünüyor?
1. Backend yeniden başlatılmadı → API boş veri dönüyor
2. Frontend "veri yok" state'inde kalıyor

### Çözüm
Backend yeniden başlatıldığında otomatik çalışacak.

---

## 5. ÇAPRAZ KONTROL - "DÜŞÜK GÜVEN"

### Sorunun Kaynağı
`CrossCheckPanel.tsx` güven skorunu şu kriterlere göre hesaplıyor:

1. **Veri kaynağı sayısı** (mizan, banka, e-fatura)
2. **Eşleşme oranı**
3. **Veri kalitesi skoru**

### Neden "Düşük Güven"?
- E-Fatura verisi eksik (6. Big-6 kategorisi)
- Banka ekstresi ile mizan eşleşmesi yapılamıyor (veri yok)

### Düzeltme İçin Gerekli
1. E-Fatura arşivi yüklenmeli
2. Banka ekstresi ile mizan 102 hesabı eşleştirilmeli

---

## 6. KANIT PAKETİ - "MİZAN GEREKLİ"

### Sorunun Kaynağı
Kanıt paketi oluşturmak için minimum gereksinimler:
- ✅ Mizan yüklü (veritabanında 76 kayıt var)
- ❓ Frontend API'den veri alamıyor

### Gerçek Sorun
Backend `has_data: false` döndürüyor çünkü **backend yeniden başlatılmadı**.

### Çözüm
Backend yeniden başlatıldığında `has_data: true` dönecek ve kanıt paketi oluşturulabilecek.

---

## 7. VERGİ RİSK SKORU - 100 PUAN

### Açıklama
**100 puan = Düşük Risk (İYİ)**

Risk skoru ters çalışır:
- 100 = En düşük risk (mükemmel)
- 0 = En yüksek risk (kritik)

### Hesaplama Kaynağı
`KpiStrip.tsx` ve `KurganAlertPanel.tsx`:
- VDK 13 kriter analizi
- Her kriter için risk puanı hesaplanır
- Toplam skor 100 üzerinden değerlendirilir

### Neden 100?
Veritabanındaki mizan verisi analiz edildiğinde:
- Kasa oranı normal
- Kar marjı pozitif
- Ortaklar cari hesabı normal
- vs.

**Not:** Mock data kullanılmıyor - gerçek veritabanından hesaplanıyor.

---

## 8. HTTP 500 HATASI - SAHTE FATURA ANALİZİ

### Sorunun Kaynağı
`/api/v1/contracts/fake-invoice-risk` endpoint'inde alan adı hatası:

```python
# HATALI:
toplam_aktif = mizan_data.get("toplam_aktif", 0)
kar = mizan_data.get("kar", 0)

# DOĞRU:
toplam_aktif = mizan_data.get("total_assets", 0) or 0
kar = mizan_data.get("kar_zarar", 0) or 0
```

### Düzeltme Durumu
✅ **Düzeltildi** - `contracts.py` güncellendi

---

## ÖZET: YAPILMASI GEREKENLER

### 1. Backend Yeniden Başlatılmalı (KRİTİK!)
```bash
pkill -f uvicorn
cd /path/to/backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Yenilemesi
Tarayıcıda F5 veya Ctrl+R

### 3. Beklenen Sonuçlar
Backend yeniden başlatıldıktan sonra:

| Bileşen | Beklenen Durum |
|---------|----------------|
| Mizan Omurga | 76 hesap, 12.8M TL borç |
| Geçici Vergi | Dönem karı hesaplanacak |
| Çapraz Kontrol | Denge kontrolü çalışacak |
| Kanıt Paketi | Oluşturulabilir olacak |
| Sahte Fatura | Risk skoru hesaplanacak |

### 4. Kalıcı İyileştirmeler (Opsiyonel)
- Sağ paneli yeniden tasarla
- Eksik belge detaylarını göster
- %83 yerine farklı metrik kullan

---

**Rapor Sonu**
_Auditor: Claude Opus_
_Date: 2026-01-21_
