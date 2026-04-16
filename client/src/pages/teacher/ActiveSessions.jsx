import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Clock, StopCircle, RefreshCw, Wifi, Hash, QrCode, Shield,
  CheckCircle, MapPin, Filter, AlertCircle, Activity
} from 'lucide-react';

function formatTime(expiresAt, now) {
  const diff = new Date(expiresAt) - now;
  if (diff <= 0) return { label: 'Expired', expired: true, urgent: false };
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { label: `${mins}m ${secs.toString().padStart(2, '0')}s`, expired: false, urgent: diff < 120000 };
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-700 border-green-200',
    expired: 'bg-gray-100 text-gray-500 border-gray-200',
    stopped: 'bg-red-100 text-red-500 border-red-200',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border capitalize ${styles[status] || styles.expired}`}>
      {status}
    </span>
  );
}

function SessionRow({ session, onStop, stopping, now }) {
  const isStopped = session.is_active === false;
  const timer = formatTime(session.expires_at, now);
  const status = isStopped ? 'stopped' : timer.expired ? 'expired' : 'active';

  const TypeIcon = session.session_type === 'qr' ? QrCode : session.session_type === 'secure' ? Shield : Hash;

  return (
    <div className={`border rounded-2xl p-4 transition-all ${status === 'active' ? 'border-blue-100 bg-white shadow-sm' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${status === 'active' ? 'bg-blue-50' : 'bg-gray-100'}`}>
          <TypeIcon size={18} className={status === 'active' ? 'text-blue-600' : 'text-gray-400'} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-semibold text-gray-800 text-sm truncate">{session.subject_name}</p>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-gray-400 mb-2">
            {session.class_name}{session.class_section ? ` · ${session.class_section}` : ''}
            {session.subject_code ? ` · ${session.subject_code}` : ''}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg capitalize">
              {session.session_type}
            </span>
            {session.code && (
              <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg tracking-wider">
                Code: {session.code}
              </span>
            )}
            {session.geo_lat && (
              <span className="flex items-center gap-1 text-xs text-orange-500">
                <MapPin size={10} /> Geo-fenced
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1 text-xs font-medium ${status !== 'active' ? 'text-gray-400' : timer.urgent ? 'text-orange-500' : 'text-green-600'}`}>
              <Clock size={12} />
              <span>{isStopped ? 'Stopped' : timer.label}</span>
            </div>

            {status === 'active' && (
              <button
                onClick={() => onStop(session)}
                disabled={stopping === session.id}
                className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                <StopCircle size={13} />
                {stopping === session.id ? 'Stopping…' : 'Stop Session'}
              </button>
            )}
            {status !== 'active' && (
              <span className="text-xs text-gray-300 flex items-center gap-1">
                <CheckCircle size={12} /> {status === 'stopped' ? 'Manually stopped' : 'Auto-expired'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(null);
  const [filter, setFilter] = useState('active');
  const [msg, setMsg] = useState(null);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await axios.get('/api/teacher/sessions');
      setSessions(r.data.sessions || []);
    } catch (_) {}
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    fetchSessions();
    pollRef.current = setInterval(() => fetchSessions(true), 15000);
    return () => clearInterval(pollRef.current);
  }, [fetchSessions]);

  const stopSession = async (session) => {
    if (!window.confirm(`Stop session for "${session.subject_name}"?\n\nStudents will immediately lose the ability to mark attendance.`)) return;
    setStopping(session.id);
    setMsg(null);
    try {
      await axios.delete(`/api/teacher/sessions/${session.id}`);
      setMsg({ type: 'success', text: `"${session.subject_name}" session stopped successfully.` });
      fetchSessions(true);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to stop session' });
    } finally { setStopping(null); }
  };

  const categorised = sessions.reduce((acc, s) => {
    const isStopped = s.is_active === false;
    const expired = new Date(s.expires_at) <= new Date(now);
    const status = isStopped ? 'stopped' : expired ? 'expired' : 'active';
    acc[status] = (acc[status] || []).concat({ ...s, _status: status });
    return acc;
  }, {});

  const filtered = filter === 'all' ? sessions : (categorised[filter] || []);

  const counts = {
    active: (categorised.active || []).length,
    expired: (categorised.expired || []).length,
    stopped: (categorised.stopped || []).length,
    all: sessions.length,
  };

  const filterOptions = [
    { key: 'active', label: 'Active', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
    { key: 'expired', label: 'Expired', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
    { key: 'stopped', label: 'Stopped', color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
    { key: 'all', label: 'All Today', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  ];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {msg && (
        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* ── Summary Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', value: counts.active, color: 'text-green-600', bg: 'bg-green-50', pulse: counts.active > 0 },
          { label: 'Expired', value: counts.expired, color: 'text-gray-500', bg: 'bg-gray-50', pulse: false },
          { label: 'Stopped', value: counts.stopped, color: 'text-red-500', bg: 'bg-red-50', pulse: false },
        ].map(({ label, value, color, bg, pulse }) => (
          <div key={label} className={`attendance-card text-center py-3 ${bg}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              {pulse && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ───────────────────────────────────────────────────── */}
      <div className="attendance-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-gray-500" />
            <h3 className="font-semibold text-gray-700 text-sm">Today's Sessions</h3>
          </div>
          <button onClick={() => fetchSessions()} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {filterOptions.map(({ key, label, color, bg }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors ${
                filter === key ? `${bg} ${color} border-current` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
              {counts[key] > 0 && <span className="ml-1 opacity-70">({counts[key]})</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Wifi className="mx-auto text-gray-200 mb-3" size={36} />
            <p className="text-gray-400 text-sm">
              {filter === 'active' ? 'No active sessions right now' : `No ${filter} sessions today`}
            </p>
            <p className="text-gray-300 text-xs mt-1">
              {filter === 'active' ? 'Go to Take Attendance to start a session' : 'Sessions will appear here as they change status'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => (
              <SessionRow key={s.id} session={s} onStop={stopSession} stopping={stopping} now={now} />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-300 text-center mt-4 flex items-center justify-center gap-1">
          <RefreshCw size={10} /> Auto-refreshes every 15 seconds
        </p>
      </div>
    </div>
  );
}
