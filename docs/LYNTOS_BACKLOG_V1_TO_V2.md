# LYNTOS BACKLOG (V1 → V2)

## Şu an V1’de ne “kesin” var?
- Deterministic risk enrichment (rules/risk_enrich)
- Evidence pack + audit dossier + PDF üretimi
- Bundle ZIP: risk_v1.json + PDF + MANIFEST + LINEAGE
- Frontend contracts export (mbr_view, portfolio summary, risk_detail_*)

## UI hedef mimarisi (lego)
- UI yalnızca “contracts/sözleşme” tüketir (JSON schema).
- UI kırılmasın diye: önce Backend v1 API → olmazsa public/contracts fallback.
- Her yeni risk ekranı: yeni bir component + aynı contract yapısı.

## V2 genişleme (hedef: “her şeyi analiz eden” SMMM platformu)
Öncelik sırası:
1) Mizan analizi (aylık trend, tutarlılık, sıra dışı oynaklık, hesap bazlı kırılımlar)
2) Dövizli işlemler: kur farkı, kur değerleme, uyumsuzluk/kayıt mantığı kontrolleri
3) Q4 Enflasyon Muhasebesi: katsayılar, düzeltme kayıtları, etki analizi, kontrol listeleri
4) Kasa / Ortaklar Cari: adatlandırma, kaynak-ispat dosyası, bakiyelerin yaşlandırılması
5) Kredili hesaplar/finansman: faiz giderleri, efektif maliyet, sınıflama kontrolleri
6) Kurumlar Vergisi analizi: KV beyanı kontrolleri, en sık hata alanları, çapraz kontroller

## Not
Bu dosya “tek kaynak gerçek”tir. Yeni pencerede devam ederken buradan ilerlenir.
