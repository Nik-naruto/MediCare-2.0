import React, { useState, useEffect } from 'react';
import { Bell, Check, AlertCircle, RotateCcw, CheckCheck, Info, Calendar, FileText, Pill, TestTube } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

const getNotificationIcon = (typeStr) => {
  const type = String(typeStr || '').toUpperCase();
  if (type.includes('APPOINTMENT')) return Calendar;
  if (type.includes('PRESCRIPTION') || type.includes('RX')) return Pill;
  if (type.includes('LAB')) return TestTube;
  if (type.includes('RECORD') || type.includes('MEDICAL')) return FileText;
  return Info;
};

const formatNotificationTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return String(isoString);
  }
};

export const PatientNotifications = () => {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchNotifications = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await apiClient.get('/notifications/');
      const rawList = Array.isArray(response.data) ? response.data : [];
      setNotifications(rawList);
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to load notifications.';
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notifId) => {
    setUpdatingId(notifId);
    try {
      const response = await apiClient.put(`/notifications/${notifId}?is_read=true`);
      const updatedItem = response.data;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: updatedItem.is_read } : n))
      );

      addToast('Notification marked as read.', 'success');
    } catch (err) {
      const detail = err.detail || err.message || 'Failed to mark notification as read.';
      const msg = typeof detail === 'string' ? detail : 'Failed to update notification status.';
      addToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return <LoadingSpinner label="Loading your notifications..." />;
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
            {unreadCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-700 border border-sky-200">
                {unreadCount} unread
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> All caught up
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            View system alerts, appointment updates, and medical record notifications
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="text-xs text-slate-500 font-medium">
            Click "Mark as read" to update notification status
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" icon={RotateCcw} onClick={fetchNotifications}>
            Retry
          </Button>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Bell className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No notifications found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You don't have any notifications at the moment. Important alerts and updates will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const Icon = getNotificationIcon(notif.notification_type);
            const isUnread = !notif.is_read;

            return (
              <Card
                key={notif.id}
                className={`p-4 transition-all ${
                  isUnread
                    ? 'bg-sky-50/50 border-l-4 border-l-sky-600 shadow-xs'
                    : 'bg-white border border-slate-200/80 opacity-90'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnread ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm tracking-tight ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                          {notif.title}
                        </h3>

                        {isUnread && (
                          <span className="inline-block w-2 h-2 rounded-full bg-sky-600"></span>
                        )}

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          {notif.notification_type || 'INFO'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                      <span className="block text-[11px] text-slate-400 font-medium pt-1">
                        {formatNotificationTime(notif.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isUnread ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Check}
                        isLoading={updatingId === notif.id}
                        onClick={() => handleMarkAsRead(notif.id)}
                      >
                        Mark as read
                      </Button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                        <CheckCheck className="w-3.5 h-3.5" /> Read
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
