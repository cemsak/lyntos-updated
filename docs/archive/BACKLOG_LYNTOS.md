# LYNTOS — Backlog (Kalıcı Plan)

## Prensip
- UI “lego” mimari: Her panel yalnızca **contract** ile konuşur; contract değişmeden UI kırılmaz.
- Backend: Her yeni modül **kural + evidence_pack + audit_dossier + bundle(lineage/manifest)** standardına uyar.

## Genişleme Modülleri (Öncelik Sırası)
1. Dövizli işlemler ve kur farkı kontrolleri (mizan + banka + e-belge izleri)
2. Q4 Enflasyon muhasebesi: katsayılar, düzeltme farkları, hesap grupları, tutarlılık testleri
3. Kasa adatlandırma + kasa/ortaklar cari “ispat dosyası” (belge zinciri mantığı)
4. Kredili hesaplar: “nakit varken kredi kullanımı”, faiz/masraf tutarlılıkları, banka kredi hareket izleri
5. Kurumlar vergisi analizi: beyanname–mizan–edefter uyumu, yaygın hata alanları
6. Mizan incelemesini derinleştirme: hesap bazlı drill-down, dönem tutarlılığı, oran analizleri, anomali tespiti

## Ürün Hedefi
- TR’de SMMM’ler için en güvenilir “inceleme öncesi iç denetim + dosyalama” platformu.
