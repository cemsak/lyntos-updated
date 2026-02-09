/**
 * LYNTOS Navigation Configuration
 * Sprint 7.3 - Stripe Dashboard Shell
 * Updated: Faz 2 - Menü Revizyonu (12 → 8 kategori)
 */
import {
  LayoutDashboard,
  Upload,
  Users,
  FileText,
  BarChart3,
  PieChart,
  Settings,
  HelpCircle,
  Sparkles,
  Building2,
  MessageCircle,
  Calculator,
  BookOpen,
  ClipboardCheck,
  CalendarClock,
  Landmark,
  TrendingUp,
  ShieldAlert,
  CheckSquare,
  FileCheck,
  FolderArchive,
  Radar,
  BookText,
  CreditCard,
  ArrowLeftRight,
  FileSpreadsheet,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  badgeColor?: 'danger' | 'warning' | 'info';
  children?: NavItem[];
  dynamicLabel?: boolean;
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  // ═══════════════════════════════════════════════════════════
  // KOKPİT - Ana giriş noktası
  // ═══════════════════════════════════════════════════════════
  {
    id: 'kokpit',
    items: [
      {
        id: 'dashboard',
        label: 'Kokpit',
        href: '/v2',
        icon: LayoutDashboard,
      },
      {
        id: 'donem-ozet',
        label: 'Beyanname Özet & Risk Kontrolü',
        href: '/v2/donem-ozet',
        icon: PieChart,
        dynamicLabel: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // VERİ & DEFTERLER - Veri yükleme + Yevmiye/Kebir/Banka
  // (Birleştirildi: Veri + Defterler)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'veri-defterler',
    label: 'Veri & Defterler',
    items: [
      {
        id: 'upload',
        label: 'Veri Yükleme',
        href: '/v2/upload',
        icon: Upload,
      },
      {
        id: 'clients',
        label: 'Mükellefler',
        href: '/v2/clients',
        icon: Users,
      },
      {
        id: 'yevmiye',
        label: 'Yevmiye Defteri',
        href: '/v2/yevmiye',
        icon: BookText,
      },
      {
        id: 'kebir',
        label: 'Defteri Kebir',
        href: '/v2/kebir',
        icon: FileSpreadsheet,
      },
      {
        id: 'banka',
        label: 'Banka Hareketleri',
        href: '/v2/banka',
        icon: CreditCard,
      },
      {
        id: 'banka-mutabakat',
        label: 'Banka Mutabakat',
        href: '/v2/banka/mutabakat',
        icon: FileCheck,
      },
      {
        id: 'cross-check',
        label: 'Yevmiye-Kebir Kontrol',
        href: '/v2/cross-check',
        icon: ArrowLeftRight,
      },
      {
        id: 'edefter-rapor',
        label: 'E-Defter Raporları',
        href: '/v2/edefter/rapor',
        icon: FileText,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // RİSK & ANALİZ - VDK odaklı risk analizi
  // ═══════════════════════════════════════════════════════════
  {
    id: 'risk-analiz',
    label: 'Risk & Analiz',
    items: [
      {
        id: 'vdk-risk',
        label: 'VDK Risk Analizi',
        href: '/v2/vdk',
        icon: ShieldAlert,
      },
      {
        id: 'risk-rules',
        label: 'Kural Kütüphanesi',
        href: '/v2/risk/rules',
        icon: BookOpen,
      },
      // Mutabakat Matrisi menüden kaldırıldı - kontroller zaten:
      // /v2/cross-check, /v2/banka/mutabakat, /v2/mutabakat/cari sayfalarında mevcut
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // VERGİ & BEYANNAME - Vergi hesaplama ve beyanname hazırlık
  // (Birleştirildi: Vergi İşlemleri + Beyanname Hazırlık)
  // (Duplikasyonlar kaldırıldı: Geçici Vergi, Kurumlar Vergisi)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'vergi-beyanname',
    label: 'Vergi & Analiz',
    items: [
      {
        id: 'vergus',
        label: 'Vergi Stratejisti',
        href: '/v2/vergus',
        icon: Sparkles,
      },
      {
        id: 'donem-sonu',
        label: 'Dönem Sonu İşlemleri',
        href: '/v2/donem-sonu',
        icon: ClipboardCheck,
      },
      {
        id: 'gecici-vergi',
        label: 'Geçici Vergi',
        href: '/v2/vergi/gecici',
        icon: CalendarClock,
      },
      {
        id: 'kurumlar-vergisi',
        label: 'Kurumlar Vergisi',
        href: '/v2/vergi/kurumlar',
        icon: Landmark,
      },
      {
        id: 'mutabakat',
        label: 'Cari Mutabakat',
        href: '/v2/mutabakat',
        icon: FileCheck,
      },
      {
        id: 'yeniden-degerleme',
        label: 'Yeniden Değerleme',
        href: '/v2/enflasyon',
        icon: TrendingUp,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // MEVZUAT & KURUMSAL - Mevzuat takibi + TTK uyum
  // (Birleştirildi: Mevzuat + Kurumsal İşlemler)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'mevzuat-kurumsal',
    label: 'Mevzuat & Kurumsal',
    items: [
      {
        id: 'regwatch-main',
        label: 'Mevzuat Takibi',
        href: '/v2/regwatch',
        icon: Radar,
      },
      {
        id: 'corporate-law',
        label: 'Şirket İşlemleri',
        href: '/v2/corporate',
        icon: Building2,
      },
      {
        id: 'lyntos-asistan',
        label: 'LYNTOS Asistan',
        href: '/v2/asistan',
        icon: MessageCircle,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // PRATİK BİLGİLER - Referans bilgiler ve hesaplamalar
  // ═══════════════════════════════════════════════════════════
  {
    id: 'pratik-bilgiler',
    label: 'Pratik Bilgiler',
    items: [
      {
        id: 'pratik-bilgiler-main',
        label: 'Tüm Bilgiler',
        href: '/v2/pratik-bilgiler',
        icon: BookOpen,
      },
      {
        id: 'hesaplamalar',
        label: 'Hesaplamalar',
        href: '/v2/pratik-bilgiler/hesaplamalar',
        icon: Calculator,
      },
      {
        id: 'kontrol-listeleri',
        label: 'Kontrol Listeleri',
        href: '/v2/pratik-bilgiler/kontrol-listeleri',
        icon: CheckSquare,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // RAPORLAR - Çıktılar ve kanıt paketleri
  // ═══════════════════════════════════════════════════════════
  {
    id: 'reports',
    label: 'Raporlar',
    items: [
      {
        id: 'reports-main',
        label: 'Raporlar',
        href: '/v2/reports',
        icon: BarChart3,
      },
      {
        id: 'evidence-bundle',
        label: 'Kanıt Paketi',
        href: '/v2/reports/evidence',
        icon: FolderArchive,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // SİSTEM - Ayarlar ve yardım
  // ═══════════════════════════════════════════════════════════
  {
    id: 'system',
    label: 'Sistem',
    items: [
      {
        id: 'settings',
        label: 'Ayarlar',
        href: '/v2/settings',
        icon: Settings,
      },
      {
        id: 'help',
        label: 'Yardım',
        href: '/v2/help',
        icon: HelpCircle,
      },
    ],
  },
];
