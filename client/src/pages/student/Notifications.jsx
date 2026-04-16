import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle } from 'lucide-react';

function NotifIcon({ type }) {
  if (type === 'success') return (
    <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
      <CheckCircle size={17} className="text-emerald-600" />
    </div>
  );
  if (type === 'warning') return (
    <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
      <AlertTriangle size={17} className="text-amber-600" />
    </div>
  );
  return (
    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
      <Info size={17} className="text-blue-600" />
    </div>
  );
}

function formatTime(dateStr) {
  const d    = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(m / 60);
  const day  = Math.floor(h / 24);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]        = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = () => {
    setLoading(true);
    axios.get('/api/student/notifications')
      .then(r => setNotifications(r.data.notifications || []))
      .finally(() => setLoading(false));
  };

  const markRead = async (id) => {
    await axios.put(`/api/student/notifications/${id}/read`);
    setNotifications(n => n.map(x => x.id === id ? {...x, is_read: true} : x));
  };

  const markAllRead = async () => {
    await axios.put('/api/student/notifications/read-all');
    setNotifications(n => n.map(x => ({...x, is_read: true})));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="page-title">Notifications</h2>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unread} new
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary btn-sm">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* ── List ──────────────────────────────────────────────── */}
      <div className="card">
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-16" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state py-12">
            <Bell size={36} className="empty-state-icon" />
            <p className="empty-state-text">No notifications yet</p>
            <p className="empty-state-sub">You're all caught up</p>
          </div>
        ) : (
          <div>
            {notifications.map((n, i) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`flex items-start gap-3 py-3.5 border-b border-gray-50 last:border-0 rounded-xl px-1 transition-colors ${
                  !n.is_read ? 'cursor-pointer hover:bg-blue-50/50' : ''
                }`}
              >
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${n.is_read ? 'text-gray-500' : 'text-gray-900 font-semibold'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{formatTime(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
