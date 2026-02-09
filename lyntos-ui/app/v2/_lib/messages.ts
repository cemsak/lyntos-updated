/**
 * LYNTOS UX Mesaj Sabitleri
 * Tüm kullanıcıya dönük Türkçe mesajlar burada merkezi olarak yönetilir.
 * SMMM/YMM profesyonellerine uygun, profesyonel dil kullanılır.
 */

export const UX_MESSAGES = {
  scope: {
    title: 'Mükellef ve Dönem Seçin',
    description: (feature: string) =>
      `${feature} için üstteki menülerden bir mükellef ve dönem seçin.`,
    clientOnly: 'Üstteki menüden bir mükellef seçin.',
    periodOnly: 'Üstteki menüden bir dönem seçin.',
    generic: 'İşlem yapmak için üstteki menülerden mükellef ve dönem seçiniz.',
  },
  connection: {
    title: 'Bağlantı Kurulamadı',
    description: (context: string) =>
      `${context} yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.`,
    retry: 'Tekrar Dene',
    timeout: (context: string) =>
      `${context} yüklenmesi beklenenden uzun sürüyor. Lütfen tekrar deneyin.`,
    serverError: (context: string) =>
      `${context} yüklenirken bir sunucu hatası oluştu. Bu durum genellikle geçicidir.`,
  },
  empty: {
    title: 'Veri Bulunamadı',
    description: (context: string) =>
      `Bu dönem için ${context} bulunamadı.`,
  },
} as const;
