# LYNTOS STRATEJİK DÖNÜŞÜM PLANI
## KAŞİF & KURGAN Çağında SMMM'ler İçin Hayatta Kalma Rehberi

**Tarih:** 2026-01-21
**Durum:** Kritik Dönüşüm Gerekli

---

## 🔴 ACİL DURUM: TÜRKİYE VERGİ DENETİMİNDE DEVRİM

### Maliye Bakanı Mehmet Şimşek'in Duyurusu

> "Kayıt dışılıkla mücadelede yeni bir döneme girdik. Yapay zeka ve makine öğrenmesi ile artık kayıt dışı tüm faaliyetleri **ANINDA** tespit ediyor ve işlem yapıyoruz."

### KAŞİF Sistemi (Ocak 2026)
- **Günde 4 milyon mükellef** taranıyor
- GİB Teknoloji + TÜBİTAK Yapay Zeka Enstitüsü geliştirdi
- Kural tabanlı DEĞİL - yapay zeka modeli ile çalışıyor
- İlk gün: 2.550 sahte fatura riski yüksek mükellef tespit edildi
- 276 milyar TL tutarında şüpheli fatura belirlendi

### KURGAN Sistemi (1 Ekim 2025)
- "Sıfırıncı gün" mantığı - şirket kurulduğu anda tarama başlıyor
- **13 KRİTİK KRİTER** ile risk puanı hesaplıyor
- SMMM/YMM'ler artık MASAK'a raporlama ZORUNLU
- Reaktif → **PROAKTİF** denetime geçiş

---

## 📊 KURGAN 13 KRİTER (SMMM İÇİN KRİTİK)

| # | Kriter | LYNTOS Karşılığı |
|---|--------|------------------|
| K-01 | VTR'de "bilerek kullanım" tespiti | ✅ shb_risk.py |
| K-02 | Faaliyet konusu uyumu | ✅ kurgan_calculator.py |
| K-03 | Sahte belge tutarı / giderler oranı | ✅ mizan_omurga.py |
| K-04 | İlişkili kişi / müşavir bağlantısı | ✅ shb_risk.py |
| K-05 | Karlılık ve vergi uyumu | ✅ kurgan_calculator.py |
| K-06 | Çoklu sahte belge düzenleyici | ⚠️ STUB |
| K-07 | Depolama kapasitesi | ⚠️ STUB |
| K-08 | Sevkiyat belgeleri / plaka uyumu | ⚠️ STUB |
| K-09 | Ödeme şekli (banka/nakit) | ✅ cross_check_engine.py |
| K-10 | Yoklama tespitleri | ⚠️ STUB |
| K-11 | Geçmiş inceleme durumu | ✅ shb_risk.py |
| K-12 | Ortak/yönetici geçmişi | ✅ shb_risk.py |
| K-13 | E-imza tarih uyumu | ✅ analysis_trigger.py |

**LYNTOS Kapsama Oranı: 9/13 = %69 (ACİL İYİLEŞTİRME GEREKLİ)**

---

## 🎯 LYNTOS'UN MİSYONU

> **SMMM'lerin KAŞİF/KURGAN tarafından "yakalanmadan önce" müşterilerini uyarmasını sağlamak**

### Değer Önerisi

```
ÖNCE (Geleneksel):
  Mükellef hata yapar → GİB tespit eder → Ceza kesilir → SMMM "keşke bilseydik" der

SONRA (LYNTOS ile):
  LYNTOS risk analizi yapar → SMMM müşteriyi uyarır → Düzeltme yapılır → Ceza YOK
```

### SMMM'ler Neden LYNTOS'a İhtiyaç Duyar?

1. **Mesleki Sorumluluk**: MASAK'a raporlama zorunlu oldu
2. **Müşteri Koruma**: Habersiz KURGAN'a düşmemek için
3. **İş Kaybı Riski**: Riskli müşteri = SMMM'ye de soruşturma
4. **Rekabet Avantajı**: "Proaktif mali müşavirlik" markası

---

## 📍 MEVCUT DURUM: NEREDEYIZ?

### System Reality Score (Audit Sonucu)

```
┌─────────────────────────────────────────────┐
│  LYNTOS SYSTEM STATUS                       │
├─────────────────────────────────────────────┤
│  Frontend Code:     85% Real                │
│  Backend API:       95% Real                │
│  AI Services:       90% Real (Hybrid)       │
│  Rule Engines:      75% Real                │
│  Database Schema:   100% Ready              │
│  Database DATA:     0% (BOŞ!)               │
├─────────────────────────────────────────────┤
│  CODE: %85 Hazır                            │
│  DATA: %0 (Veri akışı kopuk)                │
└─────────────────────────────────────────────┘
```

### Kritik Sorunlar

| Sorun | Etki | Öncelik |
|-------|------|---------|
| Upload → DB akışı kopuk | Hiçbir analiz çalışmıyor | 🔴 P0 |
| KURGAN 4 kriter STUB | %31 kapsama eksik | 🟡 P1 |
| Cross-check BUG | 500 error | 🔴 P0 |
| Frontend demo data | SMMM güveni yok | 🟡 P1 |
| VDK page mock | Gerçek API bağlantısı yok | 🟡 P1 |

---

## 🚀 NEREYE GİDİYORUZ?

### Hedef: "GİB'den Önce Bul" Platformu

