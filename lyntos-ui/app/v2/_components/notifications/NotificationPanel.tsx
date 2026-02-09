/**
 * VERGUS Notification Panel
 * Sprint R3 - Alert & Notification System
 */
'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../_lib/config/api';
import { formatDate as formatDateCentral } from '../../_lib/format';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  severity: string;
  category: string;
  is_read: number;
  action_required: number;
  action_url?: string;
  created_at: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  by_severity: Record<string, number>;
  action_required: number;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  critical: { bg: 'bg-[#980F30]/20', border: 'border-[#F0282D]', icon: '' },
  high: { bg: 'bg-[#E67324]/20', border: 'border-[#FFB114]', icon: '' },
  medium: { bg: 'bg-yellow-900/20', border: 'border-yellow-500', icon: '' },
  low: { bg: 'bg-[#005A46]/20', border: 'border-[#00A651]', icon: '' },
  info: { bg: 'bg-[#00287F]/20', border: 'border-[#0078D0]', icon: '' },
};

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<string>('');

  const userId = 'default'; // TODO: Get from auth context

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [showAll, filter]);

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        include_read: showAll.toString(),
        limit: '20'
      });
      if (filter) params.append('severity', filter);

      const res = await fetch(`${API_BASE_URL}/api/v1/notifications?${params}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/notifications/stats?user_id=${userId}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/read?user_id=${userId}`, {
        method: 'POST'
      });
      fetchNotifications();
      fetchStats();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/notifications/read-all?user_id=${userId}`, {
        method: 'POST'
      });
      fetchNotifications();
      fetchStats();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/dismiss`, {
        method: 'POST'
      });
      fetchNotifications();
      fetchStats();
    } catch (err) {
      console.error('Failed to dismiss:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} dk once`;
    if (diffHours < 24) return `${diffHours} saat once`;
    if (diffDays < 7) return `${diffDays} gun once`;
    return formatDateCentral(dateStr);
  };

  if (loading) {
    return (
      <div className="bg-[#2E2E2E]/50 rounded-lg border border-[#5A5A5A] p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[#5A5A5A] rounded w-1/3"></div>
          <div className="h-20 bg-[#5A5A5A] rounded"></div>
          <div className="h-20 bg-[#5A5A5A] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2E2E2E]/50 rounded-lg border border-[#5A5A5A]">
      {/* Header */}
      <div className="p-4 border-b border-[#5A5A5A]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#F5F6F8]">Bildirimler</h2>
            {stats && stats.unread > 0 && (
              <span className="bg-[#F0282D] text-white text-xs font-bold px-2 py-1 rounded-full">
                {stats.unread}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm bg-[#5A5A5A] border border-[#5A5A5A] text-[#E5E5E5] rounded px-2 py-1"
            >
              <option value="">Tum Onem</option>
              <option value="critical">Kritik</option>
              <option value="high">Yuksek</option>
              <option value="medium">Orta</option>
              <option value="low">Dusuk</option>
              <option value="info">Bilgi</option>
            </select>

            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-[#00B4EB] hover:text-[#5ED6FF]"
            >
              {showAll ? 'Okunmamislar' : 'Tumu'}
            </button>

            {stats && stats.unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-[#969696] hover:text-[#B4B4B4]"
              >
                Tumunu Okundu Isaretle
              </button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="mt-3 flex gap-4 text-sm text-[#969696]">
            <span>Toplam: {stats.total}</span>
            <span>Okunmamis: {stats.unread}</span>
            {stats.action_required > 0 && (
              <span className="text-[#FFCE19] font-medium">
                Aksiyon Bekleyen: {stats.action_required}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Notification List */}
      <div className="divide-y divide-[#5A5A5A] max-h-[500px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-[#969696]">
            <div className="text-4xl mb-2">OK</div>
            <p>Yeni bildirim yok</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const style = SEVERITY_STYLES[notif.severity] || SEVERITY_STYLES.info;

            return (
              <div
                key={notif.id}
                className={`p-4 ${style.bg} ${!notif.is_read ? 'border-l-4 ' + style.border : ''} hover:bg-[#5A5A5A]/50 transition-colors`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{style.icon}</span>
                      <h3 className={`font-medium ${!notif.is_read ? 'text-[#F5F6F8]' : 'text-[#969696]'}`}>
                        {notif.title}
                      </h3>
                      {notif.action_required === 1 && (
                        <span className="bg-[#E67324]/50 text-[#FFE045] text-xs px-2 py-0.5 rounded border border-[#FA841E]">
                          Aksiyon Gerekli
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[#969696] mt-1 line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-[#969696]">
                        {formatDate(notif.created_at)}
                      </span>

                      {notif.action_url && (
                        <a
                          href={notif.action_url}
                          className="text-xs text-[#00B4EB] hover:text-[#5ED6FF]"
                        >
                          Detaylari Gor
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    {!notif.is_read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-1 text-[#969696] hover:text-[#00CB50]"
                        title="Okundu isaretle"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="p-1 text-[#969696] hover:text-[#FF555F]"
                      title="Kaldir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
