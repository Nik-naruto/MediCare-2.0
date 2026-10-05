import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, X, Check, CheckCheck, Info, Calendar, Pill, TestTube, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { ThemeToggle } from '../common/ThemeToggle';
import { apiClient } from '../../api/client';
import { getMediaUrl } from '../../utils/media';

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
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return String(isoString);
  }
};

export const Topbar = ({ title, isMobileOpen = false, onMenuClick = () => {} }) => {
  const { role, currentUser } = useAuth();
  const activeRole = role || 'Patient';
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/notifications/');
      const rawList = Array.isArray(response.data) ? response.data : [];
      setNotifications(rawList);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  // Click outside & Escape key listeners
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      const response = await apiClient.put(`/notifications/${notifId}?is_read=true`);
      const updatedItem = response.data;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: updatedItem.is_read } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    try {
      await Promise.all(
        unread.map((n) => apiClient.put(`/notifications/${n.id}?is_read=true`))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    const targetRoute =
      activeRole === 'Doctor'
        ? '/doctor/dashboard'
        : activeRole === 'Receptionist'
        ? '/receptionist/dashboard'
        : activeRole === 'Admin'
        ? '/admin/dashboard'
        : '/patient/notifications';
    navigate(targetRoute);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getInitials = (name) => {
    if (!name) return 'MC';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userInitials = getInitials(currentUser?.name || currentUser?.full_name || currentUser?.email);

  return (
    <header className="sticky top-0 z-30 bg-[#F9F9F8]/90 dark:bg-[#0C0E12]/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 px-3.5 sm:px-6 py-3 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none shrink-0"
          aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Page Title & Breadcrumb */}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-light text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none">{title}</h1>
          <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 block -mt-0.5 truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none">
            MediCare 2.0 &bull; {activeRole} Workspace
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <ThemeToggle size="md" />

        {/* Notifications Control */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen) fetchNotifications();
            }}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isOpen ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70'
            }`}
            aria-label="Notifications"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Panel Header */}
              <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">Notifications</h3>
                  {unreadCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" /> All read
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 hover:underline transition-colors cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Panel Body / Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No notifications</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">You are all caught up!</p>
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif) => {
                    const Icon = getNotificationIcon(notif.notification_type);
                    const isUnread = !notif.is_read;

                    return (
                      <div
                        key={notif.id}
                        onClick={() => isUnread && handleMarkAsRead(notif.id)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                          isUnread ? 'bg-sky-50/40 dark:bg-sky-950/30 hover:bg-sky-50/70 dark:hover:bg-sky-950/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isUnread ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className={`text-xs truncate ${isUnread ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                              {formatNotificationTime(notif.created_at)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                            {notif.message}
                          </p>
                        </div>

                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded-md transition-colors shrink-0 mt-0.5 cursor-pointer"
                            title="Mark as read"
                            aria-label="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  onClick={handleViewAll}
                  className="w-full py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>View All Notifications</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
          {(currentUser?.avatar || currentUser?.doctor_profile?.profile_photo_url || currentUser?.profile_photo_url) ? (
            <img
              src={currentUser.avatar || getMediaUrl(currentUser?.doctor_profile?.profile_photo_url || currentUser?.profile_photo_url)}
              alt={currentUser?.name || 'User Avatar'}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs">
              {userInitials}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{currentUser?.name}</span>
            <Badge variant={role === 'Doctor' ? 'teal' : role === 'Admin' ? 'purple' : role === 'Receptionist' ? 'amber' : 'sky'}>
              {role}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
};

