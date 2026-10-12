"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAdminAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { 
  Bell, 
  CheckCheck, 
  Check, 
  Trash2, 
  RotateCw, 
  AlertTriangle, 
  FileText, 
  Info, 
  ShieldAlert,
  X
} from 'lucide-react';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function AdminNotifications() {
  const { user, token } = useAdminAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'SURVEYS'>('ALL');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user, router, token]);

  const fetchNotifications = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    try {
      setError('');
      const res = await api.get('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setNotifications(res.data);
    } catch (e: any) {
      console.error(e);
      setError(getErrorMessage(e, 'Failed to fetch notifications'));
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    try {
      await api.patch(`/api/admin/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e: any) {
      alert(getErrorMessage(e, 'Failed to mark notification as read'));
    }
  };

  const markAllAsRead = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    setActionLoading(true);
    try {
      await api.post('/api/admin/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e: any) {
      alert(getErrorMessage(e, 'Failed to mark all notifications as read'));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteNotification = async (id: number) => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    try {
      await api.delete(`/api/admin/notifications/${id}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      alert(getErrorMessage(e, 'Failed to dismiss notification'));
    }
  };

  const clearAllNotifications = async () => {
    const activeToken = token || useAdminAuthStore.getState().token;
    if (!activeToken) return;
    setActionLoading(true);
    try {
      await api.delete('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      setNotifications([]);
      setShowClearConfirm(false);
    } catch (e: any) {
      alert(getErrorMessage(e, 'Failed to clear notifications'));
    } finally {
      setActionLoading(false);
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'UNREAD') return !n.is_read;
      if (filter === 'SURVEYS') return n.type === 'survey_submit';
      return true;
    });
  }, [notifications, filter]);

  const getNotificationIcon = (type: string) => {
    if (type === 'survey_submit') {
      return <FileText className="w-4 h-4 text-emerald-700" />;
    }
    if (type === 'security' || type === 'alert') {
      return <ShieldAlert className="w-4 h-4 text-amber-700" />;
    }
    return <Info className="w-4 h-4 text-[#093C22]" />;
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6 text-primary max-w-5xl animate-fade-in pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-border-strong pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#093C22] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#093C22] border border-emerald-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-secondary mt-1">
            Institutional activity feeds, survey submissions, and system synchronization events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-strong text-xs font-semibold text-primary bg-surface hover:bg-page transition-colors shadow-xs disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#093C22]" />
              Mark All as Read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-semibold text-red-700 bg-surface hover:bg-red-50 transition-colors shadow-xs disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              Clear All
            </button>
          )}

          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-strong text-xs font-semibold text-primary bg-surface hover:bg-page transition-colors shadow-xs disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#093C22]' : 'text-secondary'}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs border border-red-200 rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* Main Notifications Container */}
      <div className="bg-surface rounded-xl border border-border-strong overflow-hidden text-xs shadow-xs">
        {/* Filter Toolbar */}
        <div className="p-3.5 border-b border-border bg-page/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors font-semibold ${
                filter === 'ALL'
                  ? 'bg-[#093C22] text-white shadow-2xs'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors font-semibold ${
                filter === 'UNREAD'
                  ? 'bg-[#093C22] text-white shadow-2xs'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('SURVEYS')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors font-semibold ${
                filter === 'SURVEYS'
                  ? 'bg-[#093C22] text-white shadow-2xs'
                  : 'text-secondary hover:text-primary hover:bg-surface'
              }`}
            >
              Surveys Only
            </button>
          </div>

          <span className="text-[11px] text-muted font-medium">Auto-refresh enabled</span>
        </div>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="p-16 text-center text-xs text-muted">
            <RotateCw className="w-5 h-5 animate-spin mx-auto text-[#093C22] mb-2" />
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center text-xs text-muted">
            No notifications found under the selected view.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  !notif.is_read
                    ? 'bg-emerald-50/30 border-l-4 border-[#093C22]'
                    : 'hover:bg-page'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className={`mt-0.5 p-2 rounded-lg ${!notif.is_read ? 'bg-emerald-50 text-[#093C22]' : 'bg-page text-secondary'}`}>
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${!notif.is_read ? 'text-primary font-bold' : 'text-primary font-medium'}`}>
                        {notif.title}
                      </span>
                      {!notif.is_read && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-[#093C22] border border-emerald-200">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-secondary leading-relaxed whitespace-pre-line text-xs">
                      {notif.message}
                    </p>
                    <p className="text-[11px] text-muted font-mono pt-0.5">
                      {new Date(notif.created_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {!notif.is_read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg text-secondary hover:text-[#093C22] hover:bg-emerald-50 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    title="Dismiss notification"
                    className="p-1.5 rounded-lg text-muted hover:text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl max-w-md w-full shadow-2xl border border-border-strong p-6 space-y-4 text-xs animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-primary">Clear All Notifications</h3>
                <p className="text-secondary text-xs mt-0.5">Permanent dismissal confirmation</p>
              </div>
            </div>

            <p className="text-secondary leading-relaxed">
              Are you sure you want to dismiss and clear all <strong className="text-primary">{notifications.length}</strong> notification records? 
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg border border-border-strong bg-surface text-primary hover:bg-page font-semibold transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={clearAllNotifications}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shadow-xs"
              >
                {actionLoading ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

