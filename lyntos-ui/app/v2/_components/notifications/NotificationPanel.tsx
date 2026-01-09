/**
 * VERGUS Notification Panel
 * Sprint R3 - Alert & Notification System
 */
'use client';

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  critical: { bg: 'bg-red-900/20', border: 'border-red-500', icon: '' },
  high: { bg: 'bg-orange-900/20', border: 'border-orange-500', icon: '' },
  medium: { bg: 'bg-yellow-900/20', border: 'border-yellow-500', icon: '' },
  low: { bg: 'bg-green-900/20', border: 'border-green-500', icon: '' },
  info: { bg: 'bg-blue-900/20', border: 'border-blue-500', icon: '' },
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

      const res = await fetch(`${API_BASE}/api/v1/notifications?${params}`);
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
      const res = await fetch(`${API_BASE}/api/v1/notifications/stats?user_id=${userId}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/v1/notifications/${id}/read?user_id=${userId}`, {
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
      await fetch(`${API_BASE}/api/v1/notifications/read-all?user_id=${userId}`, {
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
      await fetch(`${API_BASE}/api/v1/notifications/${id}/dismiss`, {
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
    return date.toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">Bildirimler</h2>
            {stats && stats.unread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {stats.unread}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm bg-slate-700 border border-slate-600 text-slate-200 rounded px-2 py-1"
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
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {showAll ? 'Okunmamislar' : 'Tumu'}
            </button>

            {stats && stats.unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-slate-400 hover:text-slate-300"
              >
                Tumunu Okundu Isaretle
              </button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="mt-3 flex gap-4 text-sm text-slate-400">
            <span>Toplam: {stats.total}</span>
            <span>Okunmamis: {stats.unread}</span>
            {stats.action_required > 0 && (
              <span className="text-orange-400 font-medium">
                Aksiyon Bekleyen: {stats.action_required}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Notification List */}
      <div className="divide-y divide-slate-700 max-h-[500px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <div className="text-4xl mb-2">OK</div>
            <p>Yeni bildirim yok</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const style = SEVERITY_STYLES[notif.severity] || SEVERITY_STYLES.info;

            return (
              <div
                key={notif.id}
                className={`p-4 ${style.bg} ${!notif.is_read ? 'border-l-4 ' + style.border : ''} hover:bg-slate-700/50 transition-colors`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{style.icon}</span>
                      <h3 className={`font-medium ${!notif.is_read ? 'text-slate-100' : 'text-slate-400'}`}>
                        {notif.title}
                      </h3>
                      {notif.action_required === 1 && (
                        <span className="bg-orange-900/50 text-orange-300 text-xs px-2 py-0.5 rounded border border-orange-700">
                          Aksiyon Gerekli
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-slate-500">
                        {formatDate(notif.created_at)}
                      </span>

                      {notif.action_url && (
                        <a
                          href={notif.action_url}
                          className="text-xs text-blue-400 hover:text-blue-300"
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
                        className="p-1 text-slate-500 hover:text-green-400"
                        title="Okundu isaretle"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="p-1 text-slate-500 hover:text-red-400"
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
