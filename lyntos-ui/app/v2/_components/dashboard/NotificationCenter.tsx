'use client';

/**
 * Notification Center - Dashboard V3
 * Pencere 13.3 - Bildirim Merkezi
 *
 * Yaklaşan beyan tarihleri, risk uyarıları, mevzuat değişiklikleri
 */

import { useState } from 'react';
import {
  Bell,
  Calendar,
  AlertTriangle,
  FileText,
  Scale,
  X,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

type NotificationType = 'deadline' | 'risk' | 'mevzuat' | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  urgent?: boolean;
  action?: {
    label: string;
    href: string;
  };
}

const typeConfig = {
  deadline: {
    icon: Calendar,
    color: 'text-[#F0282D]',
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FFC7C9]',
  },
  risk: {
    icon: AlertTriangle,
    color: 'text-[#FFB114]',
    bg: 'bg-[#FFFBEB]',
    border: 'border-[#FFF08C]',
  },
  mevzuat: {
    icon: Scale,
    color: 'text-[#0078D0]',
    bg: 'bg-[#E6F9FF]',
    border: 'border-[#ABEBFF]',
  },
  system: {
    icon: Bell,
    color: 'text-[#969696]',
    bg: 'bg-[#F5F6F8]',
    border: 'border-[#E5E5E5]',
  },
};

// Bildirimler API'den gelecek — prop üzerinden geçilir, default boş array
const emptyNotifications: Notification[] = [];

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Notification[];
}

export function NotificationCenter({
  isOpen,
  onClose,
  notifications = emptyNotifications,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<NotificationType | 'all'>('all');

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel - Mobile responsive width */}
      <div className="absolute right-2 sm:right-4 top-16 w-[calc(100vw-1rem)] sm:w-96 max-w-[24rem] bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] overflow-hidden animate-slide-down">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#F5F6F8] to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0078D0] to-[#0078D0] flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[#2E2E2E]">Bildirimler</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-[#969696]">{unreadCount} okunmamış</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5F6F8] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#969696]" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            {(['all', 'deadline', 'risk', 'mevzuat'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  filter === f
                    ? 'bg-[#E6F9FF] text-[#0049AA]'
                    : 'bg-[#F5F6F8] text-[#5A5A5A] hover:bg-[#E5E5E5]'
                }`}
              >
                {f === 'all' ? 'Tümü' :
                 f === 'deadline' ? 'Tarihler' :
                 f === 'risk' ? 'Riskler' : 'Mevzuat'}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#6BDB83] mx-auto mb-3" />
              <p className="text-[#969696]">Bildirim yok</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E5]">
              {filteredNotifications.map((notification) => {
                const config = typeConfig[notification.type];
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-[#F5F6F8] transition-colors ${
                      !notification.read ? 'bg-[#E6F9FF]/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-9 h-9 rounded-lg ${config.bg} ${config.border} border flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-[#2E2E2E]' : 'text-[#5A5A5A]'}`}>
                            {notification.title}
                            {notification.urgent && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs bg-[#FEF2F2] text-[#BF192B] rounded">
                                Acil
                              </span>
                            )}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-[#0078D0] rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-[#969696] mt-0.5 line-clamp-2">
                          {notification.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-[#969696] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.timestamp}
                          </span>
                          {notification.action && (
                            <a
                              href={notification.action.href}
                              className="text-xs font-medium text-[#0049AA] hover:text-[#0049AA] flex items-center gap-1"
                            >
                              {notification.action.label}
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E5E5] bg-[#F5F6F8]">
          <button className="w-full text-center text-sm text-[#0049AA] hover:text-[#0049AA] font-medium">
            Tüm Bildirimleri Gör
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification Bell Button
interface NotificationBellProps {
  count?: number;
  onClick: () => void;
}

export function NotificationBell({ count = 0, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-[#F5F6F8] rounded-lg transition-colors"
    >
      <Bell className="w-5 h-5 text-[#5A5A5A]" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F0282D] text-white text-xs font-bold rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

export default NotificationCenter;
