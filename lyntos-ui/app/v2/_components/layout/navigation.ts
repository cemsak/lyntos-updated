/**
 * LYNTOS Navigation Configuration
 * Sprint 7.3 - Stripe Dashboard Shell
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
  Newspaper,
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
  {
    id: 'main',
    items: [
      {
        id: 'dashboard',
        label: 'Özet',
        href: '/v2',
        icon: LayoutDashboard,
      },
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
  {
    id: 'risk',
    label: 'Risk Yönetimi',
    items: [
      {
        id: 'risk-queue',
        label: 'Risk Kuyruğu',
        href: '/v2/risk',
        icon: AlertTriangle,
        badge: 3,
        badgeColor: 'danger',
      },
    ],
  },
  {
    id: 'tax',
    label: 'Vergi İşlemleri',
    items: [
      {
        id: 'vergus',
        label: 'VERGUS Stratejist',
        href: '/v2/vergus',
        icon: Sparkles,
      },
      {
        id: 'declarations',
        label: 'Beyannameler',
        href: '/v2/declarations',
        icon: FileText,
      },
      {
        id: 'reports',
        label: 'Raporlar',
        href: '/v2/reports',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'regwatch',
    label: 'Mevzuat Takibi',
    items: [
      {
        id: 'regwatch-chat',
        label: 'Mevzuat Chat',
        href: '/v2/regwatch/chat',
        icon: Newspaper,
      },
    ],
  },
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
        label: 'Chat Asistani',
        href: '/v2/corporate/chat',
        icon: MessageCircle,
      },
    ],
  },
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
