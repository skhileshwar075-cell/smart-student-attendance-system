import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Bell, CheckCheck, Trash2, RefreshCw,
  Calendar, MessageSquare, AlertTriangle, Settings, Info, CheckCircle
} from 'lucide-react';

function typeIcon(type) {
  const base = 'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0';
  switch (type) {
    case 'attendance': return <div className={`${base} bg-emerald-100`}><Calendar size={18} className="text-emerald-600" /></div>;
    case 'request':    return <div className={`${base} bg-blue-100`}><MessageSquare size={18} className="text-blue-600" /></div>;
    case 'alert':
    case 'warning':    return <div className={`${base} bg-amber-100`}><AlertTriangle size={18} className="text-amber-600" /></div>;
    case 'system':     return <div className={`${base} bg-purple-100`}><Settings size={18} className="text-purple-600" /></div>;
    case 'success':    return <div className={`${base} bg-emerald-100`}><CheckCircle size={18} className="text-emerald-600" /></div>;
    default:           return <div className={`${base} bg-gray-100`}><Info size={18} className="text-gray-500" /></div>;
  }
}

function typeLabel(type) {
  switch (type) {
    case 'attendance': return { label: 'Attendance', color: 'bg-emerald-100 text-emerald-700' };
    case 'request':    return { label: 'Request',    color: 'bg-blue-100 text-blue-700' };
    case 'alert':
    case 'warning':    return { label: 'Alert',      color: 'bg-amber-100 text-amber-700' };
    case 'system':     return { label: 'System',     color: 'bg-purple-100 text-purple-700' };
    case 'success':    return { label: 'Approved',   color: 'bg-emerald-100 text-emerald-700' };
    default:           return { label: 'Info',       color: 'bg-gray-100 text-gray-600' };
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
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');
  const [refreshing, setRefreshing]       = useState(false);

  const fetch = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const r = await axios.get('/api/notifications?limit=100');
      setNotifications(r.data.notifications || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const markRead = async (id) => {
    await axios.put(`/api/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await axios.put('/api/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    await axios.delete(`/api/notifications/${id}`);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filters = ['all', 'unread', 'attendance', 'request', 'alert', 'system'];
  const filtered = notifications.filter(n => {
    if (filter === 'all')    return true;
    if (filter === 'unread') return !n.is_read;
    return n.type === filter || (filter === 'alert' && n.type === 'warning');
  });

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="page-title">Notifications</h2>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {unread} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetch(true)}
            disabled={refreshing}
            className="btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-primary btn-sm">
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {f}
            {f === 'unread' && unread > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{unread}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="card divide-y divide-gray-50">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-3 p-4">
                <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-2/3 rounded" />
                  <div className="skeleton h-2.5 w-full rounded" />
                  <div className="skeleton h-2 w-1/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <Bell size={24} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-400">
                {filter === 'unread' ? 'All caught up!' : 'No notifications'}
              </p>
              <p className="text-xs text-gray-300 mt-0.5">
                {filter === 'unread' ? 'No unread notifications' : 'Nothing to show here'}
              </p>
            </div>
          </div>
        ) : (
          filtered.map(n => {
            const tag = typeLabel(n.type);
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`group flex items-start gap-3 p-4 transition-colors relative ${
                  !n.is_read
                    ? 'bg-blue-50/30 hover:bg-blue-50/60 cursor-pointer'
                    : 'hover:bg-gray-50/60'
                }`}
              >
                {typeIcon(n.type)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-600 font-medium'}`}>
                        {n.title}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tag.color}`}>
                        {tag.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                      <button
                        onClick={(e) => deleteNotif(n.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                </div>

                {!n.is_read && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {notifications.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          Showing {filtered.length} of {notifications.length} notifications
        </p>
      )}
    </div>
  );
}
