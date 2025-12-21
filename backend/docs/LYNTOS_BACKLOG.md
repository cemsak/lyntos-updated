# LYNTOS BACKLOG (tek kaynak)

## Stabil çekirdek (tamamlandı)
- v1 risk enrichment (deterministic)
- evidence_pack + audit_dossier (PDF)
- bundle zip + MANIFEST + LINEAGE
- frontend contracts export (docs/contracts)

## Adım 17: Canlı API moduna geçiş
- UI, public/contracts yerine /api/v1/contracts proxy üzerinden canlı backend’e bağlanacak.
- UI component mimarisi “lego”: src/lib/v1 + src/components/v1 + app/v1 routes
- Kırılmama kuralı: contracts (JSON sözleşmesi) geriye dönük uyumlu.

## Genişleme planı (modül modül)
1) Mizan derin analiz (hesap bazlı trend, mutabakat, 100/102/120/320/331/136 vb)
2) Dövizli işlemler (kur farkı, değerleme, kur riskleri)
3) Enflasyon muhasebesi (özellikle Q4 katsayıları, düzeltme etkileri)
4) Kasa adatlandırma / ortaklar cari (ispat yükü ve belge zinciri)
5) Kredili hesaplar / finansman yapısı / gider kısıtları
6) Kurumlar vergisi analizi (beyanname riskleri + çapraz kontroller)
