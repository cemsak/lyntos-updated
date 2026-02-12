
---

## TD-002: Açılış Fişi ve Açılış Mizanı Eksikliği

**Tarih:** 2025-01-25
**Öncelik:** YÜKSEK
**Kategori:** Veri Bütünlüğü

### Problem
Kebir-Mizan cross-check'inde 35.2M TL fark tespit edildi. Farkın nedeni: Kebir dosyasında bazı hesaplar için dönem başı bakiye (açılış kaydı) bulunmuyor.

### Teknik Detay
- Mizan Borç = Dönem Başı Bakiye + Dönem İçi Hareketler
- Kebir Borç = Sadece Dönem İçi Hareketler (açılış fişi eksikse)
- 41 hesapta toplam 35,233,542.52 TL fark

### Çözüm Önerisi
Her yılın/dönemin başında sisteme şunlar yüklenmeli:
1. **Açılış Fişi (Yevmiye)** - Dönem başı bakiyelerin fiş kaydı
2. **Açılış Mizanı** - Önceki dönem kapanış bakiyeleri

### Etkilenen Modüller
- `cross_check_service.py` - C3 kontrolü
- ZIP yükleme akışı - Açılış dosyaları için alan eklenmeli
- Veri modeli - `opening_balance` tablosu gerekebilir

### Kabul Kriterleri
- [ ] ZIP yapısına açılış fişi/mizanı ekleme desteği
- [ ] Açılış bakiyelerini ayrı tabloda saklama
- [ ] C3 cross-check'te dönem başı bakiyeleri hesaba katma
- [ ] Eksik açılış verisi için kullanıcı uyarısı

