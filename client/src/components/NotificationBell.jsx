import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Bell, CheckCheck, X, CheckCircle, AlertTriangle, Info,
  Calendar, MessageSquare, Settings, ChevronRight
} from 'lucide-react';

const POLL_INTERVAL = 15000;

function typeIcon(type) {
  const base = 'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0';
  switch (type) {
    case 'attendance': return <div className={`${base} bg-emerald-100`}><Calendar size={15} className="text-emerald-600" /></div>;
    case 'request':    return <div className={`${base} bg-blue-100`}><MessageSquare size={15} className="text-blue-600" /></div>;
    case 'alert':
    case 'warning':    return <div className={`${base} bg-amber-100`}><AlertTriangle size={15} className="text-amber-600" /></div>;
    case 'system':     return <div className={`${base} bg-purple-100`}><Settings size={15} className="text-purple-600" /></div>;
    case 'success':    return <div className={`${base} bg-emerald-100`}><CheckCircle size={15} className="text-emerald-600" /></div>;
    default:           return <div className={`${base} bg-gray-100`}><Info size={15} className="text-gray-500" /></div>;
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);
  const prevUnreadRef = useRef(0);
  const toastTimerRef = useRef(null);

  const notifPath = user?.role === 'student'
    ? '/student/notifications'
    : user?.role === 'teacher'
      ? '/teacher/notifications'
      : '/admin/notifications';

  const fetchNotifications = useCallback(async () => {
    try {
      const r = await axios.get('/api/notifications?limit=10');
      const data = r.data.notifications || [];
      const newUnread = data.filter(n => !n.is_read).length;

      if (prevUnreadRef.current > 0 && newUnread > prevUnreadRef.current) {
        const newest = data.find(n => !n.is_read);
        if (newest) showToast(newest);
      }

      setNotifications(data);
      setUnread(newUnread);
      prevUnreadRef.current = newUnread;
    } catch {
    }
  }, []);

  const showToast = (notif) => {
    setToast(notif);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markRead = async (id, e) => {
    e?.stopPropagation();
    await axios.put(`/api/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
  };

  const markAllRead = async (e) => {
    e?.stopPropagation();
    await axios.put('/api/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    prevUnreadRef.current = 0;
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate(notifPath);
  };

  const handleItemClick = async (n) => {
    if (!n.is_read) await markRead(n.id);
  };

  return (
    <>
      {/* Toast popup */}
      {toast && (
        <div
          className="fixed top-3 left-2 right-2 sm:left-auto sm:right-4 sm:top-4 z-[100] sm:w-full sm:max-w-sm animate-in slide-in-from-top-2"
          style={{ animation: 'slideInDown 0.3s ease' }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-start gap-3">
            {typeIcon(toast.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{toast.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Bell button + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => { setOpen(v => !v); if (!open) fetchNotifications(); }}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="fixed left-2 right-2 top-16 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(24rem,calc(100vw-1rem))]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4 border-b border-gray-50">
              <div className="flex min-w-0 items-center gap-2">
                <Bell size={15} className="text-gray-700" />
                <span className="font-bold text-gray-900 text-sm truncate">Notifications</span>
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <CheckCheck size={12} />
                    All read
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={28} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`flex items-start gap-3 px-3 py-3 sm:px-4 border-b border-gray-50 last:border-0 transition-colors ${
                      !n.is_read ? 'bg-blue-50/40 hover:bg-blue-50 cursor-pointer' : 'hover:bg-gray-50 cursor-default'
                    }`}
                  >
                    {typeIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-tight ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-50 p-2">
              <button
                onClick={handleViewAll}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              >
                View all notifications
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
