/**
 * LYNTOS Navigation Configuration
 * Sprint 7.3 - Stripe Dashboard Shell
 * Updated: Sprint 1.1 - Anayasa Compliance
 */
import {
  LayoutDashboard,
  Upload,
  Users,
  AlertTriangle,
  FileText,
  BarChart3,
  Settings,
  HelpCircle,
  Sparkles,
  Building2,
  MessageCircle,
  Calculator,
  Percent,
  Scale,
  Shield,
  Clock,
  AlertCircle,
  Calendar,
  BookOpen,
  ClipboardCheck,
  CalendarClock,
  Landmark,
  TrendingUp,
  ShieldAlert,
  GitBranch,
  CheckSquare,
  FileCheck,
  FolderArchive,
  Radar,
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
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  // ═══════════════════════════════════════════════════════════
  // KOKPİT - Ana giriş noktası (label yok, tek item)
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
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // VERİ - Veri yükleme ve mükellef yönetimi
  // ═══════════════════════════════════════════════════════════
  {
    id: 'data',
    label: 'Veri',
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
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // RİSK YÖNETİMİ - VDK odaklı risk analizi
  // ═══════════════════════════════════════════════════════════
  {
    id: 'risk',
    label: 'Risk Yönetimi',
    items: [
      {
        id: 'risk-queue',
        label: 'Bekleyen İşlemler',
        href: '/v2/risk',
        icon: AlertTriangle,
        badge: 3,
        badgeColor: 'danger',
      },
      {
        id: 'vdk-risk',
        label: 'VDK Risk Analizi',
        href: '/v2/vdk',
        icon: ShieldAlert,
      },
      {
        id: 'risk-rules',
        label: 'Risk Kuralları',
        href: '/v2/risk/rules',
        icon: GitBranch,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // VERGİ İŞLEMLERİ - Tüm vergi hesaplama ve beyan işlemleri
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tax',
    label: 'Vergi İşlemleri',
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
        id: 'declarations',
        label: 'Beyannameler',
        href: '/v2/declarations',
        icon: FileText,
      },
      {
        id: 'mutabakat',
        label: 'Mutabakat',
        href: '/v2/mutabakat',
        icon: FileCheck,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ENFLASYON - Enflasyon muhasebesi
  // ═══════════════════════════════════════════════════════════
  {
    id: 'enflasyon',
    label: 'Enflasyon',
    items: [
      {
        id: 'enflasyon-muhasebesi',
        label: 'Enflasyon Muhasebesi',
        href: '/v2/enflasyon',
        icon: TrendingUp,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // MEVZUAT - Mevzuat takibi ve değişiklik radarı
  // ═══════════════════════════════════════════════════════════
  {
    id: 'regwatch',
    label: 'Mevzuat',
    items: [
      {
        id: 'regwatch-main',
        label: 'Mevzuat Takibi',
        href: '/v2/regwatch',
        icon: Radar,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ŞİRKETLER HUKUKU - TTK uyum ve şirket işlemleri
  // ═══════════════════════════════════════════════════════════
  {
    id: 'corporate',
    label: 'Şirketler Hukuku',
    items: [
      {
        id: 'corporate-law',
        label: 'Şirket İşlemleri',
        href: '/v2/corporate',
        icon: Building2,
      },
      {
        id: 'registry',
        label: 'Ticaret Sicili',
        href: '/v2/registry',
        icon: Building2,
      },
      {
        id: 'corporate-chat',
        label: 'Chat Asistanı',
        href: '/v2/corporate/chat',
        icon: MessageCircle,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // PRATİK BİLGİLER - Referans bilgiler ve hesaplamalar
  // (Anayasa: Tüm Bilgiler, Hesaplamalar, Kontrol Listeleri)
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
