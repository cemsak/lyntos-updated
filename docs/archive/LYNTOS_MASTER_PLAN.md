# LYNTOS MASTER PLAN
**Son Güncelleme**: 2026-02-01 21:00
**Aktif Sprint**: PENCERE 11

---

## TAMAMLANAN PENCERELER (1-10)

| Pencere | Ad | Durum |
|---------|-----|-------|
| 1 | Temel Altyapı (Next.js, FastAPI, Auth) | ✅ |
| 2 | Veri Yönetimi (Upload, Parser, Client) | ✅ |
| 3 | Defterler (Yevmiye, Kebir, Banka, E-Defter) | ✅ |
| 4 | Risk Yönetimi (VDK, KURGAN, **VDK ORACLE**) | ✅ |
| 5 | Vergi İşlemleri (Vergus, Geçici, Kurumlar) | ✅ |
| 6 | Yeniden Değerleme (Enflasyon VUK 298) | ✅ |
| 7 | Mevzuat (RegWatch) | ✅ |
| 8 | Kurumsal İşlemler (TTK, Sicil) | ✅ |
| 9 | Pratik Bilgiler (Oranlar, Hesaplamalar) | ✅ |
| 10 | Raporlar (Kanıt Paketi) | ✅ |

---

## AKTİF: PENCERE 11 - Kalite & Optimizasyon

### Hedefler
1. Mock/demo veri temizliği
2. API hata düzeltmeleri
3. Console warning temizliği
4. UI/UX tutarlılık
5. Performance iyileştirme

### Kontrol Listesi
- [ ] Mock data avı
- [ ] API 500 hataları
- [ ] React key warnings
- [ ] Panel design consistency
- [ ] Responsive test
- [ ] Loading/Error/Empty states

---

## PLANLANAN PENCERELER (12-15)

| Pencere | Ad | Öncelik |
|---------|-----|---------|
| 12 | Beyanname Hazırlık (KDV, Muhtasar) | Yüksek |
| 13 | Dashboard V3 (KPI, Notifications) | Orta |
| 14 | Multi-tenant (SMMM Login) | Orta |
| 15 | Mobile App | Düşük |

---

## SON DEĞİŞİKLİKLER

**2026-02-01**
- VDK Oracle sayfası oluşturuldu
- Navigation'a VDK Oracle eklendi
- vdk-tahmin sayfası silindi
- Plan V2 hazırlandı

---

## TEKNİK BİLGİLER

```
Backend:  http://localhost:8000
Frontend: http://localhost:3000/v2
Database: /backend/database/lyntos.db
```

### Kritik Endpoint'ler
```
/api/v1/vdk-simulator/analyze - VDK Oracle
/api/v1/contracts/kurgan-risk - KURGAN
/api/v2/mizan_data - Mizan
/api/v2/periods - Dönemler
```