```
             MÜKELLEF VERİLERİ
                    │
                    ▼
    ┌───────────────────────────────┐
    │         LYNTOS                │
    │  ┌─────────┐  ┌─────────┐    │
    │  │ KAŞİF   │  │ KURGAN  │    │
    │  │ Taklidi │  │ 13Kriter│    │
    │  └────┬────┘  └────┬────┘    │
    │       │            │         │
    │       ▼            ▼         │
    │  ┌──────────────────────┐    │
    │  │   AI Risk Analizi    │    │
    │  │   Claude + GPT-4o    │    │
    │  └──────────┬───────────┘    │
    └─────────────┼────────────────┘
                  │
                  ▼
    ┌───────────────────────────────┐
    │      SMMM DASHBOARD           │
    │  • Risk Skoru: 73/100         │
    │  • K-09 UYARI: Nakit ödeme!   │
    │  • K-03 FAIL: Oran yüksek     │
    │  • ÖNERİ: Banka ödemesi yap   │
    └───────────────────────────────┘
```

---

## 🛠️ EYLEM PLANI

### PHASE 1: Veri Akışını Düzelt (BUGÜN)

| # | Görev | Dosya | Durum |
|---|-------|-------|-------|
| 1.1 | Upload → DB sync FIX | UploadModal.tsx | ✅ YAPILDI |
| 1.2 | Upload page sync FIX | upload/page.tsx | ✅ YAPILDI |
| 1.3 | Cross-check BUG FIX | cross_check_engine.py | ❌ YAPILMADI |
| 1.4 | Q1.zip TEST | Manual test | ❌ YAPILMADI |
| 1.5 | Mizan → DB akışı doğrula | mizan_sync.py | ❌ YAPILMADI |

### PHASE 2: Eksik KURGAN Kriterleri (Bu Hafta)

| Kriter | Eksik | Aksiyon |
|--------|-------|---------|
| K-06 | Çoklu düzenleyici analizi | API entegrasyonu |
| K-07 | Depolama kapasitesi | Stok/m² hesaplama |
| K-08 | Sevkiyat/plaka | E-irsaliye entegrasyonu |
| K-10 | Yoklama verileri | GİB API (izin gerekli) |

### PHASE 3: Frontend Gerçekleştirme (Bu Ay)

| Sayfa | Durum | Aksiyon |
|-------|-------|---------|
| /v2/vdk | DEMO DATA | Real API bağlantısı |
| /v2/reports | Mock audit | DB'den gerçek veri |
| Dashboard | localStorage | Backend API |

### PHASE 4: AI Zenginleştirme (Sonraki Ay)

- Claude ile risk açıklaması
- GPT-4o ile düzeltme önerisi
- Otomatik MASAK raporu taslağı

---

## 📋 BUGÜN YAPILACAKLAR (P0)

### 1. Cross-Check Engine BUG Fix

```python
# Dosya: /services/cross_check_engine.py:203
# ESKİ (BUG):
if abs(diff) <= self.TOLERANCE:  # ❌ UNDEFINED

# YENİ (FIX):
if abs(diff) <= self.TOLERANCE_TL:  # ✅ CORRECT
```

### 2. Q1 Upload Test

```
1. /v2/upload sayfasına git
2. Q1.zip yükle
3. Console'da "[UploadPage] Backend sync basarili" gör
4. DB kontrolü: SELECT count(*) FROM mizan_entries
5. Dashboard'da veri görünsün
```

### 3. Mizan Sync Doğrulama

```python
# Backend çalıştır
uvicorn main:app --reload

# Test isteği
curl -X POST http://localhost:8000/api/v2/mizan/sync \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "default", "client_id": "test", ...}'
```

---

## 📊 BAŞARI KRİTERLERİ

### Hafta Sonu Hedefi

| Metrik | Şu An | Hedef |
|--------|-------|-------|
| mizan_entries rows | 0 | >50 |
| document_uploads rows | 0 | >10 |
| KURGAN kriterleri | 9/13 | 11/13 |
| Frontend mock | 3 sayfa | 0 sayfa |

### Ay Sonu Hedefi

| Metrik | Hedef |
|--------|-------|
| KURGAN coverage | 13/13 (100%) |
| Cross-check tests | 5/5 pass |
| SMMM pilot kullanıcı | 1 gerçek müşteri |

---

## 🔗 KAYNAKLAR

- [Milliyet - Vergi sisteminde KAŞİF dönemi](https://www.milliyet.com.tr/ekonomi/vergi-sisteminde-kasif-donemi-bakan-simsek-bizzat-uyardi-aninda-yakalayacagiz-7524171)
- [Türkiye Gazetesi - 4 milyon mükellef analiz ediliyor](https://www.turkiyegazetesi.com.tr/ekonomi/kasif-devrede-4-milyon-mukellef-gunluk-olarak-analiz-ediliyor-1764824)
- [HMB - KURGAN Rehberi PDF](https://ms.hmb.gov.tr/uploads/sites/17/2025/10/Sahte-Belgeyle-Mucadele-Stratejisi-ve-KURGAN-Rehberi-29542a682ab0a437.pdf)
- [Ekonomim - KURGAN 13 Kriter](https://www.ekonomim.com/kose-yazisi/iste-kurgan-mezarliginin-13-kriteri/847152)
- [MuhasebeTR - KURGAN ve MASAK](https://www.muhasebetr.com/yazarlarimiz/yasarcatalkaya/008/)

---

## SONUÇ

**KAŞİF ve KURGAN, Türkiye'de vergi denetimini TAMAMEN değiştirdi.**

SMMM'ler artık iki seçenekle karşı karşıya:
1. ❌ Reaktif: GİB'in ceza kesmesini bekle
2. ✅ Proaktif: LYNTOS ile önceden tespit et

**LYNTOS'un misyonu:** SMMM'lerin müşterilerini KAŞİF/KURGAN'dan ÖNCE uyarmasını sağlamak.

**Bugünkü öncelik:** Veri akışını düzelt, Q1 verisini DB'ye aktar, dashboard'u canlandır.

---

_Strateji Belgesi v1.0_
_21 Ocak 2026_
