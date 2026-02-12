# YENİ PENCERE AÇILIŞ PROMPTU

Aşağıdaki metni yeni Claude Code penceresine yapıştırın:

---

Sen LYNTOS Mali Analiz Platformu'nun teknik denetçisisin. Görevin 3 aşamadan oluşuyor. KOD DEĞİŞİKLİĞİ YAPMA — sadece denetle ve raporla.

## AŞAMA 1: Platformu Tanı

Önce brief dokümanını oku:
/Users/cemsak/lyntos/LYNTOS_PLATFORM_BRIEF.md

Sonra sırasıyla şu kritik dosyaları oku:
- /Users/cemsak/lyntos/lyntos-ui/app/v2/_components/layout/navigation.ts (menü yapısı)
- /Users/cemsak/lyntos/lyntos-ui/app/v2/_lib/config/api.ts (API endpoint config)
- /Users/cemsak/lyntos/lyntos-ui/lib/ui/design-tokens.ts (design system)
- /Users/cemsak/lyntos/lyntos-ui/app/v2/layout.tsx (provider hiyerarşisi)
- /Users/cemsak/lyntos/lyntos-ui/app/v2/_components/scope/ScopeProvider.tsx (scope sistemi)
- /Users/cemsak/lyntos/lyntos-ui/app/v2/_lib/auth.ts (auth)

## AŞAMA 2: Kapsamlı Platform Denetimi

Sol menüdeki TÜM sayfa ve modülleri denetle. Her sayfa için page.tsx + varsa alt bileşen/hook'ları oku.

Her dosyada şu kontrolleri yap:
1. API Uyumu — Endpoint URL'leri API_ENDPOINTS config'den mi geliyor? Hardcoded var mı?
2. Scope Kontrolü — useDashboardScope() veya useScopeComplete() doğru kullanılıyor mu?
3. Tip Güvenliği — TypeScript any kullanımı var mı? Eksik tiplemeler?
4. Hata Yönetimi — Loading/error/empty state'ler ele alınmış mı?
5. Design Token Uyumu — Renkler karteladan (design-tokens.ts) mı?
6. a11y — aria-label, role, semantic HTML yeterli mi?
7. Dead Code — Unused import, unreachable kod var mı?
8. Monolitik Yapı — Dosya 500+ satır mı? Bölünmeli mi?
9. localStorage — Scope-aware key pattern kullanılıyor mu?
10. Backend Sözleşme — API response frontend tipiyle uyuşuyor mu?
11. Performans — useMemo/useCallback gereken yerde kullanılmış mı?
12. Responsive — Grid/flex yapısı mobilde bozulur mu?

Denetlenecek sayfalar (tüm menü sırasıyla):
/v2 (Kokpit), /v2/q1-ozet, /v2/upload, /v2/clients, /v2/yevmiye, /v2/kebir, /v2/banka, /v2/banka/mutabakat, /v2/cross-check, /v2/edefter/rapor, /v2/vdk, /v2/risk/rules, /v2/vergus, /v2/donem-sonu, /v2/vergi/gecici, /v2/vergi/kurumlar, /v2/mutabakat (zaten denetlendi 28/28 — kısa kontrol yeterli), /v2/enflasyon, /v2/regwatch, /v2/regwatch/[id], /v2/corporate, /v2/corporate/chat, /v2/registry, /v2/pratik-bilgiler + alt sayfalar, /v2/reports, /v2/reports/evidence, /v2/settings, /v2/help

Ayrıca shared bileşenleri de kontrol et:
- app/v2/_components/shared/ altındaki tüm bileşenler
- app/v2/_hooks/ altındaki tüm hook'lar

## AŞAMA 3: Denetim Raporu Yaz

Tüm bulguları bu formatta raporla:

LYNTOS Platform Denetim Raporu
- Tarih, denetlenen dosya sayısı, toplam kontrol sayısı
- Özet: Kritik/Yüksek/Orta/Düşük bulgu adetleri
- Sayfa bazlı bulgular (her sayfa için ayrı tablo: severity, dosya:satır, sorun, önerilen düzeltme)
- Çapraz sorunlar (birden fazla sayfayı etkileyen)
- Teknik borç özeti
- Backend-frontend uyumsuzlukları
- UI/UX tutarsızlıkları

## AŞAMA 4: Bekle

Raporu yazdıktan sonra de ki: "Denetim raporu hazır. Şimdi tavsiye mektubunuzu bekliyorum. Mektubu aldıktan sonra düzeltme planı hazırlayacağım."

## ÖNEMLİ KURALLAR
- Backend (/backend/) dosyalarını ASLA değiştirme
- Sadece denetle ve raporla — KOD DEĞİŞİKLİĞİ YAPMA
- Cari Mutabakat modülü zaten denetlendi (28/28 geçti) — kısa doğrulama yeterli
- Son build durumu: npx tsc --noEmit → 0 hata, npx next build → 60/60 sayfa başarılı
